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
                    { path: 'user', select: 'username email phone' },
                    { 
                        path: 'products.product',
                        select: '-embedding -__v' // ✅ Loại bỏ embedding và __v để giảm payload
                    }
                    // 🔥 Removed promotion populates - will fetch via API
                ]
            };

            const orderList = await OrderModel.paginate({}, options);
            
            // ✅ OPTIMIZED: Fetch ALL promotion IDs at once instead of loop
            const allPromotionIDs = [];
            orderList.docs.forEach(order => {
                if (order.voucherPromotionID) allPromotionIDs.push(order.voucherPromotionID);
                if (order.freeShipPromotionID) allPromotionIDs.push(order.freeShipPromotionID);
                order.products.forEach(p => {
                    if (p.productPromotionID) allPromotionIDs.push(p.productPromotionID);
                });
            });

            // Remove duplicates
            const uniquePromotionIDs = [...new Set(allPromotionIDs)];

            // Fetch all promotions in ONE API call
            let promotionsMap = {};
            if (uniquePromotionIDs.length > 0) {
                try {
                    console.log(`📦 Fetching ${uniquePromotionIDs.length} unique promotions in batch`);
                    const promotionResult = await callPromotionAPI('/batch', 'POST', { ids: uniquePromotionIDs });
                    if (promotionResult.success) {
                        // Create map for fast lookup
                        promotionResult.data.forEach(promo => {
                            promotionsMap[promo._id] = promo;
                        });
                        console.log(`✅ Successfully fetched ${promotionResult.data.length} promotions`);
                    }
                } catch (promotionError) {
                    console.error('❌ Error fetching promotions in getAllOrder:', promotionError);
                }
            }

            // Attach promotion data to orders
            orderList.docs.forEach(order => {
                if (order.voucherPromotionID) {
                    order.voucherPromotion = promotionsMap[order.voucherPromotionID];
                }
                if (order.freeShipPromotionID) {
                    order.freeShipPromotion = promotionsMap[order.freeShipPromotionID];
                }
                order.products.forEach(product => {
                    if (product.productPromotionID) {
                        product.productPromotion = promotionsMap[product.productPromotionID];
                    }
                });
            });

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
        console.log("Đơn hàng đã được lưu thành công:", savedOrder._id);

        try {
            console.log("🐛 DEBUG: Bắt đầu cập nhật promotions qua API");
            console.log("🐛 voucherPromotionID:", voucherPromotionID);
            console.log("🐛 freeShipPromotionID:", freeShipPromotionID);
            
            const promotionUpdatePromises = [];

            // Cập nhật voucher promotion
            if (voucherPromotionID) {
                console.log(`📊 Đang cập nhật voucher: ${voucherPromotionID}`);
                promotionUpdatePromises.push(
                    callPromotionAPI(`/${voucherPromotionID}/use`, 'PATCH')
                        .then(result => {
                            console.log(`✅ Voucher updated: ${result.data?.tenKhuyenMai}, usedCount: ${result.data?.usedCount}`);
                            return result;
                        })
                        .catch(error => {
                            console.error(`❌ Failed to update voucher: ${voucherPromotionID}`, error.message);
                            return null;
                        })
                );
            }

            // Cập nhật freeship promotion  
            if (freeShipPromotionID) {
                console.log(`🚚 Đang cập nhật freeship: ${freeShipPromotionID}`);
                promotionUpdatePromises.push(
                    callPromotionAPI(`/${freeShipPromotionID}/use`, 'PATCH')
                        .then(result => {
                            console.log(`✅ Freeship updated: ${result.data?.tenKhuyenMai}, usedCount: ${result.data?.usedCount}`);
                            return result;
                        })
                        .catch(error => {
                            console.error(`❌ Failed to update freeship: ${freeShipPromotionID}`, error.message);
                            return null;
                        })
                );
            }

            // Cập nhật product promotions
            const productPromotionIDs = processedProducts
                .filter(p => p.productPromotionID)
                .map(p => p.productPromotionID);
            
            console.log("🐛 Product promotion IDs found:", productPromotionIDs);

            // Đếm số lần sử dụng cho mỗi promotion ID
            const promotionUsageCount = {};
            productPromotionIDs.forEach(id => {
                promotionUsageCount[id] = (promotionUsageCount[id] || 0) + 1;
            });

            console.log("🐛 Promotion usage count:", promotionUsageCount);

            // Cập nhật từng product promotion
            for (const [promotionId, count] of Object.entries(promotionUsageCount)) {
                console.log(`🎁 Đang cập nhật product promotion: ${promotionId}, count: ${count}`);
                
                // Gọi API nhiều lần theo số lượng count
                for (let i = 0; i < count; i++) {
                    promotionUpdatePromises.push(
                        callPromotionAPI(`/${promotionId}/use`, 'PATCH')
                            .then(result => {
                                console.log(`✅ Product promotion updated (${i+1}/${count}): ${result.data?.tenKhuyenMai}, usedCount: ${result.data?.usedCount}`);
                                return result;
                            })
                            .catch(error => {
                                console.error(`❌ Failed to update product promotion (${i+1}/${count}): ${promotionId}`, error.message);
                                return null;
                            })
                    );
                }
            }

            console.log("🐛 Total promotion API calls to execute:", promotionUpdatePromises.length);

            if (promotionUpdatePromises.length > 0) {
                // Thực hiện tất cả API calls đồng thời
                const results = await Promise.allSettled(promotionUpdatePromises);
                
                const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
                const failedCount = results.length - successCount;
                
                console.log(`✅ Promotion updates completed: ${successCount} success, ${failedCount} failed`);
                
                // Log chi tiết kết quả
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled' && result.value && result.value.data) {
                        const promotion = result.value.data;
                        console.log(`📈 ${promotion.tenKhuyenMai}: usedCount = ${promotion.usedCount}/${promotion.soLuong || 'unlimited'}`);
                    } else if (result.status === 'rejected') {
                        console.log(`⚠️ Promotion update ${index} failed:`, result.reason?.message || 'Unknown error');
                    }
                });
            } else {
                console.log("⚠️ Không có promotion nào để cập nhật!");
            }

        } catch (promotionError) {
            console.error('❌ Error updating promotion usedCount via API:', promotionError);
            console.error('❌ Error stack:', promotionError.stack);
        }

        // Gửi email thông báo với giao diện chuyên nghiệp
        try {
            const customer = await User.findById(userId);
            console.log("👤 Tìm thấy khách hàng:", customer ? customer.email : "Không tìm thấy khách hàng");
            
            if (customer && customer.email) {
                // Lấy thông tin promotion để hiển thị trong email qua API
                const promotionInfo = await getPromotionDetailsForEmail(
                    voucherPromotionID, 
                    freeShipPromotionID, 
                    processedProducts.filter(p => p.productPromotionID).map(p => p.productPromotionID)
                );

                const transporter = nodemailer.createTransport({ 
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'h5studiogl@gmail.com',
                        pass: 'ubqq hfra cduj tlnq',
                    },
                });

                // Tạo nội dung chi tiết sản phẩm
                let productsRows = '';
                for (const item of processedProducts) {
                    const productDetail = await Product.findById(item.product);
                    const productPromotion = promotionInfo.productPromotions.find(p => 
                        p._id.toString() === item.productPromotionID?.toString()
                    );
                    
                    const variantInfo = [];
                    if (item.size) variantInfo.push(`Size: ${item.size}`);
                    if (item.color) variantInfo.push(`Màu: ${item.color}`);
                    const variantText = variantInfo.length > 0 ? `<div style="font-size: 13px; color: #666; margin-top: 4px;">${variantInfo.join(' • ')}</div>` : '';
                    
                    const promotionBadge = productPromotion ? `<div style="display: inline-block; background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;">🎁 ${productPromotion.tenKhuyenMai}</div>` : '';
                    
                    productsRows += `
                        <tr>
                            <td style="padding: 16px 8px 16px 0; border-bottom: 1px solid #e5e7eb; width: 55%;">
                                <div style="font-weight: 500; color: #111827; font-size: 14px;">${productDetail ? productDetail.name : 'Sản phẩm'}</div>
                                ${variantText}
                                ${promotionBadge}
                            </td>
                            <td style="padding: 16px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; width: 15%;">
                                ${item.quantity}
                            </td>
                            <td style="padding: 16px 0 16px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 500; font-size: 14px; white-space: nowrap; width: 30%;">
                                ${item.price.toLocaleString('vi-VN')} ₫
                            </td>
                        </tr>
                    `;
                }

                // Format ngày tháng
                const orderDate = new Date();
                const day = orderDate.getDate();
                const month = orderDate.getMonth() + 1;
                const year = orderDate.getFullYear();
                const formattedDate = `${day}/${month}/${year}`;

                // Tạo mã đơn hàng ngắn gọn (8 ký tự cuối)
                const shortOrderId = savedOrder._id.toString().slice(-8).toUpperCase();

                const mailOptions = {
                    from: '"Stussy" <h5studiogl@gmail.com>',
                    to: customer.email,
                    subject: `Xác nhận đơn hàng #${shortOrderId} - Stussy`,
                    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác nhận đơn hàng</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Container chính -->
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background-color: white; width: 60px; height: 60px; border-radius: 50%; text-align: center; vertical-align: middle; line-height: 60px;">
                                        <span style="font-size: 32px; display: inline-block; vertical-align: middle; line-height: normal;">📦</span>
                                    </td>
                                </tr>
                            </table>
                            <h1 style="margin: 20px 0 0 0; color: white; font-size: 28px; font-weight: 600;">Stussy</h1>
                        </td>
                    </tr>
                    
                    <!-- Thông báo chính -->
                    <tr>
                        <td style="padding: 40px; text-align: center; background-color: #fefefe;">
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background-color: #10b981; width: 64px; height: 64px; border-radius: 50%; text-align: center; vertical-align: middle; line-height: 64px;">
                                        <span style="font-size: 36px; color: white; display: inline-block; vertical-align: middle; line-height: normal;">✓</span>
                                    </td>
                                </tr>
                            </table>
                            <h2 style="margin: 20px 0 12px; color: #111827; font-size: 24px; font-weight: 600;">Đơn hàng đã được xác nhận!</h2>
                            <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                                Cảm ơn bạn đã tin tưởng mua sắm tại Stussy.<br>
                                Chúng tôi đang xử lý đơn hàng của bạn.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Thông tin đơn hàng -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding-bottom: 16px; width: 50%;">
                                            <div style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">Mã đơn hàng</div>
                                            <div style="color: #111827; font-size: 16px; font-weight: 600;">#${shortOrderId}</div>
                                        </td>
                                        <td style="text-align: right; padding-bottom: 16px; width: 50%;">
                                            <div style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">Ngày đặt</div>
                                            <div style="color: #111827; font-size: 14px; font-weight: 500; white-space: nowrap;">${formattedDate}</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding-top: 16px; border-top: 1px solid #e5e7eb;">
                                            <div style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">Phương thức thanh toán</div>
                                            <div style="color: #111827; font-size: 14px; font-weight: 500;">${billing === 'cod' ? '💵 Thanh toán khi nhận hàng (COD)' : '💳 PayPal'}</div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Chi tiết sản phẩm -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <h3 style="margin: 0 0 20px; color: #111827; font-size: 18px; font-weight: 600;">Chi tiết đơn hàng</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #e5e7eb;">
                                        <th style="padding: 12px 8px 12px 0; text-align: left; color: #6b7280; font-weight: 500; font-size: 13px; text-transform: uppercase; width: 55%;">Sản phẩm</th>
                                        <th style="padding: 12px 8px; text-align: center; color: #6b7280; font-weight: 500; font-size: 13px; text-transform: uppercase; width: 15%;">SL</th>
                                        <th style="padding: 12px 0 12px 8px; text-align: right; color: #6b7280; font-weight: 500; font-size: 13px; text-transform: uppercase; width: 30%;">Giá</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productsRows}
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Tổng cộng -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tạm tính</td>
                                        <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px;">${orderTotal.toLocaleString('vi-VN')} ₫</td>
                                    </tr>
                                    ${discountAmount > 0 ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #10b981; font-size: 14px;">
                                            <span>🎫 Giảm giá</span>
                                            ${promotionInfo.voucher ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${promotionInfo.voucher.tenKhuyenMai}</div>` : ''}
                                        </td>
                                        <td style="padding: 8px 0; text-align: right; color: #10b981; font-size: 14px; font-weight: 500;">-${discountAmount.toLocaleString('vi-VN')} ₫</td>
                                    </tr>
                                    ` : ''}
                                    ${shippingFee > 0 ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                                            <span>🚚 Phí vận chuyển</span>
                                            ${promotionInfo.freeShip ? `<div style="font-size: 12px; color: #10b981; margin-top: 2px;">${promotionInfo.freeShip.tenKhuyenMai}</div>` : ''}
                                        </td>
                                        <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px;">${promotionInfo.freeShip ? '<span style="text-decoration: line-through; color: #9ca3af; margin-right: 8px;">' + shippingFee.toLocaleString('vi-VN') + ' ₫</span><span style="color: #10b981; font-weight: 500;">Miễn phí</span>' : shippingFee.toLocaleString('vi-VN') + ' ₫'}</td>
                                    </tr>
                                    ` : ''}
                                    <tr style="border-top: 2px solid #e5e7eb;">
                                        <td style="padding: 16px 0 0; color: #111827; font-size: 16px; font-weight: 600;">Tổng cộng</td>
                                        <td style="padding: 16px 0 0; text-align: right; color: #667eea; font-size: 20px; font-weight: 700;">${calculatedFinalAmount.toLocaleString('vi-VN')} ₫</td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Địa chỉ giao hàng -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px;">
                                <div style="color: #92400e; font-size: 13px; font-weight: 500; margin-bottom: 8px;">📍 ĐỊA CHỈ GIAO HÀNG</div>
                                <div style="color: #78350f; font-size: 14px; line-height: 1.6;">${address}</div>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Call to action -->
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                        </td>
                    </tr>
                    
                    <!-- Support -->
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                Có câu hỏi? <a href="mailto:h5studiogl@gmail.com" style="color: #667eea; text-decoration: none; font-weight: 500;">Liên hệ hỗ trợ</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 12px; color: #9ca3af; font-size: 13px;">
                                Email này được gửi tự động, vui lòng không trả lời.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © 2025 Stussy. All rights reserved.
                            </p>
                            <div style="margin-top: 16px;">
                                <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Chính sách</a>
                                <span style="color: #d1d5db;">•</span>
                                <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Điều khoản</a>
                                <span style="color: #d1d5db;">•</span>
                                <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Hỗ trợ</a>
                            </div>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
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
            // Get old order to compare status
            const oldOrder = await OrderModel.findById(id)
                .populate('user', 'username email phone')
                .populate('products.product', '-embedding -__v');
            
            if (!oldOrder) {
                return res.status(404).json({ message: 'Order not found' });
            }

            const oldStatus = oldOrder.status;

            // Update order
            const orderList = await OrderModel.findByIdAndUpdate(
                id, 
                { status, description, address }, 
                { new: true }
            )
            .populate('user', 'username email phone')
            .populate('products.product', '-embedding -__v');
            
            if (!orderList) {
                return res.status(404).json({ message: 'Order not found' });
            }

            // ✅ GỬI EMAIL KHI TRẠNG THÁI THAY ĐỔI
            if (oldStatus !== status && orderList.user && orderList.user.email) {
                try {
                    console.log(`📧 Gửi email cập nhật trạng thái: ${oldStatus} → ${status}`);
                    
                    // Lấy thông tin promotion để hiển thị trong email
                    const promotionInfo = await getPromotionDetailsForEmail(
                        orderList.voucherPromotionID,
                        orderList.freeShipPromotionID,
                        orderList.products.filter(p => p.productPromotionID).map(p => p.productPromotionID)
                    );

                    const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 587,
                        secure: false,
                        auth: {
                            user: 'h5studiogl@gmail.com',
                            pass: 'ubqq hfra cduj tlnq',
                        },
                    });

                    // Map trạng thái sang tiếng Việt và màu sắc
                    const statusMap = {
                        'pending': { text: 'Đợi xác nhận', color: '#3b82f6', icon: '⏳', bgColor: '#dbeafe' },
                        'approved': { text: 'Đang vận chuyển', color: '#f59e0b', icon: '🚚', bgColor: '#fef3c7' },
                        'final': { text: 'Đã giao hàng', color: '#10b981', icon: '✅', bgColor: '#d1fae5' },
                        'rejected': { text: 'Đã hủy', color: '#ef4444', icon: '❌', bgColor: '#fee2e2' }
                    };

                    const currentStatus = statusMap[status] || { text: status, color: '#6b7280', icon: '📦', bgColor: '#f3f4f6' };
                    
                    // Tạo HTML cho danh sách sản phẩm
                    let productsRows = '';
                    for (const item of orderList.products) {
                        const productDetail = item.product;
                        const productPromotion = promotionInfo.productPromotions.find(p => 
                            p._id.toString() === item.productPromotionID?.toString()
                        );
                        
                        const variantInfo = [];
                        if (item.size) variantInfo.push(`Size: ${item.size}`);
                        if (item.color) variantInfo.push(`Màu: ${item.color}`);
                        const variantText = variantInfo.length > 0 ? `<div style="font-size: 13px; color: #666; margin-top: 4px;">${variantInfo.join(' • ')}</div>` : '';
                        
                        const promotionBadge = productPromotion ? `<div style="display: inline-block; background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;">🎁 ${productPromotion.tenKhuyenMai}</div>` : '';
                        
                        productsRows += `
                            <tr>
                                <td style="padding: 16px 8px 16px 0; border-bottom: 1px solid #e5e7eb; width: 55%;">
                                    <div style="font-weight: 500; color: #111827; font-size: 14px;">${productDetail ? productDetail.name : 'Sản phẩm'}</div>
                                    ${variantText}
                                    ${promotionBadge}
                                </td>
                                <td style="padding: 16px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; width: 15%;">
                                    ${item.quantity}
                                </td>
                                <td style="padding: 16px 0 16px 8px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #111827; font-weight: 500; font-size: 14px; white-space: nowrap; width: 30%;">
                                    ${item.price.toLocaleString('vi-VN')} ₫
                                </td>
                            </tr>
                        `;
                    }

                    // Format ngày
                    const orderDate = new Date(orderList.createdAt);
                    const day = orderDate.getDate();
                    const month = orderDate.getMonth() + 1;
                    const year = orderDate.getFullYear();
                    const formattedDate = `${day}/${month}/${year}`;

                    const shortOrderId = orderList._id.toString().slice(-8).toUpperCase();
                    const calculatedFinalAmount = orderList.finalAmount;

                    const mailOptions = {
                        from: '"MicroMarket" <h5studiogl@gmail.com>',
                        to: orderList.user.email,
                        subject: `Cập nhật đơn hàng #${shortOrderId} - ${currentStatus.text}`,
                        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cập nhật đơn hàng</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background-color: white; width: 60px; height: 60px; border-radius: 50%; text-align: center; vertical-align: middle; line-height: 60px;">
                                        <span style="font-size: 32px; display: inline-block; vertical-align: middle; line-height: normal;">📦</span>
                                    </td>
                                </tr>
                            </table>
                            <h1 style="margin: 20px 0 0 0; color: white; font-size: 28px; font-weight: 600;">MicroMarket</h1>
                        </td>
                    </tr>
                    
                    <!-- Status Update Notice -->
                    <tr>
                        <td style="padding: 40px; text-align: center; background-color: #fefefe;">
                            <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="background-color: ${currentStatus.bgColor}; width: 64px; height: 64px; border-radius: 50%; text-align: center; vertical-align: middle; line-height: 64px;">
                                        <span style="font-size: 36px; display: inline-block; vertical-align: middle; line-height: normal;">${currentStatus.icon}</span>
                                    </td>
                                </tr>
                            </table>
                            <h2 style="margin: 20px 0 12px; color: #111827; font-size: 24px; font-weight: 600;">Đơn hàng đã được cập nhật!</h2>
                            <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                                Trạng thái đơn hàng của bạn đã thay đổi thành<br>
                                <strong style="color: ${currentStatus.color}; font-size: 18px;">${currentStatus.icon} ${currentStatus.text}</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Order Info -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding-bottom: 16px; width: 50%;">
                                            <div style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">Mã đơn hàng</div>
                                            <div style="color: #111827; font-size: 16px; font-weight: 600;">#${shortOrderId}</div>
                                        </td>
                                        <td style="text-align: right; padding-bottom: 16px; width: 50%;">
                                            <div style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">Ngày đặt</div>
                                            <div style="color: #111827; font-size: 14px; font-weight: 500; white-space: nowrap;">${formattedDate}</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="2" style="padding-top: 16px; border-top: 1px solid #e5e7eb;">
                                            <div style="color: #6b7280; font-size: 13px; margin-bottom: 6px;">Phương thức thanh toán</div>
                                            <div style="color: #111827; font-size: 14px; font-weight: 500;">${orderList.billing === 'cod' ? '💵 Thanh toán khi nhận hàng (COD)' : '💳 PayPal'}</div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    
                    ${description ? `
                    <!-- Admin Note -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px;">
                                <div style="color: #92400e; font-size: 13px; font-weight: 500; margin-bottom: 8px;">📝 GHI CHÚ TỪ SHOP</div>
                                <div style="color: #78350f; font-size: 14px; line-height: 1.6;">${description}</div>
                            </div>
                        </td>
                    </tr>
                    ` : ''}
                    
                    <!-- Products -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <h3 style="margin: 0 0 20px; color: #111827; font-size: 18px; font-weight: 600;">Chi tiết đơn hàng</h3>
                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #e5e7eb;">
                                        <th style="padding: 12px 8px 12px 0; text-align: left; color: #6b7280; font-weight: 500; font-size: 13px; text-transform: uppercase; width: 55%;">Sản phẩm</th>
                                        <th style="padding: 12px 8px; text-align: center; color: #6b7280; font-weight: 500; font-size: 13px; text-transform: uppercase; width: 15%;">SL</th>
                                        <th style="padding: 12px 0 12px 8px; text-align: right; color: #6b7280; font-weight: 500; font-size: 13px; text-transform: uppercase; width: 30%;">Giá</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productsRows}
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Order Total -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <div style="background-color: #f9fafb; border-radius: 8px; padding: 24px; border: 1px solid #e5e7eb;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Tạm tính</td>
                                        <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px;">${orderList.orderTotal.toLocaleString('vi-VN')} ₫</td>
                                    </tr>
                                    ${orderList.discountAmount > 0 ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #10b981; font-size: 14px;">
                                            <span>🎫 Giảm giá</span>
                                            ${promotionInfo.voucher ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${promotionInfo.voucher.tenKhuyenMai}</div>` : ''}
                                        </td>
                                        <td style="padding: 8px 0; text-align: right; color: #10b981; font-size: 14px; font-weight: 500;">-${orderList.discountAmount.toLocaleString('vi-VN')} ₫</td>
                                    </tr>
                                    ` : ''}
                                    ${orderList.shippingFee > 0 ? `
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                                            <span>🚚 Phí vận chuyển</span>
                                            ${promotionInfo.freeShip ? `<div style="font-size: 12px; color: #10b981; margin-top: 2px;">${promotionInfo.freeShip.tenKhuyenMai}</div>` : ''}
                                        </td>
                                        <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px;">${promotionInfo.freeShip ? '<span style="text-decoration: line-through; color: #9ca3af; margin-right: 8px;">' + orderList.shippingFee.toLocaleString('vi-VN') + ' ₫</span><span style="color: #10b981; font-weight: 500;">Miễn phí</span>' : orderList.shippingFee.toLocaleString('vi-VN') + ' ₫'}</td>
                                    </tr>
                                    ` : ''}
                                    <tr style="border-top: 2px solid #e5e7eb;">
                                        <td style="padding: 16px 0 0; color: #111827; font-size: 16px; font-weight: 600;">Tổng cộng</td>
                                        <td style="padding: 16px 0 0; text-align: right; color: #667eea; font-size: 20px; font-weight: 700;">${calculatedFinalAmount.toLocaleString('vi-VN')} ₫</td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Delivery Address -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px;">
                                <div style="color: #92400e; font-size: 13px; font-weight: 500; margin-bottom: 8px;">📍 ĐỊA CHỈ GIAO HÀNG</div>
                                <div style="color: #78350f; font-size: 14px; line-height: 1.6;">${orderList.address}</div>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Support -->
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                Có câu hỏi? <a href="mailto:h5studiogl@gmail.com" style="color: #667eea; text-decoration: none; font-weight: 500;">Liên hệ hỗ trợ</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 12px; color: #9ca3af; font-size: 13px;">
                                Email này được gửi tự động, vui lòng không trả lời.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                                © 2025 MicroMarket. All rights reserved.
                            </p>
                            <div style="margin-top: 16px;">
                                <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Chính sách</a>
                                <span style="color: #d1d5db;">•</span>
                                <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Điều khoản</a>
                                <span style="color: #d1d5db;">•</span>
                                <a href="#" style="color: #9ca3af; text-decoration: none; font-size: 12px; margin: 0 8px;">Hỗ trợ</a>
                            </div>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
                        `,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('❌ Lỗi gửi email cập nhật:', error);
                        } else {
                            console.log('✅ Email cập nhật đã gửi: ' + info.response);
                        }
                    });

                } catch (emailError) {
                    console.error('❌ Không thể gửi email cập nhật:', emailError);
                }
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
                { path: 'user', select: 'username email phone' },
                { 
                    path: 'products.product',
                    select: '-embedding -__v' // ✅ Loại bỏ embedding để tăng tốc
                }
            ]
        };

        const name = req.query.name;

        try {
            const orderList = await OrderModel.paginate(
                { billing: { $regex: `.*${name}.*`, $options: 'i' } }, 
                options
            );

            // ✅ OPTIMIZED: Fetch ALL promotion IDs at once instead of loop
            const allPromotionIDs = [];
            orderList.docs.forEach(order => {
                if (order.voucherPromotionID) allPromotionIDs.push(order.voucherPromotionID);
                if (order.freeShipPromotionID) allPromotionIDs.push(order.freeShipPromotionID);
                order.products.forEach(p => {
                    if (p.productPromotionID) allPromotionIDs.push(p.productPromotionID);
                });
            });

            // Remove duplicates
            const uniquePromotionIDs = [...new Set(allPromotionIDs)];

            // Fetch all promotions in ONE API call
            let promotionsMap = {};
            if (uniquePromotionIDs.length > 0) {
                try {
                    const promotionResult = await callPromotionAPI('/batch', 'POST', { ids: uniquePromotionIDs });
                    if (promotionResult.success) {
                        // Create map for fast lookup
                        promotionResult.data.forEach(promo => {
                            promotionsMap[promo._id] = promo;
                        });
                    }
                } catch (promotionError) {
                    console.error('❌ Error fetching promotions in search:', promotionError);
                }
            }

            // Attach promotion data to orders
            orderList.docs.forEach(order => {
                if (order.voucherPromotionID) {
                    order.voucherPromotion = promotionsMap[order.voucherPromotionID];
                }
                if (order.freeShipPromotionID) {
                    order.freeShipPromotion = promotionsMap[order.freeShipPromotionID];
                }
                order.products.forEach(product => {
                    if (product.productPromotionID) {
                        product.productPromotion = promotionsMap[product.productPromotionID];
                    }
                });
            });

            res.status(200).json({ data: orderList });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    // 🔥 FIXED getOrderByUser function - Remove populate, use API calls
    getOrderByUser: async (req, res) => {
    try {
        console.log("🔍 [ORDER] Headers received:", req.headers.authorization);
        console.log("📋 [ORDER] req.user structure:", JSON.stringify(req.user, null, 2));
        
        // ✅ Get user ID từ cấu trúc chuẩn hóa
        const userId = req.user.user._id;
        
        if (!userId) {
            console.error("❌ [ORDER] User ID not found in request");
            return res.status(400).json({
                success: false,
                message: 'User ID not found',
                data: []
            });
        }
        
        console.log("✅ [ORDER] Fetching orders for user:", userId);
        
        // Fetch orders for this user
        const orders = await OrderModel.find({ user: userId })
            .populate('products.product', '-embedding -__v') // ✅ Loại bỏ embedding
            .populate("user", "username")
            .sort({ createdAt: -1 });
            
        console.log(`📦 [ORDER] Found ${orders.length} orders for user ${userId}`);
        
        res.status(200).json({ 
            success: true,
            message: `Found ${orders.length} orders`,
            data: orders 
        });
        
    } catch (err) {
        console.error("❌ [ORDER] getOrderByUser error:", err);
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