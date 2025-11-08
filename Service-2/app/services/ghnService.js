const axiosClient = require('../config/axiosClient');

class GHNService {
  constructor() {
    this.baseURL = process.env.GHN_API_BASE_URL;
    this.token = process.env.GHN_API_TOKEN;
    this.shopId = process.env.GHN_SHOP_ID;
    this.shopDistrictId = parseInt(process.env.GHN_SHOP_DISTRICT_ID); // 3695 - Thủ Đức
    this.shopWardCode = process.env.GHN_SHOP_WARD_CODE; // 90737 - Hiệp Phú
    
    console.log('🚚 GHN Service initialized:', {
      shopId: this.shopId,
      shopDistrictId: this.shopDistrictId,
      shopWardCode: this.shopWardCode,
      hasToken: !!this.token
    });
  }

  getHeaders() {
    return {
      'Token': this.token,
      'ShopId': this.shopId,
      'Content-Type': 'application/json'
    };
  }

  // ✨ Category-based weight mapping (Scalable approach)
  getCategoryWeightMapping() {
    return {
      // Category ID → Weight in grams
      '643cd88879b4192efedda4e6': 350,  // Đầm - 350g
      '660ce289db9b7f0141415599': 200,  // Áo thun - 200g  
      '66501ef7e55fcbb926195a19': 500,  // Quần jean - 500g
      '66501f4ce55fcbb926195a1e': 200,  // Quần short - 200g
      '683db340391903538806b5e8': 250,  // Áo PTIT - 250g (medium shirt)
      
      // 🎯 Fallback by category name patterns
      'default_weights': {
        'áo': 200,        // Any áo category
        'quần': 350,      // Any quần category  
        'đầm': 350,       // Any đầm category
        'váy': 300,       // Any váy category
        'giày': 800,      // Any giày category
        'túi': 400,       // Any túi category
        'phụ kiện': 100,  // Any phụ kiện category
        'default': 300    // Ultimate fallback
      }
    };
  }

  // ✨ Smart weight calculation based on categories + product names
  calculateProductWeight(providedWeight, items = []) {
    // Nếu có weight được provide → dùng luôn
    if (providedWeight && providedWeight > 0) {
      console.log('⚖️  Using provided weight:', providedWeight + 'g');
      return parseInt(providedWeight);
    }

    const weightMapping = this.getCategoryWeightMapping();
    let totalWeight = 0;

    if (items && items.length > 0) {
      console.log('📦 Calculating weight for', items.length, 'items');
      
      items.forEach(item => {
        let itemWeight = weightMapping.default_weights.default;
        const quantity = item.quantity || 1;
        
        // 🎯 Priority 1: Use exact category ID match
        if (item.categoryId && weightMapping[item.categoryId]) {
          itemWeight = weightMapping[item.categoryId];
          console.log(`  - "${item.name}": ${itemWeight}g (category ID: ${item.categoryId})`);
        }
        // 🎯 Priority 2: Use category name pattern matching
        else if (item.categoryName) {
          const categoryName = item.categoryName.toLowerCase().trim();
          for (const [pattern, weight] of Object.entries(weightMapping.default_weights)) {
            if (pattern !== 'default' && categoryName.includes(pattern)) {
              itemWeight = weight;
              console.log(`  - "${item.name}": ${itemWeight}g (category name: ${categoryName} → ${pattern})`);
              break;
            }
          }
        }
        // 🎯 Priority 3: Fallback to product name detection
        else {
          const productName = (item.name || '').toLowerCase().trim();
          for (const [pattern, weight] of Object.entries(weightMapping.default_weights)) {
            if (pattern !== 'default' && productName.includes(pattern)) {
              itemWeight = weight;
              console.log(`  - "${item.name}": ${itemWeight}g (product name → ${pattern})`);
              break;
            }
          }
        }
        
        if (itemWeight === weightMapping.default_weights.default) {
          console.log(`  - "${item.name}": ${itemWeight}g (default fallback)`);
        }
        
        totalWeight += itemWeight * quantity;
      });
    } else {
      // Single product fallback
      totalWeight = weightMapping.default_weights.default;
      console.log('📦 Using default weight:', totalWeight + 'g');
    }

    // 📏 Minimum weight: 100g, Maximum: 30kg
    const finalWeight = Math.min(Math.max(totalWeight, 100), 30000);
    console.log('⚖️  Final calculated weight:', finalWeight + 'g');
    
    return finalWeight;
  }

