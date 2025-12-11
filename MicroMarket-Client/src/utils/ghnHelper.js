// ===================================================================
// GHN HELPER - Direct API Call (NO BACKEND PROXY)
// ===================================================================

import axios from 'axios';
import { parseAddressToGHN, validateGHNAddress } from './addressParser';

// ===================================================================
// GHN CONFIG
// ===================================================================
const GHN_CONFIG = {
  token: process.env.REACT_APP_GHN_TOKEN,
  shopId: parseInt(process.env.REACT_APP_GHN_SHOP_ID),
  fromDistrictId: parseInt(process.env.REACT_APP_GHN_FROM_DISTRICT_ID),
  apiUrl: 'https://dev-online-gateway.ghn.vn/shiip/public-api/v2'
};

console.log('🔧 [GHN] Config loaded:', {
  hasToken: !!GHN_CONFIG.token,
  shopId: GHN_CONFIG.shopId,
  fromDistrictId: GHN_CONFIG.fromDistrictId
});

// ===================================================================
// AXIOS INSTANCE FOR GHN
// ===================================================================
const ghnAxios = axios.create({
  baseURL: GHN_CONFIG.apiUrl,
  headers: {
    'Content-Type': 'application/json',
    'Token': GHN_CONFIG.token,
    'ShopId': GHN_CONFIG.shopId
  },
  timeout: 10000
});

// ===================================================================
// CALCULATE GHN SHIPPING FEE (FROM ADDRESS)
// ===================================================================
export const calculateGHNShippingFromAddress = async (addressString, orderValue = 0, items = []) => {
  console.log('🚚 [GHN] Calculating shipping from address:', addressString);
  
  try {
    // 1️⃣ Parse địa chỉ → GHN IDs
    const parsedAddress = parseAddressToGHN(addressString);
    
    if (!validateGHNAddress(parsedAddress)) {
      console.warn('⚠️ [GHN] Invalid address, using fallback');
      return getFallbackShippingFee(orderValue);
    }
    
    console.log('✅ [GHN] Parsed address:', parsedAddress);
    
    // 2️⃣ Call GHN API
    return await calculateGHNShippingFee(
      parsedAddress.districtId,
      parsedAddress.wardCode,
      orderValue,
      items
    );
    
  } catch (error) {
    console.error('❌ [GHN] Error:', error);
    return getFallbackShippingFee(orderValue);
  }
};

// ===================================================================
// CALCULATE GHN SHIPPING FEE (DIRECT API CALL)
// ===================================================================
export const calculateGHNShippingFee = async (
  toDistrictId, 
  toWardCode = null, 
  orderValue = 0,
  items = []
) => {
  console.log('🚚 [GHN] Calculating fee:', {
    toDistrictId,
    toWardCode,
    orderValue,
    itemCount: items.length
  });

  if (!toDistrictId) {
    console.error('❌ [GHN] Missing toDistrictId');
    return getFallbackShippingFee(orderValue);
  }

  try {
    // 📦 Calculate total weight from items
    let totalWeight = 1000; // Default 1kg
    if (items && items.length > 0) {
      totalWeight = items.reduce((sum, item) => {
        const weight = item.weight || 500; // Default 500g/item
        const quantity = item.quantity || 1;
        return sum + (weight * quantity);
      }, 0);
    }

    // 📦 Prepare payload
    const payload = {
      service_type_id: 2, // 2 = Standard
      from_district_id: GHN_CONFIG.fromDistrictId,
      to_district_id: toDistrictId,
      to_ward_code: toWardCode || '',
      height: 15,
      length: 30,
      weight: totalWeight,
      width: 20,
      insurance_value: Math.min(orderValue, 5000000),
      coupon: null
    };

    console.log('📤 [GHN] Sending payload:', payload);

    // 🌐 Call GHN API directly
    const response = await ghnAxios.post('/shipping-order/fee', payload);

    console.log('📥 [GHN] Response:', response.data);

    if (!response.data || response.data.code !== 200) {
      throw new Error(response.data?.message || 'GHN API error');
    }

    const data = response.data.data;

    // 📊 Parse response
    const baseFee = data.service_fee || data.total || 0;
    const discountInfo = applyOrderValueDiscount(baseFee, orderValue);

    const result = {
      success: true,
      basePrice: baseFee,
      totalPrice: discountInfo.totalPrice,
      serviceFee: data.service_fee || 0,
      insuranceFee: data.insurance_fee || 0,
      pickStationFee: data.pick_station_fee || 0,
      couponValue: data.coupon_value || 0,
      discount: discountInfo.discount,
      discountPercent: discountInfo.discountPercent,
      expectedDeliveryTime: data.expected_delivery_time || null,
      shippingMethod: 'GHN Standard',
      estimatedDays: calculateEstimatedDays(data.expected_delivery_time),
      estimatedTime: formatDeliveryTime(data.expected_delivery_time),
      provider: 'GHN',
      distancePrice: 0,
      
      // Debug info
      rawData: data
    };

    console.log('✅ [GHN] Calculated fee:', result);
    return result;

  } catch (error) {
    console.error('❌ [GHN] API Error:', error.response?.data || error.message);
    
    // Fallback
    return getFallbackShippingFee(orderValue);
  }
};

