const express = require('express');
const router = express.Router();
const recommendController = require('../controllers/recommendController');

// Sinh embedding cho toàn bộ sản phẩm (chạy 1 lần)
router.get("/generate", recommendController.generateEmbeddings);
// Cập nhật embedding cho 1 sản phẩm (chạy khi thêm/sửa sản phẩm)
router.post("/update/:id", recommendController.updateProductEmbedding);

// Recommend theo product id
router.get('/product/:id', recommendController.recommendByProduct);

// Recommend theo user id (history)
router.get('/user/:id', recommendController.recommendByUser);

module.exports = router;
