const axios = require('axios');
const ProductModel = require('../models/product');
const CategoryModel = require('../models/category');
const ReviewModel = require('../models/review');
const OrderModel = require('../models/order');
const Supplier = require('../models/supplier');
const jwt = require('jsonwebtoken');
const _const = require('../config/constant');

const calculateCosineSimilarity = (product1, product2) => {
    const product1Quantity = product1.variants ? 
        product1.variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0) : 0;
    
    const product2Quantity = product2.variants ? 
        product2.variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0) : 0;
    
    const vector1 = [product1.price, product1Quantity];
    const vector2 = [product2.price, product2Quantity];
  
    let dotProduct = 0;
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
    }
  
    const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + Math.pow(value, 2), 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + Math.pow(value, 2), 0));
  
    const similarity = dotProduct / (magnitude1 * magnitude2);
    return similarity;
};

const productController = {
    getAllProductsForChatBot : async (req, res) => {
        try{
            const products = await ProductModel.find();
            res.status(200).json({data : products})
        }catch(err){
            console.error(err);
            res.status(500);
        }
    },
    
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
            console.log('📦 [PRODUCT CONTROLLER] Getting product by ID');
            
            if (req.productData) {
                console.log('✅ [PRODUCT CONTROLLER] Returning product data from middleware');
                return res.status(200).json({
                    success: true,
                    ...req.productData
                });
            }
            
            console.log('⚠️ [PRODUCT CONTROLLER] Middleware data not found');
            return res.status(500).json({
                success: false,
                message: 'Server error: Product data not loaded'
            });
            
        } catch (err) {
            console.error('❌ [PRODUCT CONTROLLER] Error:', err);
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: err.message
            });
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

        let productVariants = [];
        
        if (variants && variants.length > 0) {
            productVariants = variants.map(variant => ({
                variantId: variant.variantId,
                color: variant.color,
                size: variant.size,
                quantity: parseInt(variant.quantity, 10) || 0
            }));
        }
        else if (color && sizes && color.length > 0 && sizes.length > 0) {
            const tempId = Date.now().toString();
            
            for (const c of color) {
                for (const s of sizes) {
                    const variantId = `${tempId}-${s}-${c.replace('#', '')}`;
                    
                    productVariants.push({
                        variantId,
                        color: c,
                        size: s,
                        quantity: 0
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
            variants: productVariants,
            inventory: {
                quantityOnHand: inventory?.quantityOnHand || 0,
                expirationDate: inventory?.expirationDate || null,
                variantStock: productVariants
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
            const productId = req.params.id;
            
            const product = await ProductModel.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Sản phẩm không tồn tại"
                });
            }

            // 1. Kiểm tra sản phẩm đã được bán chưa
            const orderCount = await OrderModel.countDocuments({
                'products.product': productId
            });

            if (orderCount > 0) {
                const recentOrders = await OrderModel.find({
                    'products.product': productId
                })
                .populate('user', 'username email')
                .select('_id user status createdAt')
                .sort({ createdAt: -1 })
                .limit(5);

                return res.status(400).json({
                    success: false,
                    message: "Không thể xóa sản phẩm này vì đã có khách hàng mua",
                    details: {
                        productName: product.name,
                        totalOrders: orderCount,
                        recentOrders: recentOrders.map(order => ({
                            orderId: order._id,
                            customerName: order.user?.username || 'N/A',
                            status: order.status,
                            orderDate: order.createdAt
                        })),
                        note: orderCount > 5 ? `Và ${orderCount - 5} đơn hàng khác` : null
                    }
                });
            }

            // 2. Kiểm tra sản phẩm có đang trong đợt khuyến mãi không
            try {
                const PROMOTION_SERVICE_URL = process.env.PROMOTION_SERVICE_URL || 'http://localhost:3400';
                const now = new Date();
                
                const response = await axios({
                    method: 'GET',
                    url: `${PROMOTION_SERVICE_URL}/api/promotions`,
                    params: {
                        loai: 'dot_giam_gia',
                        trangThai: 'active',
                        page: 1,
                        limit: 1000
                    }
                });

                if (response.data.success && response.data.data.docs) {
                    const activePromotions = response.data.data.docs.filter(promo => {
                        const isActive = promo.trangThai === 'active' &&
                                       new Date(promo.thoiGianBD) <= now &&
                                       new Date(promo.thoiGianKT) >= now;
                        
                        const hasProduct = promo.sanPhamApDung && 
                                         promo.sanPhamApDung.some(p => 
                                             p._id?.toString() === productId || 
                                             p.toString() === productId
                                         );
                        
                        return isActive && hasProduct;
                    });

                    if (activePromotions.length > 0) {
                        return res.status(400).json({
                            success: false,
                            message: "Không thể xóa sản phẩm này vì đang trong đợt khuyến mãi",
                            details: {
                                productName: product.name,
                                activePromotions: activePromotions.map(p => ({
                                    name: p.tenKhuyenMai,
                                    code: p.maKhuyenMai,
                                    discount: p.phanTramKhuyenMai,
                                    startDate: p.thoiGianBD,
                                    endDate: p.thoiGianKT
                                }))
                            }
                        });
                    }
                }
            } catch (promotionError) {
                console.error('❌ Error checking promotions on delete:', promotionError);
                // Không block việc xóa nếu không kết nối được promotion service
            }

            // 3. Nếu pass cả 2 điều kiện, cho phép xóa
            await ProductModel.findByIdAndDelete(productId);
            
            res.status(200).json({
                success: true,
                message: `Xóa sản phẩm "${product.name}" thành công`
            });

        } catch (err) {
            console.error("Lỗi khi xóa sản phẩm:", err);
            res.status(500).json({
                success: false,
                message: "Lỗi server khi xóa sản phẩm",
                error: err.message
            });
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
            
            if (existingProduct.inventory) {
                existingProduct.inventory.quantityOnHand = 0;
                existingProduct.inventory.expirationDate = inventory?.expirationDate || existingProduct.inventory.expirationDate;
            } else {
                existingProduct.inventory = {
                    quantityOnHand: 0,
                    expirationDate: inventory?.expirationDate || null,
                    variantStock: []
                };
            }

            if (variants && variants.length > 0) {
                const updatedVariants = variants.map(variant => ({
                    variantId: variant.variantId || `${id}-${variant.size}-${variant.color.replace('#', '')}`,
                    color: variant.color,
                    size: variant.size,
                    quantity: parseInt(variant.quantity, 10) || 0
                }));
                
                existingProduct.variants = updatedVariants;
                existingProduct.inventory.variantStock = updatedVariants;
            }
            else if ((color && color.length > 0) || (sizes && sizes.length > 0)) {
                const updatedColor = color || existingProduct.color || [];
                const updatedSizes = sizes || existingProduct.sizes || [];
                
                if (updatedColor.length > 0 && updatedSizes.length > 0) {
                    const newVariants = [];
                    
                    for (const c of updatedColor) {
                        for (const s of updatedSizes) {
                            const variantId = `${existingProduct._id}-${s}-${c.replace('#', '')}`;
                            
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

            if (existingProduct.quantity !== undefined) {
                delete existingProduct.quantity;
            }

            if (name) existingProduct.name = name;
            if (price) existingProduct.price = price;
            if (description) existingProduct.description = description;
            if (category) existingProduct.category = category;
            if (image) existingProduct.image = image;
            if (promotion) existingProduct.promotion = promotion;
            if (color) existingProduct.color = color;
            if (supplier) existingProduct.supplier = supplier;
            if (sizes) existingProduct.sizes = sizes;

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

            const existingReview = await ReviewModel.findOne({ user: user._id, product: productId });
            if (existingReview) {
                return res.status(201).json('Bạn đã đánh giá sản phẩm này');
            }

            const review = new ReviewModel({ user: user._id, product: productId, comment, rating });
            await review.save();

            res.status(201).json('thành công');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    },

    calculateCosineSimilarity: (product1, product2) => {
        const product1Quantity = product1.variants ? 
            product1.variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0) : 0;
        
        const product2Quantity = product2.variants ? 
            product2.variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0) : 0;
        
        const vector1 = [product1.price, product1Quantity];
        const vector2 = [product2.price, product2Quantity];

        let dotProduct = 0;
        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
        }

        const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + Math.pow(value, 2), 0));
        const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + Math.pow(value, 2), 0));

        const similarity = dotProduct / (magnitude1 * magnitude2);
        return similarity;
    },

    recommendProducts: async (req, res) => {
        try {
            const productId = req.params.id;

            const selectedProduct = await ProductModel.findById(productId);

            if (!selectedProduct) {
                return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
            }

            const allProducts = await ProductModel.find({ _id: { $ne: productId } });

            const recommendations = allProducts.map((product) => ({
                product,
                similarity: calculateCosineSimilarity(selectedProduct, product),
            }));

            recommendations.sort((a, b) => b.similarity - a.similarity);

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

    getSearchPriceAndCategory: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;
        const minPrice = req.body.minPrice;
        const maxPrice = req.body.maxPrice;
        const categoryId = req.body.category;
        
        const query = {};
        
        if (minPrice !== undefined && maxPrice !== undefined) {
            query.$and = [
                { price: { $gte: minPrice } },
                { price: { $lte: maxPrice } }
            ];
        }
        
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

    checkVariantStock: async (req, res) => {
        try {
            const { productId, color, size, quantity } = req.body;
            
            const product = await ProductModel.findById(productId);
            
            if (!product) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
            }
            
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
    
    updateVariantStock: async (req, res) => {
        try {
            const { productId, color, size, quantity } = req.body;
            
            const product = await ProductModel.findById(productId);
            
            if (!product) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
            }
            
            let updated = false;
            
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
            
            if (product.variants && product.variants.length > 0) {
                availableVariants = product.variants.filter(v => v.quantity > 0);
            } 
            else if (product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0) {
                availableVariants = product.inventory.variantStock.filter(v => v.quantity > 0);
            }
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
    
    getAllVariants: async (req, res) => {
        try {
            const productId = req.params.id;
            
            const product = await ProductModel.findById(productId);
            
            if (!product) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
            }
            
            let variants = [];
            
            if (product.variants && product.variants.length > 0) {
                variants = product.variants;
            } 
            else if (product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0) {
                variants = product.inventory.variantStock;
            } 
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
    },

    // 🔥 NEW: Kiểm tra khả năng chỉnh sửa sản phẩm
    checkProductEditability: async (req, res) => {
        try {
            const productId = req.params.id;
            
            // 1. Kiểm tra sản phẩm có tồn tại không
            const product = await ProductModel.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy sản phẩm'
                });
            }

            // 2. Kiểm tra sản phẩm đã được bán chưa
            const soldCount = await OrderModel.countDocuments({
                'products.product': productId,
                status: { $in: ['approved', 'final'] }
            });

            const hasSold = soldCount > 0;

            // 3. Kiểm tra sản phẩm có đang trong đợt khuyến mãi không
            let hasActivePromotion = false;
            let activePromotions = [];
            
            try {
                const PROMOTION_SERVICE_URL = process.env.PROMOTION_SERVICE_URL || 'http://localhost:3400';
                const now = new Date();
                
                const response = await axios({
                    method: 'GET',
                    url: `${PROMOTION_SERVICE_URL}/api/promotions`,
                    params: {
                        loai: 'dot_giam_gia',
                        trangThai: 'active',
                        page: 1,
                        limit: 1000
                    }
                });

                if (response.data.success && response.data.data.docs) {
                    activePromotions = response.data.data.docs.filter(promo => {
                        const isActive = promo.trangThai === 'active' &&
                                       new Date(promo.thoiGianBD) <= now &&
                                       new Date(promo.thoiGianKT) >= now;
                        
                        const hasProduct = promo.sanPhamApDung && 
                                         promo.sanPhamApDung.some(p => 
                                             p._id?.toString() === productId || 
                                             p.toString() === productId
                                         );
                        
                        return isActive && hasProduct;
                    });
                    
                    hasActivePromotion = activePromotions.length > 0;
                }
            } catch (promotionError) {
                console.error('❌ Error checking promotions:', promotionError);
            }

            // 4. Xác định những trường có thể chỉnh sửa theo yêu cầu mới
            const editability = {
                // Nếu đã bán: chỉ được sửa một số trường
                canEditName: true,                          // ✅ Luôn được sửa tên
                canEditPrice: !hasSold,                     // ❌ Không được sửa giá nếu đã bán
                canEditImage: true,                          // ✅ Luôn được đổi ảnh
                canEditDescription: true,                    // ✅ Luôn được sửa mô tả
                canEditCategory: true,                       // ✅ Luôn được đổi danh mục
                canEditSupplier: true,                       // ✅ Luôn được đổi thương hiệu
                canAddColors: hasSold,                       // ✅ Được thêm màu mới nếu đã bán
                canRemoveColors: !hasSold,                   // ❌ Không được xóa màu cũ nếu đã bán
                canModifyExistingColors: !hasSold,           // ❌ Không được sửa màu cũ nếu đã bán
                canAddSizes: hasSold,                        // ✅ Được thêm size mới nếu đã bán
                canRemoveSizes: !hasSold,                    // ❌ Không được xóa size cũ nếu đã bán
                canModifyExistingSizes: !hasSold,            // ❌ Không được sửa size cũ nếu đã bán
                canEditVariantQuantity: true,                // ✅ Luôn được sửa số lượng tồn kho
                
                // Điều kiện xóa
                canDelete: !hasSold && !hasActivePromotion   // ❌ Không xóa nếu đã bán HOẶC đang KM
            };

            // Lưu màu và size gốc để frontend check
            const originalColors = product.color || [];
            const originalSizes = product.sizes || [];

            console.log(`🔍 Product editability check for ${productId}:`, {
                hasSold,
                hasActivePromotion,
                editability,
                activePromotionsCount: activePromotions.length
            });

            res.status(200).json({
                success: true,
                data: {
                    productId,
                    productName: product.name,
                    hasSold,
                    soldCount,
                    hasActivePromotion,
                    activePromotions: activePromotions.map(p => ({
                        id: p._id,
                        name: p.tenKhuyenMai,
                        code: p.maKhuyenMai,
                        discount: p.phanTramKhuyenMai,
                        startDate: p.thoiGianBD,
                        endDate: p.thoiGianKT
                    })),
                    editability,
                    originalData: {
                        colors: originalColors,
                        sizes: originalSizes,
                        price: product.price
                    },
                    restrictions: {
                        price: hasSold ? 'Sản phẩm đã được bán - không thể thay đổi giá' : null,
                        colors: hasSold ? 'Sản phẩm đã được bán - chỉ được thêm màu mới, không được xóa/sửa màu cũ' : null,
                        sizes: hasSold ? 'Sản phẩm đã được bán - chỉ được thêm size mới, không được xóa/sửa size cũ' : null,
                        delete: hasSold ? 'Sản phẩm đã được bán' : (hasActivePromotion ? 'Sản phẩm đang trong đợt khuyến mãi' : null)
                    }
                }
            });

        } catch (error) {
            console.error('❌ Error checking product editability:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi kiểm tra khả năng chỉnh sửa sản phẩm',
                error: error.message
            });
        }
    }
};

module.exports = productController;