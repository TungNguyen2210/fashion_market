// ✅ THÊM 2 DÒNG NÀY Ở ĐẦU FILE
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: { 
    type: String, 
    default: '' 
  },
  username: { 
    type: String, 
    default: '' 
  },
  name: {
    type: String,
    required: false,
    default: ''
  },
  password: {
    type: String,
    required: false  
  },
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  picture: {
    type: String,
    default: 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png'
  },
  image: {
    type: String,
    default: 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png'
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'isClient'],  // ✅ Thêm 'isClient' vì code cũ dùng
    default: 'isClient'  // ✅ Đổi default thành 'isClient' để tương thích
  },
  status: { 
    type: String, 
    default: 'actived' 
  }
}, { 
  timestamps: true,
  collection: 'users'
});

// ✅ Thêm plugin paginate
userSchema.plugin(mongoosePaginate);

// ✅ Index để tăng tốc query
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

module.exports = mongoose.model('User', userSchema);