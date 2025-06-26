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
const productRoute = require('./app/routers/product');
const categoryRoute = require('./app/routers/category');
const orderRoute = require('./app/routers/order');
const colorRoute = require('./app/routers/colors');

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

app.use('/api/product', productRoute);
app.use('/api/category', categoryRoute);
app.use('/api/order', orderRoute);
app.use('/api/color', colorRoute);
app.use('/uploads', express.static('uploads'));

// sendEmailNotification();

const PORT = process.env.PORT || _CONST.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});