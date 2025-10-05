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
      
      // Chỉ thêm ID của đợt giảm giá (nếu có)
      productPromotionID: { type: Schema.Types.ObjectId, ref: 'Promotion', default: null },
      
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
  
  // ID voucher áp dụng cho toàn đơn (nếu có)
  voucherPromotionID: { type: Schema.Types.ObjectId, ref: 'Promotion', default: null },
  
  // ID freeship áp dụng cho toàn đơn (nếu có)  
  freeShipPromotionID: { type: Schema.Types.ObjectId, ref: 'Promotion', default: null },
  
  // Các trường tính toán (sẽ được tính khi cần)
  discountAmount: { type: Number, default: 0 }, // Tổng tiền được giảm (tính từ các promotion)
  shippingFee: { type: Number, default: 0 },
  finalAmount: { type: Number }, // Tổng cuối cùng sau tất cả giảm giá và phí ship
  
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