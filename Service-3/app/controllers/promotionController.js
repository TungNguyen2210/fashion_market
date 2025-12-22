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
            if (loai && loai !== 'all') filter.loai = loai;
            if (trangThai && trangThai !== 'all') filter.trangThai = trangThai;

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
            
            console.log('✅ Retrieved promotions:', promotions.docs?.length || 0);

            res.status(200).json({
                success: true,
                data: promotions
            });
        } catch (err) {
            console.error('❌ Get promotions error:', err);
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

            console.log('✅ Retrieved promotion:', promotion.maKhuyenMai);

            res.status(200).json({
                success: true,
                data: promotion
            });
        } catch (err) {
            console.error('❌ Get promotion by ID error:', err);
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

    // ===== NEW API ENDPOINTS FOR SERVICE-2 =====

    // 🔥 API tăng số lượng đã sử dụng của promotion
    incrementUsage: async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const promotionId = req.params.id;
            
            console.log(`🔄 Incrementing usage for promotion: ${promotionId}`);
            
            // Kiểm tra promotion có tồn tại và có thể sử dụng không
            const promotion = await Promotion.findById(promotionId).session(session);
            
            if (!promotion) {
                await session.abortTransaction();
                return res.status(404).json({
                    success: false,
                    message: 'Promotion not found'
                });
            }

            // Kiểm tra promotion có đang active không
            const now = new Date();
            if (promotion.trangThai !== 'active' || 
                promotion.thoiGianBD > now || 
                promotion.thoiGianKT < now) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: 'Promotion is not currently active'
                });
            }

            // Kiểm tra còn slot không (chỉ áp dụng cho voucher)
            if (promotion.loai === 'voucher' && promotion.soLuong) {
                const currentUsed = promotion.usedCount || 0;
                if (currentUsed >= promotion.soLuong) {
                    await session.abortTransaction();
                    return res.status(400).json({
                        success: false,
                        message: 'Promotion has reached maximum usage limit'
                    });
                }
            }

            // Cập nhật usedCount với đảm bảo Int32
            const updatedPromotion = await Promotion.findByIdAndUpdate(
                promotionId,
                { 
                    $inc: { usedCount: 1 }
                },
                { new: true, session }
            );

            await session.commitTransaction();

            console.log(`✅ Updated promotion usage: ${updatedPromotion.usedCount}/${updatedPromotion.soLuong || 'unlimited'}`);

            res.status(200).json({
                success: true,
                message: 'Promotion usage updated successfully',
                data: {
                    _id: updatedPromotion._id,
                    usedCount: updatedPromotion.usedCount,
                    soLuong: updatedPromotion.soLuong,
                    tenKhuyenMai: updatedPromotion.tenKhuyenMai,
                    soLuongConLai: updatedPromotion.soLuong ? updatedPromotion.soLuong - updatedPromotion.usedCount : null
                }
            });
        } catch (error) {
            await session.abortTransaction();
            console.error('❌ Error updating promotion usage:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating promotion usage',
                error: error.message
            });
        } finally {
            session.endSession();
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
            }).select('_id tenKhuyenMai maKhuyenMai phanTramKhuyenMai giamToiDa loai usedCount soLuong');

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

    // ===== EXISTING METHODS - IMPROVED =====

    // 🔥 Tạo promotion mới - COMPLETE VERSION
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
            moTa,
            trangThai
        } = req.body;

        try {
            console.log('📝 Creating promotion with data:', {
                maKhuyenMai,
                loai,
                phanTramKhuyenMai,
                giaTriToiThieu,
                giamToiDa,
                soLuong
            });

            // 1. Validate required fields
            if (!maKhuyenMai || !tenKhuyenMai || !loai || !thoiGianBD || !thoiGianKT) {
                return res.status(400).json({
                    success: false,
                    message: 'Thiếu thông tin bắt buộc: mã KM, tên KM, loại, thời gian bắt đầu và kết thúc'
                });
            }

            // 2. Kiểm tra mã khuyến mãi đã tồn tại (case-insensitive)
            const existingPromotion = await Promotion.findOne({ 
                maKhuyenMai: { $regex: new RegExp(`^${maKhuyenMai.trim()}$`, 'i') }
            });
            if (existingPromotion) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã khuyến mãi đã tồn tại'
                });
            }

            // 3. Validate và parse dates
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
                    message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
                });
            }

            // 4. Validate theo từng loại promotion
            let validatedData = {
                maKhuyenMai: maKhuyenMai.trim().toUpperCase(),
                tenKhuyenMai: tenKhuyenMai.trim(),
                loai,
                thoiGianBD: startDate,
                thoiGianKT: endDate,
                moTa: moTa?.trim() || '',
                trangThai: trangThai || 'scheduled',
                usedCount: 0  // 🔥 Khởi tạo usedCount = 0
            };

            switch (loai) {
                case 'voucher':
                    // Validate required fields for voucher
                    if (!phanTramKhuyenMai || phanTramKhuyenMai <= 0 || phanTramKhuyenMai > 100) {
                        return res.status(400).json({
                            success: false,
                            message: 'Voucher phải có phần trăm khuyến mãi từ 1-100%'
                        });
                    }
                    if (!giaTriToiThieu || giaTriToiThieu <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Voucher phải có giá trị đơn hàng tối thiểu lớn hơn 0'
                        });
                    }
                    if (!giamToiDa || giamToiDa <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Voucher phải có giá trị giảm tối đa lớn hơn 0'
                        });
                    }
                    if (giamToiDa > giaTriToiThieu) {
                        return res.status(400).json({
                            success: false,
                            message: 'Giá trị giảm tối đa không được lớn hơn giá trị đơn hàng tối thiểu'
                        });
                    }
                    if (!soLuong || soLuong <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Voucher phải có số lượng lớn hơn 0'
                        });
                    }

                    validatedData = {
                        ...validatedData,
                        phanTramKhuyenMai,
                        giaTriToiThieu,
                        giamToiDa,
                        soLuong
                    };
                    break;

                case 'dot_giam_gia':
                    // Validate required fields for dot_giam_gia
                    if (!phanTramKhuyenMai || phanTramKhuyenMai <= 0 || phanTramKhuyenMai > 100) {
                        return res.status(400).json({
                            success: false,
                            message: 'Đợt giảm giá phải có phần trăm khuyến mãi từ 1-100%'
                        });
                    }
                    if (!sanPhamApDung || !Array.isArray(sanPhamApDung) || sanPhamApDung.length === 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Đợt giảm giá phải chọn ít nhất một sản phẩm áp dụng'
                        });
                    }

                    validatedData = {
                        ...validatedData,
                        phanTramKhuyenMai,
                        giaTriToiThieu: 0,
                        sanPhamApDung,
                        giamToiDa: giamToiDa || null
                    };
                    break;

                case 'free_shipping':
                    // Validate required fields for free_shipping
                    if (!giaTriToiThieu || giaTriToiThieu <= 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Miễn phí vận chuyển phải có giá trị đơn hàng tối thiểu lớn hơn 0'
                        });
                    }
                    if (phanTramKhuyenMai && phanTramKhuyenMai !== 0) {
                        return res.status(400).json({
                            success: false,
                            message: 'Miễn phí vận chuyển không có phần trăm khuyến mãi'
                        });
                    }

                    validatedData = {
                        ...validatedData,
                        phanTramKhuyenMai: 0,
                        giaTriToiThieu
                    };
                    break;

                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Loại khuyến mãi không hợp lệ. Chỉ chấp nhận: voucher, dot_giam_gia, free_shipping'
                    });
            }

            // 5. Tạo promotion mới
            console.log('✅ Validated data:', validatedData);

            const newPromotion = new Promotion(validatedData);
            const savedPromotion = await newPromotion.save();

            console.log('🎉 Created promotion successfully:', savedPromotion.maKhuyenMai);

            // 6. Populate san productos if needed
            await savedPromotion.populate('sanPhamApDung', 'name price image');

            res.status(201).json({
                success: true,
                data: savedPromotion,
                message: 'Tạo khuyến mãi thành công'
            });
        } catch (err) {
            console.error('❌ Create promotion error:', err);
            console.error('Error code:', err.code);
            console.error('Error name:', err.name);
            
            // ✅ Handle duplicate key error (MongoDB E11000)
            if (err.code === 11000 || err.message?.includes('E11000') || err.message?.includes('duplicate')) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã khuyến mãi đã tồn tại'
                });
            }
            
            // Handle mongoose validation errors
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(error => error.message);
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    details: messages
                });
            }

            res.status(500).json({
                success: false,
                message: 'Lỗi server khi tạo khuyến mãi: ' + err.message
            });
        }
    },

    updatePromotion: async (req, res) => {
        try {
            const promotionId = req.params.id;
            const updateData = { ...req.body };
            
            console.log('=====================================');
            console.log('📥 UPDATE REQUEST');
            console.log('   ID:', promotionId);
            console.log('   Data:', updateData);
            console.log('=====================================');

            // 1. Check existence
            const currentPromotion = await Promotion.findById(promotionId);
            if (!currentPromotion) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khuyến mãi'
                });
            }

            // 2. ✅ CONVERT DATES FIRST
            if (updateData.thoiGianBD) {
                const startDate = new Date(updateData.thoiGianBD);
                if (isNaN(startDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ngày bắt đầu không hợp lệ'
                    });
                }
                updateData.thoiGianBD = startDate;
                console.log('✅ Start date:', startDate.toISOString());
            }
            
            if (updateData.thoiGianKT) {
                const endDate = new Date(updateData.thoiGianKT);
                if (isNaN(endDate.getTime())) {
                    return res.status(400).json({
                        success: false,
                        message: 'Ngày kết thúc không hợp lệ'
                    });
                }
                updateData.thoiGianKT = endDate;
                console.log('✅ End date:', endDate.toISOString());
            }

            // 3. Validate date range
            const finalStartDate = updateData.thoiGianBD || currentPromotion.thoiGianBD;
            const finalEndDate = updateData.thoiGianKT || currentPromotion.thoiGianKT;
            
            console.log('🔍 Comparing dates:');
            console.log('   Start:', finalStartDate);
            console.log('   End:', finalEndDate);
            console.log('   Valid:', finalEndDate > finalStartDate);
            
            if (finalEndDate <= finalStartDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
                });
            }

            // 4. Update
            console.log('🔄 Updating in database...');
            const updatedPromotion = await Promotion.findByIdAndUpdate(
                promotionId,
                updateData,
                { 
                    new: true,
                    runValidators: true
                }
            ).populate('sanPhamApDung', 'name price image');

            console.log('✅ SUCCESS!');
            console.log('=====================================');

            res.status(200).json({
                success: true,
                data: updatedPromotion,
                message: 'Cập nhật khuyến mãi thành công'
            });
            
        } catch (err) {
            console.error('=====================================');
            console.error('❌ ERROR:', err.message);
            console.error('Error code:', err.code);
            console.error('Error name:', err.name);
            console.error('=====================================');
            
            // ✅ Handle duplicate key error when updating
            if (err.code === 11000 || err.message?.includes('E11000') || err.message?.includes('duplicate')) {
                return res.status(400).json({
                    success: false,
                    message: 'Mã khuyến mãi đã được sử dụng bởi khuyến mãi khác'
                });
            }
            
            // Handle mongoose validation errors
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(error => error.message);
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu không hợp lệ',
                    details: messages
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Lỗi server khi cập nhật khuyến mãi: ' + err.message
            });
        }
    },

    // Xóa promotion với business rules
    deletePromotion: async (req, res) => {
        try {
            const promotionId = req.params.id;
            
            // 1. Kiểm tra promotion có tồn tại không
            const promotion = await Promotion.findById(promotionId);
            if (!promotion) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khuyến mãi'
                });
            }

            // 2. Kiểm tra business rules
            const canDelete = checkCanDeletePromotion(promotion);
            if (!canDelete.allowed) {
                return res.status(400).json({
                    success: false,
                    message: canDelete.reason
                });
            }

            // 3. Xóa promotion
            await Promotion.findByIdAndDelete(promotionId);
            
            console.log('🗑️ Deleted promotion:', promotion.maKhuyenMai);

            res.status(200).json({
                success: true,
                message: 'Xóa khuyến mãi thành công'
            });
        } catch (err) {
            console.error('❌ Delete promotion error:', err);
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    },

