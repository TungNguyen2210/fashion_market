const OrderModel = require('../models/order');
const _const = require('../config/constant');
const jwt = require('jsonwebtoken');
const Product = require('../models/product');
const User = require('../models/user');
const nodemailer = require('nodemailer');
const axios = require('axios');

// 🔥 Config URL của Service-3
const PROMOTION_SERVICE_URL = process.env.PROMOTION_SERVICE_URL || 'http://localhost:3400';

// 🔥 Helper function để call API Service-3
const callPromotionAPI = async (endpoint, method = 'GET', data = null) => {
    try {
        const config = {
            method,
            url: `${PROMOTION_SERVICE_URL}/api/promotions${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        console.log(`🔗 Calling Promotion API: ${config.method} ${config.url}`);
        
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`❌ Promotion API Error [${endpoint}]:`, error.response?.data || error.message);
        throw new Error(`Promotion service error: ${error.response?.data?.message || error.message}`);
    }
};

// 🔥 Helper function để lấy thông tin promotion cho email
const getPromotionDetailsForEmail = async (voucherPromotionID, freeShipPromotionID, productPromotionIDs) => {
    try {
        const allPromotionIDs = [
            voucherPromotionID,
            freeShipPromotionID,
            ...productPromotionIDs
        ].filter(Boolean);

        if (allPromotionIDs.length === 0) {
            return {
                voucher: null,
                freeShip: null,
                productPromotions: []
            };
        }

        // 🔥 Call API để lấy batch promotions
        const result = await callPromotionAPI('/batch', 'POST', { ids: allPromotionIDs });
        
        if (!result.success) {
            throw new Error('Failed to get promotion details');
        }

        const promotions = result.data;

        return {
            voucher: voucherPromotionID ? promotions.find(p => p._id === voucherPromotionID) : null,
            freeShip: freeShipPromotionID ? promotions.find(p => p._id === freeShipPromotionID) : null,
            productPromotions: productPromotionIDs.map(id => promotions.find(p => p._id === id)).filter(Boolean)
        };
    } catch (error) {
        console.error('❌ Error getting promotion details for email:', error);
        return {
            voucher: null,
            freeShip: null,
            productPromotions: []
        };
    }
};

const orderController = {
    getAllOrder: async (req, res) => {
        try {
            const page = req.body.page || 1;
            const limit = req.body.limit || 10;

            const options = {
                page: page,
                limit: limit,
                populate: [
                    { path: 'user', select: 'username email' },
                    { path: 'products.product' }
                    // 🔥 Removed promotion populates - will fetch via API
                ]
            };

            const orderList = await OrderModel.paginate({}, options);
            
            // 🔥 Fetch promotion details via API for each order
            for (const order of orderList.docs) {
                try {
                    const promotionIDs = [
                        order.voucherPromotionID,
                        order.freeShipPromotionID,
                        ...order.products.map(p => p.productPromotionID)
                    ].filter(Boolean);

                    if (promotionIDs.length > 0) {
                        const promotionResult = await callPromotionAPI('/batch', 'POST', { ids: promotionIDs });
                        if (promotionResult.success) {
                            const promotions = promotionResult.data;
                            
                            // Attach promotion data
                            if (order.voucherPromotionID) {
                                order.voucherPromotion = promotions.find(p => p._id === order.voucherPromotionID);
                            }
                            if (order.freeShipPromotionID) {
                                order.freeShipPromotion = promotions.find(p => p._id === order.freeShipPromotionID);
                            }
                            
                            // Attach product promotion data
                            order.products.forEach(product => {
                                if (product.productPromotionID) {
                                    product.productPromotion = promotions.find(p => p._id === product.productPromotionID);
                                }
                            });
                        }
                    }
                } catch (promotionError) {
                    console.error('❌ Error fetching promotions for order:', order._id, promotionError);
                }
            }

            res.status(200).json({ data: orderList });
        } catch (err) {
            console.log(err)
            res.status(200).json(err);
        }
    },

    getOrderById: (req, res) => {
        try {
            res.status(200).json(res.order);
        } catch (err) {
            res.status(500).json(err);
        }
    },

    createOrder: async (req, res) => {
        try {
            console.log("🛒 Dữ liệu đơn hàng nhận được:", JSON.stringify(req.body, null, 2));
            
            const {
                userId,
                products,
                address,
                billing = 'cod',
                description = '',
                status = 'pending',
                
                // Thông tin promotion IDs
                voucherPromotionID,
                freeShipPromotionID,
                
                // Thông tin tính toán
                orderTotal,
                discountAmount = 0,
                shippingFee = 0,
                finalAmount,
                
                // Thông tin shipping (từ frontend)
                distanceKm,
                shipping
            } = req.body;

            const insufficientQuantityProducts = [];
            const processedProducts = [];
            
            // Validate dữ liệu cơ bản
            if (!products || products.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Không có sản phẩm trong đơn hàng'
                });
            }

            console.log("💰 Thông tin promotion và tính toán:", {
                voucherPromotionID,
                freeShipPromotionID,
                orderTotal,
                discountAmount,
                shippingFee,
                finalAmount
            });

            // Xử lý từng sản phẩm
            for (const productItem of products) {
                const productId = productItem.product;
                const quantity = productItem.quantity;
                const size = productItem.size || null;
                const color = productItem.color || null;
                const variantId = productItem.variantId || null;
                const productPromotionID = productItem.productPromotionID || null;

                console.log(`🔍 Xử lý sản phẩm: ${productId}, size: ${size}, color: ${color}, variantId: ${variantId}, promotionID: ${productPromotionID}`);

                // Tìm sản phẩm trong database
                const product = await Product.findById(productId);

                if (!product) {
                    console.log(`❌ Không tìm thấy sản phẩm: ${productId}`);
                    insufficientQuantityProducts.push({
                        productId,
                        quantity: 0,
                    });
                    continue;
                }

                // Kiểm tra số lượng tồn kho (logic giống như cũ)
                let variantQuantity = 0;
                let variant = null;

                // Tìm variant theo các cách khác nhau
                if (variantId && product.variants && product.variants.length > 0) {
                    variant = product.variants.find(v => v.variantId === variantId);
                    if (variant) {
                        variantQuantity = variant.quantity;
                        console.log(`✅ Tìm thấy biến thể trong variants với số lượng: ${variantQuantity}`);
                    }
                }

                if (!variant && variantId && product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0) {
                    variant = product.inventory.variantStock.find(v => v.variantId === variantId);
                    if (variant) {
                        variantQuantity = variant.quantity;
                        console.log(`✅ Tìm thấy biến thể trong inventory.variantStock với số lượng: ${variantQuantity}`);
                    }
                }

                if (!variant) {
                    if (product.variants && product.variants.length > 0 && (size || color)) {
                        variant = product.variants.find(v => 
                            (!size || v.size === size) && 
                            (!color || v.color === color)
                        );
                        
                        if (variant) {
                            variantQuantity = variant.quantity;
                            console.log(`✅ Tìm thấy biến thể trong variants bằng size/color với số lượng: ${variantQuantity}`);
                        }
                    }
                    
                    if (!variant && product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0 && (size || color)) {
                        variant = product.inventory.variantStock.find(v => 
                            (!size || v.size === size) && 
                            (!color || v.color === color)
                        );
                        
                        if (variant) {
                            variantQuantity = variant.quantity;
                            console.log(`✅ Tìm thấy biến thể trong inventory.variantStock bằng size/color với số lượng: ${variantQuantity}`);
                        }
                    }
                }

                if (!variant) {
                    console.log(`❌ Không tìm thấy thông tin biến thể cho sản phẩm: ${productId}`);
                    insufficientQuantityProducts.push({
                        productId,
                        variantId: variantId || null,
                        size: size || null,
                        color: color || null,
                        availableQuantity: 0,
                        requestedQuantity: quantity
                    });
                    continue;
                }

                if (variantQuantity < quantity) {
                    console.log(`❌ Không đủ số lượng cho sản phẩm: ${productId}, biến thể: ${variantId || 'none'}, Có sẵn: ${variantQuantity}, Yêu cầu: ${quantity}`);
                    insufficientQuantityProducts.push({
                        productId,
                        variantId: variantId || null,
                        size: size || null,
                        color: color || null,
                        availableQuantity: variantQuantity,
                        requestedQuantity: quantity
                    });
                    continue;
                }

                // Thêm vào danh sách sản phẩm đã xử lý
                processedProducts.push({
                    product: productId,
                    quantity,
                    price: productItem.price,
                    size: size,
                    color: color,
                    variantId: variantId,
                    productPromotionID: productPromotionID 
                });
                
                console.log(`✅ Đã thêm vào sản phẩm đã xử lý với promotionID: ${productPromotionID}`);
            }

            if (insufficientQuantityProducts.length > 0) {
                console.log("❌ Sản phẩm không đủ số lượng:", insufficientQuantityProducts);
                return res.status(200).json({
                    error: 'Insufficient quantity for one or more products.',
                    insufficientQuantityProducts,
                });
            }

            const calculatedFinalAmount = finalAmount || (orderTotal - discountAmount + shippingFee);

            console.log("📊 Tính toán cuối cùng:", {
                orderTotal,
                discountAmount,
                shippingFee,
                calculatedFinalAmount
            });

            const order = new OrderModel({
                user: userId,
                products: processedProducts,
                
                address,
                billing,
                description,
                status,
                
                voucherPromotionID: voucherPromotionID || null,
                freeShipPromotionID: freeShipPromotionID || null,
                
                orderTotal,
                discountAmount,
                shippingFee,
                finalAmount: calculatedFinalAmount
            });

            console.log("📦 Đã tạo đơn hàng với promotion IDs");

            // Cập nhật số lượng sản phẩm (logic giống như cũ)
            for (const productItem of processedProducts) {
                const productId = productItem.product;
                const quantity = productItem.quantity;
                const variantId = productItem.variantId;
                const size = productItem.size;
                const color = productItem.color;
                
                if (variantId) {
                    const variantsResult = await Product.updateOne(
                        { _id: productId, "variants.variantId": variantId },
                        { $inc: { "variants.$.quantity": -quantity } }
                    );
                    
                    console.log(`📉 Cập nhật số lượng trong variants: ${JSON.stringify(variantsResult)}`);
                    
                    const variantStockResult = await Product.updateOne(
                        { _id: productId, "inventory.variantStock.variantId": variantId },
                        { $inc: { "inventory.variantStock.$.quantity": -quantity } }
                    );
                    
                    console.log(`📉 Cập nhật số lượng trong variantStock: ${JSON.stringify(variantStockResult)}`);
                } 
                else if (size || color) {
                    if (size && color) {
                        await Product.updateOne(
                            { 
                                _id: productId, 
                                "variants.size": size, 
                                "variants.color": color 
                            },
                            { $inc: { "variants.$.quantity": -quantity } }
                        );
                        
                        await Product.updateOne(
                            { 
                                _id: productId, 
                                "inventory.variantStock.size": size, 
                                "inventory.variantStock.color": color 
                            },
                            { $inc: { "inventory.variantStock.$.quantity": -quantity } }
                        );
                    }
                    else if (size) {
                        await Product.updateOne(
                            { _id: productId, "variants.size": size },
                            { $inc: { "variants.$.quantity": -quantity } }
                        );
                        
                        await Product.updateOne(
                            { _id: productId, "inventory.variantStock.size": size },
                            { $inc: { "inventory.variantStock.$.quantity": -quantity } }
                        );
                    }
                    else if (color) {
                        await Product.updateOne(
                            { _id: productId, "variants.color": color },
                            { $inc: { "variants.$.quantity": -quantity } }
                        );
                        
                        await Product.updateOne(
                            { _id: productId, "inventory.variantStock.color": color },
                            { $inc: { "inventory.variantStock.$.quantity": -quantity } }
                        );
                    }
                }
            }

            const savedOrder = await order.save();
            console.log("✅ Đơn hàng đã được lưu thành công:", savedOrder._id);

            // 🔥 Cập nhật số lượng đã sử dụng cho các promotion qua API
            try {
                if (voucherPromotionID) {
                    await callPromotionAPI(`/${voucherPromotionID}/increment-usage`, 'PATCH');
                    console.log(`✅ Đã cập nhật số lượng sử dụng cho voucher: ${voucherPromotionID}`);
                }

                if (freeShipPromotionID) {
                    await callPromotionAPI(`/${freeShipPromotionID}/increment-usage`, 'PATCH');
                    console.log(`✅ Đã cập nhật số lượng sử dụng cho freeship: ${freeShipPromotionID}`);
                }

                // Cập nhật cho product promotions
                const productPromotionIDs = processedProducts
                    .filter(p => p.productPromotionID)
                    .map(p => p.productPromotionID);
                
                if (productPromotionIDs.length > 0) {
                    for (const promotionId of productPromotionIDs) {
                        await callPromotionAPI(`/${promotionId}/increment-usage`, 'PATCH');
                    }
                    console.log(`✅ Đã cập nhật số lượng sử dụng cho ${productPromotionIDs.length} product promotion`);
                }
            } catch (promotionError) {
                console.error('❌ Error updating promotion usage:', promotionError);
                // Không throw error để không làm fail việc tạo order
            }

            // Gửi email thông báo (với thông tin promotion chi tiết)
            try {
                const customer = await User.findById(userId);
                console.log("👤 Tìm thấy khách hàng:", customer ? customer.email : "Không tìm thấy khách hàng");
                
                if (customer && customer.email) {
                    // 🔥 Lấy thông tin promotion để hiển thị trong email qua API
                    const promotionInfo = await getPromotionDetailsForEmail(
                        voucherPromotionID, 
                        freeShipPromotionID, 
                        processedProducts.filter(p => p.productPromotionID).map(p => p.productPromotionID)
                    );

                    const transporter = nodemailer.createTransporter({
                        host: 'smtp.gmail.com',
                        port: 587,
                        secure: false,
                        auth: {
                            user: 'h5studiogl@gmail.com',
                            pass: 'ubqq hfra cduj tlnq',
                        },
                    });

                    // Tạo nội dung chi tiết sản phẩm
                    let productsHtml = '';
                    for (const item of processedProducts) {
                        const productDetail = await Product.findById(item.product);
                        const productPromotion = promotionInfo.productPromotions.find(p => 
                            p._id.toString() === item.productPromotionID?.toString()
                        );
                        
                        productsHtml += `
                            <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                                <p><strong>${productDetail ? productDetail.name : 'Sản phẩm'}</strong> x ${item.quantity}</p>
                                <p>Giá: ${item.price.toLocaleString()} VND</p>
                                ${productPromotion ? `<p>🎁 Khuyến mãi: ${productPromotion.tenKhuyenMai}</p>` : ''}
                                ${item.size ? `<p>Kích thước: ${item.size}</p>` : ''}
                                ${item.color ? `<p>Màu sắc: ${item.color}</p>` : ''}
                            </div>
                        `;
                    }

                    // Tạo thông tin chi tiết về giá
                    const priceBreakdown = `
                        <h3>Chi tiết thanh toán:</h3>
                        <p>Tạm tính: ${orderTotal.toLocaleString()} VND</p>
                        ${discountAmount > 0 ? `<p>🎫 Giảm giá: -${discountAmount.toLocaleString()} VND</p>` : ''}
                        ${promotionInfo.voucher ? `<p>Voucher: ${promotionInfo.voucher.tenKhuyenMai}</p>` : ''}
                        ${shippingFee > 0 ? `<p>Phí vận chuyển: ${shippingFee.toLocaleString()} VND</p>` : ''}
                        ${promotionInfo.freeShip ? `<p>🚚 Miễn phí vận chuyển: ${promotionInfo.freeShip.tenKhuyenMai}</p>` : ''}
                        <p><strong>Tổng cộng: ${calculatedFinalAmount.toLocaleString()} VND</strong></p>
                    `;

                    const mailOptions = {
                        from: '"MicroMarket" <h5studiogl@gmail.com>',
                        to: customer.email,
                        subject: 'Xác nhận đơn hàng của bạn tại MicroMarket',
                        html: `
                            <h1>Cảm ơn bạn đã đặt hàng!</h1>
                            <p>Đơn hàng với mã số <strong>${savedOrder._id}</strong> của bạn đã được đặt thành công.</p>
                            
                            <h2>Chi tiết đơn hàng:</h2>
                            ${productsHtml}
                            
                            ${priceBreakdown}
                            
                            <p>Phương thức thanh toán: ${savedOrder.billing === 'cod' ? 'Thanh toán khi nhận hàng' : 'PayPal'}</p>
                            <p>Địa chỉ giao hàng: ${savedOrder.address}</p>
                            
                            <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng bắt đầu được giao.</p>
                            <p>Cảm ơn bạn đã mua sắm tại MicroMarket!</p>
                        `,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('❌ Lỗi gửi email:', error);
                        } else {
                            console.log('✅ Email đã gửi: ' + info.response);
                        }
                    });
                }
            } catch (emailError) {
                console.error('❌ Không thể gửi email xác nhận đơn hàng:', emailError);
            }

            // Trả về response
            res.status(200).json({
                success: true,
                data: {
                    orderId: savedOrder._id,
                    orderTotal: savedOrder.orderTotal,
                    discountAmount: savedOrder.discountAmount,
                    shippingFee: savedOrder.shippingFee,
                    finalAmount: savedOrder.finalAmount,
                    status: savedOrder.status
                },
                message: 'Đặt hàng thành công'
            });

        } catch (err) {
            console.log("❌ Lỗi tạo đơn hàng:", err);
            res.status(500).json({
                success: false,
                message: err.message,
                error: err
            });
        }
    },

    deleteOrder: async (req, res) => {
        try {
            const orderList = await OrderModel.findByIdAndDelete(req.params.id);
            if (!orderList) {
                return res.status(200).json("Order does not exist");
            }
            res.status(200).json("Delete order success");
        } catch (err) {
            res.status(500).json(err);
        }
    },

    updateOrder: async (req, res) => {
        const id = req.params.id;
        const { user, products, address, orderTotal, billing, description, status } = req.body;

        try {
            const orderList = await OrderModel.findByIdAndUpdate(
                id, 
                { status, description, address }, 
                { new: true }
            );
            
            if (!orderList) {
                return res.status(404).json({ message: 'Order not found' });
            }
            
            res.status(200).json(orderList);
        } catch (err) {
            res.status(500).json(err);
        }
    },

    searchOrderByName: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
            populate: [
                { path: 'user', select: 'username email' },
                { path: 'products.product' }
                // 🔥 Removed promotion populates - will fetch via API
            ]
        };

        const name = req.query.name;

        try {
            const orderList = await OrderModel.paginate(
                { billing: { $regex: `.*${name}.*`, $options: 'i' } }, 
                options
            );

            // 🔥 Fetch promotion details via API for each order
            for (const order of orderList.docs) {
                try {
                    const promotionIDs = [
                        order.voucherPromotionID,
                        order.freeShipPromotionID,
                        ...order.products.map(p => p.productPromotionID)
                    ].filter(Boolean);

                    if (promotionIDs.length > 0) {
                        const promotionResult = await callPromotionAPI('/batch', 'POST', { ids: promotionIDs });
                        if (promotionResult.success) {
                            const promotions = promotionResult.data;
                            
                            // Attach promotion data
                            if (order.voucherPromotionID) {
                                order.voucherPromotion = promotions.find(p => p._id === order.voucherPromotionID);
                            }
                            if (order.freeShipPromotionID) {
                                order.freeShipPromotion = promotions.find(p => p._id === order.freeShipPromotionID);
                            }
                            
                            // Attach product promotion data
                            order.products.forEach(product => {
                                if (product.productPromotionID) {
                                    product.productPromotion = promotions.find(p => p._id === product.productPromotionID);
                                }
                            });
                        }
                    }
                } catch (promotionError) {
                    console.error('❌ Error fetching promotions for order:', order._id, promotionError);
                }
            }

            res.status(200).json({ data: orderList });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // 🔥 FIXED getOrderByUser function - Remove populate, use API calls
    getOrderByUser: async (req, res) => {
        try {
            console.log("🔍 Headers received:", req.headers.authorization);
            
            // ✅ Check if authorization header exists
            if (!req.headers.authorization) {
                return res.status(401).json({
                    success: false,
                    message: 'Missing authorization header',
                    data: []
                });
            }
            
            // ✅ Handle both Bearer token and direct token
            let token = req.headers.authorization;
            if (token.startsWith('Bearer ')) {
                token = token.slice(7); // Remove "Bearer " prefix
            }
            
            console.log("🎯 Token to verify:", token.substring(0, 20) + "...");
            
            const decodedToken = jwt.verify(token, _const.JWT_ACCESS_KEY);
            console.log("✅ Decoded token:", decodedToken.user._id);
            
            // 🔥 Fetch orders without promotion populate
            const orders = await OrderModel.find({ user: decodedToken.user._id })
                .populate('products.product')
                .populate("user", "username")
                // 🔥 Removed all promotion populates
                .sort({ createdAt: -1 });
                
            console.log(`📦 Found ${orders.length} orders for user`);
            
            // 🔥 Fetch promotion details for all orders via API
            for (const order of orders) {
                try {
                    const promotionIDs = [
                        order.voucherPromotionID,
                        order.freeShipPromotionID,
                        ...order.products.map(p => p.productPromotionID)
                    ].filter(Boolean);

                    if (promotionIDs.length > 0) {
                        const promotionResult = await callPromotionAPI('/batch', 'POST', { ids: promotionIDs });
                        if (promotionResult.success) {
                            const promotions = promotionResult.data;
                            
                            // 🔥 Manually attach promotion data to order object
                            if (order.voucherPromotionID) {
                                order._doc.voucherPromotion = promotions.find(p => p._id === order.voucherPromotionID.toString());
                            }
                            if (order.freeShipPromotionID) {
                                order._doc.freeShipPromotion = promotions.find(p => p._id === order.freeShipPromotionID.toString());
                            }
                            
                            // Attach product promotion data
                            order.products.forEach(product => {
                                if (product.productPromotionID) {
                                    product._doc.productPromotion = promotions.find(p => p._id === product.productPromotionID.toString());
                                }
                            });
                        }
                    }
                } catch (promotionError) {
                    console.error('❌ Error fetching promotions for order:', order._id, promotionError);
                    // Continue without promotion data
                }
            }
            
            // ✅ Always return consistent JSON structure
            res.status(200).json({ 
                success: true,
                data: orders,
                count: orders.length
            });
            
        } catch (err) {
            console.error("❌ getOrderByUser error:", err.message);
            
            // ✅ Return JSON error response instead of text
            if (err.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token',
                    data: [],
                    error: err.message
                });
            }
            
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired',
                    data: [],
                    error: err.message
                });
            }
            
            // Generic server error
            res.status(500).json({
                success: false,
                message: 'Server error while fetching orders',
                data: [],
                error: err.message
            });
        }
    },
    
    // Đánh giá đơn hàng (giữ nguyên)
    rateOrder: async (req, res) => {
        try {
            const { rating, comment } = req.body;
            const orderId = req.params.id;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ message: "Số sao đánh giá phải từ 1 đến 5." });
            }

            const order = await OrderModel.findById(orderId);

            if (!order) {
                return res.status(404).json({ message: "Đơn hàng không tồn tại." });
            }

            if (order.rated) {
                return res.status(400).json({ message: "Đơn hàng này đã được đánh giá." });
            }

            order.rating = rating;
            order.comment = comment || "";
            order.rated = true;

            await order.save();
            res.status(200).json({ message: "Đánh giá đơn hàng thành công." });
        } catch (error) {
            console.error("Lỗi máy chủ khi đánh giá đơn hàng:", error);
            res.status(500).json({ message: "Lỗi máy chủ khi đánh giá đơn hàng." });
        }
    },

    // Đánh giá sản phẩm trong đơn hàng (giữ nguyên)
    rateProductsInOrder: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const { ratings } = req.body;

            if (!Array.isArray(ratings) || ratings.length === 0) {
                return res.status(400).json({ message: "Danh sách đánh giá không hợp lệ." });
            }

            const order = await OrderModel.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
            }

            let updated = false;
            let updatedProducts = 0;

            for (const { productId, rating, comment } of ratings) {
                for (let i = 0; i < order.products.length; i++) {
                    const productInOrder = order.products[i];
                    
                    if (productInOrder.product.toString() === productId) {
                        order.products[i].rated = true;
                        order.products[i].rating = rating;
                        order.products[i].comment = comment || "";
                        updated = true;
                        updatedProducts++;
                        
                        console.log(`Updated product: ${productId} with rating: ${rating}`);
                        break;
                    }
                }
            }

            if (!updated) {
                return res.status(400).json({ 
                    message: "Không có sản phẩm nào được cập nhật đánh giá.",
                    debug: {
                        receivedIds: ratings.map(r => r.productId),
                        orderProductIds: order.products.map(p => p.product.toString())
                    }
                });
            }

            order.rated = true;
            await order.save();
            
            res.status(200).json({ 
                message: `Đánh giá ${updatedProducts} sản phẩm thành công.` 
            });
        } catch (error) {
            console.error("Lỗi khi đánh giá sản phẩm trong đơn hàng:", error);
            res.status(500).json({ message: "Lỗi máy chủ khi đánh giá sản phẩm." });
        }
    },

    getReviewsByProductId: async (req, res) => {
        try {
            const { productId } = req.params;
            console.log("Lấy đánh giá sản phẩm trong orderController", productId);

            const orders = await OrderModel.find({
                "products.product": productId,
                "products.rated": true,
            }).populate("user", "username");

            const reviews = [];

            for (const order of orders) {
                const customer = order.user?.username || "Khách hàng";

                const matchedProducts = order.products.filter(
                    (p) =>
                        p.product.toString() === productId &&
                        p.rated &&
                        p.rating
                );

                for (const p of matchedProducts) {
                    reviews.push({
                        rating: p.rating,
                        comment: p.comment || "",
                        customer,
                        createdAt: order.updatedAt, 
                    });
                }
            }

            reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            res.status(200).json({ data: reviews });
        } catch (error) {
            console.error("Error fetching product reviews:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    getOrderDetailForShipping: async (req, res) => {
        try {
            const orderId = req.params.id;
            
            // 🔥 Fetch order without promotion populate
            const order = await OrderModel.findById(orderId)
                .populate('user', 'username email phone')
                .populate('products.product', 'name image price');
                // 🔥 Removed promotion populates
                
            if (!order) {
                return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
            }

            // 🔥 Fetch promotion details via API
            let voucherPromotion = null;
            let freeShipPromotion = null;
            const productPromotions = {};

            try {
                const promotionIDs = [
                    order.voucherPromotionID,
                    order.freeShipPromotionID,
                    ...order.products.map(p => p.productPromotionID)
                ].filter(Boolean);

                if (promotionIDs.length > 0) {
                    const promotionResult = await callPromotionAPI('/batch', 'POST', { ids: promotionIDs });
                    if (promotionResult.success) {
                        const promotions = promotionResult.data;
                        
                        if (order.voucherPromotionID) {
                            voucherPromotion = promotions.find(p => p._id === order.voucherPromotionID.toString());
                        }
                        if (order.freeShipPromotionID) {
                            freeShipPromotion = promotions.find(p => p._id === order.freeShipPromotionID.toString());
                        }
                        
                        // Map product promotions
                        order.products.forEach(product => {
                            if (product.productPromotionID) {
                                const promotion = promotions.find(p => p._id === product.productPromotionID.toString());
                                if (promotion) {
                                    productPromotions[product.productPromotionID] = promotion;
                                }
                            }
                        });
                    }
                }
            } catch (promotionError) {
                console.error('❌ Error fetching promotions for order details:', promotionError);
            }

            // Tạo response với thông tin promotion đầy đủ
            const responseData = {
                _id: order._id,
                user: {
                    _id: order.user?._id,
                    username: order.user?.username || "Khách hàng",
                    email: order.user?.email || "N/A",
                    phone: order.user?.phone || "N/A"
                },
                products: order.products.map(item => ({
                    product: {
                        _id: item.product._id,
                        name: item.product.name,
                        image: item.product.image,
                        price: item.product.price
                    },
                    quantity: item.quantity,
                    price: item.price,
                    size: item.size,
                    color: item.color,
                    variantId: item.variantId,
                    productPromotionID: item.productPromotionID,
                    productPromotion: item.productPromotionID ? productPromotions[item.productPromotionID] || null : null,
                    rated: item.rated,
                    rating: item.rating,
                    comment: item.comment
                })),
                
                // Thông tin promotion tổng
                voucherPromotionID: order.voucherPromotionID,
                voucherPromotion: voucherPromotion,
                
                freeShipPromotionID: order.freeShipPromotionID,
                freeShipPromotion: freeShipPromotion,
                
                // Thông tin tiền tệ
                orderTotal: order.orderTotal,
                discountAmount: order.discountAmount,
                shippingFee: order.shippingFee,
                finalAmount: order.finalAmount,
                
                // Thông tin cơ bản
                address: order.address,
                billing: order.billing,
                status: order.status,
                description: order.description,
                
                // Thông tin đánh giá
                rated: order.rated,
                rating: order.rating,
                comment: order.comment,
                
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            };

            res.status(200).json(responseData);
        } catch (err) {
            console.error("Lỗi khi lấy chi tiết đơn hàng:", err);
            res.status(500).json({ 
                message: "Lỗi server khi lấy chi tiết đơn hàng", 
                error: err.message 
            });
        }
    }
};

module.exports = orderController;