// ===================================================================
// APPLY ORDER VALUE DISCOUNT
// ===================================================================
const applyOrderValueDiscount = (baseFee, orderValue) => {
  let discount = 0;
  let discountPercent = 0;

  if (orderValue >= 2000000) {
    discountPercent = 50;
  } else if (orderValue >= 1000000) {
    discountPercent = 30;
  } else if (orderValue >= 500000) {
    discountPercent = 20;
  }

  if (discountPercent > 0) {
    discount = Math.round((baseFee * discountPercent) / 100);
  }

  return {
    basePrice: baseFee,
    discount: discount,
    totalPrice: baseFee - discount,
    discountPercent: discountPercent
  };
};

// ===================================================================
// CALCULATE ESTIMATED DAYS
// ===================================================================
const calculateEstimatedDays = (expectedDeliveryTime) => {
  if (!expectedDeliveryTime) return 3;

  try {
    const deliveryDate = new Date(expectedDeliveryTime);
    const now = new Date();
    const diffTime = deliveryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  } catch (error) {
    return 3;
  }
};

// ===================================================================
// FORMAT DELIVERY TIME
// ===================================================================
const formatDeliveryTime = (expectedDeliveryTime) => {
  if (!expectedDeliveryTime) return '2-3 ngày';

  try {
    const date = new Date(expectedDeliveryTime);
    const days = calculateEstimatedDays(expectedDeliveryTime);
    
    if (days === 0) return 'Trong ngày';
    if (days === 1) return 'Ngày mai';
    return `${days} ngày`;
  } catch (error) {
    return '2-3 ngày';
  }
};

// ===================================================================
// FALLBACK SHIPPING FEE
// ===================================================================
const getFallbackShippingFee = (orderValue) => {
  console.warn('⚠️ [GHN] Using fallback shipping fee');
  
  let baseFee = 30000;
  let discount = 0;
  
  if (orderValue >= 2000000) {
    discount = 15000;
  } else if (orderValue >= 1000000) {
    discount = 9000;
  } else if (orderValue >= 500000) {
    discount = 6000;
  }
  
  return {
    success: false,
    basePrice: baseFee,
    discount: discount,
    totalPrice: baseFee - discount,
    serviceFee: baseFee,
    shippingMethod: 'Giao hàng tiêu chuẩn',
    estimatedDays: 3,
    estimatedTime: '2-3 ngày',
    provider: 'Fallback',
    distancePrice: 0,
    error: 'Cannot calculate GHN fee'
  };
};

// ===================================================================
// GET AVAILABLE SERVICES (Optional)
// ===================================================================
export const getGHNAvailableServices = async (toDistrictId) => {
  try {
    const response = await ghnAxios.post('/shipping-order/available-services', {
      shop_id: GHN_CONFIG.shopId,
      from_district: GHN_CONFIG.fromDistrictId,
      to_district: toDistrictId
    });

    console.log('📋 [GHN] Available services:', response.data);
    return response.data?.data || [];
  } catch (error) {
    console.error('❌ [GHN] Error getting services:', error);
    return [];
  }
};

