const OrderModel = require('../models/order');
const _const = require('../config/constant')
const jwt = require('jsonwebtoken');
const Product = require('../models/product');
const user = require('../models/user');
const nodemailer = require('nodemailer');

const orderController = {
    getAllOrder: async (req, res) => {
        try {
            const page = req.body.page || 1;
            const limit = req.body.limit || 10;

            const options = {
                page: page,
                limit: limit,
                populate: 'user'
            };

            const orderList = await OrderModel.paginate({}, options);
            res.status(200).json({ data: orderList });
        } catch (err) {
            console.log(err)
            res.status(200).json(err);
        }
    },

    getOrderById: (req, res) => {
        try {
            res.status(200).json(res.order);
        } catch (err) {
            res.status(500).json(err);
        }
    },

    createOrder: async (req, res) => {
    try {
        console.log("Dữ liệu đơn hàng nhận được:", JSON.stringify(req.body, null, 2));
        const insufficientQuantityProducts = [];

        // Chuẩn bị dữ liệu sản phẩm với thông tin đầy đủ
        const processedProducts = [];
        
        for (const productItem of req.body.products) {
            const productId = productItem.product;
            const quantity = productItem.quantity;
            
            // Lấy thông tin về size, color và variantId từ request
            const size = productItem.size || null;
            const color = productItem.color || null;
            const variantId = productItem.variantId || null;

            console.log(`Xử lý sản phẩm: ${productId}, size: ${size}, color: ${color}, variantId: ${variantId}`);

            // Tìm sản phẩm trong database
            const product = await Product.findById(productId);

            if (!product) {
                console.log(`Không tìm thấy sản phẩm: ${productId}`);
                insufficientQuantityProducts.push({
                    productId,
                    quantity: 0,
                });
                continue;
            }

            // Kiểm tra số lượng tồn kho
            let variantQuantity = 0;
            let variant = null;

            // 1. Kiểm tra theo variantId trong variants
            if (variantId && product.variants && product.variants.length > 0) {
                variant = product.variants.find(v => v.variantId === variantId);
                if (variant) {
                    variantQuantity = variant.quantity;
                    console.log(`Tìm thấy biến thể trong variants với số lượng: ${variantQuantity}`);
                }
            }

            // 2. Kiểm tra theo variantId trong inventory.variantStock nếu không tìm thấy trong variants
            if (!variant && variantId && product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0) {
                variant = product.inventory.variantStock.find(v => v.variantId === variantId);
                if (variant) {
                    variantQuantity = variant.quantity;
                    console.log(`Tìm thấy biến thể trong inventory.variantStock với số lượng: ${variantQuantity}`);
                }
            }

            // 3. Thử tìm theo size và color nếu không tìm được theo variantId
            if (!variant) {
                // Tìm trong variants
                if (product.variants && product.variants.length > 0 && (size || color)) {
                    variant = product.variants.find(v => 
                        (!size || v.size === size) && 
                        (!color || v.color === color)
                    );
                    
                    if (variant) {
                        variantQuantity = variant.quantity;
                        console.log(`Tìm thấy biến thể trong variants bằng size/color với số lượng: ${variantQuantity}`);
                    }
                }
                
                // Tìm trong inventory.variantStock nếu không tìm thấy trong variants
                if (!variant && product.inventory && product.inventory.variantStock && product.inventory.variantStock.length > 0 && (size || color)) {
                    variant = product.inventory.variantStock.find(v => 
                        (!size || v.size === size) && 
                        (!color || v.color === color)
                    );
                    
                    if (variant) {
                        variantQuantity = variant.quantity;
                        console.log(`Tìm thấy biến thể trong inventory.variantStock bằng size/color với số lượng: ${variantQuantity}`);
                    }
                }
            }

            // 4. Nếu không tìm được biến thể phù hợp, KHÔNG sử dụng tổng số lượng sản phẩm
            // Đây là nguyên nhân của vấn đề - chúng ta sẽ bỏ qua bước này nếu đã tìm thấy biến thể
            if (!variant) {
                console.log(`Không tìm thấy thông tin biến thể cho sản phẩm: ${productId}`);
                insufficientQuantityProducts.push({
                    productId,
                    variantId: variantId || null,
                    size: size || null,
                    color: color || null,
                    availableQuantity: 0,
                    requestedQuantity: quantity
                });
                continue;
            }

            // Kiểm tra đủ số lượng hay không
            if (variantQuantity < quantity) {
                console.log(`Không đủ số lượng cho sản phẩm: ${productId}, biến thể: ${variantId || 'none'}, Có sẵn: ${variantQuantity}, Yêu cầu: ${quantity}`);
                insufficientQuantityProducts.push({
                    productId,
                    variantId: variantId || null,
                    size: size || null,
                    color: color || null,
                    availableQuantity: variantQuantity,
                    requestedQuantity: quantity
                });
                continue;
            }

            // Nếu đủ số lượng, thêm vào danh sách sản phẩm đã xử lý
            processedProducts.push({
                product: productId,
                quantity,
                price: productItem.price,
                size: size,
                color: color,
                variantId: variantId
            });
            
            console.log(`Đã thêm vào sản phẩm đã xử lý: ${JSON.stringify({
                product: productId,
                quantity,
                size: size,
                color: color,
                variantId: variantId
            })}`);
        }

        if (insufficientQuantityProducts.length > 0) {
            console.log("Sản phẩm không đủ số lượng:", insufficientQuantityProducts);
            return res.status(200).json({
                error: 'Insufficient quantity for one or more products.',
                insufficientQuantityProducts,
            });
        }

        // Tạo đơn hàng với dữ liệu đã xử lý
        const order = new OrderModel({
            user: req.body.userId,
            products: processedProducts,
            description: req.body.description || '',
            orderTotal: req.body.orderTotal,
            billing: req.body.billing || 'cod',
            address: req.body.address,
            status: req.body.status || 'pending',
        });

        console.log("Đã tạo đơn hàng với sản phẩm đã xử lý");

        // Cập nhật số lượng sản phẩm sử dụng thao tác nguyên tử MongoDB
        for (const productItem of processedProducts) {
            const productId = productItem.product;
            const quantity = productItem.quantity;
            const variantId = productItem.variantId;
            const size = productItem.size;
            const color = productItem.color;
            
            // Chỉ cập nhật tại nơi chúng ta tìm thấy biến thể
            if (variantId) {
                // Cập nhật trong variants array nếu tồn tại
                const variantsResult = await Product.updateOne(
                    { _id: productId, "variants.variantId": variantId },
                    { $inc: { "variants.$.quantity": -quantity } }
                );
                
                console.log(`Cập nhật số lượng trong variants: ${JSON.stringify(variantsResult)}`);
                
                // Cập nhật trong inventory.variantStock nếu tồn tại
                const variantStockResult = await Product.updateOne(
                    { _id: productId, "inventory.variantStock.variantId": variantId },
                    { $inc: { "inventory.variantStock.$.quantity": -quantity } }
                );
                
                console.log(`Cập nhật số lượng trong variantStock: ${JSON.stringify(variantStockResult)}`);
            } 
            // Nếu không có variantId nhưng có size và color, tìm theo size và color
            else if (size || color) {
                // Logic tìm và cập nhật theo size và color
                // Trong variants
                if (size && color) {
                    await Product.updateOne(
                        { 
                            _id: productId, 
                            "variants.size": size, 
                            "variants.color": color 
                        },
                        { $inc: { "variants.$.quantity": -quantity } }
                    );
                    
                    // Trong variantStock
                    await Product.updateOne(
                        { 
                            _id: productId, 
                            "inventory.variantStock.size": size, 
                            "inventory.variantStock.color": color 
                        },
                        { $inc: { "inventory.variantStock.$.quantity": -quantity } }
                    );
                }
                else if (size) {
                    // Cập nhật theo size
                    await Product.updateOne(
                        { 
                            _id: productId, 
                            "variants.size": size 
                        },
                        { $inc: { "variants.$.quantity": -quantity } }
                    );
                    
                    await Product.updateOne(
                        { 
                            _id: productId, 
                            "inventory.variantStock.size": size 
                        },
                        { $inc: { "inventory.variantStock.$.quantity": -quantity } }
                    );
                }
                else if (color) {
                    // Cập nhật theo color
                    await Product.updateOne(
                        { 
                            _id: productId, 
                            "variants.color": color 
                        },
                        { $inc: { "variants.$.quantity": -quantity } }
                    );
                    
                    await Product.updateOne(
                        { 
                            _id: productId, 
                            "inventory.variantStock.color": color 
                        },
                        { $inc: { "inventory.variantStock.$.quantity": -quantity } }
                    );
                }
            }
            // QUAN TRỌNG: Chúng ta không cập nhật inventory.quantityOnHand vì đó là lý do gây ra số âm
        }

        const savedOrder = await order.save();
        console.log("Đơn hàng đã được lưu thành công");

        // Gửi email thông báo cho người dùng
        try {
            const customer = await user.findById(req.body.userId);
            console.log("Tìm thấy khách hàng:", customer ? customer.email : "Không tìm thấy khách hàng");
            
            if (customer && customer.email) {
                // Thiết lập transporter email
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false,
                    auth: {
                        user: 'h5studiogl@gmail.com',
                        pass: 'ubqq hfra cduj tlnq',
                    },
                });

                // Tạo nội dung chi tiết sản phẩm
                let productsHtml = '';
                for (const item of processedProducts) {
                    const productDetail = await Product.findById(item.product);
                    productsHtml += `
                        <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                            <p><strong>${productDetail ? productDetail.name : 'Sản phẩm'}</strong> x ${item.quantity}</p>
                            <p>Giá: ${item.price.toLocaleString()} VND</p>
                            ${item.size ? `<p>Kích thước: ${item.size}</p>` : ''}
                            ${item.color ? `<p>Màu sắc: ${item.color}</p>` : ''}
                        </div>
                    `;
                }

                const mailOptions = {
                    from: '"MicroMarket" <h5studiogl@gmail.com>',
                    to: customer.email,
                    subject: 'Xác nhận đơn hàng của bạn tại MicroMarket',
                    html: `<h1>Cảm ơn bạn đã đặt hàng!</h1>
                         <p>Đơn hàng với mã số ${savedOrder._id} của bạn đã được đặt thành công.</p>
                         
                         <h2>Chi tiết đơn hàng:</h2>
                         ${productsHtml}
                         
                         <p>Tổng tiền đơn hàng: ${savedOrder.orderTotal.toLocaleString()} VND</p>
                         <p>Phương thức thanh toán: ${savedOrder.billing === 'cod' ? 'Thanh toán khi nhận hàng' : 'PayPal'}</p>
                         <p>Địa chỉ giao hàng: ${savedOrder.address}</p>
                         <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng bắt đầu được giao.</p>
                         <p>Cảm ơn bạn đã mua sắm tại MicroMarket!</p>`,
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Lỗi gửi email:', error);
                    } else {
                        console.log('Email đã gửi: ' + info.response);
                    }
                });
            } else {
                console.log('Không tìm thấy email người dùng, bỏ qua thông báo email.');
            }
        } catch (emailError) {
            console.error('Không thể gửi email xác nhận đơn hàng:', emailError);
        }

        res.status(200).json(savedOrder);
    }
    catch (err) {
        console.log("Lỗi tạo đơn hàng:", err);
        res.status(500).json(err);
    }
},

    deleteOrder: async (req, res) => {
        try {
            const orderList = await OrderModel.findByIdAndDelete(req.params.id);
            if (!orderList) {
                return res.status(200).json("Order does not exist");
            }
            res.status(200).json("Delete order success");
        } catch (err) {
            res.status(500).json(err);
        }
    },

    updateOrder: async (req, res) => {
        const id = req.params.id;
        const { user, products, address, orderTotal, billing, description, status } = req.body;

        try {
            const orderList = await OrderModel.findByIdAndUpdate(id, { status, description, address }, { new: true });
            if (!orderList) {
                return res.status(404).json({ message: 'Order not found' });
            }
            res.status(200).json(orderList);
        } catch (err) {
            res.status(500).json(err);
        }
    },

    searchOrderByName: async (req, res) => {
        const page = req.body.page || 1;
        const limit = req.body.limit || 10;

        const options = {
            page: page,
            limit: limit,
            populate: 'user'
        };

        const name = req.query.name;

        try {
            const orderList = await OrderModel.paginate({ billing: { $regex: `.*${name}.*`, $options: 'i' } }, options);

            res.status(200).json({ data: orderList });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    getOrderByUser: async (req, res) => {
        try {
            const decodedToken = jwt.verify(req.headers.authorization, _const.JWT_ACCESS_KEY);
            const orders = await OrderModel.find({ user: decodedToken.user._id })
                .populate('products.product') // Lấy tên và giá sản phẩm
                .populate("user", "username");    // Lấy tên người dùng
            res.status(200).json({ data: orders });
        } catch (err) {
            res.status(401).send('Unauthorized');
        }
    },
    
    // Đánh giá đơn hàng 
    rateOrder: async (req, res) => {
        try {
            const { rating, comment } = req.body;
            const orderId = req.params.id;

            if (!rating || rating < 1 || rating > 5) {
                return res.status(400).json({ message: "Số sao đánh giá phải từ 1 đến 5." });
            }

            const order = await OrderModel.findById(orderId);

            if (!order) {
                return res.status(404).json({ message: "Đơn hàng không tồn tại." });
            }

            if (order.rated) {
                return res.status(400).json({ message: "Đơn hàng này đã được đánh giá." });
            }

            order.rating = rating;
            order.comment = comment || "";
            order.rated = true;

            await order.save();
            res.status(200).json({ message: "Đánh giá đơn hàng thành công." });
        } catch (error) {
            console.error("Lỗi máy chủ khi đánh giá đơn hàng:", error);
            res.status(500).json({ message: "Lỗi máy chủ khi đánh giá đơn hàng." });
        }
    },

    // Đánh giá sản phẩm trong đơn hàng
    rateProductsInOrder: async (req, res) => {
        try {
            const orderId = req.params.orderId;
            const { ratings } = req.body;

            if (!Array.isArray(ratings) || ratings.length === 0) {
                return res.status(400).json({ message: "Danh sách đánh giá không hợp lệ." });
            }

            const order = await OrderModel.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: "Không tìm thấy đơn hàng." });
            }

            let updated = false;
            let updatedProducts = 0;

            // Log để kiểm tra
            console.log("Ratings from client:", ratings);
            console.log("Products in order:", order.products.map(p => ({
                productId: p.product.toString(),
                name: p.product.name
            })));

            // Xử lý từng đánh giá
            for (const { productId, rating, comment } of ratings) {
                // Tìm sản phẩm trong đơn hàng
                for (let i = 0; i < order.products.length; i++) {
                    const productInOrder = order.products[i];
                    
                    // So sánh ID sản phẩm
                    if (productInOrder.product.toString() === productId) {
                        // Cập nhật đánh giá cho sản phẩm này
                        order.products[i].rated = true;
                        order.products[i].rating = rating;
                        order.products[i].comment = comment || "";
                        updated = true;
                        updatedProducts++;
                        
                        console.log(`Updated product: ${productId} with rating: ${rating}`);
                        break;
                    }
                }
            }

            if (!updated) {
                return res.status(400).json({ 
                    message: "Không có sản phẩm nào được cập nhật đánh giá.",
                    debug: {
                        receivedIds: ratings.map(r => r.productId),
                        orderProductIds: order.products.map(p => p.product.toString())
                    }
                });
            }

            // Đánh dấu đơn hàng đã đánh giá
            order.rated = true;
            await order.save();
            
            res.status(200).json({ 
                message: `Đánh giá ${updatedProducts} sản phẩm thành công.` 
            });
        } catch (error) {
            console.error("Lỗi khi đánh giá sản phẩm trong đơn hàng:", error);
            res.status(500).json({ message: "Lỗi máy chủ khi đánh giá sản phẩm." });
        }
    },

    getReviewsByProductId: async (req, res) => {
        try {
            const { productId } = req.params;
            console.log("Lấy đánh giá sản phẩm trong orderController", productId);

            // Tìm đơn hàng có sản phẩm này và có ít nhất một sản phẩm đã được đánh giá
            const orders = await OrderModel.find({
                "products.product": productId,
                "products.rated": true,
            })
                .populate("user", "username");

            const reviews = [];

            for (const order of orders) {
                const customer = order.user?.username || "Khách hàng";

                // Tìm sản phẩm phù hợp trong đơn hàng
                const matchedProducts = order.products.filter(
                    (p) =>
                        p.product.toString() === productId &&
                        p.rated &&
                        p.rating
                );

                for (const p of matchedProducts) {
                    reviews.push({
                        rating: p.rating,
                        comment: p.comment || "",
                        customer,
                        createdAt: order.updatedAt, 
                    });
                }
            }

            // Sắp xếp các đánh giá theo ngày tạo
            reviews.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            res.status(200).json({ data: reviews });
        } catch (error) {
            console.error("Error fetching product reviews:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    },

    getOrderDetailForShipping: async (req, res) => {
        try {
            const orderId = req.params.id;
            
            // Tìm đơn hàng theo ID
            const order = await OrderModel.findById(orderId);
            if (!order) {
                return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
            }

            // Lấy thông tin chi tiết về người dùng
            let userInfo = null;
            if (order.user) {
                if (typeof order.user === 'object' && !order.user.username) {
                    // Trường hợp user chỉ là ObjectId
                    userInfo = await user.findById(order.user);
                } else if (typeof order.user === 'string') {
                    // Trường hợp user là string
                    userInfo = await user.findById(order.user);
                } else {
                    // Trường hợp đã có thông tin user đầy đủ
                    userInfo = order.user;
                }
            }

            // Xử lý thông tin sản phẩm
            const productDetails = [];
            
            if (Array.isArray(order.products)) {
                // Lặp qua danh sách sản phẩm trong đơn hàng
                for (const item of order.products) {
                    let productDetail = {};
                    
                    // Trường hợp product là ObjectId hoặc chuỗi
                    if (item.product) {
                        if (typeof item.product === 'object' && !item.product.name) {
                            // Nếu chỉ có ID, lấy thông tin sản phẩm từ DB
                            const productId = item.product.toString();
                            const productData = await Product.findById(productId);
                            
                            if (productData) {
                                productDetail = {
                                    ...item.toObject(),
                                    product: {
                                        _id: productId,
                                        name: productData.name,
                                        image: productData.image || productData.thumbnail || null,
                                        price: productData.price
                                    }
                                };
                            } else {
                                // Nếu không tìm thấy sản phẩm
                                productDetail = {
                                    ...item.toObject(),
                                    product: {
                                        _id: productId,
                                        name: "Sản phẩm không tồn tại",
                                        image: null,
                                        price: item.price || 0
                                    }
                                };
                            }
                        } else if (typeof item.product === 'string') {
                            // Trường hợp product là chuỗi (ID hoặc tên)
                            // Thử tìm theo ID trước
                            try {
                                const productData = await Product.findById(item.product);
                                
                                if (productData) {
                                    productDetail = {
                                        ...item.toObject(),
                                        product: {
                                            _id: item.product,
                                            name: productData.name,
                                            image: productData.image || productData.thumbnail || null,
                                            price: productData.price
                                        }
                                    };
                                } else {
                                    // Nếu không phải ID, coi như là tên sản phẩm
                                    productDetail = {
                                        ...item.toObject(),
                                        product: {
                                            name: item.product,
                                            image: null,
                                            price: item.price || 0
                                        }
                                    };
                                }
                            } catch (err) {
                                // Nếu xảy ra lỗi khi tìm theo ID, coi như là tên sản phẩm
                                productDetail = {
                                    ...item.toObject(),
                                    product: {
                                        name: item.product,
                                        image: null,
                                        price: item.price || 0
                                    }
                                };
                            }
                        } else {
                            // Trường hợp đã có thông tin product đầy đủ
                            productDetail = {
                                ...item.toObject()
                            };
                        }
                    } else {
                        // Trường hợp không có thông tin product
                        productDetail = {
                            ...item.toObject(),
                            product: {
                                name: "Không có thông tin sản phẩm",
                                image: null,
                                price: item.price || 0
                            }
                        };
                    }
                    
                    productDetails.push(productDetail);
                }
            } else if (Array.isArray(order.products) && typeof order.products[0] === 'string') {
                // Trường hợp products là mảng các chuỗi (tên sản phẩm)
                for (let i = 0; i < order.products.length; i++) {
                    const productName = order.products[i];
                    const estimatedPrice = order.orderTotal / order.products.length;
                    
                    productDetails.push({
                        product: {
                            name: productName,
                            image: null,
                            price: estimatedPrice
                        },
                        quantity: 1,
                        price: estimatedPrice,
                        color: "#CCCCCC",
                        size: "-",
                        variantId: null
                    });
                }
            }

            // Tạo response với định dạng nhất quán
            const responseData = {
                _id: order._id,
                user: {
                    _id: userInfo?._id || order.user,
                    username: userInfo?.username || "Khách hàng",
                    email: userInfo?.email || "N/A",
                    phone: userInfo?.phone || "N/A"
                },
                products: productDetails,
                orderTotal: order.orderTotal,
                address: order.address,
                billing: order.billing,
                status: order.status,
                description: order.description,
                rated: order.rated || false,
                rating: order.rating,
                comment: order.comment,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt
            };

            res.status(200).json(responseData);
        } catch (err) {
            console.error("Lỗi khi lấy chi tiết đơn hàng:", err);
            res.status(500).json({ message: "Lỗi server khi lấy chi tiết đơn hàng", error: err.message });
        }
    }
};

module.exports = orderController;