const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser");
const app = express();
const path = require('path');
const DB_MONGO = require('./app/config/db.config')
const _CONST = require('./app/config/constant')

require('dotenv').config();

//router
const authRoute = require('./app/routers/auth');
const userRoute = require('./app/routers/user'); 
const uploadFileRoute = require('./app/routers/uploadFile');
const newsRoute = require('./app/routers/news');
const paymentRoute = require('./app/routers/paypal');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());

app.use(express.static('public'));

mongoose.connect(DB_MONGO.URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB.');
    })
    .catch((error) => {
        console.error('MongoDB connection error:', error);
    });

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/uploadFile', uploadFileRoute);
app.use('/api/news', newsRoute);
app.use('/api/payment', paymentRoute);
app.use('/uploads', express.static('uploads'));

app.use((req, res) => {
    console.log('❌ 404 - Route not found:', req.method, req.url);
    res.status(404).json({ 
        message: 'Route not found',
        path: req.url,
        method: req.method
    });
});

const PORT = process.env.PORT || _CONST.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
    console.log(`API User available at: http://localhost:${PORT}/api/user`);
});