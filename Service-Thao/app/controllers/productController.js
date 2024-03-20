const ProductModel = require('../models/product');
const CategoryModel = require('../models/category');
const ReviewModel = require('../models/review');
const Supplier = require('../models/supplier');
const jwt = require('jsonwebtoken');
const _const = require('../config/constant')

const calculateCosineSimilarity = (product1, product2) => {
    // Chuyển đổi các đặc trưng của sản phẩm thành vector
    const vector1 = [product1.price, product1.quantity]; // Ví dụ: sử dụng giá và số lượng làm đặc trưng
    const vector2 = [product2.price, product2.quantity];
  
    // Tính tổng tích của hai vector
    let dotProduct = 0;
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
    }
  
    // Tính độ dài của vector
    const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + Math.pow(value, 2), 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + Math.pow(value, 2), 0));
  
    // Tính cosine similarity
    const similarity = dotProduct / (magnitude1 * magnitude2);
    return similarity;
  };
  

const productController = {
    getAllProduct: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
            populate: ['category', 'supplier']
        };

        try {
            const products = await ProductModel.paginate({}, options);
            res.status(200).json({ data: products });
        } catch (err) {
            console.log(err)
            res.status(500).json(err);
        }
    },

    getProductById: (req, res) => {
        try {
            res.status(200).json(res);
        } catch (err) {
            res.status(500).json(err);
        }
    },

    createProduct: async (req, res) => {
        const {
            name,
            price,
            description,
            category,
            image,
            promotion,
            quantity,
            slide,
            supplier,
            inventory

        } = req.body;

        const product = new ProductModel({
            name,
            price,
            description,
            category,
            image,
            promotion,
            quantity,
            slide,
            supplier,
            inventory: {
                quantityOnHand: inventory?.quantityOnHand || 0,
                expirationDate: inventory?.expirationDate || null
            }
        });

        try {
            const checkCategory = await CategoryModel.findById(category);
            if (!checkCategory) {
                return res.status(400).json({ error: 'Invalid category' });
            }
            const newProduct = await product.save();
            res.status(200).json(newProduct);
        } catch (err) {
            res.status(500).json(err);
        }
    },


    deleteProduct: async (req, res) => {
        try {
            const product = await ProductModel.findByIdAndDelete(req.params.id);
            if (!product) {
                return res.status(200).json("Product does not exist");
            }
            res.status(200).json("Delete product success");
        } catch (err) {
            res.status(500).json(err);
        }
    },

    updateProduct: async (req, res) => {
        const id = req.params.id;
        const {
            name,
            price,
            description,
            category,
            image,
            promotion,
            quantity,
            color,
            supplier,
            inventory,
        } = req.body;

        try {
            const existingProduct = await ProductModel.findById(id);

            if (!existingProduct) {
                return res.status(404).json({ message: 'Product not found' });
            }


            // Update the inventory fields
            existingProduct.inventory.quantityOnHand = (Number(existingProduct.inventory.quantityOnHand) || 0) + (Number(inventory?.quantityOnHand) || 0);
            existingProduct.inventory.expirationDate = inventory?.expirationDate || existingProduct?.expirationDate;

            // Check if quantity has changed
            if (quantity) {
                existingProduct.inventory.quantityOnHand -= Number(quantity);

                // Update the quantity history entry
                historyEntry.quantity = -Number(quantity);
            }

            // Update other product fields
            existingProduct.name = name || existingProduct.name;
            existingProduct.price = price || existingProduct.price;
            existingProduct.description = description || existingProduct.description;
            existingProduct.quantity = (Number(existingProduct.quantity) || 0) + (Number(quantity) || 0);
            existingProduct.category = category || existingProduct.category;
            existingProduct.image = image || existingProduct.image;
            existingProduct.promotion = promotion || existingProduct.promotion;
            existingProduct.color = color || existingProduct.color;
            existingProduct.supplier = supplier || existingProduct.supplier;

            // Save the updated product
            const updatedProduct = await existingProduct.save();

            res.status(200).json(updatedProduct);
        } catch (err) {
            console.log(err);
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
            const productList = await ProductModel.paginate({ name: { $regex: `.*${name}.*`, $options: 'i' } }, options);

            res.status(200).json({ data: productList });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    createReviews: async (req, res) => {
        try {
            const { comment, rating } = req.body;
            const { user } = req;
            const productId = req.params.id;

            // Kiểm tra xem người dùng đã đánh giá sản phẩm này chưa
            const existingReview = await ReviewModel.findOne({ user: decodedToken.user._id, product: productId });
            if (existingReview) {
                return res.status(201).json('Bạn đã đánh giá sản phẩm này');
            }

            // Tạo mới đánh giá sản phẩm
            const review = new ReviewModel({ user: decodedToken.user._id, product: productId, comment, rating });
            await review.save();

            res.status(201).json('thành công');
        } catch (error) {
            console.error(error);
            res.status(500).send('Server error');
        }
    },

    // Hàm tính cosine similarity giữa hai sản phẩm
    calculateCosineSimilarity: (product1, product2) => {
        // Chuyển đổi các đặc trưng của sản phẩm thành vector
        const vector1 = [product1.price, product1.quantity]; // Ví dụ: sử dụng giá và số lượng làm đặc trưng
        const vector2 = [product2.price, product2.quantity];

        // Tính tổng tích của hai vector
        let dotProduct = 0;
        for (let i = 0; i < vector1.length; i++) {
            dotProduct += vector1[i] * vector2[i];
        }

        // Tính độ dài của vector
        const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + Math.pow(value, 2), 0));
        const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + Math.pow(value, 2), 0));

        // Tính cosine similarity
        const similarity = dotProduct / (magnitude1 * magnitude2);
        return similarity;
    },

    // API khuyến nghị sản phẩm dựa trên sản phẩm đã chọn
    recommendProducts: async (req, res) => {
        try {
            const productId = req.params.id;

            // Tìm sản phẩm đã chọn trong CSDL
            const selectedProduct = await ProductModel.findById(productId);

            if (!selectedProduct) {
                return res.status(404).json({ message: 'Sản phẩm không tồn tại' });
            }

            // Lấy tất cả sản phẩm khác trong CSDL
            const allProducts = await ProductModel.find({ _id: { $ne: productId } });

            // Tính toán cosine similarity giữa sản phẩm đã chọn và các sản phẩm khác
            const recommendations = allProducts.map((product) => ({
                product,
                similarity: calculateCosineSimilarity(selectedProduct, product),
            }));

            // Sắp xếp danh sách khuyến nghị theo độ tương đồng giảm dần
            recommendations.sort((a, b) => b.similarity - a.similarity);

            // Chỉ lấy top 5 sản phẩm khuyến nghị
            const topRecommendations = recommendations.slice(0, 5).map((item) => item.product);

            return res.json({ recommendations: topRecommendations });
        } catch (error) {
            console.error('Error recommending products:', error);
            return res.status(500).json({ message: 'Lỗi máy chủ' });
        }
    },

    getSearchPrice: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;
        const minPrice = req.body.minPrice;
        const maxPrice = req.body.maxPrice;

        const query = {};

        if (minPrice !== undefined && maxPrice !== undefined) {
            query.$and = [
                { price: { $gte: minPrice } },
                { price: { $lte: maxPrice } }
            ];
        }

        const options = {
            page: page,
            limit: limit,
            populate: 'category'
        };

        try {
            const products = await ProductModel.paginate(query, options);
            res.status(200).json({ data: products });
        } catch (err) {
            res.status(500).json(err);
        }
    }
}

module.exports = productController;