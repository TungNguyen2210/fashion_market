const jwt = require('jsonwebtoken');
const _const = require('../config/constant');
const Category = require('../models/category');
const Product = require('../models/product');
const Order = require('../models/order');
const ReviewModel = require('../models/review');
const color = require('../models/color');
const axios = require('axios');

module.exports = {
    checkLogin: async (req, res, next) => {
        const authHeader = req.header('Authorization');
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                message: 'Access Denied - No token provided' 
            });
        }

        try {
            // Extract token
            const token = authHeader.startsWith('Bearer ') 
                ? authHeader.slice(7) 
                : authHeader;
            
            console.log('🔍 [MIDDLEWARE] Token length:', token.length);
            
            // ✅ TRY TO VERIFY AS JWT FIRST
            let isJWT = false;
            let jwtPayload = null;
            
            try {
                // Attempt to decode as JWT
                const decoded = jwt.decode(token, { complete: true });
                if (decoded && decoded.header && decoded.header.alg) {
                    // This looks like a JWT
                    isJWT = true;
                    console.log('🔐 [MIDDLEWARE] Detected JWT token structure');
                }
            } catch (decodeError) {
                console.log('🔍 [MIDDLEWARE] Not a JWT token');
            }
            
            // ✅ HANDLE JWT TOKEN
            if (isJWT) {
                console.log('🔐 [MIDDLEWARE] Verifying JWT token...');
                
                try {
                    const verified = jwt.verify(token, _const.JWT_ACCESS_KEY);
                    
                    console.log('📋 [MIDDLEWARE] Token verified successfully!');
                    console.log('📋 [MIDDLEWARE] Token payload:', JSON.stringify(verified, null, 2));
                    
                    // ✅ CHUẨN HÓA CẤU TRÚC TOKEN
                    req.user = {
                        user: {
                            _id: verified._id || verified.userId || verified.id,
                            email: verified.email,
                            username: verified.username,
                            role: verified.role,
                            status: verified.status
                        }
                    };
                    
                    // ✅ Kiểm tra xem có phải admin không
                    if (verified.role === 'admin' || verified.role === 'isAdmin') {
                        req.user.isAdmin = true;
                        console.log('✅ [MIDDLEWARE] Admin user verified');
                    }
                    
                    console.log('✅ [MIDDLEWARE] JWT verified - user._id =', req.user.user._id);
                    return next();
                    
                } catch (verifyError) {
                    console.error('❌ [MIDDLEWARE] JWT verify error:', verifyError.message);
                    
                    if (verifyError.name === 'JsonWebTokenError') {
                        return res.status(401).json({ 
                            success: false,
                            message: 'Invalid token format',
                            error: verifyError.message 
                        });
                    }
                    
                    if (verifyError.name === 'TokenExpiredError') {
                        return res.status(401).json({ 
                            success: false,
                            message: 'Token expired',
                            error: verifyError.message 
                        });
                    }
                    
                    throw verifyError;
                }
            }
            
            // ✅ HANDLE GOOGLE TOKEN (only for very long tokens that are not JWT)
            if (!isJWT && token.length > 1000) {
                console.log('🔐 [MIDDLEWARE] Detected possible Google OAuth token, verifying with auth service...');
                
                try {
                    // Call auth service to verify Google token
                    const authResponse = await axios.get('http://localhost:3200/api/auth/me', {
                        headers: {
                            Authorization: authHeader
                        }
                    });
                    
                    if (authResponse.data.success && authResponse.data.user) {
                        console.log('✅ [MIDDLEWARE] Google token verified');
                        const googleUser = authResponse.data.user;
                        req.user = {
                            user: {
                                _id: googleUser._id || googleUser.id,
                                email: googleUser.email,
                                username: googleUser.username,
                                role: googleUser.role
                            },
                            isGoogleAuth: true
                        };
                        return next();
                    } else {
                        throw new Error('Invalid auth service response');
                    }
                } catch (authError) {
                    console.error('❌ [MIDDLEWARE] Google token verification failed:', authError.message);
                    return res.status(401).json({ 
                        success: false,
                        message: 'Invalid Google token',
                        error: authError.message 
                    });
                }
            }
            
            // ✅ TOKEN KHÔNG PHẢI JWT CŨNG KHÔNG PHẢI GOOGLE
            console.error('❌ [MIDDLEWARE] Unknown token type');
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token type',
                tokenLength: token.length,
                isJWT: isJWT
            });
            
        } catch (err) {
            console.error('❌ [MIDDLEWARE] Token verification failed:', err.message);
            return res.status(400).json({ 
                success: false,
                message: 'Token verification failed',
                error: err.message 
            });
        }
    },

    getCategory: async (req, res, next) => {
        let category;
        try {
            category = await Category.findById(req.params.id);
            if (category == null) {
                return res.status(404).json({ message: 'Cannot find category' });
            }
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }

        res.category = category;
        next();
    },

    getProduct: async (req, res, next) => {
        try {
            const productId = req.params.id;

            console.log('🔍 [MIDDLEWARE] Getting product:', productId);

            // Lấy thông tin sản phẩm
            const product = await Product.findById(productId).populate('category');
            if (!product) {
                console.log('❌ [MIDDLEWARE] Product not found');
                return res.status(404).json({ 
                    success: false,
                    message: 'Cannot find product' 
                });
            }

            console.log('✅ [MIDDLEWARE] Product found:', product.name);

            // Lấy thông tin đánh giá
            const reviews = await ReviewModel.find({ product: productId })
                .populate('user', 'username email')
                .select('comment rating createdAt user')
                .sort({ createdAt: -1 });
            
            const reviewCount = reviews.length;
            let avgRating = 0;

            // Tính trung bình số sao đánh giá
            if (reviewCount > 0) {
                const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                avgRating = totalRating / reviewCount;
            }

            // Tính thống kê đánh giá
            const reviewStats = {};
            for (const review of reviews) {
                if (reviewStats[review.rating]) {
                    reviewStats[review.rating]++;
                } else {
                    reviewStats[review.rating] = 1;
                }
            }

            const reviewStatsArray = Array.from({ length: 5 }, (_, i) => {
                const rating = i + 1;
                return reviewStats[rating] || 0;
            });

            console.log('✅ [MIDDLEWARE] Found reviews:', reviewCount);

            // ✅ GẮN DỮ LIỆU VÀO req THAY VÌ res.json()
            req.productData = {
                product: product,
                reviewStats: reviewStatsArray,
                avgRating: avgRating,
                reviewCount: reviewCount,
                reviews: reviews
            };

            // ✅ GỌI next() ĐỂ CHUYỂN SANG CONTROLLER
            next();

        } catch (error) {
            console.error('❌ [MIDDLEWARE] Error getting product:', error);
            return res.status(500).json({ 
                success: false,
                message: 'Server error',
                error: error.message 
            });
        }
    },

    getColor: async (req, res, next) => {
        let news;
        try {
            news = await color.findById(req.params.id);
            if (news == null) {
                return res.status(404).json({ message: 'Cannot find color' });
            }
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }

        res.news = news;
        next();
    },

    getOrder: async (req, res, next) => {
        try {
          const order = await Order.findById(req.params.id)
            .populate('user', 'username')
            .populate({
              path: 'products.product',
              select: 'name',
            });
      
          if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
          }

          console.log(order)
      
          const userName = order.user ? order.user.username : null;
          const productNames = order.products.map((product) => product.product.name);
      
          const result = {
            _id: order._id,
            user: userName,
            products: productNames,
            orderTotal: order.orderTotal,
            address: order.address,
            billing: order.billing,
            status: order.status,
            description: order.description,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
          };
      
          res.order = result;
          next();
        } catch (err) {
          return res.status(500).json({ message: err.message });
        }
    },

    checkRole: (role) => async (req, res, next) => {
        if (req.user.user.role !== role) {
            return res.status(403).json({ 
                success: false,
                message: 'Forbidden - Insufficient permissions' 
            });
        }
        next();
    }
}