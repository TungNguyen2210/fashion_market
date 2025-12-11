const express = require('express');
const router = express.Router();
const shippingController = require('../controllers/shippingController');

// ✅ SỬA: Thay :provinceId thành query param
router.get('/provinces', shippingController.getProvinces);
router.get('/districts', shippingController.getDistricts);  
router.get('/wards', shippingController.getWards);         
router.get('/services', shippingController.getServices); 

router.post('/calculate-fee', shippingController.calculateFee);
router.get('/product-info/:productId', shippingController.getProductShippingInfo);

module.exports = router;