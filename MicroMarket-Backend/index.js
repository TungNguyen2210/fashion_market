const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser");
const app = express();
const path = require('path');
const DB_MONGO = require('./app/config/db.config')
const _CONST = require('./app/config/constant')
// const { sendEmailNotification } = require('./app/kafka/consumer');

//router
const authRoute = require('./app/routers/auth');
const userRoute = require('./app/routers/user');
const productRoute = require('./app/routers/product');
const categoryRoute = require('./app/routers/category');
const uploadFileRoute = require('./app/routers/uploadFile');
const newsRoute = require('./app/routers/news');
const orderRoute = require('./app/routers/order');
const statisticalRoute = require('./app/routers/statistical');
const paymentRoute = require('./app/routers/paypal');
const colorRoute = require('./app/routers/colors');
const supplierRoute = require('./app/routers/supplier');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

mongoose.connect(DB_MONGO.URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB.');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/product', productRoute);
app.use('/api/category', categoryRoute);
app.use('/api/uploadFile', uploadFileRoute);
app.use('/api/news', newsRoute);
app.use('/api/statistical', statisticalRoute);
app.use('/api/order', orderRoute);
app.use('/api/payment', paymentRoute);
app.use('/api/color', colorRoute);
app.use('/api/suppliers', supplierRoute);

app.use('/uploads', express.static('uploads'));
// sendEmailNotification();

const PORT = process.env.PORT || _CONST.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});