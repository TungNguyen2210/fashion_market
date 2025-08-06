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
            const insufficientQuantityProducts = [];

            const order = new OrderModel({
                user: req.body.userId,
                products: req.body.products,
                description: req.body.description,
                orderTotal: req.body.orderTotal,
                billing: req.body.billing,
                address: req.body.address,
                status: req.body.status,
            });

            for (const productItem of req.body.products) {
                const productId = productItem.product;
                const quantity = productItem.quantity;

                // Find the product in the database
                const product = await Product.findById(productId);

                if (!product || product.quantity < quantity) {
                    insufficientQuantityProducts.push({
                        productId,
                        quantity: product ? product.quantity : 0,
                    });
                }
            }

            if (insufficientQuantityProducts.length > 0) {
                return res.status(200).json({
                    error: 'Insufficient quantity for one or more products.',
                    insufficientQuantityProducts,
                });
            }

            // Update product quantities after check and before saving order
            for (const productItem of req.body.products) {
                const productId = productItem.product;
                const quantity = productItem.quantity;
                const product = await Product.findById(productId);
                if (product) { // Product should exist at this point due to the check above
                    product.quantity -= quantity;
                    await product.save();
                }
            }

            const savedOrder = await order.save();

            // Send email to user
            try {
                const customer = await user.findById(req.body.userId);
                console.log(customer);
                if (customer && customer.email) {
                    // Set up the email transporter
                    const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 587, // Port should be a number, not a string
                        secure: false, // true for 465, false for other ports
                        auth: {
                            user: 'h5studiogl@gmail.com', // Consider using environment variables for credentials
                            pass: 'ubqq hfra cduj tlnq', // Consider using environment variables for credentials
                        },
                    });

                    const mailOptions = {
                        from: '"MicroMarket" <h5studiogl@gmail.com>',
                        to: customer.email,
                        subject: 'Xác nhận đơn hàng của bạn tại MicroMarket',
                        html: `<h1>Cảm ơn bạn đã đặt hàng!</h1>
                             <p>Đơn hàng với mã số ${savedOrder._id} của bạn đã được đặt thành công.</p>
                             <p>Tổng tiền đơn hàng: ${savedOrder.orderTotal}</p>
                             <p>Tên người nhận hàng: ${savedOrder.billing}</p>
                             <p>Địa chỉ giao hàng: ${savedOrder.address}</p>
                             <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng bắt đầu được giao.</p>
                             <p>Cảm ơn bạn đã mua sắm tại MicroMarket!</p>`,
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Error sending email:', error);
                        } else {
                            console.log('Email sent: ' + info.response);
                        }
                    });
                } else {
                    console.log('User email not found, skipping email notification.');
                }
            } catch (emailError) {
                console.error('Failed to send order confirmation email:', emailError);
                // Decide if this error should affect the response to the client
            }

            res.status(200).json(savedOrder);


        }
        catch (err) {
            console.log(err);
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
    //Thêm phần đánh giá sản phẩm
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

    getReviewsByProductId: async (req, res) => {
        try {
            const { productId } = req.params;
            console.log("Fetching reviews for product:", productId);

            
            const orders = await OrderModel.find({ rated: true })
                .populate("user", "username") // Lấy tên user
                .populate("products.product", "_id"); // Lấy product Id

            // Lấy đánh giá theo product ID
            const reviews = orders
                .filter(order =>
                    order.products.some(p => p.product?._id?.toString() === productId)
                )
                .map(order => ({
                    rating: order.rating,
                    comment: order.comment,
                    customer: order.user?.username || "Khách hàng",
                    createdAt: order.updatedAt,
                }))
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // sắp xếp theo ngày tạo
            
            console.log(reviews);

            res.status(200).json({ data: reviews });
        } catch (error) {
            console.error("Error fetching product reviews:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }


}

module.exports = orderController;