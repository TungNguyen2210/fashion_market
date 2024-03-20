const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const promotionSchema = new mongoose.Schema({
    maKhuyenMai: {
        type: String,
        required: true
    },
    phanTramKhuyenMai: {
        type: Number,
        required: true
    },
    thoiGianBD: {
        type: Date,
        required: true
    },
    thoiGianKT: {
        type: Date,
        required: true
    }
});
promotionSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Promotion', promotionSchema);
