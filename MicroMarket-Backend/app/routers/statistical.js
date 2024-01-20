const statisticalController = require("../controllers/statisticalController");
const router = require("express").Router();
const verifyToken = require('../utils/middleware');

router.get('/count', verifyToken.checkLogin, statisticalController.getAllStatistical);

module.exports = router;