const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require("cookie-parser");
const path = require('path');
const app = express();

// config
const DB_MONGO = require('./app/config/db.config');
const _CONST = require('./app/config/constant');

// routers
const recommendRoute = require('./app/routers/recommend');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));
app.use(cookieParser());

// connect mongodb
mongoose.connect(DB_MONGO.URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Service-4 connected to MongoDB.');
    })
    .catch((error) => {
        console.error('MongoDB connection error (Service-4):', error);
    });

// routes
app.use('/api/recommend', recommendRoute);

const PORT = process.env.PORT || _CONST.PORT;
app.listen(PORT, () => {
    console.log(`Service-4 is running on port ${PORT}.`);
});
