const Promotion = require('../models/promotion');

const promotionController = {
    getAllPromotions: async (req, res) => {
        try {
            const promotions = await Promotion.find();
            res.status(200).json({ data: promotions });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getPromotionById: async (req, res) => {
        try {
            const promotion = await Promotion.findById(req.params.id);
            if (!promotion) {
                return res.status(404).json({ message: 'Promotion not found' });
            }
            res.status(200).json({ data: promotion });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    createPromotion: async (req, res) => {
        const { maKhuyenMai, phanTramKhuyenMai, thoiGianBD, thoiGianKT } = req.body;
        
        const newPromotion = new Promotion({
            maKhuyenMai,
            phanTramKhuyenMai,
            thoiGianBD,
            thoiGianKT
        });

        try {
            const savedPromotion = await newPromotion.save();
            res.status(201).json({ data: savedPromotion });
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    },

    updatePromotion: async (req, res) => {
        const { maKhuyenMai, phanTramKhuyenMai, thoiGianBD, thoiGianKT } = req.body;

        try {
            const updatedPromotion = await Promotion.findByIdAndUpdate(req.params.id, 
                { maKhuyenMai, phanTramKhuyenMai, thoiGianBD, thoiGianKT }, 
                { new: true });
            if (!updatedPromotion) {
                return res.status(404).json({ message: 'Promotion not found' });
            }
            res.status(200).json({ data: updatedPromotion });
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    },

    deletePromotion: async (req, res) => {
        try {
            const deletedPromotion = await Promotion.findByIdAndDelete(req.params.id);
            if (!deletedPromotion) {
                return res.status(404).json({ message: 'Promotion not found' });
            }
            res.status(200).json({ message: 'Promotion deleted successfully' });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    searchPromotionByName: async (req, res) => {
        const { page = 1, limit = 10 } = req.query;
        const searchTerm = req.query.name;

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
        };

        try {
            const promotions = await Promotion.paginate(
                { maKhuyenMai: { $regex: searchTerm, $options: 'i' } },
                options
            );
            res.status(200).json({ data: promotions });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
};

module.exports = promotionController;
