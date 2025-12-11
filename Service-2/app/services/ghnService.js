const axios = require('axios');
const config = require('../config/shippingConfig');

class GHNService {
    constructor() {
        this.baseUrl = config.ghn.baseUrl;
        this.token = config.ghn.token;
        this.shopId = config.ghn.shopId;
        this.fromDistrictId = config.ghn.fromDistrictId;
    }

    // Headers cho mọi request
    getHeaders() {
        return {
            'Token': this.token,
            'ShopId': this.shopId,
            'Content-Type': 'application/json'
        };
    }

    // 1. Lấy danh sách tỉnh/thành
    async getProvinces() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/master-data/province`,
                { headers: this.getHeaders() }
            );
            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('GHN getProvinces error:', error.response?.data);
            throw new Error(error.response?.data?.message || 'Failed to get provinces');
        }
    }

    // 2. Lấy quận/huyện theo tỉnh
    async getDistricts(provinceId) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/master-data/district`,
                { province_id: parseInt(provinceId) },
                { headers: this.getHeaders() }
            );
            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('GHN getDistricts error:', error.response?.data);
            throw new Error(error.response?.data?.message || 'Failed to get districts');
        }
    }

    // 3. Lấy phường/xã theo quận
    async getWards(districtId) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/master-data/ward`,
                { district_id: parseInt(districtId) },
                { headers: this.getHeaders() }
            );
            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('GHN getWards error:', error.response?.data);
            throw new Error(error.response?.data?.message || 'Failed to get wards');
        }
    }

    // 4. Lấy services khả dụng
    async getAvailableServices(toDistrictId) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/v2/shipping-order/available-services`,
                {
                    shop_id: this.shopId,
                    from_district: this.fromDistrictId,
                    to_district: parseInt(toDistrictId)
                },
                { headers: this.getHeaders() }
            );
            return {
                success: true,
                data: response.data.data
            };
        } catch (error) {
            console.error('GHN getAvailableServices error:', error.response?.data);
            throw new Error(error.response?.data?.message || 'Failed to get services');
        }
    }

    // 5. Tính dimensions cho đơn hàng
    calculateOrderDimensions(cartItems) {
        let totalWeight = 0;
        let maxLength = 0;
        let maxWidth = 0;
        let totalHeight = 0;

        for (const item of cartItems) {
            const product = item.product;
            const quantity = item.quantity;

            // Detect category
            const dimensions = config.detectCategory(product);

            totalWeight += dimensions.weight * quantity;
            maxLength = Math.max(maxLength, dimensions.length);
            maxWidth = Math.max(maxWidth, dimensions.width);
            totalHeight += dimensions.height * quantity;
        }

        return {
            weight: Math.ceil(totalWeight),
            length: Math.ceil(maxLength),
            width: Math.ceil(maxWidth),
            height: Math.min(Math.ceil(totalHeight), 150) // GHN max 150cm
        };
    }

    // 6. Tính phí ship
    async calculateShippingFee(params) {
        const {
            items,              // [{ product, quantity }]
            toDistrictId,
            toWardCode,
            totalValue = 0,
            codAmount = 0,
            serviceTypeId = config.serviceTypes.STANDARD
        } = params;

        try {
            // Tính dimensions
            const dimensions = this.calculateOrderDimensions(items);

            console.log('📦 Dimensions:', dimensions);

            // Lấy service khả dụng
            const services = await this.getAvailableServices(toDistrictId);
            const serviceId = services.data[0]?.service_id;

            if (!serviceId) {
                throw new Error('No shipping service available for this address');
            }

            // Calculate fee
            const response = await axios.post(
                `${this.baseUrl}/v2/shipping-order/fee`,
                {
                    from_district_id: this.fromDistrictId,
                    to_district_id: parseInt(toDistrictId),
                    to_ward_code: toWardCode,
                    service_id: serviceId,
                    service_type_id: serviceTypeId,
                    
                    insurance_value: Math.min(totalValue, 5000000), // Max 5M
                    coupon: null,
                    
                    weight: dimensions.weight,
                    length: dimensions.length,
                    width: dimensions.width,
                    height: dimensions.height,
                    
                    cod_failed_amount: codAmount
                },
                { headers: this.getHeaders() }
            );

            const feeData = response.data.data;

            return {
                success: true,
                fee: feeData.total,
                breakdown: {
                    serviceFee: feeData.service_fee,
                    insurance: feeData.insurance_fee,
                    coupon: feeData.coupon_value || 0,
                    total: feeData.total
                },
                dimensions: dimensions,
                serviceId: serviceId
            };

        } catch (error) {
            console.error('GHN calculateShippingFee error:', error.response?.data);
            throw new Error(error.response?.data?.message || 'Failed to calculate shipping fee');
        }
    }

    // 7. Lấy thời gian giao hàng dự kiến
    async getLeadTime(params) {
        const { toDistrictId, toWardCode, serviceId } = params;

        try {
            const response = await axios.post(
                `${this.baseUrl}/v2/shipping-order/leadtime`,
                {
                    from_district_id: this.fromDistrictId,
                    to_district_id: parseInt(toDistrictId),
                    to_ward_code: toWardCode,
                    service_id: serviceId
                },
                { headers: this.getHeaders() }
            );

            return {
                success: true,
                leadtime: response.data.data.leadtime,
                leadtimeText: `${Math.ceil(response.data.data.leadtime / 86400)} ngày`
            };
        } catch (error) {
            console.error('GHN getLeadTime error:', error.response?.data);
            return {
                success: false,
                leadtime: null
            };
        }
    }
}

module.exports = new GHNService();