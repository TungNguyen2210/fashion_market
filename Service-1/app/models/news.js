const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const NewsSchema = new mongoose.Schema({
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
}, { timestamps: true }, { collection: 'News' });

NewsSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('News', NewsSchema);