// ===================================================================
// CALCULATE INTERNATIONAL SHIPPING (KEEP OLD LOGIC)
// ===================================================================
export const calculateInternationalShippingFee = (
  country,
  orderValue,
  options = {}
) => {
  console.log('🌍 [INTL] Calculating international shipping:', { country, orderValue });

  const {
    serviceType = 'standard',
    insurance = true,
    tracking = true,
    signature = false
  } = options;

  const regionRates = {
    'TH': 150000, 'SG': 150000, 'MY': 150000, 'ID': 180000,
    'PH': 180000, 'LA': 120000, 'KH': 120000, 'MM': 150000,
    'BN': 200000, 'CN': 200000, 'JP': 250000, 'KR': 250000,
    'TW': 220000, 'HK': 200000, 'MO': 200000, 'IN': 280000,
    'PK': 300000, 'BD': 280000, 'LK': 280000, 'AU': 350000,
    'NZ': 380000, 'US': 400000, 'CA': 420000, 'MX': 380000,
    'BR': 450000, 'AR': 450000, 'CL': 450000, 'GB': 380000,
    'DE': 380000, 'FR': 380000, 'IT': 400000, 'ES': 400000,
    'NL': 380000, 'BE': 380000, 'CH': 400000, 'AE': 350000,
    'SA': 380000, 'QA': 350000, 'DEFAULT': 400000
  };

  let baseFee = regionRates[country] || regionRates['DEFAULT'];

  if (serviceType === 'express') baseFee *= 1.5;
  else if (serviceType === 'economy') baseFee *= 0.8;

  let insuranceFee = insurance ? Math.min(orderValue * 0.02, 100000) : 0;
  let trackingFee = tracking ? 20000 : 0;
  let signatureFee = signature ? 30000 : 0;

  const totalPrice = baseFee + insuranceFee + trackingFee + signatureFee;
  const estimatedDays = serviceType === 'express' ? 5 : serviceType === 'economy' ? 15 : 10;

  return {
    success: true,
    basePrice: baseFee,
    insuranceFee,
    trackingFee,
    signatureFee,
    totalPrice,
    serviceFee: baseFee,
    shippingMethod: `International ${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)}`,
    estimatedDays,
    estimatedTime: `${estimatedDays}-${estimatedDays + 3} ngày`,
    provider: 'International',
    country,
    isInternational: true,
    discount: 0,
    distancePrice: 0
  };
};

// ===================================================================
// VALIDATE CONFIG
// ===================================================================
export const validateGHNConfig = () => {
  const isValid = !!(
    GHN_CONFIG.token &&
    GHN_CONFIG.shopId &&
    GHN_CONFIG.fromDistrictId
  );

  if (!isValid) {
    console.error('❌ [GHN] Invalid config:', GHN_CONFIG);
  }

  return isValid;
};

// ===================================================================
// GET PROVINCES (Tỉnh/Thành phố)
// ===================================================================
export const getProvinces = async () => {
  console.log('📍 [GHN] Fetching provinces...');
  
  try {
    const response = await ghnAxios.get('/master-data/province');
    
    if (response.data?.code === 200) {
      console.log('✅ [GHN] Provinces loaded:', response.data.data.length);
      return response.data.data || [];
    }
    
    throw new Error('Invalid response from GHN');
  } catch (error) {
    console.error('❌ [GHN] Error fetching provinces:', error);
    return [];
  }
};

// ===================================================================
// GET DISTRICTS (Quận/Huyện)
// ===================================================================
export const getDistricts = async (provinceId) => {
  console.log('📍 [GHN] Fetching districts for province:', provinceId);
  
  if (!provinceId) {
    console.warn('⚠️ [GHN] No provinceId provided');
    return [];
  }
  
  try {
    const response = await ghnAxios.post('/master-data/district', {
      province_id: parseInt(provinceId)
    });
    
    if (response.data?.code === 200) {
      console.log('✅ [GHN] Districts loaded:', response.data.data.length);
      return response.data.data || [];
    }
    
    throw new Error('Invalid response from GHN');
  } catch (error) {
    console.error('❌ [GHN] Error fetching districts:', error);
    return [];
  }
};

// ===================================================================
// GET WARDS (Phường/Xã)
// ===================================================================
export const getWards = async (districtId) => {
  console.log('📍 [GHN] Fetching wards for district:', districtId);
  
  if (!districtId) {
    console.warn('⚠️ [GHN] No districtId provided');
    return [];
  }
  
  try {
    const response = await ghnAxios.post('/master-data/ward', {
      district_id: parseInt(districtId)
    });
    
    if (response.data?.code === 200) {
      console.log('✅ [GHN] Wards loaded:', response.data.data.length);
      return response.data.data || [];
    }
    
    throw new Error('Invalid response from GHN');
  } catch (error) {
    console.error('❌ [GHN] Error fetching wards:', error);
    return [];
  }
};


// ===================================================================
// EXPORTS
// ===================================================================
export default {
  calculateGHNShippingFromAddress,
  calculateGHNShippingFee,
  calculateInternationalShippingFee,
  getGHNAvailableServices,
  validateGHNConfig,
  getProvinces,       
  getDistricts,        
  getWards, 
  GHN_CONFIG
};