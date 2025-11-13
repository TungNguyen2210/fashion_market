const jwt = require('jsonwebtoken');
const _const = require('../config/constant');

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

    checkRole: (role) => async (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).send('Forbidden');
        }
        next();
    }
}