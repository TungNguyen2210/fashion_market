const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const InventorySchema = new mongoose.Schema({
  quantityOnHand: {
    type: Number,
    default: 0
  },
  expirationDate: {
    type: Date,
    default: null  
  },
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
 
}, { timestamps: true }, { collection: 'product' });

ProductSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Product', ProductSchema);
