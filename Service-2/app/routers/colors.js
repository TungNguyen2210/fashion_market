
const router = require("express").Router();
const newsController = require("../controllers/colorController");
const middleware = require('../utils/middleware');

router.post('/search', newsController.getAllNews);
router.get("/searchByName", newsController.searchNewsByName);
router.get('/:id', middleware.getColor, newsController.getNewsById);

router.post('/', middleware.checkLogin, newsController.createNews)
router.put('/:id', middleware.checkLogin, newsController.updateNews)
router.delete("/:id", middleware.checkLogin, newsController.deleteNews);

module.exports = router;