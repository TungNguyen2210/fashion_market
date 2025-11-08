const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const User = require('../models/user');
const _const = require('../config/constant');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const registerUser = async (req, res) => {
    try {
        const { email, password, username, phone } = req.body;

        // Kiểm tra email đã tồn tại
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Email đã được sử dụng'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Tạo user mới
        const newUser = await User.create({
            email,
            password: hashedPassword,
            username: username || email.split('@')[0],
            phone: phone || '',
            role: 'isClient',
            status: 'actived',
            authProvider: 'local',
            isVerified: false
        });

        // Tạo token với cả _id
        const token = jwt.sign(
            {
                userId: newUser._id,
                _id: newUser._id,  // 🔥 THÊM DÒNG NÀY
                email: newUser.email,
                username: newUser.username,
                role: newUser.role
            },
            _const.JWT_ACCESS_KEY,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Đăng ký thành công',
            user: {
                id: newUser._id,
                _id: newUser._id,  // 🔥 THÊM DÒNG NÀY
                email: newUser.email,
                username: newUser.username,
                role: newUser.role,
                status: newUser.status
            },
            token
        });

    } catch (error) {
        console.error('❌ Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi đăng ký',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kiểm tra user tồn tại
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Kiểm tra user có đăng ký bằng Google không
        if (user.authProvider === 'google' && !user.password) {
            return res.status(400).json({
                success: false,
                message: 'Tài khoản này đã đăng ký bằng Google. Vui lòng đăng nhập bằng Google.'
            });
        }

        // Kiểm tra password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Email hoặc mật khẩu không đúng'
            });
        }

        // Kiểm tra trạng thái tài khoản
        if (user.status !== 'actived') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị khóa hoặc chưa được kích hoạt'
            });
        }

        // Tạo token với cả _id
        const token = jwt.sign(
            {
                userId: user._id,
                _id: user._id,  // 🔥 THÊM DÒNG NÀY
                email: user.email,
                username: user.username,
                role: user.role,
                status: user.status
            },
            _const.JWT_ACCESS_KEY,
            { expiresIn: '7d' }
        );

        // Set cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        };

        res.cookie('token', token, cookieOptions);

        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công',
            user: {
                id: user._id,
                _id: user._id,  // 🔥 THÊM DÒNG NÀY
                email: user.email,
                username: user.username,
                image: user.image,
                role: user.role,
                status: user.status,
                phone: user.phone
            },
            token
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi đăng nhập',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        // Kiểm tra credential
        if (!credential) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu Google credential'
            });
        }

        console.log('🔍 Verifying Google token...');

        // Verify token với Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { sub: googleId, email, name, picture, email_verified } = payload;

        console.log('✅ Google verification successful:', email);

        // Tìm user theo googleId hoặc email
        let user = await User.findOne({ 
            $or: [
                { googleId },
                { email }
            ]
        });

        if (user) {
            console.log('👤 Existing user found:', user.email);
            
            // Nếu user cũ chưa link Google, cập nhật
            if (!user.googleId && user.authProvider === 'local') {
                user.googleId = googleId;
                user.authProvider = 'google';
                user.isVerified = email_verified;
                user.image = picture || user.image;
                await user.save();
                console.log('🔗 Linked Google account to existing user');
            }
            
            // Nếu user đã có nhưng authProvider vẫn là local, update
            if (user.googleId === googleId && user.authProvider === 'local') {
                user.authProvider = 'google';
                await user.save();
            }
        } else {
            // Tạo user mới
            user = await User.create({
                googleId,
                email,
                username: name,
                image: picture || 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png',
                authProvider: 'google',
                isVerified: email_verified,
                role: 'isClient',
                status: 'actived',
                phone: ''
            });
            console.log('✨ Created new Google user:', user.email);
        }

        // Kiểm tra trạng thái tài khoản
        if (user.status !== 'actived') {
            return res.status(403).json({
                success: false,
                message: 'Tài khoản đã bị khóa hoặc chưa được kích hoạt'
            });
        }

        // Tạo JWT token với cả _id
        const token = jwt.sign(
            {
                userId: user._id,
                _id: user._id,  // 🔥 THÊM DÒNG NÀY
                email: user.email,
                username: user.username,
                role: user.role,
                status: user.status
            },
            _const.JWT_ACCESS_KEY,
            { expiresIn: '7d' }
        );

        // Set cookie
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        };

        res.cookie('token', token, cookieOptions);

        // Trả về response
        res.status(200).json({
            success: true,
            message: 'Đăng nhập Google thành công',
            user: {
                id: user._id,
                _id: user._id,  // 🔥 THÊM DÒNG NÀY
                email: user.email,
                username: user.username,
                image: user.image,
                role: user.role,
                status: user.status,
                phone: user.phone,
                authProvider: user.authProvider,
                isVerified: user.isVerified
            },
            token
        });

    } catch (error) {
        console.error('❌ Google login error:', error);
        
        // Xử lý các lỗi cụ thể
        if (error.message?.includes('Token used too late')) {
            return res.status(401).json({
                success: false,
                message: 'Google token đã hết hạn, vui lòng thử lại'
            });
        }

        if (error.message?.includes('Invalid token signature')) {
            return res.status(401).json({
                success: false,
                message: 'Google token không hợp lệ'
            });
        }

        res.status(401).json({
            success: false,
            message: 'Xác thực Google thất bại',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User không tồn tại'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                _id: user._id,  // 🔥 THÊM DÒNG NÀY
                email: user.email,
                username: user.username,
                image: user.image,
                role: user.role,
                status: user.status,
                phone: user.phone,
                authProvider: user.authProvider,
                isVerified: user.isVerified,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('❌ Get me error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi lấy thông tin user'
        });
    }
};

const logout = (req, res) => {
    res.clearCookie('token');
    res.json({
        success: true,
        message: 'Đăng xuất thành công'
    });
};

const verifyToken = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId)
            .select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                valid: false,
                message: 'User không tồn tại'
            });
        }

        res.json({
            success: true,
            valid: true,
            user: {
                id: user._id,
                _id: user._id,  // 🔥 THÊM DÒNG NÀY
                email: user.email,
                username: user.username,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error('❌ Verify token error:', error);
        res.status(500).json({
            success: false,
            valid: false,
            message: 'Lỗi verify token'
        });
    }
};

module.exports = {
    registerUser,
    login,
    googleLogin,
    getMe,
    logout,
    verifyToken
};