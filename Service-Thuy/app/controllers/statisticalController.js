const UserModel = require('../models/user');
const ProductModel = require('../models/product');
const CategoryModel = require('../models/category');
const OrderModel = require('../models/order');

const statisticalController = {
    getAllStatistical: async (req, res) => {
        try {
            // const statistical = await StatisticalModel.find();

            // Đếm số lượng user và sản phẩm trong cơ sở dữ liệu MongoDB
            const userCountPromise = UserModel.countDocuments();
            const productCountPromise = ProductModel.countDocuments();
            const categoryCountPromise = CategoryModel.countDocuments();
            const currentDate = new Date();
            const last12Months = new Date(currentDate.setMonth(currentDate.getMonth() - 11));
            const orderCountPromise = OrderModel.aggregate([
                {
                    $match: {
                        createdAt: {
                            $gte: last12Months,
                            $lte: new Date()
                        }
                    }
                },
                {
                    $group: {
                        _id: { $month: "$createdAt" },
                        total: { $sum: 1 }
                    }
                }
            ]);

            const orderIncomePromise = OrderModel.aggregate([
                {
                    $match: {
                        status: "final", // hoặc status: "delivered" tùy vào trạng thái đã thanh toán hay giao hàng thành công của đơn hàng
                        createdAt: {
                            $gte: last12Months,
                            $lte: new Date()
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalIncome: { $sum: "$orderTotal" }
                    }
                }
            ]);
            
            const result = {};
            // Sử dụng Promise.all để chờ cả hai Promise hoàn thành
            Promise.all([userCountPromise, productCountPromise, categoryCountPromise, orderCountPromise, orderIncomePromise])
                .then((results) => {
                    const [userCount, productCount, categoryCount, orderCount, orderIncome] = results;
                    const data = [
                        { name: "Tháng 1", Total: 0 },
                        { name: "Tháng 2", Total: 0 },
                        { name: "Tháng 3", Total: 0 },
                        { name: "Tháng 4", Total: 0 },
                        { name: "Tháng 5", Total: 0 },
                        { name: "Tháng 6", Total: 0 },
                        { name: "Tháng 7", Total: 0 },
                        { name: "Tháng 8", Total: 0 },
                        { name: "Tháng 9", Total: 0 },
                        { name: "Tháng 10", Total: 0 },
                        { name: "Tháng 11", Total: 0 },
                        { name: "Tháng 12", Total: 0 }
                    ];

                    orderCount.forEach(item => {
                        const month = item._id;
                        const total = item.total;
                        data[month - 1].Total = total;
                    });

                    const result = {
                        userTotal: userCount,
                        productTotal: productCount,
                        categoryTotal: categoryCount,
                        orderTotal: orderCount.reduce((acc, item) => acc + item.total, 0),
                        totalIncome: orderIncome.length > 0 ? orderIncome[0].totalIncome : 0, // Tổng thu nhập từ đơn hàng đã hoàn thành
                        data
                    };
                    res.status(200).json({ data: result });
                })
                .catch((error) => {
                    console.log(error);
                });

        } catch (err) {
            console.log(err);
            res.status(500).json(err);
        }
    },
}

module.exports = statisticalController;