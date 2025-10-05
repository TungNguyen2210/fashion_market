const Promotion = require('../models/promotion');
const mongoose = require('mongoose');

const promotionController = {
    // Lấy tất cả promotions với filter
    getAllPromotions: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 10, 
                loai, 
                trangThai,
                sortBy = 'ngayTao',
                sortOrder = 'desc'
            } = req.query;

            // Tạo filter object
            const filter = {};
            if (loai) filter.loai = loai;
            if (trangThai) filter.trangThai = trangThai;

            // Tạo sort object
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const options = {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                sort,
                populate: {
                    path: 'sanPhamApDung',
                    select: 'name price image'
                }
            };

            const promotions = await Promotion.paginate(filter, options);
            res.status(200).json({
                success: true,
                data: promotions
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    // Lấy promotion theo ID
    getPromotionById: async (req, res) => {
        try {
            const promotion = await Promotion.findById(req.params.id)
                .populate('sanPhamApDung', 'name price image');
            
            if (!promotion) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khuyến mãi'
                });
            }

            res.status(200).json({
                success: true,
                data: promotion
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    // ===== NEW API ENDPOINTS FOR SERVICE-2 =====

    // 🔥 API tăng số lượng đã sử dụng của promotion
    incrementUsage: async (req, res) => {
        try {
            const promotionId = req.params.id;
            
            console.log(`🔄 Incrementing usage for promotion: ${promotionId}`);
            
            const updatedPromotion = await Promotion.findByIdAndUpdate(
                promotionId,
                { $inc: { soLuongDaSuDung: 1 } },
                { new: true }
            );

            if (!updatedPromotion) {
                return res.status(404).json({
                    success: false,
                    message: 'Promotion not found'
                });
            }

            console.log(`✅ Updated promotion usage: ${updatedPromotion.soLuongDaSuDung}/${updatedPromotion.soLuong || 'unlimited'}`);

            res.status(200).json({
                success: true,
                message: 'Promotion usage updated successfully',
                data: {
                    _id: updatedPromotion._id,
                    soLuongDaSuDung: updatedPromotion.soLuongDaSuDung,
                    soLuong: updatedPromotion.soLuong,
                    tenKhuyenMai: updatedPromotion.tenKhuyenMai
                }
            });
        } catch (error) {
            console.error('❌ Error updating promotion usage:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating promotion usage',
                error: error.message
            });
        }
    },

    // 🔥 API lấy nhiều promotions cùng lúc (cho email)
    getBatchPromotions: async (req, res) => {
        try {
            const { ids } = req.body;
            
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'IDs array is required'
                });
            }

            console.log(`🔍 Getting batch promotions for IDs: ${ids.join(', ')}`);

            const promotions = await Promotion.find({
                _id: { $in: ids }
            }).select('_id tenKhuyenMai maKhuyenMai phanTramKhuyenMai giamToiDa loai');

            console.log(`✅ Found ${promotions.length} promotions`);

            res.status(200).json({
                success: true,
                data: promotions
            });
        } catch (error) {
            console.error('❌ Error getting batch promotions:', error);
            res.status(500).json({
                success: false,
                message: 'Error getting promotions',
                error: error.message
            });
        }
    },

    // ===== EXISTING METHODS =====

    // Tạo promotion mới
    createPromotion: async (req, res) => {
        const {
            maKhuyenMai,
            tenKhuyenMai,
            loai,
            phanTramKhuyenMai,
            giaTriToiThieu,
            giamToiDa,
            soLuong,
            sanPhamApDung,
            thoiGianBD,
            thoiGianKT,
            moTa
        } = req.body;

        try {
            // Kiểm tra mã khuyến mãi đã tồn tại
            const existingPromotion = await Promotion.findOne({ maKhuyenMai });
            if (existingPromotion) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã khuyến mãi đã tồn tại'
                });
            }

            // Validate dates trước khi create
            const startDate = new Date(thoiGianBD);
            const endDate = new Date(thoiGianKT);
            
            if (isNaN(startDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: `Ngày bắt đầu không hợp lệ: ${thoiGianBD}`
                });
            }
            
            if (isNaN(endDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: `Ngày kết thúc không hợp lệ: ${thoiGianKT}`
                });
            }
            
            if (endDate.getTime() <= startDate.getTime()) {
                return res.status(400).json({
                    success: false,
                    message: `Thời gian kết thúc (${endDate.toLocaleDateString('vi-VN')}) phải sau thời gian bắt đầu (${startDate.toLocaleDateString('vi-VN')})`
                });
            }

            // Validate dữ liệu theo loại
            if (loai === 'voucher' && !giamToiDa) {
                return res.status(400).json({
                    success: false,
                    message: 'Voucher phải có giá trị giảm tối đa'
                });
            }

            if (loai === 'free_shipping' && phanTramKhuyenMai !== 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Free shipping không có phần trăm khuyến mãi'
                });
            }

            const newPromotion = new Promotion({
                maKhuyenMai,
                tenKhuyenMai,
                loai,
                phanTramKhuyenMai,
                giaTriToiThieu: giaTriToiThieu || 0,
                giamToiDa: loai === 'voucher' ? giamToiDa : null,
                soLuong: loai === 'voucher' ? soLuong : null,
                sanPhamApDung: sanPhamApDung || [],
                thoiGianBD: startDate,
                thoiGianKT: endDate,
                moTa
            });

            const savedPromotion = await newPromotion.save();
            res.status(201).json({
                success: true,
                data: savedPromotion,
                message: 'Tạo khuyến mãi thành công'
            });
        } catch (err) {
            console.error('❌ Create promotion error:', err);
            res.status(400).json({
                success: false,
                message: err.message
            });
        }
    },

    // Cập nhật promotion với date validation fix
    updatePromotion: async (req, res) => {
        try {
            const updateData = { ...req.body };
            
            console.log('📥 Update promotion request:', {
                id: req.params.id,
                updateData
            });
            
            // Xử lý dates
            if (updateData.thoiGianBD) {
                updateData.thoiGianBD = new Date(updateData.thoiGianBD);
                if (isNaN(updateData.thoiGianBD.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: `Ngày bắt đầu không hợp lệ: ${req.body.thoiGianBD}`
                    });
                }
            }
            
            if (updateData.thoiGianKT) {
                updateData.thoiGianKT = new Date(updateData.thoiGianKT);
                if (isNaN(updateData.thoiGianKT.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: `Ngày kết thúc không hợp lệ: ${req.body.thoiGianKT}`
                    });
                }
            }
            
            // Validate dates before update
            if (updateData.thoiGianBD && updateData.thoiGianKT) {
                const startTime = updateData.thoiGianBD.getTime();
                const endTime = updateData.thoiGianKT.getTime();
                
                if (endTime <= startTime) {
                    return res.status(400).json({
                        success: false,
                        message: `Thời gian kết thúc (${updateData.thoiGianKT.toLocaleDateString('vi-VN')}) phải sau thời gian bắt đầu (${updateData.thoiGianBD.toLocaleDateString('vi-VN')})`
                    });
                }
            } else if (updateData.thoiGianBD || updateData.thoiGianKT) {
                const currentPromotion = await Promotion.findById(req.params.id);
                if (!currentPromotion) {
                    return res.status(404).json({
                        success: false,
                        message: 'Không tìm thấy khuyến mãi'
                    });
                }
                
                const finalStartDate = updateData.thoiGianBD || currentPromotion.thoiGianBD;
                const finalEndDate = updateData.thoiGianKT || currentPromotion.thoiGianKT;
                
                if (finalEndDate <= finalStartDate) {
                    return res.status(400).json({
                        success: false,
                        message: `Thời gian kết thúc (${finalEndDate.toLocaleDateString('vi-VN')}) phải sau thời gian bắt đầu (${finalStartDate.toLocaleDateString('vi-VN')})`
                    });
                }
            }

            const updatedPromotion = await Promotion.findByIdAndUpdate(
                req.params.id,
                updateData,
                { 
                    new: true, 
                    runValidators: false
                }
            ).populate('sanPhamApDung', 'name price image');

            if (!updatedPromotion) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khuyến mãi'
                });
            }

            res.status(200).json({
                success: true,
                data: updatedPromotion,
                message: 'Cập nhật khuyến mãi thành công'
            });
        } catch (err) {
            console.error('❌ Update promotion error:', err);
            res.status(400).json({
                success: false,
                message: err.message
            });
        }
    },

    // Xóa promotion
    deletePromotion: async (req, res) => {
        try {
            const deletedPromotion = await Promotion.findByIdAndDelete(req.params.id);
            
            if (!deletedPromotion) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khuyến mãi'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Xóa khuyến mãi thành công'
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    // ENHANCED: Tìm kiếm promotion với debug logs và workaround
    searchPromotions: async (req, res) => {
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        const { 
            page = 1, 
            limit = 10, 
            keyword,
            name,
            loai,
            trangThai,
            _t
        } = req.query;

        try {
            let searchKeyword = keyword;
            if (!keyword && name && name !== 'undefined') {
                searchKeyword = name;
            }

            const searchQuery = {};
            
            if (searchKeyword && searchKeyword.trim() !== '') {
                searchQuery.$or = [
                    { maKhuyenMai: { $regex: searchKeyword.trim(), $options: 'i' } },
                    { tenKhuyenMai: { $regex: searchKeyword.trim(), $options: 'i' } }
                ];
            }
            
            if (loai && loai !== 'all') {
                searchQuery.loai = loai;
            }
            
            if (trangThai && trangThai !== 'all') {
                searchQuery.trangThai = trangThai;
            }

            const options = {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                sort: { ngayTao: -1 },
                populate: {
                    path: 'sanPhamApDung',
                    select: 'name price image'
                }
            };

            const promotions = await Promotion.paginate(searchQuery, options);
            
            res.status(200).json({
                success: true,
                data: promotions
            });
        } catch (err) {
            console.error('❌ Search error:', err);
            res.status(500).json({
                success: false,
                message: err.message,
                error: err.toString()
            });
        }
    },

    // Lấy promotion đang active
    getActivePromotions: async (req, res) => {
        try {
            const now = new Date();
            const activePromotions = await Promotion.find({
                thoiGianBD: { $lte: now },
                thoiGianKT: { $gte: now },
                trangThai: 'active'
            }).populate('sanPhamApDung', 'name price image');

            res.status(200).json({
                success: true,
                data: activePromotions
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    // Áp dụng promotion cho sản phẩm
    applyPromotionToProduct: async (req, res) => {
        const { promotionId, productId } = req.params;

        try {
            const promotion = await Promotion.findById(promotionId);
            if (!promotion) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khuyến mãi'
                });
            }

            if (promotion.sanPhamApDung.includes(productId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Sản phẩm đã được áp dụng khuyến mãi này'
                });
            }

            promotion.sanPhamApDung.push(productId);
            await promotion.save();

            res.status(200).json({
                success: true,
                message: 'Áp dụng khuyến mãi thành công',
                data: promotion
            });
        } catch (err) {
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    // ===== NEW ENDPOINTS FOR CART SYSTEM =====

    // 1. Lấy promotion active cho nhiều sản phẩm (dùng cho cart)
    getActiveProductPromotions: async (req, res) => {
        try {
            const { productIds } = req.query; // "id1,id2,id3"
            const productIdArray = productIds ? productIds.split(',') : [];
            
            if (productIdArray.length === 0) {
                return res.json({ 
                    success: true, 
                    promotions: {} 
                });
            }
            
            console.log('🔍 Getting promotions for products:', productIdArray);
            
            // Lấy tất cả promotion đang active cho đợt giảm giá
            const now = new Date();
            const activePromotions = await Promotion.find({
                loai: 'dot_giam_gia',
                trangThai: 'active',
                thoiGianBD: { $lte: now },
                thoiGianKT: { $gte: now }
            });
            
            console.log('📊 Found active promotions:', activePromotions.length);
            
            // Nếu có bảng PromotionProduct riêng
            let promotionProducts = [];
            if (PromotionProduct) {
                promotionProducts = await PromotionProduct.find({
                    promotion_id: { $in: activePromotions.map(p => p._id) },
                    product_id: { $in: productIdArray }
                }).populate('promotion_id');
            } else {
                // Nếu không có bảng riêng, check trực tiếp trong promotion.sanPhamApDung
                promotionProducts = activePromotions.filter(promotion => 
                    promotion.sanPhamApDung.some(productId => 
                        productIdArray.includes(productId.toString())
                    )
                ).map(promotion => ({
                    promotion_id: promotion,
                    product_id: promotion.sanPhamApDung.find(productId => 
                        productIdArray.includes(productId.toString())
                    )
                }));
            }
            
            console.log('🎯 Found promotion-product matches:', promotionProducts.length);
            
            const result = {};
            promotionProducts.forEach(pp => {
                const promotion = pp.promotion_id;
                const productId = pp.product_id;
                
                result[productId] = {
                    id: promotion._id,
                    name: promotion.tenKhuyenMai,
                    type: promotion.loai,
                    discountPercent: promotion.phanTramKhuyenMai,
                    maxDiscountAmount: promotion.giamToiDa
                };
            });
            
            console.log('✅ Final result:', result);
            
            res.json({
                success: true,
                promotions: result
            });
            
        } catch (error) {
            console.error('❌ Error getting product promotions:', error);
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    },

    // 2. Validate voucher code
    validateVoucher: async (req, res) => {
        try {
            const { voucherCode, orderValue } = req.body;
            
            console.log('🎫 Validating voucher:', { voucherCode, orderValue });
            
            if (!voucherCode || !voucherCode.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập mã voucher'
                });
            }
            
            const now = new Date();
            const voucher = await Promotion.findOne({
                maKhuyenMai: voucherCode.trim(),
                loai: 'voucher',
                trangThai: 'active',
                thoiGianBD: { $lte: now },
                thoiGianKT: { $gte: now },
                giaTriToiThieu: { $lte: orderValue || 0 },
                $expr: { 
                    $or: [
                        { $eq: ['$soLuong', null] }, // Không giới hạn số lượng
                        { $lt: ['$soLuongDaSuDung', '$soLuong'] } // Còn slot
                    ]
                }
            });
            
            if (!voucher) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã voucher không hợp lệ hoặc không đủ điều kiện sử dụng'
                });
            }
            
            console.log('✅ Voucher valid:', voucher.tenKhuyenMai);
            
            res.json({
                success: true,
                voucher: {
                    id: voucher._id,
                    code: voucher.maKhuyenMai,
                    name: voucher.tenKhuyenMai,
                    discountPercent: voucher.phanTramKhuyenMai,
                    maxDiscountAmount: voucher.giamToiDa,
                    minOrderValue: voucher.giaTriToiThieu
                }
            });
            
        } catch (error) {
            console.error('❌ Error validating voucher:', error);
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    },

    // 3. Tính discount amount cho voucher
    calculateVoucherDiscount: async (req, res) => {
        try {
            const { voucherId, orderValue } = req.body;
            
            const voucher = await Promotion.findById(voucherId);
            if (!voucher) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Voucher không tồn tại' 
                });
            }
            
            let discountAmount = 0;
            if (voucher.phanTramKhuyenMai > 0) {
                discountAmount = (orderValue * voucher.phanTramKhuyenMai) / 100;
                if (voucher.giamToiDa > 0) {
                    discountAmount = Math.min(discountAmount, voucher.giamToiDa);
                }
            }
            
            res.json({
                success: true,
                discountAmount: Math.round(discountAmount),
                voucher: {
                    id: voucher._id,
                    name: voucher.tenKhuyenMai,
                    code: voucher.maKhuyenMai
                }
            });
            
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    },

    // 4. Check free shipping promotion
    checkFreeShipping: async (req, res) => {
        try {
            const { orderValue, address } = req.body;
            
            const now = new Date();
            const freeShipPromotion = await Promotion.findOne({
                loai: 'free_shipping',
                trangThai: 'active',
                thoiGianBD: { $lte: now },
                thoiGianKT: { $gte: now },
                giaTriToiThieu: { $lte: orderValue },
                $expr: { 
                    $or: [
                        { $eq: ['$soLuong', null] },
                        { $lt: ['$soLuongDaSuDung', '$soLuong'] }
                    ]
                }
            });
            
            res.json({
                success: true,
                freeShipping: !!freeShipPromotion,
                promotion: freeShipPromotion ? {
                    id: freeShipPromotion._id,
                    name: freeShipPromotion.tenKhuyenMai,
                    minOrderValue: freeShipPromotion.giaTriToiThieu
                } : null
            });
            
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    },

    // 5. Lấy promotion theo loại
    getPromotionsByType: async (req, res) => {
        try {
            const { type } = req.params;
            const { active = false } = req.query;
            
            let query = { loai: type };
            
            if (active === 'true') {
                const now = new Date();
                query = {
                    ...query,
                    trangThai: 'active',
                    thoiGianBD: { $lte: now },
                    thoiGianKT: { $gte: now }
                };
            }
            
            const promotions = await Promotion.find(query)
                .populate('sanPhamApDung', 'name price image')
                .sort({ ngayTao: -1 });
            
            res.json({
                success: true,
                data: promotions
            });
            
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    },

    // 6. Check promotion availability
    checkPromotionAvailability: async (req, res) => {
        try {
            const { id } = req.params;
            
            const promotion = await Promotion.findById(id);
            if (!promotion) {
                return res.status(404).json({
                    success: false,
                    message: 'Promotion không tồn tại'
                });
            }
            
            const now = new Date();
            const isActive = promotion.trangThai === 'active' && 
                           promotion.thoiGianBD <= now && 
                           promotion.thoiGianKT >= now;
            
            const hasSlot = !promotion.soLuong || 
                          (promotion.soLuongDaSuDung || 0) < promotion.soLuong;
            
            res.json({
                success: true,
                available: isActive && hasSlot,
                details: {
                    isActive,
                    hasSlot,
                    usedQuantity: promotion.soLuongDaSuDung || 0,
                    totalQuantity: promotion.soLuong,
                    startDate: promotion.thoiGianBD,
                    endDate: promotion.thoiGianKT
                }
            });
            
        } catch (error) {
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    }
};

module.exports = promotionController;