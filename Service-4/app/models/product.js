const mongoose = require('mongoose');
const { Schema } = mongoose;

const VariantSchema = new Schema({
  variantId: { type: String },
  color: { type: String },
  size: { type: String },
  quantity: { type: Number, default: 0 }
}, { _id: true });

const InventoryVariantSchema = new Schema({
  variantId: String,
  color: String,
  size: String,
  quantity: { type: Number, default: 0 }
}, { _id: true });

const InventorySchema = new Schema({
  quantityOnHand: { type: Number, default: 0 },
  expirationDate: { type: Date, default: null },
  variantStock: [InventoryVariantSchema]
}, { _id: false });

const ProductSchema = new Schema({
  name: String,
  description: String,
  price: Number,
  promotion: Number,
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  supplier: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  color: [String],
  sizes: [String],
  image: String,
  slide: [String],
  inventory: InventorySchema,
  variants: [VariantSchema],
  quantity: Number, // optional top-level (not used in calcQuantity)
  //Thêm trường embedding để lưu vector đặc trưng AI
  embedding: {
    type: [Number],    // Mảng các số thực (vector embedding)
    default: []        // Mặc định rỗng
  }
}, { timestamps: true, versionKey: '__v' });

module.exports = mongoose.model('Product', ProductSchema);
