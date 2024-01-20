
const router = require("express").Router();
const verifyToken = require('../utils/middleware');
const middleware = require('../utils/middleware');

const multer = require('multer');
const uploadFileController = require("../controllers/uploadFile");

// Tạo storage engine để lưu trữ ảnh
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./uploads"); // Thư mục để lưu trữ ảnh
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + "-" + file.originalname); // Đổi tên file để tránh bị trùng lặp
    },
  });
  
  // Tạo middleware upload để xử lý yêu cầu upload ảnh
  const upload = multer({ storage: storage });

router.post('/', verifyToken.checkLogin,upload.single('image'), uploadFileController.uploadFile)

module.exports = router;