const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const promotionSchema = new mongoose.Schema({
    maKhuyenMai: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    tenKhuyenMai: {
        type: String,
        required: true,
        trim: true
    },
    loai: {
        type: String,
        required: true,
        enum: ['voucher', 'dot_giam_gia', 'free_shipping'],
        default: 'voucher'
    },
    phanTramKhuyenMai: {
        type: Number,
        required: function() {
            return this.loai !== 'free_shipping';
        },
        min: 0,
        max: 100,
        default: function() {
            return this.loai === 'free_shipping' ? 0 : undefined;
        }
    },
    giaTriToiThieu: {
        type: Number,
        required: function() {
            return this.loai === 'voucher' || this.loai === 'free_shipping';
        },
        min: 0,
        default: function() {
            return this.loai === 'dot_giam_gia' ? 0 : undefined;
        }
    },
    giamToiDa: {
        type: Number,
        min: 0,
        default: null
    },
    soLuong: {
        type: Number,
        required: function() {
            return this.loai === 'voucher';
        },
        min: 1,
        default: null
    },
    // 🔥 FIELD CHÍNH: usedCount thay vì soLuongDaSuDung
    usedCount: {
        type: Number,
        default: 0,
        min: 0,
        // Đảm bảo lưu dưới dạng Int32
        get: function(value) {
            return parseInt(value) || 0;
        },
        set: function(value) {
            return parseInt(value) || 0;
        }
    },
    sanPhamApDung: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    thoiGianBD: {
        type: Date,
        required: true
    },
    thoiGianKT: {
        type: Date,
        required: true,
        validate: {
            validator: function(v) {
                return v > this.thoiGianBD;
            },
            message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
        }
    },
    trangThai: {
        type: String,
        enum: ['active', 'expired', 'scheduled', 'inactive'],
        default: 'scheduled'
    },
    moTa: {
        type: String,
        trim: true
    },
    ngayTao: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    // Đảm bảo toJSON include getters
    toJSON: { getters: true },
    toObject: { getters: true }
});

// Virtual để tính số lượng còn lại (tương thích với frontend)
promotionSchema.virtual('soLuongConLai').get(function() {
    if (this.loai !== 'voucher' || !this.soLuong) return null;
    return this.soLuong - (this.usedCount || 0);
});

// Virtual để kiểm tra còn slot không
promotionSchema.virtual('hasAvailableSlot').get(function() {
    if (this.loai !== 'voucher' || !this.soLuong) return true;
    return (this.usedCount || 0) < this.soLuong;
});

// Virtual để tính usage rate
promotionSchema.virtual('usageRate').get(function() {
    if (this.loai !== 'voucher' || !this.soLuong) return null;
    return Math.round(((this.usedCount || 0) / this.soLuong) * 100);
});

// Pre-save middleware để tự động cập nhật trạng thái
promotionSchema.pre('save', function(next) {
    const now = new Date();
    
    // Auto update status based on time (except inactive)
    if (this.trangThai !== 'inactive') {
        if (this.thoiGianKT < now) {
            this.trangThai = 'expired';
        } else if (this.thoiGianBD <= now && this.thoiGianKT >= now) {
            this.trangThai = 'active';
        } else if (this.thoiGianBD > now) {
            this.trangThai = 'scheduled';
        }
    }
    
    // Check if voucher reached limit
    if (this.loai === 'voucher' && this.soLuong && 
        (this.usedCount || 0) >= this.soLuong && 
        this.trangThai === 'active') {
        this.trangThai = 'expired';
    }
    
    next();
});

// Middleware để validate sanPhamApDung cho dot_giam_gia
promotionSchema.pre('save', function(next) {
    if (this.loai === 'dot_giam_gia' && (!this.sanPhamApDung || this.sanPhamApDung.length === 0)) {
        return next(new Error('Đợt giảm giá phải có ít nhất một sản phẩm áp dụng'));
    }
    next();
});

// Static method để tìm voucher có thể sử dụng
promotionSchema.statics.findUsableVoucher = function(maKhuyenMai, orderValue = 0) {
    const now = new Date();
    return this.findOne({
        maKhuyenMai: maKhuyenMai.toUpperCase(),
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
};

// Instance method để kiểm tra có thể sử dụng không
promotionSchema.methods.canBeUsed = function(orderValue = 0, productIds = []) {
    const now = new Date();
    
    // Kiểm tra thời gian và trạng thái
    if (this.trangThai !== 'active' || 
        this.thoiGianBD > now || 
        this.thoiGianKT < now) {
        return { canUse: false, reason: 'Khuyến mãi không trong thời gian hiệu lực' };
    }
    
    // Kiểm tra giá trị đơn hàng tối thiểu
    if (this.giaTriToiThieu > orderValue) {
        return { 
            canUse: false, 
            reason: `Đơn hàng phải có giá trị tối thiểu ${this.giaTriToiThieu.toLocaleString()}đ` 
        };
    }
    
    // Kiểm tra slot cho voucher
    if (this.loai === 'voucher' && !this.hasAvailableSlot) {
        return { canUse: false, reason: 'Voucher đã hết lượt sử dụng' };
    }
    
    // Kiểm tra sản phẩm áp dụng cho đợt giảm giá
    if (this.loai === 'dot_giam_gia' && productIds.length > 0) {
        const hasApplicableProduct = productIds.some(id => 
            this.sanPhamApDung.some(productId => productId.toString() === id.toString())
        );
        if (!hasApplicableProduct) {
            return { canUse: false, reason: 'Không có sản phẩm nào được áp dụng khuyến mãi này' };
        }
    }
    
    return { canUse: true, reason: null };
};

// Indexes
promotionSchema.index({ maKhuyenMai: 1 }, { unique: true });
promotionSchema.index({ trangThai: 1 });
promotionSchema.index({ loai: 1 });
promotionSchema.index({ thoiGianBD: 1, thoiGianKT: 1 });
promotionSchema.index({ 'sanPhamApDung': 1 });
promotionSchema.index({ ngayTao: -1 });

// Text index for search
promotionSchema.index({ 
    maKhuyenMai: 'text', 
    tenKhuyenMai: 'text' 
});

// Plugin paginate
promotionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Promotion', promotionSchema);