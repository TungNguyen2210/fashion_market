'use strict';

const orderSchema = new mongoose.Schema({
    name: String,
}, { timestamps: true }, { collection: 'status' });

module.exports = mongoose.model('Status', orderSchema);