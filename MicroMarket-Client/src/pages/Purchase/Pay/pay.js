import React, { useState, useEffect, useRef } from "react";
import styles from "./pay.css";
import axiosClient from "../../../apis/axiosClient";
import { useParams } from "react-router-dom";
import eventApi from "../../../apis/eventApi";
import userApi from "../../../apis/userApi";
import productApi from "../../../apis/productApi";
import { useHistory } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Col, Row, Tag, Spin, Card, AutoComplete } from "antd";
import { DateTime } from "../../../utils/dateTime";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { searchMaps } from "../../../apis/mapsApi";
import {
  Typography,
  Button,
  Steps,
  Breadcrumb,
  Modal,
  notification,
  Form,
  Input,
  Select,
  Radio,
  Divider,
  Statistic,
} from "antd";
import {
  LeftSquareOutlined,
  EnvironmentOutlined,
  PercentageOutlined,
  GlobalOutlined
} from "@ant-design/icons";
import { numberWithCommas } from "../../../utils/common";

const { Meta } = Card;
const { Option } = Select;
const { Title } = Typography;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { TextArea } = Input;
const RATE_VND_USD = 26144.38;

const Pay = () => {
  // ===== STATES =====
  const [productDetail, setProductDetail] = useState([]);
  const [productNames, setProductNames] = useState({});
  const [userData, setUserData] = useState(null); // ✅ CHANGE: null thay vì []
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(true); // ✅ NEW: Loading state riêng cho userData
  const [orderTotal, setOrderTotal] = useState(0);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dataForm, setDataForm] = useState([]);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const paymentId = queryParams.get("paymentId");
  const [lengthForm, setLengthForm] = useState();
  const [form] = Form.useForm();
  const [template_feedback, setTemplateFeedback] = useState();
  let { id } = useParams();
  const history = useHistory();
  const [showModal, setShowModal] = useState(false);
  const [addrQuery, setAddrQuery] = useState('');
  const [addrLoading, setAddrLoading] = useState(false);
  const [selectedLL, setSelectedLL] = useState(null);
  const [pendingFormValues, setPendingFormValues] = useState(null);

  // === PROMOTION STATES ===
  const [voucherPromotionID, setVoucherPromotionID] = useState(null);
  const [freeShipPromotionID, setFreeShipPromotionID] = useState(null);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState(0);
  const [activePromotions, setActivePromotions] = useState([]);
  const [productPromotionDiscounts, setProductPromotionDiscounts] = useState({});
  const [promotionLoaded, setPromotionLoaded] = useState(false);

  const debounceRef = useRef(null);

  // ===== SHIPPING STATES =====
  const [distKm, setDistKm] = useState(null);
  const [shipFee, setShipFee] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [shippingDetails, setShippingDetails] = useState({
    basePrice: 0,
    distancePrice: 0,
    totalPrice: 0,
    estimatedDays: 0,
    shippingMethod: ''
  });

  // ===== INTERNATIONAL SHIPPING STATES =====
  const [selectedCountry, setSelectedCountry] = useState('VN');
  const [isInternational, setIsInternational] = useState(false);
  const [internationalZone, setInternationalZone] = useState(null);

  // Store coordinates
  const STORE_COORD = { lat: 10.870319219700491, lng: 106.79061359058457 };

  // ===== SHIPPING CONFIGURATION (giữ nguyên) =====
  const SHIPPING_CONFIG = {
    domestic: {
      regions: {
        hcm_inner: {
          name: 'Nội thành TP.HCM',
          districts: ['quận 1', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 
                     'quận 8', 'quận 10', 'quận 11', 'phú nhuận', 'tân bình', 
                     'tân phú', 'bình thạnh', 'gò vấp'],
          baseFee: 16500,
          estimatedHours: '2-4 giờ',
          estimatedDays: 0
        },
        hcm_suburban: {
          name: 'Ngoại thành TP.HCM',
          districts: ['quận 2', 'quận 9', 'quận 12', 'thủ đức', 'bình tân', 
                     'bình chánh', 'hóc môn', 'củ chi', 'nhà bè', 'cần giờ'],
          baseFee: 22000,
          estimatedHours: '4-6 giờ',
          estimatedDays: 0
        },
        nearby_province: {
          name: 'Tỉnh lân cận',
          provinces: ['bình dương', 'đồng nai', 'long an', 'bà rịa vũng tàu', 'tây ninh'],
          baseFee: 30000,
          estimatedDays: 1
        },
        south_region: {
          name: 'Miền Nam',
          provinces: ['tiền giang', 'bến tre', 'vĩnh long', 'cần thơ', 'an giang',
                     'kiên giang', 'cà mau', 'bạc liêu', 'sóc trăng', 'trà vinh',
                     'hậu giang', 'đồng tháp'],
          baseFee: 35000,
          estimatedDays: 2
        },
        central_coast: {
          name: 'Miền Trung - Duyên hải',
          provinces: ['bình thuận', 'ninh thuận', 'khánh hòa', 'phú yên', 'bình định',
                     'quảng ngãi', 'quảng nam', 'đà nẵng', 'thừa thiên huế'],
          baseFee: 35000,
          estimatedDays: 2
        },
        central_highland: {
          name: 'Miền Trung - Tây Nguyên',
          provinces: ['lâm đồng', 'đắk lắk', 'đắk nông', 'gia lai', 'kon tum'],
          baseFee: 35000,
          estimatedDays: 2
        },
        north_region: {
          name: 'Miền Bắc',
          provinces: ['hà nội', 'hải phòng', 'quảng ninh', 'hải dương', 'hưng yên',
                     'thái bình', 'nam định', 'ninh bình', 'hà nam', 'bắc ninh',
                     'bắc giang', 'vĩnh phúc', 'phú thọ', 'thái nguyên', 'lạng sơn',
                     'cao bằng', 'bắc kạn', 'tuyên quang', 'lào cai', 'yên bái',
                     'điện biên', 'lai châu', 'sơn la', 'hòa bình', 'thanh hóa',
                     'nghệ an', 'hà tĩnh', 'quảng bình', 'quảng trị'],
          baseFee: 35000,
          estimatedDays: 3
        }
      },
      surcharges: {
        remote_area: {
          districts: ['cần giờ', 'củ chi', 'côn đảo', 'phú quốc', 'tây nguyên'],
          fee: 10000
        },
        peak_hour: {
          hours: [11, 12, 17, 18, 19],
          fee: 5000
        },
        weekend: {
          fee: 5000
        }
      }
    },
    international: {
      zones: {
        zone1: {
          name: 'Đông Nam Á',
          countries: ['SG', 'MY', 'TH', 'ID', 'PH', 'LA', 'KH', 'MM', 'BN'],
          countryNames: {
            'SG': 'Singapore',
            'MY': 'Malaysia', 
            'TH': 'Thái Lan',
            'ID': 'Indonesia',
            'PH': 'Philippines',
            'LA': 'Lào',
            'KH': 'Campuchia',
            'MM': 'Myanmar',
            'BN': 'Brunei'
          },
          baseFee: 450000,
          estimatedDays: '3-5',
          customsClearance: 2
        },
        zone2: {
          name: 'Đông Á',
          countries: ['CN', 'JP', 'KR', 'TW', 'HK', 'MO'],
          countryNames: {
            'CN': 'Trung Quốc',
            'JP': 'Nhật Bản',
            'KR': 'Hàn Quốc',
            'TW': 'Đài Loan',
            'HK': 'Hong Kong',
            'MO': 'Macau'
          },
          baseFee: 550000,
          estimatedDays: '5-7',
          customsClearance: 3
        },
        zone3: {
          name: 'Nam Á & Trung Đông',
          countries: ['IN', 'PK', 'BD', 'LK', 'AE', 'SA', 'QA', 'KW', 'IL'],
          countryNames: {
            'IN': 'Ấn Độ',
            'PK': 'Pakistan',
            'BD': 'Bangladesh',
            'LK': 'Sri Lanka',
            'AE': 'UAE',
            'SA': 'Saudi Arabia',
            'QA': 'Qatar',
            'KW': 'Kuwait',
            'IL': 'Israel'
          },
          baseFee: 650000,
          estimatedDays: '7-10',
          customsClearance: 4
        },
        zone4: {
          name: 'Châu Úc & Thái Bình Dương',
          countries: ['AU', 'NZ', 'FJ', 'PG'],
          countryNames: {
            'AU': 'Úc',
            'NZ': 'New Zealand',
            'FJ': 'Fiji',
            'PG': 'Papua New Guinea'
          },
          baseFee: 750000,
          estimatedDays: '7-10',
          customsClearance: 3
        },
        zone5: {
          name: 'Châu Âu',
          countries: ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'AT', 'CH', 'PT', 'GR', 'RU'],
          countryNames: {
            'GB': 'Anh',
            'FR': 'Pháp',
            'DE': 'Đức',
            'IT': 'Ý',
            'ES': 'Tây Ban Nha',
            'NL': 'Hà Lan',
            'BE': 'Bỉ',
            'SE': 'Thụy Điển',
            'NO': 'Na Uy',
            'DK': 'Đan Mạch',
            'FI': 'Phần Lan',
            'PL': 'Ba Lan',
            'CZ': 'Séc',
            'AT': 'Áo',
            'CH': 'Thụy Sĩ',
            'PT': 'Bồ Đào Nha',
            'GR': 'Hy Lạp',
            'RU': 'Nga'
          },
          baseFee: 850000,
          estimatedDays: '10-14',
          customsClearance: 5
        },
        zone6: {
          name: 'Bắc Mỹ',
          countries: ['US', 'CA', 'MX'],
          countryNames: {
            'US': 'Hoa Kỳ',
            'CA': 'Canada',
            'MX': 'Mexico'
          },
          baseFee: 950000,
          estimatedDays: '12-15',
          customsClearance: 5
        },
        zone7: {
          name: 'Nam Mỹ & Châu Phi',
          countries: ['BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'ZA', 'EG', 'NG', 'KE', 'MA'],
          countryNames: {
            'BR': 'Brazil',
            'AR': 'Argentina',
            'CL': 'Chile',
            'CO': 'Colombia',
            'PE': 'Peru',
            'VE': 'Venezuela',
            'ZA': 'Nam Phi',
            'EG': 'Ai Cập',
            'NG': 'Nigeria',
            'KE': 'Kenya',
            'MA': 'Maroc'
          },
          baseFee: 1100000,
          estimatedDays: '15-20',
          customsClearance: 7
        }
      },
      services: {
        express: {
          name: 'Giao hàng nhanh quốc tế',
          feeMultiplier: 1.5,
          reduceDays: '30%'
        },
        economy: {
          name: 'Giao hàng tiết kiệm',
          feeMultiplier: 0.7,
          addDays: '50%'
        },
        insurance: {
          name: 'Bảo hiểm quốc tế',
          rate: 2,
          minFee: 50000,
          maxFee: 500000
        },
        tracking: {
          name: 'Theo dõi chi tiết',
          fee: 50000
        },
        signature: {
          name: 'Yêu cầu chữ ký nhận hàng',
          fee: 30000
        }
      },
      additionalFees: {
        fuelSurcharge: 0.15,
        remoteSurcharge: 200000,
        customsHandling: 150000,
        documentFee: 100000
      },
      restrictedItems: [
        'weapons', 'drugs', 'explosives', 'perishables', 'liquids', 'batteries'
      ],
      disclaimer: {
        vi: 'Giá vận chuyển chưa bao gồm thuế nhập khẩu và phí hải quan tại nước đến. Khách hàng có trách nhiệm thanh toán các khoản phí này khi nhận hàng.',
        en: 'Shipping price does not include import taxes and customs duties at destination country. Customer is responsible for these charges upon delivery.'
      }
    },
    services: {
      cod: {
        name: 'Thu hộ COD',
        fee: 0,
        rate: 0,
        availableFor: ['domestic']
      },
      careful: {
        name: 'Giao hàng cẩn thận',
        fee: 5000,
        availableFor: ['domestic', 'international']
      }
    }
  };

  const COUNTRIES_LIST = [
    { code: 'VN', name: 'Việt Nam', flag: '🇻🇳' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
    { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
    { code: 'TH', name: 'Thái Lan', flag: '🇹🇭' },
    { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
    { code: 'LA', name: 'Lào', flag: '🇱🇦' },
    { code: 'KH', name: 'Campuchia', flag: '🇰🇭' },
    { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
    { code: 'BN', name: 'Brunei', flag: '🇧🇳' },
    { code: 'CN', name: 'Trung Quốc', flag: '🇨🇳' },
    { code: 'JP', name: 'Nhật Bản', flag: '🇯🇵' },
    { code: 'KR', name: 'Hàn Quốc', flag: '🇰🇷' },
    { code: 'TW', name: 'Đài Loan', flag: '🇹🇼' },
    { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
    { code: 'MO', name: 'Macau', flag: '🇲🇴' },
    { code: 'IN', name: 'Ấn Độ', flag: '🇮🇳' },
    { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
    { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
    { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
    { code: 'IL', name: 'Israel', flag: '🇮🇱' },
    { code: 'AU', name: 'Úc', flag: '🇦🇺' },
    { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
    { code: 'FJ', name: 'Fiji', flag: '🇫🇯' },
    { code: 'GB', name: 'Anh', flag: '🇬🇧' },
    { code: 'FR', name: 'Pháp', flag: '🇫🇷' },
    { code: 'DE', name: 'Đức', flag: '🇩🇪' },
    { code: 'IT', name: 'Ý', flag: '🇮🇹' },
    { code: 'ES', name: 'Tây Ban Nha', flag: '🇪🇸' },
    { code: 'NL', name: 'Hà Lan', flag: '🇳🇱' },
    { code: 'BE', name: 'Bỉ', flag: '🇧🇪' },
    { code: 'SE', name: 'Thụy Điển', flag: '🇸🇪' },
    { code: 'NO', name: 'Na Uy', flag: '🇳🇴' },
    { code: 'DK', name: 'Đan Mạch', flag: '🇩🇰' },
    { code: 'FI', name: 'Phần Lan', flag: '🇫🇮' },
    { code: 'PL', name: 'Ba Lan', flag: '🇵🇱' },
    { code: 'CZ', name: 'Séc', flag: '🇨🇿' },
    { code: 'AT', name: 'Áo', flag: '🇦🇹' },
    { code: 'CH', name: 'Thụy Sĩ', flag: '🇨🇭' },
    { code: 'PT', name: 'Bồ Đào Nha', flag: '🇵🇹' },
    { code: 'GR', name: 'Hy Lạp', flag: '🇬🇷' },
    { code: 'RU', name: 'Nga', flag: '🇷🇺' },
    { code: 'US', name: 'Hoa Kỳ', flag: '🇺🇸' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
    { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
    { code: 'CL', name: 'Chile', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'PE', name: 'Peru', flag: '🇵🇪' },
    { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
    { code: 'ZA', name: 'Nam Phi', flag: '🇿🇦' },
    { code: 'EG', name: 'Ai Cập', flag: '🇪🇬' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    { code: 'MA', name: 'Maroc', flag: '🇲🇦' }
  ];

  // ===== HELPER FUNCTIONS =====
  const normalizeVietnamese = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  const determineInternationalZone = (countryCode) => {
    for (const [zoneKey, zone] of Object.entries(SHIPPING_CONFIG.international.zones)) {
      if (zone.countries.includes(countryCode)) {
        return { key: zoneKey, ...zone };
      }
    }
    return null;
  };

  const calculateInternationalShippingFee = (countryCode, orderValue, options = {}) => {
    const {
      serviceType = 'standard',
      insurance = true,
      tracking = true,
      signature = false
    } = options;

    const zone = determineInternationalZone(countryCode);
    if (!zone) {
      return {
        error: true,
        message: 'Quốc gia không được hỗ trợ giao hàng'
      };
    }

    let baseFee = zone.baseFee;
    let totalFee = baseFee;
    let additionalFees = [];
    let estimatedDays = zone.estimatedDays;

    if (serviceType === 'express') {
      totalFee *= SHIPPING_CONFIG.international.services.express.feeMultiplier;
      additionalFees.push(`Giao hàng nhanh: x${SHIPPING_CONFIG.international.services.express.feeMultiplier}`);
      
      const [minDays, maxDays] = estimatedDays.split('-').map(Number);
      const reducedMin = Math.ceil(minDays * 0.7);
      const reducedMax = Math.ceil(maxDays * 0.7);
      estimatedDays = `${reducedMin}-${reducedMax}`;
    } else if (serviceType === 'economy') {
      totalFee *= SHIPPING_CONFIG.international.services.economy.feeMultiplier;
      additionalFees.push(`Giao hàng tiết kiệm: x${SHIPPING_CONFIG.international.services.economy.feeMultiplier}`);
      
      const [minDays, maxDays] = estimatedDays.split('-').map(Number);
      const increasedMin = Math.ceil(minDays * 1.5);
      const increasedMax = Math.ceil(maxDays * 1.5);
      estimatedDays = `${increasedMin}-${increasedMax}`;
    }

    const fuelSurcharge = totalFee * SHIPPING_CONFIG.international.additionalFees.fuelSurcharge;
    totalFee += fuelSurcharge;
    additionalFees.push(`Phụ phí nhiên liệu (15%): +${numberWithCommas(Math.round(fuelSurcharge))}đ`);

    totalFee += SHIPPING_CONFIG.international.additionalFees.customsHandling;
    additionalFees.push(`Phí xử lý hải quan: +${numberWithCommas(SHIPPING_CONFIG.international.additionalFees.customsHandling)}đ`);

    totalFee += SHIPPING_CONFIG.international.additionalFees.documentFee;
    additionalFees.push(`Phí chứng từ: +${numberWithCommas(SHIPPING_CONFIG.international.additionalFees.documentFee)}đ`);

    if (insurance) {
      const insuranceFee = Math.min(
        Math.max(
          orderValue * SHIPPING_CONFIG.international.services.insurance.rate / 100,
          SHIPPING_CONFIG.international.services.insurance.minFee
        ),
        SHIPPING_CONFIG.international.services.insurance.maxFee
      );
      totalFee += insuranceFee;
      additionalFees.push(`Bảo hiểm (2%): +${numberWithCommas(Math.round(insuranceFee))}đ`);
    }

    if (tracking) {
      totalFee += SHIPPING_CONFIG.international.services.tracking.fee;
      additionalFees.push(`Theo dõi chi tiết: +${numberWithCommas(SHIPPING_CONFIG.international.services.tracking.fee)}đ`);
    }

    if (signature) {
      totalFee += SHIPPING_CONFIG.international.services.signature.fee;
      additionalFees.push(`Yêu cầu chữ ký: +${numberWithCommas(SHIPPING_CONFIG.international.services.signature.fee)}đ`);
    }

    const totalEstimatedDays = `${estimatedDays} ngày + ${zone.customsClearance} ngày thông quan`;

    return {
      basePrice: baseFee,
      additionalFees: additionalFees,
      totalPrice: Math.round(totalFee),
      estimatedDays: totalEstimatedDays,
      shippingMethod: `Vận chuyển quốc tế - ${zone.name}`,
      zone: zone.name,
      serviceType: serviceType,
      hasInsurance: insurance,
      hasTracking: tracking,
      hasSignature: signature,
      customsNote: SHIPPING_CONFIG.international.disclaimer.vi
    };
  };

  const determineDomesticShippingRegion = (address) => {
    if (!address) return null;
    
    const normalizedAddr = normalizeVietnamese(address);
    
    for (const district of SHIPPING_CONFIG.domestic.regions.hcm_inner.districts) {
      if (normalizedAddr.includes(normalizeVietnamese(district))) {
        return SHIPPING_CONFIG.domestic.regions.hcm_inner;
      }
    }
    
    for (const district of SHIPPING_CONFIG.domestic.regions.hcm_suburban.districts) {
      if (normalizedAddr.includes(normalizeVietnamese(district))) {
        return SHIPPING_CONFIG.domestic.regions.hcm_suburban;
      }
    }
    
    for (const [regionKey, region] of Object.entries(SHIPPING_CONFIG.domestic.regions)) {
      if (region.provinces) {
        for (const province of region.provinces) {
          if (normalizedAddr.includes(normalizeVietnamese(province))) {
            return region;
          }
        }
      }
    }
    
    return SHIPPING_CONFIG.domestic.regions.north_region;
  };

  const isRemoteArea = (address) => {
    const normalizedAddr = normalizeVietnamese(address);
    return SHIPPING_CONFIG.domestic.surcharges.remote_area.districts.some(
      district => normalizedAddr.includes(normalizeVietnamese(district))
    );
  };

  const calculateDomesticShippingFee = (address, orderValue, options = {}) => {
    const { 
      express = false, 
      insurance = false,
      cod = true,
      deliveryTime = new Date() 
    } = options;
    
    const region = determineDomesticShippingRegion(address);
    if (!region) {
      return {
        basePrice: 0,
        totalPrice: 0,
        estimatedDays: 0,
        shippingMethod: 'Không xác định được khu vực'
      };
    }
    
    let baseFee = region.baseFee;
    let totalFee = baseFee;
    let estimatedDays = region.estimatedDays;
    let additionalFees = [];
    
    if (freeShipPromotionID) {
      return {
        basePrice: baseFee,
        additionalFees: [],
        totalPrice: 0,
        estimatedDays: estimatedDays,
        estimatedTime: estimatedDays === 0 ? (region.estimatedHours || 'Trong ngày') : `${estimatedDays} ngày`,
        shippingMethod: region.name + ' (Miễn phí vận chuyển)',
        isCOD: cod,
        hasInsurance: insurance,
        isExpress: express,
        isFreeShip: true
      };
    }
    
    if (isRemoteArea(address)) {
      totalFee += SHIPPING_CONFIG.domestic.surcharges.remote_area.fee;
      additionalFees.push('Phụ phí vùng xa: +' + numberWithCommas(SHIPPING_CONFIG.domestic.surcharges.remote_area.fee) + 'đ');
    }
    
    const currentHour = deliveryTime.getHours();
    if (SHIPPING_CONFIG.domestic.surcharges.peak_hour.hours.includes(currentHour)) {
      totalFee += SHIPPING_CONFIG.domestic.surcharges.peak_hour.fee;
      additionalFees.push('Phụ phí giờ cao điểm: +' + numberWithCommas(SHIPPING_CONFIG.domestic.surcharges.peak_hour.fee) + 'đ');
    }
    
    const dayOfWeek = deliveryTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      totalFee += SHIPPING_CONFIG.domestic.surcharges.weekend.fee;
      additionalFees.push('Phụ phí cuối tuần: +' + numberWithCommas(SHIPPING_CONFIG.domestic.surcharges.weekend.fee) + 'đ');
    }
    
    totalFee = Math.max(totalFee, 15000);
    
    let estimatedTime = '';
    if (estimatedDays === 0) {
      estimatedTime = region.estimatedHours || 'Trong ngày';
    } else {
      estimatedTime = `${estimatedDays} ngày`;
    }
    
    return {
      basePrice: baseFee,
      additionalFees: additionalFees,
      totalPrice: Math.round(totalFee),
      estimatedDays: estimatedDays,
      estimatedTime: estimatedTime,
      shippingMethod: region.name,
      isCOD: cod,
      hasInsurance: insurance,
      isExpress: express
    };
  };

  const calculateShippingFee = (country, address, orderValue, options = {}) => {
    if (country === 'VN') {
      return calculateDomesticShippingFee(address, orderValue, options);
    } else {
      return calculateInternationalShippingFee(country, orderValue, options);
    }
  };

  const getDrivingDistanceKm = async (from, to) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('osrm fail');
      const j = await res.json();
      const meters = j?.routes?.[0]?.distance;
      if (!meters && meters !== 0) throw new Error('no distance');
      return meters / 1000;
    } catch {
      return null;
    }
  };

  const haversineKm = (a, b) => {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };

  async function geocodeAddress(q) {
    if (!q || q.trim().length < 3) return;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=vn&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } });
      const list = await res.json();

      if (Array.isArray(list) && list.length > 0) {
        const first = list[0];
        const lat = Number(first.lat);
        const lng = Number(first.lon);

        form.setFieldsValue({ address: first.display_name, lat, lng });
        setAddrQuery(first.display_name);
        setSelectedLL({ lat, lng });
      }
    } catch (e) {
      console.error(e);
    }
  }

  const onAddressChange = (e) => {
    const v = e.target.value;
    setAddrQuery(v);
    form.setFieldsValue({ address: v, lat: undefined, lng: undefined });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (selectedCountry === 'VN') {
        geocodeAddress(v);
      }
    }, 1500);
  };

  const onCountryChange = (value) => {
    setSelectedCountry(value);
    setIsInternational(value !== 'VN');
    
    if (value !== 'VN') {
      form.setFieldsValue({ lat: undefined, lng: undefined });
      setSelectedLL(null);
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'vi' } }
      );
      const j = await res.json();
      return j.display_name || '';
    } catch (e) {
      return '';
    }
  };

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      notification.warning({ message: 'Trình duyệt của bạn không hỗ trợ định vị.' });
      return;
    }

    if (selectedCountry !== 'VN') {
      notification.warning({ 
        message: 'Chức năng này chỉ khả dụng cho địa chỉ trong Việt Nam.' 
      });
      return;
    }

    setAddrLoading(true);
    notification.info({
      message: 'Đang lấy vị trí',
      description: 'Vui lòng cấp quyền truy cập vị trí trong trình duyệt.',
      duration: 0,
      key: 'geolocation-loading',
    });

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;

        const addr = await reverseGeocode(lat, lng);

        setSelectedLL({ lat, lng });
        form.setFieldsValue({ lat, lng, address: addr || form.getFieldValue('address') });
        setAddrQuery(addr || form.getFieldValue('address'));

        setAddrLoading(false);
        notification.close('geolocation-loading');
        notification.success({
          message: 'Thành công',
          description: 'Lấy vị trí hiện tại thành công!',
        });
      },
      (err) => {
        setAddrLoading(false);
        notification.close('geolocation-loading');

        if (err.code === err.PERMISSION_DENIED) {
          notification.error({
            message: 'Không lấy được vị trí',
            description: 'Bạn đã từ chối cấp quyền truy cập vị trí.',
          });
        } else {
          notification.error({
            message: 'Lỗi không xác định',
            description: err.message || 'Đã xảy ra lỗi khi lấy vị trí.',
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const addressWatch = Form.useWatch('address', form);
  const latWatch = Form.useWatch('lat', form);
  const lngWatch = Form.useWatch('lng', form);
  const countryWatch = Form.useWatch('country', form);

  useEffect(() => {
    const calculateShipping = async () => {
      const address = form.getFieldValue('address');
      const country = form.getFieldValue('country') || selectedCountry;
      
      if (address && address.length > 10) {
        const shippingCalc = calculateShippingFee(country, address, orderTotal || 0, {
          express: false,
          insurance: country !== 'VN',
          cod: country === 'VN',
          tracking: country !== 'VN',
          deliveryTime: new Date()
        });
        
        setShippingDetails(shippingCalc);
        
        const finalShipFee = (freeShipPromotionID && country === 'VN') ? 0 : shippingCalc.totalPrice;
        setShipFee(finalShipFee);
        
        setGrandTotal((orderTotal || 0) + finalShipFee);
        
        if (country === 'VN') {
          const lat = form.getFieldValue('lat');
          const lng = form.getFieldValue('lng');
          if (lat && lng) {
            const to = { lat: Number(lat), lng: Number(lng) };
            let km = await getDrivingDistanceKm(STORE_COORD, to);
            if (km == null) km = haversineKm(STORE_COORD, to);
            setDistKm(km);
          }
        } else {
          setDistKm(null);
        }
      } else {
        setShippingDetails({
          basePrice: 0,
          totalPrice: 0,
          estimatedDays: 0,
          shippingMethod: ''
        });
        setShipFee(0);
        setGrandTotal(orderTotal || 0);
      }
    };
    
    calculateShipping();
  }, [addressWatch, orderTotal, freeShipPromotionID, selectedCountry, countryWatch]);

  // ===== PROMOTION FUNCTIONS =====
  const calculateDiscountedPrice = (product) => {
    const now = new Date();
    let finalPrice = product.price;
    let maxDiscountPercent = 0;
    let appliedPromotion = null;

    const validPromotions = activePromotions.filter(promotion => {
      if (promotion.loai !== 'dot_giam_gia') return false;
      if (promotion.trangThai !== 'active') return false;
      
      const startDate = new Date(promotion.thoiGianBD);
      const endDate = new Date(promotion.thoiGianKT);
      
      if (now < startDate || now > endDate) return false;
      
      if (!promotion.sanPhamApDung || promotion.sanPhamApDung.length === 0) return false;
      
      const productInPromotion = promotion.sanPhamApDung.some(productId => {
        let id = typeof productId === 'string' ? productId : 
                productId?.$oid || productId?._id || productId?.toString();
        
        let currentProductId = product.product || product._id;
        if (typeof currentProductId === 'object') {
          currentProductId = currentProductId.$oid || currentProductId._id || currentProductId.toString();
        }
        
        return id === currentProductId;
      });
      
      return productInPromotion;
    });

    validPromotions.forEach(promotion => {
      if (promotion.phanTramKhuyenMai > maxDiscountPercent) {
        maxDiscountPercent = promotion.phanTramKhuyenMai;
        appliedPromotion = promotion;
      }
    });

    if (maxDiscountPercent > 0) {
      const discountAmount = (product.price * maxDiscountPercent) / 100;
      finalPrice = product.price - discountAmount;
    }

    return {
      originalPrice: product.price,
      finalPrice: Math.round(finalPrice),
      discountPercent: maxDiscountPercent,
      appliedPromotion: appliedPromotion,
      hasDiscount: maxDiscountPercent > 0
    };
  };

  const fetchActivePromotions = async () => {
    try {
      const possibleEndpoints = [
        '/promotion-management',
        '/promotions',
        '/promotion',
        '/khuyenmai',
        '/promotion-management/search'
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axiosClient.get(endpoint, {
            params: {
              trangThai: 'active',
              loai: 'dot_giam_gia'
            }
          });
          
          if (response?.data) {
            const promotionsData = response.data.docs || response.data || [];
            
            if (Array.isArray(promotionsData) && promotionsData.length > 0) {
              setActivePromotions(promotionsData);
              return;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      setActivePromotions([]);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      setActivePromotions([]);
    }
  };

  const loadPromotionsFromStorage = () => {
    try {
      const voucherID = localStorage.getItem("appliedVoucherID");
      const freeshipID = localStorage.getItem("appliedFreeshipID");
      const voucherData = localStorage.getItem("appliedVoucher");
      
      if (voucherID) {
        setVoucherPromotionID(voucherID);
      }
      
      if (freeshipID) {
        setFreeShipPromotionID(freeshipID);
      }
      
      if (voucherData) {
        const voucher = JSON.parse(voucherData);
        setAppliedVoucher(voucher);
      }
      
      setPromotionLoaded(true);
    } catch (error) {
      console.error("Error loading promotions from storage:", error);
      setPromotionLoaded(true);
    }
  };

  const calculateVoucherDiscount = (baseTotal, voucher) => {
    if (!voucher || !voucher.phanTramKhuyenMai) return 0;
    
    let discount = (baseTotal * voucher.phanTramKhuyenMai) / 100;
    
    if (voucher.giamToiDa && discount > voucher.giamToiDa) {
      discount = voucher.giamToiDa;
    }
    
    return discount;
  };

  const calculateTotalWithPromotions = (products) => {
    if (!Array.isArray(products) || products.length === 0) {
      return {
        originalTotal: 0,
        totalWithProductPromotions: 0,
        productPromotionDiscount: 0
      };
    }
    
    let totalOriginal = 0;
    let totalWithProductPromotions = 0;
    const discounts = {};
    
    products.forEach((product) => {
      if (!product || typeof product.price !== 'number' || typeof product.quantity !== 'number') {
        return;
      }
      
      const priceInfo = calculateDiscountedPrice(product);
      const originalPrice = priceInfo.originalPrice * product.quantity;
      const finalPrice = priceInfo.finalPrice * product.quantity;
      
      totalOriginal += originalPrice;
      totalWithProductPromotions += finalPrice;
      
      discounts[product.product || product._id] = {
        originalPrice: originalPrice,
        discountedPrice: finalPrice,
        discountAmount: originalPrice - finalPrice,
        discountPercent: priceInfo.discountPercent,
        appliedPromotion: priceInfo.appliedPromotion,
        hasDiscount: priceInfo.hasDiscount
      };
    });
    
    setProductPromotionDiscounts(discounts);
    
    return {
      originalTotal: totalOriginal,
      totalWithProductPromotions: totalWithProductPromotions,
      productPromotionDiscount: totalOriginal - totalWithProductPromotions
    };
  };

  useEffect(() => {
    if (promotionLoaded && originalTotal > 0) {
      const voucherDiscount = calculateVoucherDiscount(originalTotal, appliedVoucher);
      setVoucherDiscountAmount(voucherDiscount);
      setDiscountAmount(voucherDiscount);
      
      const finalOrderTotal = originalTotal - voucherDiscount;
      setOrderTotal(Math.max(0, finalOrderTotal));
    }
  }, [originalTotal, appliedVoucher, promotionLoaded]);

  // ===== PAYPAL FUNCTIONS =====
  async function fetchUsdVndRate() {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) {
        return RATE_VND_USD;
      }
      const data = await response.json();
      const rate = data?.rates?.VND;
      if (!rate) {
        return RATE_VND_USD;
      }
      return rate;
    } catch (error) {
      console.error("Lỗi khi lấy tỷ giá:", error);
      return RATE_VND_USD;
    }
  }

  const handlePayment = async (values, totalUSD) => {
    try {
      const productPayment = {
        price: totalUSD,
        description: values.description,
        return_url: "http://localhost:3500" + location.pathname,
        cancel_url: "http://localhost:3500" + location.pathname,
      };
      const response = await axiosClient.post("/payment/pay", productPayment);
      if (response.approvalUrl) {
        localStorage.setItem("session_paypal", response.accessToken);
        return response.approvalUrl;
      } else {
        notification["error"]({
          message: `Thông báo`,
          description: "Thanh toán thất bại",
        });
        return null;
      }
    } catch (error) {
      throw error;
    }
  };

  const confirmOrder = async (values) => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPayPalCallback = urlParams.get("paymentId") && urlParams.get("PayerID");

    if (isPayPalCallback) {
      console.log("Detected PayPal callback, skipping confirmOrder");
      return;
    }

    console.log("🛒 ConfirmOrder called with values:", values);

    if (values.country && values.country !== 'VN' && values.billing === 'cod') {
      notification["error"]({
        message: `Thông báo`,
        description: "Đơn hàng quốc tế không hỗ trợ thanh toán khi nhận hàng (COD). Vui lòng chọn thanh toán PayPal.",
      });
      return;
    }

    if (values.billing === "paypal") {
      localStorage.setItem("description", values.description || "");
      localStorage.setItem("address", values.address || "");
      localStorage.setItem("country", values.country || "VN");

      console.log("💳 Processing PayPal payment");

      try {
        const usdToVndRate = await fetchUsdVndRate();
        console.log("💱 USD to VND rate:", usdToVndRate);

        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const processedProducts = cart.map(item => {
          const priceVND = item.price;
          const priceUSD = (priceVND / usdToVndRate).toFixed(2);
          return {
            product: item._id,
            quantity: item.quantity,
            price: priceUSD,
            size: item.selectedSize || item.size || item.productSize || null,
            color: item.selectedColor || item.color || null,
            variantId: item.variantId || `${item._id}-${item.selectedSize || item.size || ''}-${(item.selectedColor || item.color || '').replace('#', '')}`,
          };
        });

        const productsTotal = processedProducts.reduce(
          (sum, p) => sum + (p.price * p.quantity), 0
        );
        const shippingUSD = (shipFee / usdToVndRate).toFixed(2);
        const totalUSD = (parseFloat(productsTotal) + parseFloat(shippingUSD)).toFixed(2);

        console.log("🚀 PayPal products:", processedProducts);
        console.log("📦 Shipping USD:", shippingUSD);
        console.log("💰 Total USD:", totalUSD);

        const approvalUrl = await handlePayment(values, totalUSD);
        if (approvalUrl) {
          console.log("🔄 Redirecting to PayPal:", approvalUrl);
          window.location.href = approvalUrl;
        } else {
          notification["error"]({
            message: `Thông báo`,
            description: "Thanh toán thất bại",
          });
        }
      } catch (error) {
        console.error("❌ PayPal error:", error);
        notification["error"]({
          message: `Thông báo`,
          description: "Thanh toán thất bại",
        });
      }
    } else {
      console.log("💵 Processing COD order (domestic only)");
      
      // 🔍 LOG 1: Check userData
      console.log("🔍 [DEBUG] userData:", userData);
      console.log("🔍 [DEBUG] userData._id:", userData?._id);
      console.log("🔍 [DEBUG] typeof userData:", typeof userData);
      
      // 🔍 LOG 2: Check localStorage user
      const localStorageUser = localStorage.getItem("user");
      console.log("🔍 [DEBUG] localStorage user raw:", localStorageUser);
      if (localStorageUser) {
        try {
          const parsedUser = JSON.parse(localStorageUser);
          console.log("🔍 [DEBUG] localStorage user parsed:", parsedUser);
          console.log("🔍 [DEBUG] localStorage user.user:", parsedUser?.user);
          console.log("🔍 [DEBUG] localStorage user.user._id:", parsedUser?.user?._id);
        } catch (e) {
          console.error("🔍 [DEBUG] Error parsing localStorage user:", e);
        }
      }
      
      try {
        const { lat, lng } = form.getFieldsValue(['lat', 'lng']);
        const subtotal = orderTotal || 0;
        const shippingFee = shipFee || 0;
        const distanceKm = distKm ?? null;
        const total = (grandTotal || (subtotal + shippingFee));

        // 🔍 LOG 3: Check all state variables
        console.log("🔍 [DEBUG] State variables:", {
          orderTotal,
          shipFee,
          distKm,
          grandTotal,
          originalTotal,
          discountAmount,
          voucherPromotionID,
          freeShipPromotionID,
          productDetail,
          shippingDetails
        });

        // 🔍 LOG 4: Try to get user ID from different sources
        let userId = userData?._id;
        console.log("🔍 [DEBUG] userId from userData:", userId);
        
        if (!userId && localStorageUser) {
          const parsed = JSON.parse(localStorageUser);
          userId = parsed?.user?._id || parsed?._id;
          console.log("🔍 [DEBUG] userId from localStorage:", userId);
        }

        if (!userId) {
          console.error("❌ [DEBUG] No user ID found!");
          notification["error"]({
            message: `Lỗi`,
            description: "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.",
          });
          return;
        }

        const formatData = {
          userId: userData?.id || userData?._id, 
          address: values.address,
          country: values.country || 'VN',
          billing: values.billing,
          description: values.description,
          status: "pending",
          
          products: productDetail.map(item => ({
            product: item.product,
            quantity: item.quantity,
            price: item.price,
            size: item.selectedSize || item.size || item.productSize || null,
            color: item.selectedColor || item.color || null,
            variantId: item.variantId || null,
          })),
          
          voucherPromotionID: voucherPromotionID || null,
          freeShipPromotionID: freeShipPromotionID || null,
          
          orderTotal: originalTotal,
          discountAmount: discountAmount,
          shippingFee,
          finalAmount: total,
          distanceKm,
          
          shipping: {
            address: values.address,
            country: values.country || 'VN',
            lat,
            lng,
            method: shippingDetails.shippingMethod,
            estimatedDays: shippingDetails.estimatedDays,
            estimatedTime: shippingDetails.estimatedTime,
            isInternational: false
          }
        };

        // 🔍 LOG 5: Final data check
        console.log("📦 Order data being sent:", formatData);
        console.log("🔍 [DEBUG] formatData.user:", formatData.user);
        console.log("🔍 [DEBUG] formatData JSON:", JSON.stringify(formatData, null, 2));

        await axiosClient.post("/order", formatData)
          .then((response) => {
            console.log("✅ Server response:", response);
            console.log("🔍 [DEBUG] Response data:", response.data);
            console.log("🔍 [DEBUG] Response status:", response.status);

            if (response.error === "Insufficient quantity for one or more products.") {
              let errorMessage = "Sản phẩm đã hết hàng!";
              if (response.insufficientQuantityProducts && response.insufficientQuantityProducts.length > 0) {
                errorMessage += " Chi tiết:\n";
                response.insufficientQuantityProducts.forEach(p => {
                  const productName = productNames[p.productId]?.name || `Sản phẩm ID: ${p.productId}`;
                  errorMessage += `\n- ${productName}`;
                  if (p.size) errorMessage += `, kích cỡ: ${p.size}`;
                  if (p.color) errorMessage += `, màu: ${p.color}`;
                  errorMessage += `\n  Số lượng hiện có: ${p.availableQuantity}, Yêu cầu: ${p.requestedQuantity}`;
                });
              }

              return notification["error"]({
                message: `Thông báo`,
                description: errorMessage,
                duration: 10
              });
            }

            if (response == undefined) {
              notification["error"]({
                message: `Thông báo`,
                description: "Đặt hàng thất bại",
              });
            } else {
              notification["success"]({
                message: `Thông báo`,
                description: "Đặt hàng thành công",
              });
              form.resetFields();
              history.push("/final-pay");
              
              localStorage.removeItem("cart");
              localStorage.removeItem("cartLength");
              localStorage.removeItem("appliedVoucherID");
              localStorage.removeItem("appliedFreeshipID");
              localStorage.removeItem("appliedVoucher");
            }
          })
          .catch((error) => {
            // 🔍 LOG 6: Detailed error logging
            console.error("❌ COD order error - Full error:", error);
            console.error("🔍 [DEBUG] Error response:", error.response);
            console.error("🔍 [DEBUG] Error response data:", error.response?.data);
            console.error("🔍 [DEBUG] Error response status:", error.response?.status);
            console.error("🔍 [DEBUG] Error message:", error.message);
            
            // Show detailed error from server
            const serverError = error.response?.data?.message || 
                               error.response?.data?.error || 
                               error.message || 
                               "Lỗi không xác định";
            
            notification["error"]({
              message: `Lỗi đặt hàng`,
              description: `Chi tiết: ${serverError}`,
              duration: 10
            });
            
            throw error;
          });
      } catch (error) {
        console.error("❌ COD order error:", error);
        notification["error"]({
          message: `Thông báo`,
          description: "Đặt hàng thất bại: " + (error.message || "Lỗi không xác định"),
        });
        throw error;
      }
    }

    setTimeout(function () {
      setLoading(false);
    }, 1000);
  };

  const accountCreate = async (values) => {
    setPendingFormValues(values);
    setShowModal(true);
  };

  const handleModalConfirm = async () => {
    try {
      const queryParams = new URLSearchParams(window.location.search);
      const paymentId = queryParams.get("paymentId");
      const PayerID = queryParams.get("PayerID");

      if (paymentId && PayerID) {
        const token = localStorage.getItem("session_paypal");
        const description = localStorage.getItem("description");
        const address = localStorage.getItem("address");
        const country = localStorage.getItem("country") || "VN";

        if (!token) {
          notification["error"]({
            message: `Thông báo`,
            description: "Không tìm thấy token thanh toán PayPal",
          });
          setShowModal(false);
          return;
        }

        const response = await axiosClient.get("/payment/executePayment", {
          params: {
            paymentId,
            token,
            PayerID,
          },
        });

        if (response) {
          const local = localStorage.getItem("user");
          const currentUser = JSON.parse(local);

          const cart = JSON.parse(localStorage.getItem("cart")) || [];
          const processedProducts = cart.map(item => {
            return {
              product: item._id,
              quantity: item.quantity,
              price: item.price,
              size: item.selectedSize || item.size || item.productSize || null,
              color: item.selectedColor || item.color || null,
              variantId: item.variantId || `${item._id}-${item.selectedSize || item.size || ''}-${(item.selectedColor || item.color || '').replace('#', '')}`,
            };
          });

          const formatData = {
            userId: currentUser.user._id,
            address: address,
            country: country,
            billing: "paypal",
            description: description,
            status: "pending",
            
            products: processedProducts,
            
            voucherPromotionID: voucherPromotionID || null,
            freeShipPromotionID: (freeShipPromotionID && country === 'VN') ? freeShipPromotionID : null,
            
            orderTotal: originalTotal,
            discountAmount: discountAmount,
            shippingFee: country === 'VN' ? 0 : shipFee,
            finalAmount: grandTotal || orderTotal,
            
            shipping: {
              address: address,
              country: country,
              method: shippingDetails.shippingMethod || (country !== 'VN' ? 'International Shipping' : 'Domestic Shipping'),
              estimatedDays: shippingDetails.estimatedDays || '',
              estimatedTime: shippingDetails.estimatedTime || '',
              isInternational: country !== 'VN'
            }
          };

          const orderResponse = await axiosClient.post("/order", formatData);

          if (orderResponse.error === "Insufficient quantity for one or more products.") {
            let errorMessage = "Sản phẩm đã hết hàng!";
            if (orderResponse.insufficientQuantityProducts && orderResponse.insufficientQuantityProducts.length > 0) {
              errorMessage += " Chi tiết:\n";
              orderResponse.insufficientQuantityProducts.forEach(p => {
                const productName = productNames[p.productId]?.name || `Sản phẩm ID: ${p.productId}`;
                errorMessage += `\n- ${productName}`;
                if (p.size) errorMessage += `, kích cỡ: ${p.size}`;
                if (p.color) errorMessage += `, màu: ${p.color}`;
                errorMessage += `\n  Số lượng hiện có: ${p.availableQuantity}, Yêu cầu: ${p.requestedQuantity}`;
              });
            }

            notification["error"]({
              message: `Thông báo`,
              description: errorMessage,
              duration: 10
            });
            setShowModal(false);
            return;
          }

          if (!orderResponse) {
            notification["error"]({
              message: `Thông báo`,
              description: "Đặt hàng thất bại",
            });
            setShowModal(false);
            return;
          }

          notification["success"]({
            message: `Thông báo`,
            description: "Thanh toán và đặt hàng thành công",
          });

          localStorage.removeItem("cart");
          localStorage.removeItem("cartLength");
          localStorage.removeItem("appliedVoucherID");
          localStorage.removeItem("appliedFreeshipID");
          localStorage.removeItem("appliedVoucher");
          localStorage.removeItem("session_paypal");
          localStorage.removeItem("description");
          localStorage.removeItem("address");
          localStorage.removeItem("country");

          form.resetFields();
          history.push("/final-pay");

        } else {
          notification["error"]({
            message: `Thông báo`,
            description: "Thanh toán thất bại",
          });
        }
      } else if (pendingFormValues) {
        await confirmOrder(pendingFormValues);
      } else {
        notification["warning"]({
          message: `Thông báo`,
          description: "Không có dữ liệu thanh toán để xử lý",
        });
      }

      setShowModal(false);
      setPendingFormValues(null);
    } catch (error) {
      console.error("❌ Payment confirmation error:", error);
      notification["error"]({
        message: `Thông báo`,
        description: "Thanh toán thất bại: " + (error.message || "Lỗi không xác định"),
      });
      setShowModal(false);
      setPendingFormValues(null);
    }
  };

  
  useEffect(() => {
    (async () => {
      try {
        console.log("🚀 [PAY] Starting data loading...");
        
        const urlParams = new URLSearchParams(window.location.search);
        const paymentId = urlParams.get("paymentId");
        const PayerID = urlParams.get("PayerID");

        if (paymentId && PayerID) {
          console.log("💳 [PAY] Detected PayPal callback");
          setShowModal(true);
        }

        // Load promotions
        console.log("🎁 [PAY] Loading promotions...");
        loadPromotionsFromStorage();
        await fetchActivePromotions();

        // ✅ Load user profile
        console.log("👤 [PAY] Loading user profile...");
        const response = await userApi.getProfile();
        console.log("✅ [PAY] User profile response:", response);
        
        if (!response || !response.user) {
          console.error("❌ [PAY] Invalid user response:", response);
          throw new Error("Không thể lấy thông tin người dùng");
        }

        localStorage.setItem("user", JSON.stringify(response));
        setUserData(response.user);
        console.log("✅ [PAY] User data set:", response.user);
        
        // ✅ Set form initial values
        const formData = {
          name: response.user.username,
          email: response.user.email,
          phone: response.user.phone,
          country: 'VN',
        };
        
        console.log("📝 [PAY] Setting form data:", formData);
        
        if (paymentId && PayerID) {
          const savedDescription = localStorage.getItem("description");
          const savedAddress = localStorage.getItem("address");
          const savedCountry = localStorage.getItem("country");
          if (savedAddress) {
            formData.address = savedAddress;
            formData.billing = "paypal";
            formData.description = savedDescription;
            formData.country = savedCountry || 'VN';
            setAddrQuery(savedAddress);
            setSelectedCountry(savedCountry || 'VN');
            setIsInternational((savedCountry || 'VN') !== 'VN');
          }
        }

        form.setFieldsValue(formData);
        console.log("✅ [PAY] Form values set");
        
        setUserDataLoading(false);

        // ✅ Load cart
        console.log("🛒 [PAY] Loading cart from localStorage...");
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        console.log("🛒 [PAY] Cart data:", cart);
        
        if (!Array.isArray(cart) || cart.length === 0) {
          console.warn("⚠️ [PAY] Cart is empty!");
          notification.warning({
            message: 'Giỏ hàng trống',
            description: 'Bạn chưa có sản phẩm nào trong giỏ hàng.',
            duration: 5
          });
        }
        
        const transformedData = cart.map(item => ({
          product: item._id,
          productName: item.name || null,
          quantity: item.quantity,
          price: item.price,
          image: item.image || null,
          selectedSize: item.selectedSize || item.size || item.productSize || null,
          selectedColor: item.selectedColor || item.color || null,
          variantId: item.variantId || null
        }));

        console.log("✅ [PAY] Transformed product data:", transformedData);

        const totalCalculation = calculateTotalWithPromotions(transformedData);
        console.log("💰 [PAY] Total calculation:", totalCalculation);
        
        setOriginalTotal(totalCalculation.totalWithProductPromotions);
        setProductDetail(transformedData);

        setLoading(false);
        console.log("✅ [PAY] Data loading completed!");
      } catch (error) {
        console.error("❌ [PAY] Failed to fetch data:", error);
        notification.error({
          message: 'Lỗi tải dữ liệu',
          description: error.message || 'Không thể tải thông tin thanh toán. Vui lòng thử lại.',
          duration: 5
        });
        setLoading(false);
        setUserDataLoading(false);
      }
    })();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (Array.isArray(activePromotions) && activePromotions.length > 0 && 
        Array.isArray(productDetail) && productDetail.length > 0) {
      const totalCalculation = calculateTotalWithPromotions(productDetail);
      setOriginalTotal(totalCalculation.totalWithProductPromotions);
    }
  }, [activePromotions, productDetail]);
    return (
    <div className="py-5">
      <Spin spinning={loading}>
        <Card className="container">
          <div className="product_detail">
            <div style={{ marginLeft: 5, marginBottom: 10, marginTop: 10 }}>
              <Breadcrumb>
                <Breadcrumb.Item href="http://localhost:3500/cart">
                  <LeftSquareOutlined style={{ fontSize: "24px" }} />
                  <span> Quay lại giỏ hàng</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item href="">
                  <span>Thanh toán</span>
                </Breadcrumb.Item>
              </Breadcrumb>

              <div className="payment_progress">
                <Steps
                  current={1}
                  percent={60}
                  items={[
                    {
                      title: "Chọn sản phẩm",
                    },
                    {
                      title: "Thanh toán",
                    },
                    {
                      title: "Hoàn thành",
                    },
                  ]}
                />
              </div>

              <div className="information_pay">
                <Form form={form} onFinish={accountCreate} layout="vertical">
                  <Row gutter={24}>
                    <Col xs={24} lg={16}>
                      {/* ✅ ✅ ✅ THÔNG TIN KHÁCH HÀNG - THÊM DEBUG & CHECK ✅ ✅ ✅ */}
                      <Card 
                        bordered 
                        style={{ marginBottom: 16 }} 
                        title={<span style={{ fontWeight: 600 }}>Thông tin khách hàng</span>}
                        loading={userDataLoading}
                      >
                        {!userDataLoading && userData ? (
                          <Row gutter={16} style={{ padding: '0 10px' }}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="name"
                                label="Tên"
                                hasFeedback
                                style={{ marginBottom: 10 }}
                              >
                                <Input 
                                  placeholder="Tên" 
                         
                                  value={userData.username}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="email"
                                label="Email"
                                hasFeedback
                                style={{ marginBottom: 10 }}
                              >
                                <Input 
                                  placeholder="Email" 
                    
                                  value={userData.email}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                            {userDataLoading ? 'Đang tải thông tin...' : '❌ Không thể tải thông tin người dùng'}
                          </div>
                        )}
                        
                        {!userDataLoading && userData && (
                          <Row gutter={16} style={{ padding: '0 10px' }}>
                            <Col xs={24} md={12}>
                              <Form.Item
                                name="phone"
                                label="Số điện thoại"
                                hasFeedback
                                style={{ marginBottom: 10 }}
                              >
                                <Input 
                                  placeholder="Số điện thoại" 
                                  value={userData.phone}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        )}
                      </Card>

                      {/* ĐỊA CHỈ GIAO HÀNG */}
                      <Card bordered title={<span style={{ fontWeight: 600 }}>Địa chỉ giao hàng</span>}>
                        <Form.Item
                          name="address"
                          label="Địa chỉ"
                          rules={[
                            { required: true, message: 'Vui lòng nhập địa chỉ' }
                          ]}
                          style={{ marginBottom: 15 }}
                        >
                          <Input
                            value={addrQuery}
                            onChange={onAddressChange}
                            placeholder="Nhập địa chỉ của bạn"
                            allowClear
                            suffix={
                              <EnvironmentOutlined
                                title="Dùng vị trí của tôi"
                                style={{ color: '#1890ff', cursor: 'pointer' }}
                                onClick={handleUseMyLocation}
                              />
                            }
                          />
                        </Form.Item>

                        <div style={{ marginTop: 8 }}>
                          <div style={{ marginBottom: 6, fontWeight: 500 }}>Location Preview</div>
                          {(() => {
                            const lat = selectedLL?.lat ?? form.getFieldValue('lat');
                            const lng = selectedLL?.lng ?? form.getFieldValue('lng');
                            const hasLL = !!lat && !!lng;

                            const pad = 0.0015;
                            const left = lng - pad;
                            const right = lng + pad;
                            const top = lat + pad;
                            const bottom = lat - pad;
                            const src = hasLL
                              ? `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`
                              : null;

                            return (
                              <>
                                <div
                                  style={{
                                    position: 'relative',
                                    height: 280,
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    background: '#1f1f1f',
                                  }}
                                >
                                  {hasLL ? (
                                    <iframe
                                      title="map-preview"
                                      src={src}
                                      style={{
                                        position: 'absolute',
                                        inset: 0,
                                        width: '100%',
                                        height: '100%',
                                        border: 0,
                                      }}
                                      scrolling="no"
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#aaa',
                                        textAlign: 'center',
                                      }}
                                    >
                                      <div>
                                        <div style={{ fontSize: 18, marginBottom: 4 }}>🗺️ Map Preview</div>
                                        <div>Interactive map will show here</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                {hasLL && (
                                  <div style={{ paddingTop: 6, fontSize: 12 }}>
                                    <a
                                      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Mở bản đồ lớn (OpenStreetMap)
                                    </a>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          
                          {/* Enhanced Shipping Info Display */}
                          <div
                            style={{
                              marginTop: 12,
                              padding: '12px',
                              borderRadius: 8,
                              border: '1px solid rgba(0,0,0,0.08)',
                              backgroundColor: '#fafafa'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontWeight: 500 }}>📍 Khoảng cách từ cửa hàng</span>
                              <b style={{ color: '#1890ff' }}>{distKm != null ? `${distKm.toFixed(2)} km` : '-'}</b>
                            </div>
                            
                            {shippingDetails.shippingMethod && (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <span>🚚 Phương thức vận chuyển</span>
                                  <span style={{ color: '#52c41a', fontWeight: 500 }}>{shippingDetails.shippingMethod}</span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span>📅 Thời gian giao hàng dự kiến</span>
                                  <span style={{ fontWeight: 500 }}>
                                    {shippingDetails.estimatedDays === 0 
                                      ? 'Trong ngày' 
                                      : `${shippingDetails.estimatedDays} ngày`}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <Form.Item name="lat" hidden><Input /></Form.Item>
                        <Form.Item name="lng" hidden><Input /></Form.Item>
                      </Card>

                      {/* GHI CHÚ ĐƠN HÀNG */}
                      <Card bordered title={<span style={{ fontWeight: 600 }}>Ghi chú đơn hàng</span>}>
                        <Form.Item
                          name="description"
                          label="Ghi chú (tùy chọn)"
                          style={{ marginBottom: 0 }}
                        >
                          <TextArea
                            rows={4}
                            placeholder="Nhập ghi chú cho đơn hàng (nếu có)..."
                            maxLength={500}
                            showCount
                          />
                        </Form.Item>
                      </Card>
                    </Col>

                    <Col xs={24} lg={8}>
                      {/* ✅ ✅ ✅ THÔNG TIN ĐƠN HÀNG - THÊM DEBUG ✅ ✅ ✅ */}
                      <Card bordered style={{ marginBottom: 16 }} title={<span style={{ fontWeight: 600 }}>Thông tin đơn hàng</span>}>
                        <div style={{ marginBottom: 12 }}>
                          {/* ✅ DEBUG: Show cart info */}
                          {console.log("🛒 [RENDER] ProductDetail:", productDetail)}
                          {console.log("🛒 [RENDER] ProductDetail length:", productDetail?.length)}
                          
                          {Array.isArray(productDetail) && productDetail.length > 0 ? (
                            <div className="custom-table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
                              {productDetail.map((item, index) => {
                                const priceInfo = calculateDiscountedPrice(item);
                                const productDiscount = productPromotionDiscounts[item.product || item._id];
                                
                                return (
                                  <div key={index} style={{ 
                                    display: "flex", 
                                    padding: "12px 0", 
                                    borderBottom: index < productDetail.length - 1 ? "1px solid #f0f0f0" : "none",
                                    gap: "12px",
                                    alignItems: "flex-start"
                                  }}>
                                    <div style={{ 
                                      width: "60px", 
                                      height: "60px", 
                                      flexShrink: 0,
                                      borderRadius: "8px",
                                      overflow: "hidden",
                                      border: "1px solid #f0f0f0",
                                      position: "relative"
                                    }}>
                                      {item.image ? (
                                        <img 
                                          src={item.image} 
                                          alt={item.productName}
                                          style={{ 
                                            width: "100%", 
                                            height: "100%", 
                                            objectFit: "cover" 
                                          }}
                                        />
                                      ) : (
                                        <div style={{
                                          width: "100%",
                                          height: "100%",
                                          backgroundColor: "#f5f5f5",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: "#999",
                                          fontSize: "12px"
                                        }}>
                                          📷
                                        </div>
                                      )}
                                      
                                      {priceInfo.hasDiscount && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '2px',
                                          right: '2px',
                                          backgroundColor: '#ff4d4f',
                                          color: 'white',
                                          padding: '2px 4px',
                                          borderRadius: '6px',
                                          fontSize: '10px',
                                          fontWeight: 'bold',
                                          zIndex: 2
                                        }}>
                                          -{priceInfo.discountPercent}%
                                        </div>
                                      )}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontWeight: "500", 
                                        marginBottom: "8px", 
                                        fontSize: "15px",
                                        lineHeight: "1.3"
                                      }}>
                                        {item.productName || `Sản phẩm ${index + 1}`}
                                      </div>
                                      
                                      {priceInfo.appliedPromotion && (
                                        <div style={{ marginBottom: "6px" }}>
                                          <span style={{
                                            color: '#52c41a',
                                            fontSize: '11px',
                                            fontWeight: '500',
                                            backgroundColor: '#f6ffed',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            border: '1px solid #b7eb8f'
                                          }}>
                                            🎉 {priceInfo.appliedPromotion.tenKhuyenMai}
                                          </span>
                                        </div>
                                      )}
                                      
                                      <div style={{ 
                                        display: "flex", 
                                        flexWrap: "wrap",
                                        gap: "8px", 
                                        fontSize: "13px", 
                                        color: "#666",
                                        marginBottom: "8px",
                                        alignItems: "center"
                                      }}>
                                        <span style={{ 
                                          background: "#f0f0f0", 
                                          padding: "2px 6px", 
                                          borderRadius: "4px",
                                          whiteSpace: "nowrap"
                                        }}>
                                          SL: {item.quantity}
                                        </span>
                                        
                                        {item.selectedSize && (
                                          <Tag color="blue" style={{ margin: 0, fontSize: "12px" }}>
                                            Size: {item.selectedSize}
                                          </Tag>
                                        )}
                                        
                                        {item.selectedColor && item.selectedColor !== '-' && (
                                          <span style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: "4px",
                                            background: "#f0f0f0", 
                                            padding: "2px 6px", 
                                            borderRadius: "4px",
                                            whiteSpace: "nowrap"
                                          }}>
                                            <span style={{ fontSize: "11px" }}>Màu:</span>
                                            <div style={{
                                              width: "12px",
                                              height: "12px",
                                              borderRadius: "50%",
                                              background: item.selectedColor,
                                              border: "1px solid #ddd"
                                            }}></div>
                                            <span style={{ fontSize: "11px" }}>{item.selectedColor}</span>
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div style={{ marginBottom: "4px" }}>
                                        {priceInfo.hasDiscount ? (
                                          <div>
                                            <div style={{ 
                                              fontWeight: "600", 
                                              color: "#ff4d4f",
                                              fontSize: "14px",
                                              marginBottom: "2px"
                                            }}>
                                              {numberWithCommas(priceInfo.finalPrice * item.quantity)} đ
                                            </div>
                                            <div style={{ 
                                              color: "#999",
                                              fontSize: "12px",
                                              textDecoration: "line-through"
                                            }}>
                                              {numberWithCommas(priceInfo.originalPrice * item.quantity)} đ
                                            </div>
                                          </div>
                                        ) : (
                                          <div style={{ 
                                            fontWeight: "600", 
                                            color: "#ff4d4f",
                                            fontSize: "14px"
                                          }}>
                                            {numberWithCommas(item.price * item.quantity)} đ
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{ 
                              color: '#ff4d4f', 
                              padding: '40px 20px', 
                              textAlign: 'center',
                              backgroundColor: '#fff2f0',
                              borderRadius: '8px',
                              border: '1px dashed #ffccc7'
                            }}>
                              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛒</div>
                              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                                Giỏ hàng trống
                              </div>
                              <div style={{ fontSize: '14px', color: '#999' }}>
                                Không có sản phẩm nào trong giỏ hàng
                              </div>
                              <Button 
                                type="primary" 
                                style={{ marginTop: '16px' }}
                                onClick={() => history.push('/shop')}
                              >
                                Tiếp tục mua sắm
                              </Button>
                            </div>
                          )}
                        </div>

                        <Divider style={{ margin: "16px 0" }} />

                        <div style={{ display: 'grid', gap: 8, padding: '8px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tổng tiền hàng</span>
                            <span>{(originalTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                          </div>
                          
                          {appliedVoucher && (
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              color: voucherDiscountAmount > 0 ? '#1890ff' : '#999',
                              padding: '8px 12px',
                              backgroundColor: voucherDiscountAmount > 0 ? '#f0f8ff' : '#f5f5f5',
                              borderRadius: '6px',
                              border: voucherDiscountAmount > 0 ? '1px solid #91d5ff' : '1px solid #ddd'
                            }}>
                              <span style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                                🎫 <strong style={{ marginLeft: '5px' }}>{appliedVoucher.maKhuyenMai}</strong>
                                <span style={{ fontSize: '12px', marginLeft: '5px', color: '#666' }}>
                                  ({appliedVoucher.phanTramKhuyenMai}%)
                                </span>
                              </span>
                              <span style={{ fontWeight: '600', color: voucherDiscountAmount > 0 ? '#52c41a' : '#999' }}>
                                -{(voucherDiscountAmount || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                              </span>
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '500' }}>
                            <span>Tạm tính</span>
                            <span>{(orderTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                          </div>
                          
                          {/* Enhanced Shipping Fee Display */}
                          <div style={{ 
                            padding: '12px',
                            backgroundColor: freeShipPromotionID ? '#f6ffed' : '#fafafa',
                            borderRadius: '8px',
                            border: freeShipPromotionID ? '1px solid #b7eb8f' : '1px solid #f0f0f0'
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              marginBottom: shippingDetails.basePrice > 0 ? '8px' : '0'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  color: freeShipPromotionID ? '#52c41a' : '#666',
                                  fontWeight: freeShipPromotionID ? '500' : 'normal'
                                }}>
                                  Phí vận chuyển
                                  {distKm != null && (
                                    <span style={{ fontSize: '12px', color: '#999', marginLeft: '4px' }}>
                                      ({distKm.toFixed(2)} km)
                                    </span>
                                  )}
                                </div>
                                {freeShipPromotionID && (
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: '#52c41a',
                                    fontWeight: '600',
                                    marginTop: '2px'
                                  }}>
                                    🚚 Miễn phí vận chuyển
                                  </div>
                                )}
                              </div>
                              
                              <div style={{ textAlign: 'right' }}>
                                {freeShipPromotionID ? (
                                  <div>
                                    <div style={{ 
                                      fontSize: '12px', 
                                      color: '#999',
                                      textDecoration: 'line-through'
                                    }}>
                                      {(shippingDetails.totalPrice || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                    </div>
                                    <div style={{ 
                                      color: '#52c41a', 
                                      fontWeight: '600',
                                      fontSize: '14px'
                                    }}>
                                      Miễn phí
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ 
                                    fontWeight: '500',
                                    fontSize: '14px'
                                  }}>
                                    {(shippingDetails.totalPrice || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Shipping fee breakdown */}
                            {!freeShipPromotionID && shippingDetails.basePrice > 0 && (
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#999',
                                borderTop: '1px solid #f0f0f0',
                                paddingTop: '8px',
                                marginTop: '8px'
                              }}>
                                {shippingDetails.distancePrice > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>Phí khoảng cách:</span>
                                    <span>{shippingDetails.distancePrice.toLocaleString('vi-VN')} đ</span>
                                  </div>
                                )}
                                {shippingDetails.discount > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52c41a' }}>
                                    <span>Giảm giá (đơn hàng {originalTotal >= 2000000 ? '>2tr' : originalTotal >= 1000000 ? '>1tr' : '>500k'}):</span>
                                    <span>-{shippingDetails.discount.toLocaleString('vi-VN')} đ</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '6px 0' }} />
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span>Tổng thanh toán</span>
                            <Statistic
                              value={grandTotal || 0}
                              precision={0}
                              suffix="VND"
                              valueStyle={{ fontSize: '18px', lineHeight: '1.2', color: '#ff4d4f' }}
                            />
                          </div>
                        </div>

                        {(appliedVoucher || freeShipPromotionID) && (
                          <>
                            <Divider style={{ margin: "16px 0" }} />
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ 
                                fontWeight: 600, 
                                marginBottom: 8, 
                                color: '#52c41a',
                                fontSize: '15px'
                              }}>
                                🎉 Ưu đãi đã áp dụng
                              </div>
                              
                              {appliedVoucher && (
                                <div style={{
                                  padding: '10px 12px',
                                  backgroundColor: '#f0f8ff',
                                  borderRadius: '8px',
                                  border: '1px solid #91d5ff',
                                  marginBottom: '8px'
                                }}>
                                  <div style={{ 
                                    fontWeight: '500', 
                                    color: '#1890ff',
                                    marginBottom: '4px',
                                    fontSize: '14px'
                                  }}>
                                    🎫 {appliedVoucher.tenKhuyenMai || 'Mã giảm giá'}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                                    Mã: <strong>{appliedVoucher.maKhuyenMai}</strong> • 
                                    Giảm <strong>{appliedVoucher.phanTramKhuyenMai}%</strong>
                                    {appliedVoucher.giamToiDa && (
                                      <span> • Tối đa {appliedVoucher.giamToiDa.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                                    )}
                                  </div>
                                  <div style={{ 
                                    fontSize: '13px', 
                                    color: voucherDiscountAmount > 0 ? '#52c41a' : '#ff4d4f',
                                    fontWeight: '600'
                                  }}>
                                    Tiết kiệm: {voucherDiscountAmount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                  </div>
                                </div>
                              )}
                              
                              {freeShipPromotionID && (
                                <div style={{
                                  padding: '10px 12px',
                                  backgroundColor: '#f6ffed',
                                  borderRadius: '8px',
                                  border: '1px solid #b7eb8f'
                                }}>
                                  <div style={{ 
                                    fontWeight: '500', 
                                    color: '#52c41a',
                                    marginBottom: '4px',
                                    fontSize: '14px'
                                  }}>
                                    🚚 Miễn phí vận chuyển
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666' }}>
                                    Tiết kiệm: <strong>{(shippingDetails.totalPrice || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</strong>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        <div style={{ marginTop: 16 }}>
                          <div style={{ marginBottom: 8, fontWeight: 600 }}>Chọn phương thức thanh toán</div>
                          <Form.Item name="billing" rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán!' }]} style={{ marginBottom: 0 }}>
                            <Radio.Group style={{ display: 'grid', gap: 8 }}>
                              <Radio value="cod">💵 COD (Thanh toán khi nhận hàng)</Radio>
                              <Radio value="paypal">💳 PayPal</Radio>
                            </Radio.Group>
                          </Form.Item>
                        </div>

                        <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                          <Button 
                            type="primary" 
                            htmlType="submit" 
                            block 
                            style={{ height: 44, fontWeight: 600, fontSize: '15px' }}
                            disabled={!productDetail || productDetail.length === 0}
                          >
                            🛒 Xác nhận đặt hàng
                          </Button>
                        </Form.Item>

                        <div style={{ marginTop: 8, fontSize: 12, color: '#999', textAlign: 'center' }}>
                          🔒 Thông tin thanh toán của bạn được bảo mật
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </Form>
              </div>
            </div>
          </div>
        </Card>
        
        {/* MODAL XÁC NHẬN */}
        <Modal
          title="🛒 Xác nhận đặt hàng"
          visible={showModal}
          onOk={handleModalConfirm}
          onCancel={() => { setShowModal(false); setPendingFormValues(null); }}
          okText="✅ Xác nhận đặt hàng"
          cancelText="❌ Hủy"
          width={500}
        >
          <div style={{ padding: '10px 0' }}>
            <p style={{ fontSize: '16px', marginBottom: '16px' }}>
              Bạn có chắc chắn muốn xác nhận đặt hàng với tổng giá trị <strong style={{ color: '#ff4d4f' }}>
                {(grandTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
              </strong>?
            </p>
            
            <div style={{ backgroundColor: '#f9f9f9', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontWeight: '600', marginBottom: '8px' }}>📋 Tóm tắt đơn hàng:</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Tổng tiền hàng:</span>
                <span>{(originalTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
              </div>
              {voucherDiscountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#1890ff' }}>
                  <span>Giảm giá voucher:</span>
                  <span>-{(voucherDiscountAmount || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Phí vận chuyển:</span>
                <span style={{ color: freeShipPromotionID ? '#52c41a' : 'inherit' }}>
                  {freeShipPromotionID ? 'Miễn phí' : (shipFee || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #ddd', paddingTop: '4px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '16px' }}>
                  <span>Tổng thanh toán:</span>
                  <span style={{ color: '#ff4d4f' }}>
                    {(grandTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                  </span>
                </div>
              </div>
            </div>

            {appliedVoucher && (
              <div style={{ 
                marginBottom: '10px', 
                padding: '12px', 
                background: '#f0f8ff', 
                border: '1px solid #91d5ff', 
                borderRadius: '8px' 
              }}>
                <div style={{ color: '#1890ff', fontWeight: '600', marginBottom: '4px' }}>
                  🎫 Voucher đã áp dụng:
                </div>
                <div style={{ fontWeight: '500' }}>{appliedVoucher.tenKhuyenMai || 'Mã giảm giá'}</div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Mã: <strong>{appliedVoucher.maKhuyenMai}</strong> • 
                  Giảm <strong>{appliedVoucher.phanTramKhuyenMai}%</strong>
                  {appliedVoucher.giamToiDa && (
                    <span> • Tối đa {appliedVoucher.giamToiDa.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                  )}
                </div>
              </div>
            )}

            {freeShipPromotionID && (
              <div style={{ 
                marginBottom: '10px', 
                padding: '12px', 
                background: '#f6ffed', 
                border: '1px solid #b7eb8f', 
                borderRadius: '8px' 
              }}>
                <div style={{ color: '#52c41a', fontWeight: '600' }}>
                  🚚 Miễn phí vận chuyển
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Tiết kiệm: {(shippingDetails.totalPrice || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                </div>
              </div>
            )}

            {/* Shipping Info in Modal */}
            {shippingDetails.shippingMethod && (
              <div style={{ 
                marginBottom: '10px', 
                padding: '12px', 
                background: '#f0f8ff', 
                border: '1px solid #91d5ff', 
                borderRadius: '8px' 
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1890ff' }}>
                  🚚 Thông tin vận chuyển:
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  <div>Phương thức: <strong>{shippingDetails.shippingMethod}</strong></div>
                  <div>Khoảng cách: <strong>{distKm?.toFixed(2)} km</strong></div>
                  <div>Thời gian dự kiến: <strong>
                    {shippingDetails.estimatedDays === 0 
                      ? 'Trong ngày' 
                      : `${shippingDetails.estimatedDays} ngày`}
                  </strong></div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '16px', padding: '8px', backgroundColor: '#fff2e8', borderRadius: '6px', fontSize: '13px', color: '#d48806' }}>
              ⚠️ <strong>Lưu ý:</strong> Sau khi xác nhận, bạn không thể thay đổi thông tin đơn hàng.
            </div>
          </div>
        </Modal>
      </Spin>
    </div>
  );
};

export default Pay;