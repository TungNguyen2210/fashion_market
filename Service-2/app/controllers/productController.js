const ProductModel = require('../models/product');
const CategoryModel = require('../models/category');
const ReviewModel = require('../models/review');
const Supplier = require('../models/supplier');
const jwt = require('jsonwebtoken');
const _const = require('../config/constant');

const calculateCosineSimilarity = (product1, product2) => {
    // Tính toán tổng số lượng từ variants thay vì sử dụng trường quantity
    const product1Quantity = product1.variants ? 
        product1.variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0) : 0;
    
    const product2Quantity = product2.variants ? 
        product2.variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0) : 0;
    
    // Chuyển đổi các đặc trưng của sản phẩm thành vector
    const vector1 = [product1.price, product1Quantity]; // Sử dụng số lượng từ variants
    const vector2 = [product2.price, product2Quantity];
  
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
            slide,
            supplier,
            inventory,
            color,
            sizes,
            variants
        } = req.body;

        // Nếu đã có biến thể được gửi đến, sử dụng chúng trực tiếp
        let productVariants = [];
        
        if (variants && variants.length > 0) {
            // Sử dụng biến thể đã được gửi đến, không phân phối lại số lượng
            productVariants = variants.map(variant => ({
                variantId: variant.variantId,
                color: variant.color,
                size: variant.size,
                quantity: parseInt(variant.quantity, 10) || 0 // Đảm bảo số lượng là số nguyên
            }));
        }
        // Nếu không có biến thể nhưng có màu sắc và kích thước, tạo biến thể mới
        else if (color && sizes && color.length > 0 && sizes.length > 0) {
            const tempId = Date.now().toString();
            
            // Tạo các biến thể cho tất cả các tổ hợp màu sắc và kích thước
            for (const c of color) {
                for (const s of sizes) {
                    const variantId = `${tempId}-${s}-${c.replace('#', '')}`;
                    
                    productVariants.push({
                        variantId,
                        color: c,
                        size: s,
                        quantity: 0 // Mặc định là 0
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
            slide,
            supplier,
            color,
            sizes,
            variants: productVariants, // Sử dụng biến thể đã xử lý
            inventory: {
                quantityOnHand: inventory?.quantityOnHand || 0,
                expirationDate: inventory?.expirationDate || null,
                variantStock: productVariants // Lưu biến thể trong inventory 
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
                existingProduct.inventory.quantityOnHand = 0; // Không cần thiết, sẽ tính từ variants
                existingProduct.inventory.expirationDate = inventory?.expirationDate || existingProduct.inventory.expirationDate;
            } else {
                existingProduct.inventory = {
                    quantityOnHand: 0,
                    expirationDate: inventory?.expirationDate || null,
                    variantStock: []
                };
            }

            // Cập nhật biến thể nếu được cung cấp
            if (variants && variants.length > 0) {
                // Sử dụng biến thể đã được gửi đến, không phân phối lại số lượng
                const updatedVariants = variants.map(variant => ({
                    variantId: variant.variantId || `${id}-${variant.size}-${variant.color.replace('#', '')}`,
                    color: variant.color,
                    size: variant.size,
                    quantity: parseInt(variant.quantity, 10) || 0 // Đảm bảo số lượng là số nguyên
                }));
                
                existingProduct.variants = updatedVariants;
                existingProduct.inventory.variantStock = updatedVariants;
            }
            // Nếu không có biến thể nhưng có thay đổi về color hoặc sizes, tạo biến thể mới
            else if ((color && color.length > 0) || (sizes && sizes.length > 0)) {
                const updatedColor = color || existingProduct.color || [];
                const updatedSizes = sizes || existingProduct.sizes || [];
                
                if (updatedColor.length > 0 && updatedSizes.length > 0) {
                    const newVariants = [];
                    
                    // Tạo biến thể mới
                    for (const c of updatedColor) {
                        for (const s of updatedSizes) {
                            const variantId = `${existingProduct._id}-${s}-${c.replace('#', '')}`;
                            
                            // Tìm biến thể hiện có nếu có
                            const existingVariant = existingProduct.variants?.find(
                                v => v.color === c && v.size === s
                            );
                            
                            newVariants.push({
                                variantId,
                                color: c,
                                size: s,
                                quantity: existingVariant ? parseInt(existingVariant.quantity, 10) || 0 : 0
                            });
                        }
                    }
                    
                    existingProduct.variants = newVariants;
                    existingProduct.inventory.variantStock = newVariants;
                }
            }

            // Xóa trường quantity (nếu có)
            if (existingProduct.quantity !== undefined) {
                delete existingProduct.quantity;
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

    // Hàm tính cosine similarity giữa hai sản phẩm - cập nhật để sử dụng số lượng từ variants
    calculateCosineSimilarity: (product1, product2) => {
        // Tính tổng số lượng từ variants thay vì sử dụng trường quantity
        const product1Quantity = product1.variants ? 
            product1.variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0) : 0;
        
        const product2Quantity = product2.variants ? 
            product2.variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0) : 0;
        
        // Chuyển đổi các đặc trưng của sản phẩm thành vector
        const vector1 = [product1.price, product1Quantity];
        const vector2 = [product2.price, product2Quantity];

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
                return res.status(404).json({ 
                    success: false, 
                    message: 'Không tìm thấy thông tin về kho của sản phẩm này' 
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
                for (const color of product.color) {
                    for (const size of product.sizes) {
                        availableVariants.push({
                            variantId: `${product._id}-${color}-${size}`,
                            color,
                            size,
                            quantity: 0
                        });
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
                    image: product.image
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
                for (const color of product.color) {
                    for (const size of product.sizes) {
                        variants.push({
                            variantId: `${product._id}-${color}-${size}`,
                            color,
                            size,
                            quantity: 0
                        });
                    }
                }
            }
            
            // Tính tổng số lượng từ variants
            const totalQuantity = variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0);
            
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
                    totalQuantity: totalQuantity
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