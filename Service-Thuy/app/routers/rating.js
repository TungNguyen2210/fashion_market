
const router = require("express").Router();
const newsController = require("../controllers/newsController");
const middleware = require('../utils/middleware');

router.post('/search', newsController.getAllNews);
router.get("/searchByName", newsController.searchNewsByName);

router.post('/', middleware.checkLogin, newsController.createNews)
router.put('/:id', middleware.checkLogin, newsController.updateNews)
router.delete("/:id", middleware.checkLogin, newsController.deleteNews);
router.get('/:id', middleware.getNews, newsController.getNewsById);

module.exports = router;