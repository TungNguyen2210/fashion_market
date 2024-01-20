const cateController = require("../controllers/cateController");
const router = require("express").Router();
const middleware = require('../utils/middleware');

router.post('/search', cateController.getAllCate);
router.get("/searchByName", cateController.searchCateByName);

router.post('/', middleware.checkLogin, cateController.createCate)
router.put('/:id', middleware.checkLogin, cateController.updateCate)
router.delete("/:id", middleware.checkLogin, cateController.deleteCate);
router.get('/:id', middleware.getCategory, cateController.getCateById);

module.exports = router;