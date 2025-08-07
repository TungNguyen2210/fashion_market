const ProductModel = require('../models/product');
const CategoryModel = require('../models/category');
const ReviewModel = require('../models/review');
const Supplier = require('../models/supplier');
const jwt = require('jsonwebtoken');
const _const = require('../config/constant');

const calculateCosineSimilarity = (product1, product2) => {
    // Chuyển đổi các đặc trưng của sản phẩm thành vector
    const vector1 = [product1.price, product1.quantity]; // Ví dụ: sử dụng giá và số lượng làm đặc trưng
    const vector2 = [product2.price, product2.quantity];
  
    // Tính tổng tích của hai vector
    let dotProduct = 0;
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
    }
  
    // Tính độ dài của vector
    const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + Math.pow(value, 2), 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + Math.pow(value, 2), 0));
  
    // Tính cosine similarity
    const similarity = dotProduct / (magnitude1 * magnitude2);
    return similarity;
};

const productController = {
    getAllProduct: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
            populate: ['category', 'supplier']
        };

        try {
            const products = await ProductModel.paginate({}, options);
            res.status(200).json({ data: products });
        } catch (err) {
            console.log(err)
            res.status(500).json(err);
        }
    },

    getProductById: (req, res) => {
        try {
            res.status(200).json(res);
        } catch (err) {
            res.status(500).json(err);
        }
    },

    createProduct: async (req, res) => {
        const {
            name,
            price,
            description,
            category,
            image,
            promotion,
            quantity,
            slide,
            supplier,
            inventory,
            color,
            sizes,
            variants
        } = req.body;

        // Tạo các biến thể nếu chưa được cung cấp
        let productVariants = variants || [];
        if (!variants && color && sizes && color.length > 0 && sizes.length > 0) {
            // Phân phối số lượng đều giữa các biến thể
            const variantCount = color.length * sizes.length;
            const quantityPerVariant = Math.floor(quantity / variantCount);
            let remainingQuantity = quantity % variantCount;
            
            // Tạo các biến thể cho tất cả các tổ hợp màu sắc và kích thước
            for (const c of color) {
                for (const s of sizes) {
                    let variantQuantity = quantityPerVariant;
                    if (remainingQuantity > 0) {
                        variantQuantity++;
                        remainingQuantity--;
                    }
                    
                    const variantId = `${Date.now()}-${c}-${s}`;
                    
                    productVariants.push({
                        variantId,
                        color: c,
                        size: s,
                        quantity: variantQuantity
                    });
                }
            }
        }

        const product = new ProductModel({
            name,
            price,
            description,
            category,
            image,
            promotion,
            quantity,
            slide,
            supplier,
            color,
            sizes,
            variants: productVariants, // Thêm biến thể vào sản phẩm
            inventory: {
                quantityOnHand: inventory?.quantityOnHand || 0,
                expirationDate: inventory?.expirationDate || null,
                variantStock: productVariants // Lưu biến thể trong inventory nếu cần
            }
        });

        try {
            const checkCategory = await CategoryModel.findById(category);
            if (!checkCategory) {
                return res.status(400).json({ error: 'Invalid category' });
            }
            const newProduct = await product.save();
            res.status(200).json(newProduct);
        } catch (err) {
            res.status(500).json(err);
        }
    },

    deleteProduct: async (req, res) => {
        try {
            const product = await ProductModel.findByIdAndDelete(req.params.id);
            if (!product) {
                return res.status(200).json("Product does not exist");
            }
            res.status(200).json("Delete product success");
        } catch (err) {
            res.status(500).json(err);
        }
    },

    updateProduct: async (req, res) => {
        const id = req.params.id;
        const {
            name,
            price,
            description,
            category,
            image,
            promotion,
            quantity,
            color,
            supplier,
            inventory,
            sizes,
            variants
        } = req.body;

        try {
            const existingProduct = await ProductModel.findById(id);

            if (!existingProduct) {
                return res.status(404).json({ message: 'Product not found' });
            }
            
            // Cập nhật inventory cơ bản
            if (existingProduct.inventory) {
                existingProduct.inventory.quantityOnHand = (Number(existingProduct.inventory.quantityOnHand) || 0) + (Number(inventory?.quantityOnHand) || 0);
                existingProduct.inventory.expirationDate = inventory?.expirationDate || existingProduct.inventory.expirationDate;
            } else {
                existingProduct.inventory = {
                    quantityOnHand: Number(inventory?.quantityOnHand) || 0,
                    expirationDate: inventory?.expirationDate || null,
                    variantStock: []
                };
            }

            // Cập nhật biến thể nếu được cung cấp
            if (variants && variants.length > 0) {
                existingProduct.variants = variants;
                existingProduct.inventory.variantStock = variants;
                
                // Tính lại tổng số lượng từ các biến thể
                existingProduct.quantity = variants.reduce((sum, variant) => sum + variant.quantity, 0);
            }
            // Nếu không có biến thể nhưng có thay đổi về color hoặc sizes, tạo biến thể mới
            else if ((color && color.length > 0) || (sizes && sizes.length > 0)) {
                const updatedColor = color || existingProduct.color || [];
                const updatedSizes = sizes || existingProduct.sizes || [];
                
                if (updatedColor.length > 0 && updatedSizes.length > 0) {
                    // Lưu trữ biến thể hiện tại và số lượng của chúng
                    const currentVariants = existingProduct.variants || [];
                    const currentVariantMap = {};
                    
                    currentVariants.forEach(variant => {
                        const key = `${variant.color}-${variant.size}`;
                        currentVariantMap[key] = variant.quantity;
                    });
                    
                    // Tạo biến thể mới
                    const newVariants = [];
                    const updatedQuantity = quantity || existingProduct.quantity || 0;
                    
                    // Phân phối số lượng đều giữa các biến thể mới
                    const variantCount = updatedColor.length * updatedSizes.length;
                    const quantityPerVariant = Math.floor(updatedQuantity / variantCount);
                    let remainingQuantity = updatedQuantity % variantCount;
                    
                    for (const c of updatedColor) {
                        for (const s of updatedSizes) {
                            const key = `${c}-${s}`;
                            
                            // Ưu tiên sử dụng số lượng từ biến thể hiện có nếu có
                            let variantQuantity = currentVariantMap[key];
                            
                            // Nếu không tìm thấy biến thể hiện có, phân phối số lượng mới
                            if (variantQuantity === undefined) {
                                variantQuantity = quantityPerVariant;
                                if (remainingQuantity > 0) {
                                    variantQuantity++;
                                    remainingQuantity--;
                                }
                            }
                            
                            const variantId = `${existingProduct._id}-${c}-${s}`;
                            
                            newVariants.push({
                                variantId,
                                color: c,
                                size: s,
                                quantity: variantQuantity
                            });
                        }
                    }
                    
                    existingProduct.variants = newVariants;
                    existingProduct.inventory.variantStock = newVariants;
                    
                    // Tính tổng số lượng từ các biến thể
                    existingProduct.quantity = newVariants.reduce((sum, variant) => sum + variant.quantity, 0);
                }
            } else if (quantity) {
                // Nếu chỉ cập nhật số lượng tổng
                existingProduct.quantity = (Number(existingProduct.quantity) || 0) + Number(quantity);
                
                // Phân phối số lượng mới giữa các biến thể nếu có
                if (existingProduct.variants && existingProduct.variants.length > 0) {
                    const variantCount = existingProduct.variants.length;
                    const quantityPerVariant = Math.floor(Number(quantity) / variantCount);
                    let remainingQuantity = Number(quantity) % variantCount;
                    
                    existingProduct.variants.forEach(variant => {
                        let extraQuantity = quantityPerVariant;
                        if (remainingQuantity > 0) {
                            extraQuantity++;
                            remainingQuantity--;
                        }
                        variant.quantity = (Number(variant.quantity) || 0) + extraQuantity;
                    });
                    
                    existingProduct.inventory.variantStock = existingProduct.variants;
                }
            }

            // Cập nhật các trường khác của sản phẩm
            if (name) existingProduct.name = name;
            if (price) existingProduct.price = price;
            if (description) existingProduct.description = description;
            if (category) existingProduct.category = category;
            if (image) existingProduct.image = image;
            if (promotion) existingProduct.promotion = promotion;
            if (color) existingProduct.color = color;
            if (supplier) existingProduct.supplier = supplier;
            if (sizes) existingProduct.sizes = sizes;

            // Lưu sản phẩm đã cập nhật
            const updatedProduct = await existingProduct.save();

            res.status(200).json(updatedProduct);
        } catch (err) {
            console.log(err);
            res.status(500).json(err);
        }
    },

    searchCateByName: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        const name = req.query.name;

        try {
            const productList = await ProductModel.paginate({ name: { $regex: `.*${name}.*`, $options: 'i' } }, options);

            res.status(200).json({ data: productList });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    createReviews: async (req, res) => {
        try {
            const { comment, rating } = req.body;
            const { user } = req;
            const productId = req.params.id;

            // Kiểm tra xem người dùng đã đánh giá sản phẩm này chưa
            const existingReview = await ReviewModel.findOne({ user: user._id, product: productId });
            if (existingReview) {
                return res.status(201).json('Bạn đã đánh giá sản phẩm này');
            }

            // Tạo mới đánh giá sản phẩm
            const review = new ReviewModel({ user: user._id, product: productId, comment, rating });
            await review.save();

            res.status(201).json('thành công');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    },

    // Hàm tính cosine similarity giữa hai sản phẩm
    calculateCosineSimilarity: (product1, product2) => {
        // Chuyển đổi các đặc trưng của sản phẩm thành vector
        const vector1 = [product1.price, product1.quantity]; // Ví dụ: sử dụng giá và số lượng làm đặc trưng
        const vector2 = [product2.price, product2.quantity];

        // Tính tổng tích của hai vector
        let dotProduct = 0;
        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
        }

        // Tính độ dài của vector
        const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + Math.pow(value, 2), 0));
        const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + Math.pow(value, 2), 0));

        // Tính cosine similarity
        const similarity = dotProduct / (magnitude1 * magnitude2);
        return similarity;
    },

    // API khuyến nghị sản phẩm dựa trên sản phẩm đã chọn
    recommendProducts: async (req, res) => {
        try {
            const productId = req.params.id;

            // Tìm sản phẩm đã chọn trong CSDL
            const selectedProduct = await ProductModel.findById(productId);

            if (!selectedProduct) {
                return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
            }

            // Lấy tất cả sản phẩm khác trong CSDL
            const allProducts = await ProductModel.find({ _id: { $ne: productId } });

            // Tính toán cosine similarity giữa sản phẩm đã chọn và các sản phẩm khác
            const recommendations = allProducts.map((product) => ({
                product,
                similarity: calculateCosineSimilarity(selectedProduct, product),
            }));

            // Sắp xếp danh sách khuyến nghị theo độ tương đồng giảm dần
            recommendations.sort((a, b) => b.similarity - a.similarity);

            // Chỉ lấy top 5 sản phẩm khuyến nghị
            const topRecommendations = recommendations.slice(0, 5).map((item) => item.product);

            return res.json({ recommendations: topRecommendations });
        } catch (error) {
            console.error('Error recommending products:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ' });
        }
    },

    getSearchPrice: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;
        const minPrice = req.body.minPrice;
        const maxPrice = req.body.maxPrice;

        const query = {};

        if (minPrice !== undefined && maxPrice !== undefined) {
            query.$and = [
                { price: { $gte: minPrice } },
                { price: { $lte: maxPrice } }
            ];
        }

        const options = {
            page: page,
            limit: limit,
            populate: 'category'
        };

        try {
            const products = await ProductModel.paginate(query, options);
            res.status(200).json({ data: products });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    // Phương thức mới để tìm kiếm theo khoảng giá và danh mục
    getSearchPriceAndCategory: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;
        const minPrice = req.body.minPrice;
        const maxPrice = req.body.maxPrice;
        const categoryId = req.body.category;
        
        const query = {};
        
        // Thêm điều kiện lọc theo giá
        if (minPrice !== undefined && maxPrice !== undefined) {
            query.$and = [
                { price: { $gte: minPrice } },
                { price: { $lte: maxPrice } }
            ];
        }
        
        // Thêm điều kiện lọc theo danh mục nếu có
        if (categoryId) {
            query.category = categoryId;
        }
        
        const options = {
            page: page,
            limit: limit,
            populate: 'category'
        };
        
        try {
            const products = await ProductModel.paginate(query, options);
            res.status(200).json({ data: products });
        } catch (err) {
            console.error('Error searching by price and category:', err);
            res.status(500).json(err);
        }
    },

    // Thêm phương thức kiểm tra tồn kho biến thể
    checkVariantStock: async (req, res) => {
        try {
            const { productId, color, size, quantity } = req.body;
            
            const product = await ProductModel.findById(productId);
            
            if (!product) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
            }
            
            // Kiểm tra trong variants nếu có
            if (product.variants && product.variants.length > 0) {
                const variant = product.variants.find(
                    v => v.color === color && v.size === size
                );
                
                if (!variant) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'Không tìm thấy biến thể sản phẩm với màu sắc và kích thước đã chọn' 
                    });
                }
                
                const available = variant.quantity >= quantity;
                
                return res.status(200).json({
                    success: true,
                    available: available,
                    stock: variant.quantity
                });
            } 
            // Hoặc kiểm tra trong inventory.variantStock
            else if (product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0) {
                const variant = product.inventory.variantStock.find(
                    v => v.color === color && v.size === size
                );
                
                if (!variant) {
                    return res.status(404).json({ 
                        success: false, 
                        message: 'Không tìm thấy biến thể sản phẩm với màu sắc và kích thước đã chọn' 
                    });
                }
                
                const available = variant.quantity >= quantity;
                
                return res.status(200).json({
                    success: true,
                    available: available,
                    stock: variant.quantity
                });
            } else {
                // Nếu không có biến thể, kiểm tra số lượng tổng
                const available = product.quantity >= quantity;
                
                return res.status(200).json({
                    success: true,
                    available: available,
                    stock: product.quantity
                });
            }
        } catch (error) {
            console.error('Error checking variant stock:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    },
    
    // Cập nhật tồn kho biến thể
    updateVariantStock: async (req, res) => {
        try {
            const { productId, color, size, quantity } = req.body;
            
            const product = await ProductModel.findById(productId);
            
            if (!product) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
            }
            
            let updated = false;
            
            // Cập nhật trong variants nếu có
            if (product.variants && product.variants.length > 0) {
                for (const variant of product.variants) {
                    if (variant.color === color && variant.size === size) {
                        if (variant.quantity < quantity) {
                            return res.status(400).json({ 
                                success: false, 
                                message: 'Không đủ số lượng tồn kho' 
                            });
                        }
                        
                        variant.quantity -= quantity;
                        updated = true;
                        break;
                    }
                }
                
                if (updated) {
                    // Cập nhật tổng số lượng
                    product.quantity = product.variants.reduce((sum, v) => sum + v.quantity, 0);
                    
                    // Đồng bộ với inventory.variantStock nếu có
                    if (product.inventory && product.inventory.variantStock) {
                        product.inventory.variantStock = product.variants;
                    }
                    
                    await product.save();
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Đã cập nhật tồn kho thành công',
                        product: product
                    });
                }
            } 
            // Hoặc cập nhật trong inventory.variantStock
            else if (product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0) {
                for (const variant of product.inventory.variantStock) {
                    if (variant.color === color && variant.size === size) {
                        if (variant.quantity < quantity) {
                            return res.status(400).json({ 
                                success: false, 
                                message: 'Không đủ số lượng tồn kho' 
                            });
                        }
                        
                        variant.quantity -= quantity;
                        updated = true;
                        break;
                    }
                }
                
                if (updated) {
                    // Cập nhật tổng số lượng
                    product.quantity = product.inventory.variantStock.reduce((sum, v) => sum + v.quantity, 0);
                    
                    // Đồng bộ với variants nếu có
                    if (product.variants) {
                        product.variants = product.inventory.variantStock;
                    }
                    
                    await product.save();
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Đã cập nhật tồn kho thành công',
                        product: product
                    });
                }
            } 
            // Nếu không có biến thể, cập nhật số lượng tổng
            else if (product.quantity >= quantity) {
                product.quantity -= quantity;
                await product.save();
                
                return res.status(200).json({
                    success: true,
                    message: 'Đã cập nhật tồn kho thành công',
                    product: product
                });
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Không đủ số lượng tồn kho' 
                });
            }
            
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy biến thể sản phẩm với màu sắc và kích thước đã chọn' 
            });
        } catch (error) {
            console.error('Error updating variant stock:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    },
    
    // Lấy danh sách biến thể có sẵn
    getAvailableVariants: async (req, res) => {
        try {
            const productId = req.params.id;
            
            const product = await ProductModel.findById(productId);
            
            if (!product) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
            }
            
            let availableVariants = [];
            let availableColors = [];
            let availableSizes = [];
            
            // Lấy từ variants nếu có
            if (product.variants && product.variants.length > 0) {
                availableVariants = product.variants.filter(v => v.quantity > 0);
            } 
            // Hoặc lấy từ inventory.variantStock
            else if (product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0) {
                availableVariants = product.inventory.variantStock.filter(v => v.quantity > 0);
            }
            // Nếu không có biến thể, tạo biến thể từ color và sizes nếu có
            else if (product.color && product.sizes && product.color.length > 0 && product.sizes.length > 0) {
                const hasStock = product.quantity > 0;
                
                // Phân phối số lượng đều giữa các biến thể
                const variantCount = product.color.length * product.sizes.length;
                const quantityPerVariant = Math.floor(product.quantity / variantCount);
                let remainingQuantity = product.quantity % variantCount;
                
                for (const color of product.color) {
                    for (const size of product.sizes) {
                        let quantity = quantityPerVariant;
                        if (remainingQuantity > 0) {
                            quantity++;
                            remainingQuantity--;
                        }
                        
                        if (quantity > 0) {
                            availableVariants.push({
                                variantId: `${product._id}-${color}-${size}`,
                                color,
                                size,
                                quantity
                            });
                        }
                    }
                }
            }
            
            // Lấy danh sách màu sắc và kích thước có sẵn
            availableColors = [...new Set(availableVariants.map(v => v.color))];
            availableSizes = [...new Set(availableVariants.map(v => v.size))];
            
            return res.status(200).json({
                success: true,
                availableVariants,
                availableColors,
                availableSizes,
                product: {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    promotion: product.promotion,
                    image: product.image,
                    quantity: product.quantity
                }
            });
        } catch (error) {
            console.error('Error getting available variants:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    },
    
    // Lấy tất cả biến thể (có sẵn và hết hàng)
    getAllVariants: async (req, res) => {
        try {
            const productId = req.params.id;
            
            const product = await ProductModel.findById(productId);
            
            if (!product) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
            }
            
            let variants = [];
            
            // Lấy từ variants nếu có
            if (product.variants && product.variants.length > 0) {
                variants = product.variants;
            } 
            // Hoặc lấy từ inventory.variantStock
            else if (product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0) {
                variants = product.inventory.variantStock;
            } 
            // Nếu không có biến thể, tạo biến thể từ color và sizes nếu có
            else if (product.color && product.sizes && product.color.length > 0 && product.sizes.length > 0) {
                // Phân phối số lượng đều giữa các biến thể
                const variantCount = product.color.length * product.sizes.length;
                const quantityPerVariant = Math.floor(product.quantity / variantCount);
                let remainingQuantity = product.quantity % variantCount;
                
                for (const color of product.color) {
                    for (const size of product.sizes) {
                        let quantity = quantityPerVariant;
                        if (remainingQuantity > 0) {
                            quantity++;
                            remainingQuantity--;
                        }
                        
                        variants.push({
                            variantId: `${product._id}-${color}-${size}`,
                            color,
                            size,
                            quantity
                        });
                    }
                }
            }
            
            return res.status(200).json({
                success: true,
                variants,
                product: {
                    _id: product._id,
                    name: product.name,
                    price: product.price,
                    promotion: product.promotion,
                    image: product.image,
                    color: product.color,
                    sizes: product.sizes,
                    quantity: product.quantity
                }
            });
        } catch (error) {
            console.error('Error getting all variants:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    },

    // Phương thức lấy sản phẩm theo danh mục
    getProductByCategory: async (req, res) => {
        try {
            const categoryId = req.params.categoryId;
            const page = req.query.page || 1;
            const limit = req.query.limit || 10;
            
            const options = {
                page: page,
                limit: limit,
                populate: ['category', 'supplier']
            };
            
            // Kiểm tra danh mục có tồn tại không
            const category = await CategoryModel.findById(categoryId);
            
            if (!category) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Không tìm thấy danh mục' 
                });
            }
            
            const products = await ProductModel.paginate({ category: categoryId }, options);
            
            res.status(200).json({ 
                success: true,
                data: products,
                category: category
            });
        } catch (error) {
            console.error('Error getting products by category:', error);
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
        }
    }
};

module.exports = productController;