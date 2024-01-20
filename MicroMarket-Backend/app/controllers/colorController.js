const ColorModel = require('../models/color');

const colorController = {
    getAllNews: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        try {
            const news = await ColorModel.paginate({}, options);
            res.status(200).json({ data: news });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    getNewsById: (req, res) => {
        try {
            res.status(200).json({ data: res.news });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    createNews: async (req, res) => {
        const news = new ColorModel({
            name: req.body.name,
            description: req.body.description,
            image: req.body.image,
        });

        try {
            const newsSave = await news.save();
            res.status(200).json({ data: newSave });
        }
        catch (err) {
            res.status(500).json(err);
        }
    },

    deleteNews: async (req, res) => {
        try {
            const user = await ColorModel.findByIdAndDelete(req.params.id);
            if (!user) {
                return res.status(200).json("News does not exist");
            }
            res.status(200).json("Delete news success");
        } catch (err) {
            res.status(500).json(err);
        }
    },

    updateNews: async (req, res) => {
        const { name, description, image } = req.body;

        try {
            const updatedNews = await ColorModel.findByIdAndUpdate(req.params.id, { name, description, image }, { new: true });
            if (!updatedNews) {
                return res.status(404).json({ message: 'News not found' });
            }
            res.status(200).json({ data: updatedNews });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    searchNewsByName: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        const name = req.query.name;

        try {
            const news = await ColorModel.paginate({ name: { $regex: `.*${name}.*`, $options: 'i' } }, options);

            res.status(200).json({ data: news });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },
}

module.exports = colorController;