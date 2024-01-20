const mongoose = require('mongoose');

const StatisticalSchema = new mongoose.Schema({
    userTotal: {
        type: Number,
        default: 0
    },
    productTotal: {
        type: Number,
        default: 0
    },
    categoryTotal: {
        type: Number,
        default: 0
    },
}, { timestamps: true }, { collection: 'Statistical' });

module.exports = mongoose.model('Statistical', StatisticalSchema);