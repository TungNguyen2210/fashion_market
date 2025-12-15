const router = require("express").Router();
const colorController = require("../controllers/colorController");
const middleware = require('../utils/middleware');

router.post('/search', colorController.getAllNews);
router.get("/searchByName", colorController.searchNewsByName);
router.get('/:id', middleware.getColor, colorController.getNewsById);

router.post('/', middleware.checkLogin, colorController.createNews);
router.put('/:id', middleware.checkLogin, colorController.updateNews);
router.delete("/:id", middleware.checkLogin, colorController.deleteNews);

module.exports = router;