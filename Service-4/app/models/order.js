const mongoose = require('mongoose');
const { Schema } = mongoose;

const OrderProductSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  price: Number,
  quantity: Number,
  color: String,
  size: String,
  variantId: String,
  comment: String,
  rated: { type: Boolean, default: false },
  rating: { type: Number, default: null }
}, { _id: true });

const OrderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  address: String,
  billing: String,
  comment: String,
  description: String,
  orderTotal: Number,
  products: [OrderProductSchema],
  rated: { type: Boolean, default: false },
  rating: { type: Number, default: null },
  status: String
}, { timestamps: true, versionKey: '__v' });

module.exports = mongoose.model('Order', OrderSchema);
