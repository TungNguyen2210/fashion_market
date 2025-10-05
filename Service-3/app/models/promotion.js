const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const promotionSchema = new mongoose.Schema({
    maKhuyenMai: {
        type: String,
        required: true,
        unique: true,
        trim: true
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
        required: true,
        min: 0,
        max: 100
    },
    giaTriToiThieu: {
        type: Number,
        default: 0,
        min: 0
    },
    giamToiDa: {
        type: Number,
        default: null
    },
    soLuong: {
        type: Number,
        default: null 
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
        enum: ['active', 'expired', 'scheduled'],
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
    timestamps: true 
});

promotionSchema.pre('save', function(next) {
    const now = new Date();
    
    if (this.thoiGianKT < now) {
        this.trangThai = 'expired';
    } else if (this.thoiGianBD <= now && this.thoiGianKT >= now) {
        this.trangThai = 'active';
    } else {
        this.trangThai = 'scheduled';
    }
    
    next();
});

promotionSchema.index({ maKhuyenMai: 1 });
promotionSchema.index({ trangThai: 1 });
promotionSchema.index({ loai: 1 });
promotionSchema.index({ thoiGianBD: 1, thoiGianKT: 1 });

// Plugin paginate
promotionSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Promotion', promotionSchema);