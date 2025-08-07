const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

// Thêm schema cho ProductVariant
const VariantSchema = new mongoose.Schema({
  variantId: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 0
  }
});

const InventorySchema = new mongoose.Schema({
  quantityOnHand: {
    type: Number,
    default: 0
  },
  expirationDate: {
    type: Date,
    default: null  
  },
  // Thêm mảng variants vào inventory nếu bạn muốn giữ cấu trúc hiện tại
  variantStock: [VariantSchema]
});


const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  promotion: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  slide: {
    type: [String]
  },
  color: {
    type: [String]
  },
  sizes: {
    type: [String]
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier' 
  },
  inventory: InventorySchema,
  
  variants: [VariantSchema]
 
}, { timestamps: true }, { collection: 'product' });

ProductSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Product', ProductSchema);