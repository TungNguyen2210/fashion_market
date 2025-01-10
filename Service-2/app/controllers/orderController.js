const OrderModel = require('../models/order');
const _const = require('../config/constant')
const jwt = require('jsonwebtoken');
const Product = require('../models/product');
const user = require('../models/user');

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

                if (insufficientQuantityProducts.length > 0) {
                    return res.status(200).json({
                        error: 'Insufficient quantity for one or more products.',
                        insufficientQuantityProducts,
                    });
                }


                // Update the product quantity
                if (product) {
                    product.quantity -= quantity;
                    await product.save();
                }
            }


            const orderList = await order.save();
            res.status(200).json(orderList);


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
                .populate('products.product'); // Chỉ lấy tên và giá sản phẩm
            res.status(200).json({ data: orders });
        } catch (err) {
            res.status(401).send('Unauthorized');
        }
    }
}

module.exports = orderController;