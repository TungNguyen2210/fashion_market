const jwt = require('jsonwebtoken');
const _const = require('../config/constant');
const News = require('../models/news');

module.exports = {
    checkLogin: (req, res, next) => {
        const token = req.header('Authorization');
        if (!token) return res.status(401).send('Access Denied');

        try {
            const verified = jwt.verify(token, _const.JWT_ACCESS_KEY);
            next();
        } catch (err) {
            return res.status(400).send('Invalid Token');
        }
    },

    getNews: async (req, res, next) => {
        let news;
        try {
            news = await News.findById(req.params.id);
            if (news == null) {
                return res.status(404).json({ message: 'Cannot find news' });
            }
        } catch (err) {
            return res.status(500).json({ message: err.message });
        }

        res.news = news;
        next();
    },

    checkRole: (role) => async (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).send('Forbidden');
        }
        next();
    }
}