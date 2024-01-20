const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true }, { collection: 'Rating' });

module.exports = mongoose.model('News', commentSchema);