searchPromotions: async (req, res) => {
    console.log('🟢 SEARCH ROUTE HIT!', req.query);
    
    // ✅ Nhận cả keyword và name
    const { keyword, name } = req.query;
    const searchKeyword = keyword || name; // Fallback
    
    console.log('🟢 Final searchKeyword:', searchKeyword);
    
    try {
        let searchQuery = {};
        
        if (searchKeyword && searchKeyword !== 'undefined' && searchKeyword.trim() !== '') {
            const trimmedKeyword = searchKeyword.trim();
            searchQuery.$or = [
                { maKhuyenMai: { $regex: trimmedKeyword, $options: 'i' } },
                { tenKhuyenMai: { $regex: trimmedKeyword, $options: 'i' } }
            ];
        }
        
        // Apply filters
        if (req.query.loai && req.query.loai !== 'all' && req.query.loai !== 'undefined') {
            searchQuery.loai = req.query.loai;
        }
        
        if (req.query.trangThai && req.query.trangThai !== 'all' && req.query.trangThai !== 'undefined') {
            searchQuery.trangThai = req.query.trangThai;
        }
        
        console.log('🟢 MongoDB searchQuery:', JSON.stringify(searchQuery, null, 2));
        
        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            sort: { ngayTao: -1 },
            populate: {
                path: 'sanPhamApDung',
                select: 'name price image'
            }
        };
        
        const result = await Promotion.paginate(searchQuery, options);
        
        res.status(200).json({
            success: true,
            data: result
        });
        
    } catch (err) {
        console.error('❌ Search error:', err);
        res.status(500).json({ success: false, message: err.message });
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

            console.log(`✅ Found ${activePromotions.length} active promotions`);

            res.status(200).json({
                success: true,
                data: activePromotions
            });
        } catch (err) {
            console.error('❌ Get active promotions error:', err);
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

            if (promotion.loai !== 'dot_giam_gia') {
                return res.status(400).json({
                    success: false,
                    message: 'Chỉ có thể áp dụng sản phẩm cho đợt giảm giá'
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

            console.log(`✅ Applied promotion ${promotion.maKhuyenMai} to product ${productId}`);

            res.status(200).json({
                success: true,
                message: 'Áp dụng khuyến mãi thành công',
                data: promotion
            });
        } catch (err) {
            console.error('❌ Apply promotion error:', err);
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
            const { productIds } = req.query;
            const productIdArray = productIds ? productIds.split(',') : [];
            
            if (productIdArray.length === 0) {
                return res.json({ 
                    success: true, 
                    promotions: {} 
                });
            }
            
            console.log('🔍 Getting promotions for products:', productIdArray);
            
            const now = new Date();
            const activePromotions = await Promotion.find({
                loai: 'dot_giam_gia',
                trangThai: 'active',
                thoiGianBD: { $lte: now },
                thoiGianKT: { $gte: now },
                sanPhamApDung: { $in: productIdArray }
            });
            
            console.log('📊 Found active promotions:', activePromotions.length);
            
            const result = {};
            activePromotions.forEach(promotion => {
                promotion.sanPhamApDung.forEach(productId => {
                    if (productIdArray.includes(productId.toString())) {
                        result[productId.toString()] = {
                            id: promotion._id,
                            name: promotion.tenKhuyenMai,
                            type: promotion.loai,
                            discountPercent: promotion.phanTramKhuyenMai,
                            maxDiscountAmount: promotion.giamToiDa
                        };
                    }
                });
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

    // 2. Validate voucher code với business logic
    validateVoucher: async (req, res) => {
        try {
            const { voucherCode, orderValue = 0 } = req.body;
            
            console.log('🎫 Validating voucher:', { voucherCode, orderValue });
            
            if (!voucherCode || !voucherCode.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập mã voucher'
                });
            }
            
            const now = new Date();
            const voucher = await Promotion.findOne({
                maKhuyenMai: voucherCode.trim().toUpperCase(),
                loai: 'voucher',
                trangThai: 'active',
                thoiGianBD: { $lte: now },
                thoiGianKT: { $gte: now },
                giaTriToiThieu: { $lte: orderValue },
                $expr: { 
                    $or: [
                        { $eq: ['$soLuong', null] },
                        { $lt: ['$usedCount', '$soLuong'] }
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
                    minOrderValue: voucher.giaTriToiThieu,
                    usedCount: voucher.usedCount,
                    totalCount: voucher.soLuong,
                    remainingCount: voucher.soLuong ? voucher.soLuong - voucher.usedCount : null
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
            
            console.log(`💰 Calculated discount: ${discountAmount} for voucher ${voucher.maKhuyenMai}`);
            
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
            console.error('❌ Error calculating voucher discount:', error);
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    },

    // 4. Check free shipping promotion
    checkFreeShipping: async (req, res) => {
        try {
            const { orderValue } = req.body;
            
            const now = new Date();
            const freeShipPromotion = await Promotion.findOne({
                loai: 'free_shipping',
                trangThai: 'active',
                thoiGianBD: { $lte: now },
                thoiGianKT: { $gte: now },
                giaTriToiThieu: { $lte: orderValue }
            });
            
            console.log(`🚚 Free shipping check for order value ${orderValue}: ${!!freeShipPromotion}`);
            
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
            console.error('❌ Error checking free shipping:', error);
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
            
            console.log(`📋 Found ${promotions.length} promotions of type: ${type}`);
            
            res.json({
                success: true,
                data: promotions
            });
            
        } catch (error) {
            console.error('❌ Error getting promotions by type:', error);
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
                          (promotion.usedCount || 0) < promotion.soLuong;
            
            console.log(`🔍 Availability check for ${promotion.maKhuyenMai}: active=${isActive}, hasSlot=${hasSlot}`);
            
            res.json({
                success: true,
                available: isActive && hasSlot,
                details: {
                    isActive,
                    hasSlot,
                    usedQuantity: promotion.usedCount || 0,
                    totalQuantity: promotion.soLuong,
                    remainingQuantity: promotion.soLuong ? promotion.soLuong - (promotion.usedCount || 0) : null,
                    startDate: promotion.thoiGianBD,
                    endDate: promotion.thoiGianKT
                }
            });
            
        } catch (error) {
            console.error('❌ Error checking promotion availability:', error);
            res.status(500).json({ 
                success: false,
                error: error.message 
            });
        }
    },

    // 7. Deactivate promotion (ngừng sử dụng)
    deactivatePromotion: async (req, res) => {
        try {
            const promotionId = req.params.id;
            
            const promotion = await Promotion.findById(promotionId);
            if (!promotion) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy khuyến mãi'
                });
            }

            if (promotion.trangThai === 'inactive') {
                return res.status(400).json({
                    success: false,
                    message: 'Khuyến mãi đã ngừng sử dụng'
                });
            }

            const updatedPromotion = await Promotion.findByIdAndUpdate(
                promotionId,
                { trangThai: 'inactive' },
                { new: true }
            ).populate('sanPhamApDung', 'name price image');

            console.log(`⏹️ Deactivated promotion: ${promotion.maKhuyenMai}`);

            res.status(200).json({
                success: true,
                data: updatedPromotion,
                message: 'Ngừng sử dụng khuyến mãi thành công'
            });
        } catch (err) {
            console.error('❌ Deactivate promotion error:', err);
            res.status(500).json({
                success: false,
                message: err.message
            });
        }
    }
};


// Kiểm tra có thể cập nhật promotion không
function checkCanUpdatePromotion(promotion) {
    const now = new Date();
    const usedCount = promotion.usedCount || 0;
    
    // Không thể update nếu đã hết hạn
    if (promotion.trangThai === 'expired') {
        return {
            allowed: false,
            reason: 'Không thể sửa khuyến mãi đã hết hạn'
        };
    }
    
    return {
        allowed: true,
        reason: null
    };
}

// Lấy danh sách fields được phép update
function getAllowedUpdateFields(promotion) {
    const usedCount = promotion.usedCount || 0;
    const now = new Date();
    
    let allowedFields = [
        'tenKhuyenMai',
        'moTa',
        'trangThai',
        'thoiGianKT'
    ];
    
    // Nếu chưa được sử dụng, cho phép sửa thêm
    if (usedCount === 0) {
        allowedFields.push(
            'phanTramKhuyenMai',
            'giaTriToiThieu',
            'giamToiDa',
            'soLuong',
            'sanPhamApDung',
            'thoiGianBD'
        );
    } else {
        // Nếu đã được sử dụng, chỉ cho phép tăng số lượng và gia hạn
        if (promotion.loai === 'voucher') {
            allowedFields.push('soLuong'); 
        }
    }
    
    return allowedFields;
}

// Kiểm tra có thể xóa promotion không
function checkCanDeletePromotion(promotion) {
    const usedCount = promotion.usedCount || 0;
    const now = new Date();
    
    // Không thể xóa nếu đã được sử dụng
    if (usedCount > 0) {
        return {
            allowed: false,
            reason: `Khuyến mãi đã được sử dụng ${usedCount} lần, không thể xóa`
        };
    }
    
    // Không thể xóa nếu đang active và trong thời gian hiệu lực
    if (promotion.trangThai === 'active' && 
        promotion.thoiGianBD <= now && 
        promotion.thoiGianKT >= now) {
        return {
            allowed: false,
            reason: 'Không thể xóa khuyến mãi đang hoạt động'
        };
    }
    
    return {
        allowed: true,
        reason: null
    };
}

module.exports = promotionController;