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
            const user = await UserModel.findById(_id);
            
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Chuẩn bị data để update
            const updateData = {
                username,
                email,
                role,
                phone,
                status
            };

            // Nếu có password mới thì hash nó
            if (password && password.trim() !== '') {
                // Validate độ dài password
                if (password.length < 6) {
                    return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
                }

                // Hash password mới
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                updateData.password = hashedPassword;
            }

            // Update user
            const updatedUser = await UserModel.findByIdAndUpdate(
                _id, 
                updateData, 
                { new: true }
            ).select('-password'); // Không trả về password trong response

            return res.status(200).json({
                message: "Update success",
                data: updatedUser
            });
        } catch (err) {
            console.log(err);
            
            // Xử lý lỗi duplicate email hoặc phone
            if (err.code === 11000) {
                const field = Object.keys(err.keyPattern)[0];
                return res.status(400).json({ 
                    message: `${field === 'email' ? 'Email' : 'Số điện thoại'} đã tồn tại` 
                });
            }
            
            return res.status(500).json({ 
                message: 'Có lỗi xảy ra', 
                error: err.message 
            });
        }
    },

    changePassword: async (req, res) => {
     
        const _id = req.user._id || req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        try {
            // Validate input
            if (!currentPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin' });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({ message: 'Mật khẩu mới không khớp' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
            }

            // Tìm user
            const user = await UserModel.findById(_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            // Kiểm tra mật khẩu hiện tại
            const validPassword = await bcrypt.compare(currentPassword, user.password);
            if (!validPassword) {
                return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
            }

            // Hash mật khẩu mới
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Cập nhật mật khẩu
            user.password = hashedPassword;
            await user.save();

            return res.status(200).json({ message: 'Đổi mật khẩu thành công' });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'Có lỗi xảy ra', error: err });
        }
    },

    resetPassword: async (req, res) => {
        const _id = req.params.id;
        const { newPassword } = req.body;
        
        try {
            if (!newPassword) {
                return res.status(400).json({ message: 'Vui lòng nhập mật khẩu mới' });
            }

            if (newPassword.length < 6) {
                return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
            }

            const user = await UserModel.findById(_id);
            if (!user) {
                return res.status(404).json({ message: 'Không tìm thấy người dùng' });
            }

            // Hash mật khẩu mới
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            // Cập nhật mật khẩu
            user.password = hashedPassword;
            await user.save();

            return res.status(200).json({ message: 'Reset mật khẩu thành công' });
        } catch (err) {
            console.log(err);
            return res.status(500).json({ message: 'Có lỗi xảy ra', error: err });
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

    updateProfile: async (req, res) => {
        try {
            // Lấy token từ header
            const authHeader = req.headers.authorization;
            const token = authHeader.split(' ')[1]; 
            
            const decoded = jwt.verify(token, _const.JWT_ACCESS_KEY);
            const userId = decoded._id;

            const { username, phone } = req.body;

            if (!username || !phone) {
                return res.status(400).json({ 
                    message: 'Username và số điện thoại là bắt buộc' 
                });
            }

            const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({ 
                    message: 'Số điện thoại không hợp lệ' 
                });
            }

            // Update user
            const updatedUser = await UserModel.findByIdAndUpdate(
                userId,
                { username, phone },
                { new: true }
            ).select('-password');

            if (!updatedUser) {
                return res.status(404).json({ 
                    message: 'Không tìm thấy người dùng' 
                });
            }

            return res.status(200).json({ 
                message: 'Cập nhật thông tin thành công',
                user: updatedUser 
            });

        } catch (err) {
            console.error('Update profile error:', err);
            return res.status(500).json({ 
                message: 'Lỗi server',
                error: err.message 
            });
        }
    },

    getProfile: async (req, res) => {
        try {
            const token = req.headers.authorization;
            const decoded = jwt.verify(token, _const.JWT_ACCESS_KEY);
            
            // Lấy thông tin user từ database thay vì chỉ trả về decoded token
            const user = await UserModel.findById(decoded._id).select('-password');
            
            if (!user) {
                return res.status(404).json({ 
                    message: 'Không tìm thấy người dùng' 
                });
            }

            res.status(200).json({ user });
        } catch (err) {
            console.error('Get profile error:', err);
            res.status(401).json({ 
                message: 'Unauthorized',
                error: err.message 
            });
        }
    },

    
}

module.exports = userController;