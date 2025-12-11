// ===================================================================
// ADDRESS PARSER - Parse địa chỉ text thành GHN IDs
// ===================================================================

import { 
  GHN_PROVINCE_MAPPING, 
  HCM_DISTRICT_MAPPING,
  HANOI_DISTRICT_MAPPING,
  DANANG_DISTRICT_MAPPING
} from './ghnAddressMapping';

/**
 * Normalize Vietnamese text (remove diacritics)
 */
const normalizeVietnamese = (str) => {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
};

/**
 * Extract province from address
 */
const extractProvince = (address) => {
  const normalized = normalizeVietnamese(address);
  
  // Kiểm tra từng tỉnh/thành trong mapping
  for (const [provinceName, provinceId] of Object.entries(GHN_PROVINCE_MAPPING)) {
    const normalizedProvinceName = normalizeVietnamese(provinceName);
    
    // Kiểm tra nếu địa chỉ chứa tên tỉnh
    if (normalized.includes(normalizedProvinceName)) {
      return {
        name: provinceName,
        id: provinceId,
        normalized: normalizedProvinceName
      };
    }
  }
  
  return null;
};

/**
 * Extract district from address (HCM specific)
 */
const extractHCMDistrict = (address) => {
  const normalized = normalizeVietnamese(address);
  
  for (const [districtName, districtId] of Object.entries(HCM_DISTRICT_MAPPING)) {
    const normalizedDistrictName = normalizeVietnamese(districtName);
    
    if (normalized.includes(normalizedDistrictName)) {
      return {
        name: districtName,
        id: districtId,
        normalized: normalizedDistrictName
      };
    }
  }
  
  return null;
};

/**
 * Extract district from address (Hanoi specific)
 */
const extractHanoiDistrict = (address) => {
  const normalized = normalizeVietnamese(address);
  
  for (const [districtName, districtId] of Object.entries(HANOI_DISTRICT_MAPPING)) {
    const normalizedDistrictName = normalizeVietnamese(districtName);
    
    if (normalized.includes(normalizedDistrictName)) {
      return {
        name: districtName,
        id: districtId,
        normalized: normalizedDistrictName
      };
    }
  }
  
  return null;
};

/**
 * Extract district from address (Da Nang specific)
 */
const extractDanangDistrict = (address) => {
  const normalized = normalizeVietnamese(address);
  
  for (const [districtName, districtId] of Object.entries(DANANG_DISTRICT_MAPPING)) {
    const normalizedDistrictName = normalizeVietnamese(districtName);
    
    if (normalized.includes(normalizedDistrictName)) {
      return {
        name: districtName,
        id: districtId,
        normalized: normalizedDistrictName
      };
    }
  }
  
  return null;
};

/**
 * Extract ward from address (pattern matching)
 */
const extractWard = (address) => {
  const normalized = normalizeVietnamese(address);
  
  // Pattern: "phuong X", "ward X", "xa X"
  const wardPatterns = [
    /phuong\s+([0-9]+)/i,
    /p\.\s*([0-9]+)/i,
    /ward\s+([0-9]+)/i,
    /xa\s+([^\s,]+)/i,
    /x\.\s*([^\s,]+)/i
  ];
  
  for (const pattern of wardPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        name: match[0],
        code: match[1], // ⚠️ Đây chỉ là tên, chưa phải GHN ward code
        normalized: match[0]
      };
    }
  }
  
  return null;
};

/**
 * ===================================================================
 * MAIN FUNCTION: Parse address to GHN format
 * ===================================================================
 */