  async calculateShippingFee(customerAddress, weight = null, orderValue = 0, items = []) {
    try {
      // 🎯 Smart weight calculation
      const calculatedWeight = this.calculateProductWeight(weight, items);
      
      console.log('🚚 Calculating GHN shipping fee:', {
        from: 'Hiệp Phú, Thủ Đức, TP.HCM',
        to: customerAddress,
        originalWeight: weight,
        calculatedWeight: calculatedWeight + 'g',
        orderValue: orderValue.toLocaleString() + 'đ',
        itemsCount: items.length
      });

      // Get available services
      const services = await this.getAvailableServices(customerAddress.districtId);
      const serviceId = services[0]?.service_id || 53320;
      
      console.log('🚛 Using service ID:', serviceId);

      const requestBody = {
        service_id: serviceId,
        insurance_value: Math.min(orderValue, 5000000), // Max 5M VND
        coupon: null,
        from_district_id: this.shopDistrictId,
        from_ward_code: this.shopWardCode,
        to_district_id: parseInt(customerAddress.districtId),
        to_ward_code: customerAddress.wardCode,
        weight: calculatedWeight, // ✅ Use calculated weight
        length: 30, // cm
        width: 20,  // cm
        height: 10, // cm
        items: [{
          name: items.length > 0 ? items.map(i => i.name).join(', ') : "Sản phẩm",
          quantity: items.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1,
          weight: calculatedWeight,
          length: 30,
          width: 20,
          height: 10
        }]
      };

      console.log('📦 GHN Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(`${this.baseURL}/v2/shipping-order/fee`, 
        requestBody, 
        { headers: this.getHeaders() }
      );

      console.log('✅ GHN Response Status:', response.data.code);
      console.log('💰 GHN Response Data:', response.data.data);

      if (response.data.code === 200) {
        const feeData = response.data.data;
        
        return {
          success: true,
          fee: feeData.total,
          serviceFee: feeData.service_fee,
          insuranceFee: feeData.insurance_fee || 0,
          pickStationFee: feeData.pick_station_fee || 0,
          couponValue: feeData.coupon_value || 0,
          totalFee: feeData.total,
          expectedDeliveryTime: feeData.expected_delivery_time,
          serviceId: serviceId,
          provider: 'GHN',
          weightInfo: {
            providedWeight: weight,
            calculatedWeight: calculatedWeight,
            unit: 'grams',
            calculation: 'category-based'
          },
          shopInfo: {
            address: '97 Man Thiện, Hiệp Phú, Thủ Đức, TP.HCM',
            districtId: this.shopDistrictId,
            wardCode: this.shopWardCode
          },
          breakdown: {
            service_fee: feeData.service_fee,
            insurance_fee: feeData.insurance_fee || 0,
            pick_station_fee: feeData.pick_station_fee || 0,
            coupon_value: feeData.coupon_value || 0,
            r2s_fee: feeData.r2s_fee || 0
          }
        };
      } else {
        throw new Error(response.data.message || 'GHN API calculation failed');
      }

    } catch (error) {
      console.error('❌ GHN Shipping Error:', error.response?.data || error.message);
      
      // Fallback calculation
      return this.fallbackCalculation(customerAddress, weight, orderValue, items);
    }
  }

  async getAvailableServices(toDistrictId) {
    try {
      const response = await axios.get(`${this.baseURL}/v2/shipping-order/available-services`, {
        headers: this.getHeaders(),
        params: {
          shop_id: this.shopId,
          from_district: this.shopDistrictId,
          to_district: toDistrictId
        }
      });

      console.log('🚛 Available services:', response.data.data?.length || 0);
      return response.data.code === 200 ? response.data.data : [];
    } catch (error) {
      console.warn('⚠️  Using default service due to:', error.message);
      return [{ service_id: 53320, service_type_id: 2 }]; // Standard service
    }
  }

  async getProvinces() {
    try {
      console.log('🏙️  Getting provinces from GHN...');
      
      const response = await axios.get(`${this.baseURL}/master-data/province`, {
        headers: this.getHeaders()
      });

      if (response.data.code === 200) {
        console.log('✅ Got', response.data.data.length, 'provinces');
        return { success: true, data: response.data.data };
      }

      throw new Error(response.data.message || 'Failed to get provinces');
    } catch (error) {
      console.error('❌ Province Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getDistricts(provinceId) {
    try {
      console.log('🏘️  Getting districts for province:', provinceId);
      
      const response = await axios.get(`${this.baseURL}/master-data/district`, {
        headers: this.getHeaders(),
        params: { province_id: provinceId }
      });

      if (response.data.code === 200) {
        console.log('✅ Got', response.data.data.length, 'districts');
        return { success: true, data: response.data.data };
      }

      throw new Error(response.data.message || 'Failed to get districts');
    } catch (error) {
      console.error('❌ District Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getWards(districtId) {
    try {
      console.log('🏠 Getting wards for district:', districtId);
      
      const response = await axios.get(`${this.baseURL}/master-data/ward`, {
        headers: this.getHeaders(),
        params: { district_id: districtId }
      });

      if (response.data.code === 200) {
        console.log('✅ Got', response.data.data.length, 'wards');
        return { success: true, data: response.data.data };
      }

      throw new Error(response.data.message || 'Failed to get wards');
    } catch (error) {
      console.error('❌ Ward Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  fallbackCalculation(customerAddress, providedWeight, orderValue, items = []) {
    console.log('🔄 Using fallback shipping calculation...');
    
    const calculatedWeight = this.calculateProductWeight(providedWeight, items);
    
    // Base fee from Thủ Đức
    let baseFee = 20000; // 20k base for Thủ Đức → other areas
    
    // Weight-based fee
    if (calculatedWeight > 500) {
      baseFee += Math.ceil((calculatedWeight - 500) / 500) * 8000;
    }
    
    // Insurance fee
    const insuranceFee = orderValue > 100000 ? Math.ceil(orderValue * 0.005) : 0;
    
    const totalFee = baseFee + insuranceFee;
    
    return {
      success: true,
      fee: totalFee,
      serviceFee: baseFee,
      insuranceFee: insuranceFee,
      totalFee: totalFee,
      provider: 'Fallback',
      weightInfo: {
        providedWeight: providedWeight,
        calculatedWeight: calculatedWeight,
        unit: 'grams',
        calculation: 'category-based-fallback'
      },
      shopInfo: {
        address: '97 Man Thiện, Hiệp Phú, Thủ Đức, TP.HCM'
      },
      note: 'Estimated fee - GHN API temporarily unavailable'
    };
  }
}

module.exports = new GHNService();