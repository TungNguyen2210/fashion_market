const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const ColorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description:{
    type: String,
    default: ''
  },
  image:{
    type: String,
  },
}, { timestamps: true }, { collection: 'Color' });

ColorSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Color', ColorSchema);