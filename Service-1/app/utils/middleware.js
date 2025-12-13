const jwt = require('jsonwebtoken');
const _const = require('../config/constant');
const News = require('../models/news');

module.exports = {

    checkLogin: (req, res, next) => {
        let token = req.header('Authorization');
        if (!token) return res.status(401).send('Access Denied');

        if (token.startsWith('Bearer ')) {
            token = token.replace('Bearer ', '');
        }

        try {
            const verified = jwt.verify(token, _const.JWT_ACCESS_KEY);
            req.user = verified;  
            next();
        } catch (err) {
            console.error('❌ checkLogin error:', err.message);
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


            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Vui lòng đăng nhập để truy cập'
                });
            }


            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                console.warn('⚠️  Token không đúng định dạng JWT:', token.substring(0, 20) + '...');
                
                res.clearCookie('token');
                res.clearCookie('client');
                
                return res.status(401).json({
                    success: false,
                    message: 'Token không hợp lệ. Vui lòng đăng nhập lại.'
                });
            }

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