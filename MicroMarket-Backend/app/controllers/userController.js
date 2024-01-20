const UserModel = require('../models/user');
const bcrypt = require("bcrypt");
const _const = require('../config/constant')
const jwt = require('jsonwebtoken');

const userController = {
    getAllUser: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        try {
            const users = await UserModel.paginate({}, options);
            res.status(200).json({ data: users });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    createUser: async (req, res) => {
        try {
            const email = await UserModel.findOne({ email: req.body.email });
            const salt = await bcrypt.genSalt(10);
            const hashed = await bcrypt.hash(req.body.password, salt);

            if (!email) {
                const newUser = await new UserModel({
                    email: req.body.email,
                    phone: req.body.phone,
                    username: req.body.username,
                    password: hashed,
                    role: req.body.role,
                    status: req.body.status
                });

                const user = await newUser.save();
                res.status(200).json(user);
            } else {
                res.status(400).json("User already exists");
            }
        } catch (err) {
            res.status(500).json(err);
        }
    },

    deleteUser: async (req, res) => {
        try {
            const user = await UserModel.findByIdAndRemove(req.params.id);
            res.status(200).json("Delete success");
        } catch (err) {
            res.status(500).json(err);
        }
    },

    updateUser: async (req, res) => {
        const _id = req.params.id;
        const { username, email, password, role, phone, status } = req.body;
        try {
            const user = await UserModel.findByIdAndUpdate(_id, { username, email, password, role, phone, status }, { new: true });
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json("Update success");
        } catch (err) {
            console.log(err);
            return res.status(500).json(err);
        }
    },

    logout: async (req, res) => {
        try {

        } catch (err) {
            res.status(500).json(err);
        }
    },

    searchUserByEmail: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        const email = req.query.email;

        try {
            const productList = await UserModel.paginate({ email: { $regex: `.*${email}.*`, $options: 'i' } }, options);

            res.status(200).json({ data: productList });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getProfile: async (req, res) => {
        jwt.verify(req.headers.authorization, _const.JWT_ACCESS_KEY, (err, decodedToken) => {
            if (err) {
                // Xử lý lỗi
                res.status(401).send('Unauthorized');
            } else {
                res.status(200).json(decodedToken);
            }
        });
    },

}

module.exports = userController;