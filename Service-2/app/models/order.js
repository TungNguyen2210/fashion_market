const mongoose = require('mongoose');
const { Schema } = mongoose;
const mongoosePaginate = require('mongoose-paginate-v2');

const orderSchema = new mongoose.Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  products: [
    {
      product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      // Các trường về kích thước và màu sắc
      size: { type: String },
      color: { type: String },
      variantId: { type: String },
      // Các trường đánh giá sản phẩm 
      rated: { type: Boolean, default: false },
      rating: { type: Number, min: 1, max: 5, default: null },
      comment: { type: String, default: "" }
    },
  ],
  orderTotal: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  billing: {
    type: String,
    enum: ['cod', 'paypal'],
    default: 'cod'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'final'],
    default: 'pending'
  },
  description: {
    type: String,
    default: ''
  },

  // Thêm các trường cho phần đánh giá đơn hàng tổng thể
  rated: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  comment: {
    type: String,
    default: ''
  }

}, { timestamps: true }, { collection: 'order' });

orderSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Order', orderSchema);