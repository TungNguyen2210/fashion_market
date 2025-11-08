const jwt = require('jsonwebtoken');
const _const = require('../config/constant');
const News = require('../models/news');

module.exports = {
    // ===== GIỮ NGUYÊN CÁC FUNCTION CŨ =====
    checkLogin: (req, res, next) => {
        const token = req.header('Authorization');
        if (!token) return res.status(401).send('Access Denied');

        try {
            const verified = jwt.verify(token, _const.JWT_ACCESS_KEY);
            next();
        } catch (err) {
            return res.status(400).send('Invalid Token');
        }
    },

    getNews: async (req, res, next) => {
        let news;
        try {
            news = await News.findById(req.params.id);
            if (news == null) {
                return res.status(404).json({ message: 'Cannot find news' });
            }
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }

        res.news = news;
        next();
    },

    checkRole: (role) => async (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).send('Forbidden');
        }
        next();
    },

    /**
     * ✅ CẬP NHẬT: Middleware bảo vệ routes - hỗ trợ cả Cookie và Bearer token
     */
    protect: async (req, res, next) => {
        try {
            let token;

            // Lấy token từ cookie
            if (req.cookies && req.cookies.token) {
                token = req.cookies.token;
            }
            // Lấy token từ Authorization header
            else if (req.headers.authorization?.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            }
            // Lấy token từ header Authorization (không có Bearer)
            else if (req.headers.authorization) {
                token = req.headers.authorization;
            }

            // ✅ KIỂM TRA TOKEN TỒN TẠI
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Vui lòng đăng nhập để truy cập'
                });
            }

            // ✅ KIỂM TRA TOKEN CÓ ĐÚNG ĐỊNH DẠNG JWT KHÔNG (3 phần: header.payload.signature)
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                console.warn('⚠️  Token không đúng định dạng JWT:', token.substring(0, 20) + '...');
                
                // Xóa cookie không hợp lệ
                res.clearCookie('token');
                res.clearCookie('client');
                
                return res.status(401).json({
                    success: false,
                    message: 'Token không hợp lệ. Vui lòng đăng nhập lại.'
                });
            }

            // ✅ KIỂM TRA TOKEN KHÔNG PHẢI LÀ CHUỖI RỖNG
            if (token.trim() === '' || tokenParts.some(part => part.trim() === '')) {
                console.warn('⚠️  Token chứa phần rỗng');
                
                res.clearCookie('token');
                res.clearCookie('client');
                
                return res.status(401).json({
                    success: false,
                    message: 'Token không hợp lệ. Vui lòng đăng nhập lại.'
                });
            }

            // Verify token
            const decoded = jwt.verify(token, _const.JWT_ACCESS_KEY);
            
            // Lưu thông tin user vào request
            req.user = decoded;
            
            next();

        } catch (error) {
            console.error('❌ Auth middleware error:', error.message);
            
            // Xóa cookies không hợp lệ khi có lỗi
            res.clearCookie('token');
            res.clearCookie('client');
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token không hợp lệ. Vui lòng đăng nhập lại.'
                });
            }
            
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token đã hết hạn, vui lòng đăng nhập lại'
                });
            }

            return res.status(401).json({
                success: false,
                message: 'Xác thực thất bại. Vui lòng đăng nhập lại.'
            });
        }
    }
}