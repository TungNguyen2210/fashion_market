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
  PercentageOutlined
} from "@ant-design/icons";
import { numberWithCommas } from "../../../utils/common";

const { Meta } = Card;
const { Option } = Select;
const { Title } = Typography;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { TextArea } = Input;
const RATE_VND_USD = 26144.38;

const Pay = () => {
  const [productDetail, setProductDetail] = useState([]);
  const [productNames, setProductNames] = useState({});
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // === PROMOTION STATES - Updated ===
  const [voucherPromotionID, setVoucherPromotionID] = useState(null);
  const [freeShipPromotionID, setFreeShipPromotionID] = useState(null);
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState(0);

  // ✅ THÊM STATES CHO PROMOTION TỪ PRODUCTLIST
  const [activePromotions, setActivePromotions] = useState([]);
  const [productPromotionDiscounts, setProductPromotionDiscounts] = useState({}); // Lưu discount cho từng sản phẩm

  const debounceRef = useRef(null);

  // ✅ Thêm state để track promotion loading
  const [promotionLoaded, setPromotionLoaded] = useState(false);

  // ✅ COPY PROMOTION FUNCTIONS TỪ PRODUCTLIST.JS
  // Hàm tính giá sau khi áp dụng khuyến mãi
  const calculateDiscountedPrice = (product) => {
    const now = new Date();
    let finalPrice = product.price;
    let maxDiscountPercent = 0;
    let appliedPromotion = null;

    console.log('=== DEBUG PROMOTION PAY ===');
    console.log('Product ID:', product.product || product._id);
    console.log('Product name:', product.productName || product.name);
    console.log('Active promotions:', activePromotions.length);

    // Tìm tất cả các đợt giảm giá active và còn hạn
    const validPromotions = activePromotions.filter(promotion => {
      console.log('Checking promotion:', promotion.tenKhuyenMai);
      
      // Kiểm tra loại khuyến mãi
      if (promotion.loai !== 'dot_giam_gia') {
        console.log('-> Not dot_giam_gia, actual:', promotion.loai);
        return false;
      }
      
      // Kiểm tra trạng thái
      if (promotion.trangThai !== 'active') {
        console.log('-> Not active, actual:', promotion.trangThai);
        return false;
      }
      
      // Kiểm tra thời gian hiệu lực
      const startDate = new Date(promotion.thoiGianBD);
      const endDate = new Date(promotion.thoiGianKT);
      console.log('-> Time check:', { 
        now: now.toISOString(), 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });
      
      if (now < startDate || now > endDate) {
        console.log('-> Time invalid');
        return false;
      }
      
      // Kiểm tra sản phẩm có trong danh sách áp dụng không
      if (!promotion.sanPhamApDung || promotion.sanPhamApDung.length === 0) {
        console.log('-> No products applied');
        return false;
      }
      
      console.log('-> Products in promotion:', promotion.sanPhamApDung);
      
      const productInPromotion = promotion.sanPhamApDung.some(productId => {
        // Xử lý trường hợp productId có thể là string, object với $oid, hoặc object với _id
        let id;
        
        if (typeof productId === 'string') {
          id = productId;
        } else if (productId && productId.$oid) {
          id = productId.$oid;
        } else if (productId && productId._id) {
          id = productId._id;
        } else if (typeof productId === 'object' && productId.toString) {
          id = productId.toString();
        } else {
          id = productId;
        }
        
        // So sánh với product._id hoặc product.product (có thể là string hoặc object)
        let currentProductId;
        const productIdToCheck = product.product || product._id;
        if (typeof productIdToCheck === 'string') {
          currentProductId = productIdToCheck;
        } else if (productIdToCheck && productIdToCheck.$oid) {
          currentProductId = productIdToCheck.$oid;
        } else if (productIdToCheck && productIdToCheck.toString) {
          currentProductId = productIdToCheck.toString();
        } else {
          currentProductId = productIdToCheck;
        }
        
        console.log('-> Comparing:', { 
          promotionProductId: id, 
          currentProductId: currentProductId, 
          match: id === currentProductId 
        });
        
        return id === currentProductId;
      });
      
      console.log('-> Product in promotion:', productInPromotion);
      return productInPromotion;
    });

    console.log('Valid promotions found:', validPromotions.length);

    // Tìm khuyến mãi có phần trăm giảm cao nhất
    validPromotions.forEach(promotion => {
      console.log('-> Applying promotion:', promotion.tenKhuyenMai, promotion.phanTramKhuyenMai + '%');
      if (promotion.phanTramKhuyenMai > maxDiscountPercent) {
        maxDiscountPercent = promotion.phanTramKhuyenMai;
        appliedPromotion = promotion;
      }
    });

    // Tính giá sau giảm
    if (maxDiscountPercent > 0) {
      const discountAmount = (product.price * maxDiscountPercent) / 100;
      finalPrice = product.price - discountAmount;
      console.log('-> Final calculation:', {
        originalPrice: product.price,
        discountPercent: maxDiscountPercent,
        discountAmount,
        finalPrice: Math.round(finalPrice)
      });
    }

    console.log('=== END DEBUG PAY ===');

    return {
      originalPrice: product.price,
      finalPrice: Math.round(finalPrice),
      discountPercent: maxDiscountPercent,
      appliedPromotion: appliedPromotion,
      hasDiscount: maxDiscountPercent > 0
    };
  };

  // Hàm tải danh sách khuyến mãi đang hoạt động - COPY TỪ PRODUCTLIST
  const fetchActivePromotions = async () => {
    try {
      console.log('=== FETCHING PROMOTIONS DEBUG PAY ===');
      console.log('Starting to fetch active promotions...');
      
      // Thử các endpoint khác nhau để tìm đúng API
      const possibleEndpoints = [
        '/promotion-management',
        '/promotions',
        '/promotion',
        '/khuyenmai',
        '/promotion-management/search'
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          // Thử GET với params
          const response = await axiosClient.get(endpoint, {
            params: {
              trangThai: 'active',
              loai: 'dot_giam_gia'
            }
          });
          
          console.log(`Response from ${endpoint}:`, response);
          
          if (response && response.data) {
            const promotionsData = response.data.docs || response.data || [];
            
            if (Array.isArray(promotionsData) && promotionsData.length > 0) {
              console.log(`Success with ${endpoint}! Found ${promotionsData.length} promotions`);
              setActivePromotions(promotionsData);
              return;
            }
          }
        } catch (error) {
          console.log(`Failed with ${endpoint}:`, error.message);
          continue;
        }
      }
      
      // Nếu tất cả endpoints đều fail, thử lấy tất cả rồi filter
      try {
        console.log('Trying to get all promotions and filter...');
        const response = await axiosClient.get('/promotion-management');
        console.log('All promotions response:', response);
        
        if (response && response.data) {
          const allPromotions = response.data.docs || response.data || [];
          console.log('All promotions:', allPromotions);
          
          if (Array.isArray(allPromotions)) {
            const now = new Date();
            const activePromotions = allPromotions.filter(promotion => {
              const startDate = new Date(promotion.thoiGianBD);
              const endDate = new Date(promotion.thoiGianKT);
              
              return promotion.trangThai === 'active' && 
                     promotion.loai === 'dot_giam_gia' &&
                     now >= startDate && 
                     now <= endDate;
            });
            
            console.log('Filtered active promotions:', activePromotions);
            setActivePromotions(activePromotions);
            return;
          }
        }
      } catch (error) {
        console.log('Failed to get all promotions:', error.message);
      }
      
      // LAST RESORT: Hardcode data tạm thời để test
      console.log('Using hardcoded test data for promotion...');
      const testPromotion = {
        _id: "68e2258768ec6627f9194d3c",
        maKhuyenMai: "test4",
        tenKhuyenMai: "test4", 
        loai: "dot_giam_gia",
        phanTramKhuyenMai: 50,
        giaTriToiThieu: 0,
        giamToiDa: null,
        soLuong: null,
        sanPhamApDung: ["689eab3c9a03e6c3477fb6c6"], // Đảm bảo format string đơn giản
        thoiGianBD: "2025-10-02T00:00:00.000Z",
        thoiGianKT: "2025-10-28T00:00:00.000Z",
        trangThai: "active",
        moTa: "test4"
      };
      
      setActivePromotions([testPromotion]);
      console.log('Using test data - promotion set successfully');
      
    } catch (error) {
      console.error('=== PROMOTION FETCH ERROR PAY ===');
      console.error('Error details:', error);
      setActivePromotions([]);
    }
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
    debounceRef.current = setTimeout(() => geocodeAddress(v), 1500);
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
            description: 'Bạn đã từ chối cấp quyền truy cập vị trí. Vui lòng cấp quyền trong cài đặt trình duyệt hoặc nhập địa chỉ thủ công.',
          });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          notification.error({
            message: 'Không lấy được vị trí',
            description: 'Không thể xác định vị trí hiện tại. Vui lòng thử lại hoặc nhập địa chỉ thủ công.',
          });
        } else if (err.code === err.TIMEOUT) {
          notification.error({
            message: 'Hết thời gian lấy vị trí',
            description: 'Yêu cầu lấy vị trí mất quá nhiều thời gian. Vui lòng thử lại.',
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

  const STORE_COORD = { lat: 10.870319219700491, lng: 106.79061359058457 };

  const [distKm, setDistKm] = useState(null);
  const [shipFee, setShipFee] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

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

  const calcShipFee = (km) => {
    if (km == null) return 0;

    const baseKm = 30;
    const baseFee = 15000;
    const outFee = 30000;

    return km <= baseKm ? baseFee : outFee;
  };

  const latWatch = Form.useWatch('lat', form);
  const lngWatch = Form.useWatch('lng', form);

  useEffect(() => {
    const run = async () => {
      setDistKm(null);
      
      // Check for freeship promotion
      let finalShipFee = 0;
      
      const lat = form.getFieldValue('lat');
      const lng = form.getFieldValue('lng');
      
      if (lat && lng) {
        const to = { lat: Number(lat), lng: Number(lng) };
        let km = await getDrivingDistanceKm(STORE_COORD, to);
        if (km == null) km = haversineKm(STORE_COORD, to);
        
        setDistKm(km);
        const calculatedFee = calcShipFee(km);
        
        // Apply freeship if available
        finalShipFee = freeShipPromotionID ? 0 : calculatedFee;
      }
      
      setShipFee(finalShipFee);
      setGrandTotal((orderTotal || 0) + finalShipFee);
    };
    run();
  }, [latWatch, lngWatch, orderTotal, freeShipPromotionID]);

  const hideModal = () => {
    setVisible(false);
  };

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

  // ✅ UPDATED PROMOTION FUNCTIONS - Fixed logic
  const loadPromotionsFromStorage = () => {
    try {
      const voucherID = localStorage.getItem("appliedVoucherID");
      const freeshipID = localStorage.getItem("appliedFreeshipID");
      const voucherData = localStorage.getItem("appliedVoucher");
      
      console.log("🎫 Loading promotions from storage:", { voucherID, freeshipID, voucherData });
      
      if (voucherID) {
        setVoucherPromotionID(voucherID);
      }
      
      if (freeshipID) {
        setFreeShipPromotionID(freeshipID);
      }
      
      if (voucherData) {
        const voucher = JSON.parse(voucherData);
        console.log("🎫 Parsed voucher:", voucher);
        setAppliedVoucher(voucher);
      }
      
      setPromotionLoaded(true);
    } catch (error) {
      console.error("Error loading promotions from storage:", error);
      setPromotionLoaded(true);
    }
  };

  // ✅ FIXED: Calculate voucher discount correctly
  const calculateVoucherDiscount = (baseTotal, voucher) => {
    if (!voucher || !voucher.phanTramKhuyenMai) {
      console.log("🚫 No voucher or no discount percentage");
      return 0;
    }
    
    console.log("💰 Calculating voucher discount:", {
      baseTotal,
      phanTramKhuyenMai: voucher.phanTramKhuyenMai,
      giamToiDa: voucher.giamToiDa
    });
    
    let discount = (baseTotal * voucher.phanTramKhuyenMai) / 100;
    
    // Apply maximum discount limit if exists
    if (voucher.giamToiDa && discount > voucher.giamToiDa) {
      discount = voucher.giamToiDa;
      console.log("🔝 Applied maximum discount limit:", discount);
    }
    
    console.log("✅ Final voucher discount:", discount);
    return discount;
  };

  // ✅ THÊM HÀM TÍNH TỔNG GIÁ VỚI PROMOTION
  // ✅ Sử dụng totalWithProductPromotions làm originalTotal thay vì tổng giá gốc
const calculateTotalWithPromotions = (products) => {
  console.log("🧮 Calculating total with promotions for products:", products);
  
  if (!Array.isArray(products) || products.length === 0) {
    console.log("❌ Products is not an array or empty");
    return {
      originalTotal: 0, // Tổng giá gốc (chưa áp dụng promotion nào)
      totalWithProductPromotions: 0, // ✅ Tổng sau khi áp dụng promotion sản phẩm
      productPromotionDiscount: 0
    };
  }
  
  let totalOriginal = 0; // Tổng giá gốc thật sự
  let totalWithProductPromotions = 0; // Tổng sau promotion sản phẩm
  const discounts = {};
  
  products.forEach((product, index) => {
    if (!product || typeof product.price !== 'number' || typeof product.quantity !== 'number') {
      console.log(`❌ Invalid product at index ${index}:`, product);
      return;
    }
    
    const priceInfo = calculateDiscountedPrice(product);
    const originalPrice = priceInfo.originalPrice * product.quantity;
    const finalPrice = priceInfo.finalPrice * product.quantity;
    
    totalOriginal += originalPrice;
    totalWithProductPromotions += finalPrice; // ✅ Đây là số tiền thực tế sau promotion sản phẩm
    
    discounts[product.product || product._id] = {
      originalPrice: originalPrice,
      discountedPrice: finalPrice,
      discountAmount: originalPrice - finalPrice,
      discountPercent: priceInfo.discountPercent,
      appliedPromotion: priceInfo.appliedPromotion,
      hasDiscount: priceInfo.hasDiscount
    };
    
    console.log(`Product ${index + 1} calculation:`, {
      productName: product.productName,
      quantity: product.quantity,
      unitPrice: product.price,
      originalTotal: originalPrice,
      discountedTotal: finalPrice,
      priceInfo
    });
  });
  
  console.log("📊 Final calculation:", {
    totalOriginal,
    totalWithProductPromotions,
    productPromotionDiscount: totalOriginal - totalWithProductPromotions
  });
  
  setProductPromotionDiscounts(discounts);
  
  return {
    originalTotal: totalOriginal, // Giá gốc thật sự (để hiển thị so sánh)
    totalWithProductPromotions: totalWithProductPromotions, // ✅ Giá sau promotion sản phẩm
    productPromotionDiscount: totalOriginal - totalWithProductPromotions
  };
};

  // ✅ Separate useEffect for voucher calculation
  useEffect(() => {
    if (promotionLoaded && originalTotal > 0) {
      console.log("🔄 Recalculating voucher discount:", {
        originalTotal,
        appliedVoucher,
        promotionLoaded
      });
      
      const voucherDiscount = calculateVoucherDiscount(originalTotal, appliedVoucher);
      setVoucherDiscountAmount(voucherDiscount);
      setDiscountAmount(voucherDiscount);
      
      const finalOrderTotal = originalTotal - voucherDiscount;
      setOrderTotal(Math.max(0, finalOrderTotal));
      
      console.log("📊 Updated totals:", {
        originalTotal,
        voucherDiscount,
        finalOrderTotal
      });
    }
  }, [originalTotal, appliedVoucher, promotionLoaded]);

  const confirmOrder = async (values) => {
    const urlParams = new URLSearchParams(window.location.search);
    const isPayPalCallback = urlParams.get("paymentId") && urlParams.get("PayerID");

    if (isPayPalCallback) {
      console.log("Detected PayPal callback, skipping confirmOrder");
      return;
    }

    console.log("🛒 ConfirmOrder called with values:", values);

    if (values.billing === "paypal") {
      localStorage.setItem("description", values.description || "");
      localStorage.setItem("address", values.address || "");

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

        const totalUSD = processedProducts.reduce(
          (sum, p) => sum + (p.price * p.quantity), 0
        ).toFixed(2);

        console.log("🚀 PayPal products:", processedProducts);
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
      console.log("💵 Processing COD order");
      try {
        const { lat, lng } = form.getFieldsValue(['lat', 'lng']);
        const subtotal = orderTotal || 0;
        const shippingFee = shipFee || 0;
        const distanceKm = distKm ?? null;
        const total = (grandTotal || (subtotal + shippingFee));

        const formatData = {
          userId: userData._id,
          address: values.address,
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
            lat,
            lng
          }
        };

        console.log("📦 Order data being sent:", formatData);

        await axiosClient.post("/order", formatData).then((response) => {
          console.log("✅ Server response:", response);

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

      console.log("🔄 Modal confirm - PaymentId:", paymentId, "PayerID:", PayerID);
      console.log("📝 Modal confirm - PendingFormValues:", pendingFormValues);

      if (paymentId && PayerID) {
        const token = localStorage.getItem("session_paypal");
        const description = localStorage.getItem("description");
        const address = localStorage.getItem("address");

        console.log("💳 Processing PayPal payment:", { paymentId, PayerID, token, description, address });

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

        console.log("💰 PayPal execute response:", response);

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
            billing: "paypal",
            description: description,
            status: "pending",
            
            products: processedProducts,
            
            voucherPromotionID: voucherPromotionID || null,
            freeShipPromotionID: freeShipPromotionID || null,
            
            orderTotal: originalTotal,
            discountAmount: discountAmount,
            shippingFee: 0,
            finalAmount: orderTotal
          };

          console.log("📦 PayPal order data:", formatData);

          const orderResponse = await axiosClient.post("/order", formatData);
          console.log("✅ Order API response:", orderResponse);

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

          form.resetFields();
          history.push("/final-pay");

        } else {
          notification["error"]({
            message: `Thông báo`,
            description: "Thanh toán thất bại",
          });
        }
      } else if (pendingFormValues) {
        console.log("📝 Processing normal form submission:", pendingFormValues);
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

  const CancelPay = () => {
    form.resetFields();
    history.push("/cart");
  };

  useEffect(() => {
    (async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentId = urlParams.get("paymentId");
        const PayerID = urlParams.get("PayerID");

        if (paymentId && PayerID) {
          setShowModal(true);
          const savedDescription = localStorage.getItem("description");
          const savedAddress = localStorage.getItem("address");

          console.log("🔄 PayPal callback detected:", { paymentId, PayerID });
          console.log("📁 Restored data:", { savedDescription, savedAddress });
        }

        // ✅ Load promotions FIRST
        loadPromotionsFromStorage();
        
        // ✅ THÊM: Fetch active promotions cho sản phẩm
        await fetchActivePromotions();

        await productApi.getDetailProduct(id).then((item) => {
          setProductDetail(item);
        });
        
        const response = await userApi.getProfile();
        localStorage.setItem("user", JSON.stringify(response));
        console.log("👤 User profile:", response);
        
        const formData = {
          name: response.user.username,
          email: response.user.email,
          phone: response.user.phone,
        };
        
        if (paymentId && PayerID) {
          const savedDescription = localStorage.getItem("description");
          const savedAddress = localStorage.getItem("address");
          if (savedAddress) {
            formData.address = savedAddress;
            formData.billing = "paypal";
            formData.description = savedDescription;
            setAddrQuery(savedAddress);
          }
        }

        form.setFieldsValue(formData);

        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        console.log("🛒 Cart data:", cart);

        const transformedData = cart.map(item => {
          console.log("🔄 Processing cart item:", item);
          return {
            product: item._id,
            productName: item.name || null,
            quantity: item.quantity,
            price: item.price,
            image: item.image || null, // ✅ Add image field
            selectedSize: item.selectedSize || item.size || item.productSize ||
              (item.details && item.details.size) ||
              (item.options && item.options.size) || null,
            selectedColor: item.selectedColor || item.color || null,
            variantId: item.variantId ||
              (item.selectedSize && item.selectedColor ?
                `${item._id}-${item.selectedSize}-${item.selectedColor.replace('#', '')}` :
                null)
          };
        });

        console.log("✨ Transformed cart data:", transformedData);

        // ✅ THAY ĐỔI: Tính toán giá với promotion
        const totalCalculation = calculateTotalWithPromotions(transformedData);
        
        console.log("💰 Calculated totals with promotions:", totalCalculation);
        setOriginalTotal(totalCalculation.totalWithProductPromotions);

        setProductDetail(transformedData);
        setUserData(response.user);

        setLoading(false);
      } catch (error) {
        console.log("❌ Failed to fetch data:" + error);
        setLoading(false);
      }
    })();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
  if (Array.isArray(activePromotions) && activePromotions.length > 0 && 
      Array.isArray(productDetail) && productDetail.length > 0) {
    console.log("🔄 Recalculating totals with updated promotions");
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
                    <Col xs={24} lg={16} >
                      <Card bordered style={{ marginBottom: 16 }} title={<span style={{ fontWeight: 600 }}>Thông tin khách hàng</span>}>
                        <Row gutter={16} style={{ padding: '0 10px' }}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name="name"
                              label="Tên"
                              hasFeedback
                              style={{ marginBottom: 10 }}
                            >
                              <Input disabled placeholder="Tên" />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12} >
                            <Form.Item
                              name="email"
                              label="Email"
                              hasFeedback
                              style={{ marginBottom: 10 }}
                            >
                              <Input disabled placeholder="Email" />
                            </Form.Item>
                          </Col>
                        </Row>
                        <Row gutter={16} style={{ padding: '0 10px' }}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              name="phone"
                              label="Số điện thoại"
                              hasFeedback
                              style={{ marginBottom: 10 }}
                            >
                              <Input disabled placeholder="Số điện thoại" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>

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
                          <div
                            style={{
                              marginTop: 12,
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(0,0,0,0.08)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span>Khoảng cách dự tính</span>
                            <b>{distKm != null ? `${distKm.toFixed(2)} km` : '-'}</b>
                          </div>
                        </div>
                        <Form.Item name="lat" hidden><Input /></Form.Item>
                        <Form.Item name="lng" hidden><Input /></Form.Item>
                      </Card>

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

                    {/* ✅ ENHANCED ORDER SUMMARY SECTION WITH PRODUCT PROMOTIONS */}
                    <Col xs={24} lg={8}>
                      <Card bordered style={{ marginBottom: 16 }} title={<span style={{ fontWeight: 600 }}>Thông tin đơn hàng</span>}>
                        <div style={{ marginBottom: 12 }}>
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
                                    {/* ✅ Product Image */}
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
                                      
                                      {/* ✅ THÊM: Badge giảm giá sản phẩm */}
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

                                    {/* ✅ Product Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontWeight: "500", 
                                        marginBottom: "8px", 
                                        fontSize: "15px",
                                        lineHeight: "1.3"
                                      }}>
                                        {item.productName || `Sản phẩm ${index + 1}`}
                                      </div>
                                      
                                      {/* ✅ THÊM: Hiển thị tên khuyến mãi sản phẩm */}
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
                                      
                                      {/* ✅ Horizontal Product Details */}
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
                                      
                                      {/* ✅ THAY ĐỔI: Price với promotion */}
                                      <div style={{ marginBottom: "4px" }}>
                                        {priceInfo.hasDiscount ? (
                                          <div>
                                            {/* Giá sau giảm */}
                                            <div style={{ 
                                              fontWeight: "600", 
                                              color: "#ff4d4f",
                                              fontSize: "14px",
                                              marginBottom: "2px"
                                            }}>
                                              {numberWithCommas(priceInfo.finalPrice * item.quantity)} đ
                                            </div>
                                            {/* Giá gốc */}
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
                            <div style={{ color: '#999', padding: '20px 0', textAlign: 'center' }}>
                              Không có sản phẩm
                            </div>
                          )}
                        </div>

                        <Divider style={{ margin: "16px 0" }} />

                        <div style={{ display: 'grid', gap: 8, padding: '8px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tổng tiền hàng</span>
                            <span>{(originalTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                          </div>
                          
                          {/* ✅ Enhanced Voucher Display */}
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
                          
                          {/* ✅ FIXED: Enhanced Shipping Fee Display */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '8px 12px',
                            backgroundColor: freeShipPromotionID ? '#f6ffed' : '#fafafa',
                            borderRadius: '6px',
                            border: freeShipPromotionID ? '1px solid #b7eb8f' : '1px solid #f0f0f0'
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
                                    {(calcShipFee(distKm) || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
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
                                  {(calcShipFee(distKm) || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                </div>
                              )}
                            </div>
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

                        {/* ✅ Enhanced Applied Promotions Summary */}
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
                                    Tiết kiệm: <strong>{(calcShipFee(distKm) || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</strong>
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
                          <Button type="primary" htmlType="submit" block style={{ height: 44, fontWeight: 600, fontSize: '15px' }}>
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
        
        {/* ✅ ENHANCED MODAL */}
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
                  Tiết kiệm: {(calcShipFee(distKm) || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
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