export const parseAddressToGHN = (addressString) => {
  if (!addressString || typeof addressString !== 'string') {
    console.error('❌ [parseAddressToGHN] Invalid address:', addressString);
    return {
      success: false,
      provinceId: null,
      districtId: null,
      wardCode: null,
      error: 'Invalid address string'
    };
  }

  console.log('🔍 [parseAddressToGHN] Parsing:', addressString);

  // 1️⃣ Extract province
  const province = extractProvince(addressString);
  if (!province) {
    console.warn('⚠️ [parseAddressToGHN] Cannot detect province');
    return {
      success: false,
      provinceId: null,
      districtId: null,
      wardCode: null,
      error: 'Cannot detect province'
    };
  }

  console.log('✅ [parseAddressToGHN] Province:', province.name, '→', province.id);

  // 2️⃣ Extract district (based on province)
  let district = null;
  
  if (province.normalized.includes('ho chi minh') || 
      province.normalized.includes('sai gon') ||
      province.normalized.includes('hcm')) {
    district = extractHCMDistrict(addressString);
  } else if (province.normalized.includes('ha noi')) {
    district = extractHanoiDistrict(addressString);
  } else if (province.normalized.includes('da nang')) {
    district = extractDanangDistrict(addressString);
  }

  if (!district) {
    console.warn('⚠️ [parseAddressToGHN] Cannot detect district');
    return {
      success: false,
      provinceId: province.id,
      districtId: null,
      wardCode: null,
      error: 'Cannot detect district',
      province: province.name
    };
  }

  console.log('✅ [parseAddressToGHN] District:', district.name, '→', district.id);

  // 3️⃣ Extract ward (optional - GHN có thể tính phí mà không cần ward code chính xác)
  const ward = extractWard(addressString);
  
  if (ward) {
    console.log('✅ [parseAddressToGHN] Ward detected:', ward.name);
  } else {
    console.warn('⚠️ [parseAddressToGHN] Cannot detect ward (will use district only)');
  }

  // 4️⃣ Return result
  return {
    success: true,
    provinceId: province.id,
    provinceName: province.name,
    districtId: district.id,
    districtName: district.name,
    wardCode: ward ? ward.code : null,
    wardName: ward ? ward.name : null,
    fullAddress: addressString
  };
};

/**
 * ===================================================================
 * VALIDATION HELPER
 * ===================================================================
 */
export const validateGHNAddress = (parsedAddress) => {
  if (!parsedAddress) return false;
  
  // Tối thiểu cần Province + District
  return !!(
    parsedAddress.success &&
    parsedAddress.provinceId &&
    parsedAddress.districtId
  );
};

/**
 * ===================================================================
 * FORMAT DISPLAY ADDRESS
 * ===================================================================
 */
export const formatGHNAddress = (parsedAddress) => {
  if (!parsedAddress || !parsedAddress.success) {
    return 'Không xác định';
  }

  let parts = [];
  
  if (parsedAddress.wardName) {
    parts.push(parsedAddress.wardName);
  }
  
  if (parsedAddress.districtName) {
    parts.push(parsedAddress.districtName);
  }
  
  if (parsedAddress.provinceName) {
    parts.push(parsedAddress.provinceName);
  }
  
  return parts.join(', ');
};

/**
 * ===================================================================
 * DEBUG HELPER
 * ===================================================================
 */
export const debugAddressParsing = (address) => {
  console.group('🔍 Address Parsing Debug');
  console.log('Input:', address);
  console.log('Normalized:', normalizeVietnamese(address));
  
  const province = extractProvince(address);
  console.log('Province:', province);
  
  if (province) {
    let district = null;
    if (province.normalized.includes('ho chi minh') || province.normalized.includes('hcm')) {
      district = extractHCMDistrict(address);
      console.log('HCM District:', district);
    } else if (province.normalized.includes('ha noi')) {
      district = extractHanoiDistrict(address);
      console.log('Hanoi District:', district);
    } else if (province.normalized.includes('da nang')) {
      district = extractDanangDistrict(address);
      console.log('Da Nang District:', district);
    }
  }
  
  const ward = extractWard(address);
  console.log('Ward:', ward);
  
  const result = parseAddressToGHN(address);
  console.log('Final Result:', result);
  
  console.groupEnd();
  
  return result;
};

/**
 * ===================================================================
 * EXPORT DEFAULT
 * ===================================================================
 */
export default {
  parseAddressToGHN,
  validateGHNAddress,
  formatGHNAddress,
  debugAddressParsing,
  normalizeVietnamese
};