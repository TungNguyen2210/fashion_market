const GHNService = require('../services/GHNService');
const Product = require('../models/product');

class ShippingController {
    // ✅ 1. Get Provinces
    async getProvinces(req, res) {
        try {
            const result = await GHNService.getProvinces();
            
            // ✅ Trả về data trực tiếp, không wrap
            res.json(result.data);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // ✅ 2. Get Districts - Đổi từ params sang query
    async getDistricts(req, res) {
        try {
            const { province_id } = req.query;  // ← Đổi từ req.params
            
            if (!province_id) {
                return res.status(400).json({
                    success: false,
                    message: 'province_id is required'
                });
            }
            
            const result = await GHNService.getDistricts(province_id);
            
            // ✅ Trả về data trực tiếp
            res.json(result.data);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // ✅ 3. Get Wards - Đổi từ params sang query
    async getWards(req, res) {
        try {
            const { district_id } = req.query;  // ← Đổi từ req.params
            
            if (!district_id) {
                return res.status(400).json({
                    success: false,
                    message: 'district_id is required'
                });
            }
            
            const result = await GHNService.getWards(district_id);
            
            // ✅ Trả về data trực tiếp
            res.json(result.data);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // ✅ 4. Get Services
    async getServices(req, res) {
        try {
            const { district_id } = req.query;  // ← Đổi từ req.params
            
            if (!district_id) {
                return res.status(400).json({
                    success: false,
                    message: 'district_id is required'
                });
            }
            
            const result = await GHNService.getAvailableServices(district_id);
            res.json(result);
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // ✅ 5. Calculate Fee
    async calculateFee(req, res) {
        try {
            const {
                items,
                toDistrictId,
                toWardCode,
                totalValue = 0,
                codAmount = 0
            } = req.body;

            // Validate
            if (!toDistrictId || !toWardCode) {
                return res.status(400).json({
                    success: false,
                    message: 'to_district_id and to_ward_code are required'
                });
            }

            // Nếu không có items, tính với default weight
            let cartItems = [];
            if (items && items.length > 0) {
                cartItems = await Promise.all(
                    items.map(async (item) => {
                        const product = await Product.findById(item.productId);
                        if (!product) {
                            throw new Error(`Product ${item.productId} not found`);
                        }
                        return {
                            product: product,
                            quantity: item.quantity
                        };
                    })
                );
            } else {
                // ✅ Default: 1 sản phẩm áo 200g
                cartItems = [{
                    product: { 
                        name: 'Default',
                        category: 'Áo'
                    },
                    quantity: 1
                }];
            }

            // Tính phí
            const result = await GHNService.calculateShippingFee({
                items: cartItems,
                toDistrictId,
                toWardCode,
                totalValue,
                codAmount
            });

            // Lấy leadtime
            if (result.success) {
                const leadtime = await GHNService.getLeadTime({
                    toDistrictId,
                    toWardCode,
                    serviceId: result.serviceId
                });

                // ✅ Trả về format đơn giản
                res.json({
                    total: result.fee,
                    service_fee: result.breakdown.serviceFee,
                    insurance_fee: result.breakdown.insurance,
                    expected_delivery_time: leadtime.leadtimeText || 'Đang cập nhật',
                    success: true
                });
            } else {
                throw new Error('Failed to calculate fee');
            }

        } catch (error) {
            console.error('Calculate fee error:', error);
            res.status(500).json({
                success: false,
                message: error.message,
                error: error.message
            });
        }
    }

    // 6. Product shipping info
    async getProductShippingInfo(req, res) {
        try {
            const { productId } = req.params;
            
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const config = require('../config/shippingConfig');
            const dimensions = config.detectCategory(product);

            res.json({
                success: true,
                product: {
                    id: product._id,
                    name: product.name
                },
                shipping: dimensions
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}

module.exports = new ShippingController();