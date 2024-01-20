const CategoryModel = require('../models/category');
const ProductModel = require('../models/product');

const cateController = {
    getAllCate: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        try {
            const categories = await CategoryModel.paginate({}, options);
            res.status(200).json({ data: categories });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    getCateById: (req, res) => {
        try {
            res.status(200).json({ data: res.category });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    createCate: async (req, res) => {
        const category = new CategoryModel({
            name: req.body.name,
            description: req.body.description,
            slug: req.body.slug,
            image: req.body.image
        });

        try {
            const newCategory = await category.save();
            res.status(200).json({ data: newCategory });
        }
        catch (err) {
            res.status(500).json(err);
        }
    },

    deleteCate: async (req, res) => {
        try {
            const user = await CategoryModel.findByIdAndDelete(req.params.id);
            if (!user) {
                return res.status(200).json("Category does not exist");
            }
            res.status(200).json("Delete category success");
        } catch (err) {
            res.status(500).json(err);
        }
    },

    updateCate: async (req, res) => {
        const { name, description, slug, image } = req.body;

        try {
            const updatedCategory = await CategoryModel.findByIdAndUpdate(req.params.id, { name, description, slug, image }, { new: true });
            if (!updatedCategory) {
                return res.status(404).json({ message: 'Category not found' });
            }
            res.status(200).json({ data: updatedCategory });
        } catch (err) {
            res.status(500).json(err);
        }
    },

    searchCateByName: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
        };

        const name = req.query.name;

        try {
            const categories = await CategoryModel.paginate({ name: { $regex: `.*${name}.*`, $options: 'i' } }, options);

            res.status(200).json({ data: categories });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getProductsByCategory: async (req, res) => {
        const categoryId = req.params.id;
        const page = req.query.page || 1;
        const limit = req.query.limit || 50000;
      
        const options = {
          page: page,
          limit: limit,
        };

        console.log(categoryId);
      
        try {
          const category = await CategoryModel.findById(categoryId);
          if (!category) {
            return res.status(404).json({ message: 'Category not found' });
          }
      
          const products = await ProductModel.paginate(
            { category: categoryId },
            options
          );
      
          res.status(200).json({ data: products });
        } catch (err) {
          res.status(500).json({ message: err.message });
        }
      },
      
}

module.exports = cateController;