
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const userSchema = new mongoose.Schema({
    email: { type: String, default: '', unique: true, require: true },
    phone: { type: String, default: '' },
    username: { type: String, default: '' },
    password: { type: String, require: true },
    role: { type: String, default: '' },
    status: { type: String, default: 'noactive' },
    image: {type: String, default: 'https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png'}
}, { timestamps: true }, { collection: 'users' })

userSchema.plugin(mongoosePaginate);
userSchema.index({ email: 1 }) //Nơi đánh index
module.exports = mongoose.model('User', userSchema)