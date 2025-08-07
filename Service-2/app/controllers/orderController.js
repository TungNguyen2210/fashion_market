const OrderModel = require('../models/order');
const _const = require('../config/constant')
const jwt = require('jsonwebtoken');
const Product = require('../models/product');
const user = require('../models/user');
const nodemailer = require('nodemailer');

const orderController = {
    getAllOrder: async (req, res) => {
        try {
            const page = req.body.page || 1;
            const limit = req.body.limit || 10;

            const options = {
                page: page,
                limit: limit,
                populate: 'user'
            };

            const orderList = await OrderModel.paginate({}, options);
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
            console.log("Dữ liệu đơn hàng nhận được:", JSON.stringify(req.body, null, 2));
            const insufficientQuantityProducts = [];

            // Chuẩn bị dữ liệu sản phẩm với thông tin đầy đủ
            const processedProducts = [];
            
            for (const productItem of req.body.products) {
                const productId = productItem.product;
                const quantity = productItem.quantity;
                
                // Lấy thông tin về size, color và variantId từ request
                const size = productItem.size || null;
                const color = productItem.color || null;
                const variantId = productItem.variantId || null;

                console.log(`Xử lý sản phẩm: ${productId}, size: ${size}, color: ${color}, variantId: ${variantId}`);

                // Tìm sản phẩm trong database
                const product = await Product.findById(productId);

                if (!product) {
                    console.log(`Không tìm thấy sản phẩm: ${productId}`);
                    insufficientQuantityProducts.push({
                        productId,
                        quantity: 0,
                    });
                    continue;
                }

                // Kiểm tra số lượng tồn kho
                let variantQuantity = 0;
                let variant = null;

                // Nếu có variantId, kiểm tra số lượng của biến thể cụ thể
                if (variantId && product.variants && product.variants.length > 0) {
                    variant = product.variants.find(v => v.variantId === variantId);
                    if (variant) {
                        variantQuantity = variant.quantity;
                        console.log(`Tìm thấy biến thể với số lượng: ${variantQuantity}`);
                    }
                }

                // Nếu không tìm thấy biến thể theo variantId, thử tìm theo size và color
                if (!variant && product.variants && product.variants.length > 0 && (size || color)) {
                    variant = product.variants.find(v => 
                        (!size || v.size === size) && 
                        (!color || v.color === color)
                    );
                    
                    if (variant) {
                        variantQuantity = variant.quantity;
                        console.log(`Tìm thấy biến thể bằng size/color với số lượng: ${variantQuantity}`);
                    }
                }

                // Nếu không tìm được biến thể phù hợp, kiểm tra tổng số lượng sản phẩm
                if (!variant) {
                    variantQuantity = product.quantity;
                    console.log(`Không tìm thấy biến thể, sử dụng số lượng sản phẩm: ${variantQuantity}`);
                }

                // Kiểm tra đủ số lượng hay không
                if (variantQuantity < quantity) {
                    console.log(`Không đủ số lượng cho sản phẩm: ${productId}, biến thể: ${variantId || 'none'}`);
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

                // Nếu đủ số lượng, thêm vào danh sách sản phẩm đã xử lý
                processedProducts.push({
                    product: productId,
                    quantity,
                    price: productItem.price,
                    size: size,
                    color: color,
                    variantId: variantId
                });
                
                console.log(`Đã thêm vào sản phẩm đã xử lý: ${JSON.stringify({
                    product: productId,
                    quantity,
                    size: size,
                    color: color,
                    variantId: variantId
                })}`);
            }

            if (insufficientQuantityProducts.length > 0) {
                console.log("Sản phẩm không đủ số lượng:", insufficientQuantityProducts);
                return res.status(200).json({
                    error: 'Insufficient quantity for one or more products.',
                    insufficientQuantityProducts,
                });
            }

            // Tạo đơn hàng với dữ liệu đã xử lý
            const order = new OrderModel({
                user: req.body.userId,
                products: processedProducts,
                description: req.body.description || '',
                orderTotal: req.body.orderTotal,
                billing: req.body.billing || 'cod',
                address: req.body.address,
                status: req.body.status || 'pending',
            });

            console.log("Đã tạo đơn hàng với sản phẩm đã xử lý");

            // Cập nhật số lượng sản phẩm
            for (const productItem of processedProducts) {
                const productId = productItem.product;
                const quantity = productItem.quantity;
                const variantId = productItem.variantId;
                
                const product = await Product.findById(productId);
                
                if (product) {
                    // Nếu có variantId, giảm số lượng của biến thể cụ thể
                    if (variantId && product.variants && product.variants.length > 0) {
                        const variantIndex = product.variants.findIndex(v => v.variantId === variantId);
                        
                        if (variantIndex !== -1) {
                            console.log(`Cập nhật số lượng biến thể cho ${variantId}: ${product.variants[variantIndex].quantity} -> ${product.variants[variantIndex].quantity - quantity}`);
                            product.variants[variantIndex].quantity -= quantity;
                        }
                    }
                    
                    // Luôn cập nhật tổng số lượng sản phẩm
                    console.log(`Cập nhật số lượng sản phẩm cho ${productId}: ${product.quantity} -> ${product.quantity - quantity}`);
                    product.quantity -= quantity;
                    await product.save();
                }
            }

            const savedOrder = await order.save();
            console.log("Đơn hàng đã được lưu thành công");

            // Gửi email thông báo cho người dùng
            try {
                const customer = await user.findById(req.body.userId);
                console.log("Tìm thấy khách hàng:", customer ? customer.email : "Không tìm thấy khách hàng");
                
                if (customer && customer.email) {
                    // Thiết lập transporter email
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
                    let productsHtml = '';
                    for (const item of processedProducts) {
                        const productDetail = await Product.findById(item.product);
                        productsHtml += `
                            <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                                <p><strong>${productDetail ? productDetail.name : 'Sản phẩm'}</strong> x ${item.quantity}</p>
                                <p>Giá: ${item.price.toLocaleString()} VND</p>
                                ${item.size ? `<p>Kích thước: ${item.size}</p>` : ''}
                                ${item.color ? `<p>Màu sắc: ${item.color}</p>` : ''}
                            </div>
                        `;
                    }

                    const mailOptions = {
                        from: '"MicroMarket" <h5studiogl@gmail.com>',
                        to: customer.email,
                        subject: 'Xác nhận đơn hàng của bạn tại MicroMarket',
                        html: `<h1>Cảm ơn bạn đã đặt hàng!</h1>
                             <p>Đơn hàng với mã số ${savedOrder._id} của bạn đã được đặt thành công.</p>
                             
                             <h2>Chi tiết đơn hàng:</h2>
                             ${productsHtml}
                             
                             <p>Tổng tiền đơn hàng: ${savedOrder.orderTotal.toLocaleString()} VND</p>
                             <p>Phương thức thanh toán: ${savedOrder.billing === 'cod' ? 'Thanh toán khi nhận hàng' : 'PayPal'}</p>
                             <p>Địa chỉ giao hàng: ${savedOrder.address}</p>
                             <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng bắt đầu được giao.</p>
                             <p>Cảm ơn bạn đã mua sắm tại MicroMarket!</p>`,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Lỗi gửi email:', error);
                        } else {
                            console.log('Email đã gửi: ' + info.response);
                        }
                    });
                } else {
                    console.log('Không tìm thấy email người dùng, bỏ qua thông báo email.');
                }
            } catch (emailError) {
                console.error('Không thể gửi email xác nhận đơn hàng:', emailError);
            }

            res.status(200).json(savedOrder);
        }
        catch (err) {
            console.log("Lỗi tạo đơn hàng:", err);
            res.status(500).json(err);
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
            const orderList = await OrderModel.findByIdAndUpdate(id, { status, description, address }, { new: true });
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
            populate: 'user'
        };

        const name = req.query.name;

        try {
            const orderList = await OrderModel.paginate({ billing: { $regex: `.*${name}.*`, $options: 'i' } }, options);

            res.status(200).json({ data: orderList });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getOrderByUser: async (req, res) => {
        try {
            const decodedToken = jwt.verify(req.headers.authorization, _const.JWT_ACCESS_KEY);
            const orders = await OrderModel.find({ user: decodedToken.user._id })
                .populate('products.product') // Lấy tên và giá sản phẩm
                .populate("user", "username");    // Lấy tên người dùng
            res.status(200).json({ data: orders });
        } catch (err) {
            res.status(401).send('Unauthorized');
        }
    },
    
    // Đánh giá đơn hàng 
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

    // Đánh giá sản phẩm trong đơn hàng
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

            ratings.forEach(({ productId, rating, comment }) => {
                const product = order.products.find(p => p.product.toString() === productId);
                if (product && !product.rated) {
                    product.rated = true;
                    product.rating = rating;
                    product.comment = comment || "";
                    updated = true;
                }
            });

            if (!updated) {
                return res.status(400).json({ message: "Không có sản phẩm nào được cập nhật đánh giá." });
            }

            // Đánh dấu đơn hàng đã đánh giá
            order.rated = true;
            await order.save();
            
            res.status(200).json({ message: "Đánh giá sản phẩm thành công." });
        } catch (error) {
            console.error("Lỗi khi đánh giá sản phẩm trong đơn hàng:", error);
            res.status(500).json({ message: "Lỗi máy chủ khi đánh giá sản phẩm." });
        }
    },

    getReviewsByProductId: async (req, res) => {
        try {
            const { productId } = req.params;
            console.log("Lấy đánh giá sản phẩm trong orderController", productId);

            // Tìm đơn hàng có sản phẩm này và có ít nhất một sản phẩm đã được đánh giá
            const orders = await OrderModel.find({
                "products.product": productId,
                "products.rated": true,
            })
                .populate("user", "username");

            const reviews = [];

            for (const order of orders) {
                const customer = order.user?.username || "Khách hàng";

                // Tìm sản phẩm phù hợp trong đơn hàng
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

            // Sắp xếp các đánh giá theo ngày tạo
            reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            res.status(200).json({ data: reviews });
        } catch (error) {
            console.error("Error fetching product reviews:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
};

module.exports = orderController;