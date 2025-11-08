const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser");
const app = express();
const path = require('path');
const DB_MONGO = require('./app/config/db.config')
const _CONST = require('./app/config/constant')

// ===== THÊM DÒNG NÀY ĐỂ ĐỌC FILE .env ===== 
require('dotenv').config();

//router
const authRoute = require('./app/routers/auth');
const userRoute = require('./app/routers/user');
const uploadFileRoute = require('./app/routers/uploadFile');
const newsRoute = require('./app/routers/news');
const paymentRoute = require('./app/routers/paypal');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ===== SỬA DÒNG CORS NÀY ĐỂ HỖ TRỢ COOKIE =====
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ===== THÊM DÒNG NÀY ĐỂ PARSE COOKIE =====
app.use(cookieParser());

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
app.use('/api/uploadFile', uploadFileRoute);
app.use('/api/news', newsRoute);
app.use('/api/payment', paymentRoute);
app.use('/uploads', express.static('uploads'));

// sendEmailNotification();

const PORT = process.env.PORT || _CONST.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});