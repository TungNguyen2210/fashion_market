const statisticalController = require("../controllers/statisticalController");
const router = require("express").Router();
const verifyToken = require('../utils/middleware');

router.get('/count', statisticalController.getAllStatistical);

module.exports = router;