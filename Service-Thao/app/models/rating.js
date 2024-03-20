const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        required: true
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true }, { collection: 'Rating' });

module.exports = mongoose.model('News', ratingSchema);