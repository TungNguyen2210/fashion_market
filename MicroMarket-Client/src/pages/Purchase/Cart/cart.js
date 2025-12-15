import {
  CreditCardOutlined,
  LeftSquareOutlined,
  PercentageOutlined,
  TagOutlined,
  GiftOutlined,
  CarOutlined, 
  DownOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ShoppingCartOutlined
} from "@ant-design/icons";

import {
  Breadcrumb, Button, Card, Col, Divider, Form,
  InputNumber, Layout, Row, Spin, Tag, Input, Statistic,
  notification, Modal, Space, Typography, Alert, Dropdown, Menu, Tooltip
} from "antd";

import React, { useEffect, useState, useCallback } from "react";
import { useHistory, useParams } from "react-router-dom";
import promotionManagementApi from "../../../apis/promotionManagementApi";
import axiosClient from "../../../apis/axiosClient";
import "./cart.css";

const { Content } = Layout;
const { Text, Title } = Typography;

// Fix lỗi ResizeObserver ở đầu file
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = function(...args) {
    if (args[0]?.toString().includes('ResizeObserver')) return;
    return originalError.apply(this, args);
  };
  
  window.addEventListener('error', (e) => {
    if (e.message?.includes('ResizeObserver')) {
      e.stopPropagation();
      e.preventDefault();
      return true;
    }
  }, true);
}

// ===== ✅ THÊM HÀM CHUYỂN ĐỔI MÀU HEX SANG TÊN TIẾNG VIỆT =====
const hexToColorName = (hex) => {
  if (!hex) return 'Màu tùy chỉnh';
  
  // Chuẩn hóa hex code
  hex = hex.replace('#', '').toLowerCase();
  
  // Dictionary màu phổ biến trong tiếng Việt
  const colorMap = {
    // Đỏ
    'ff0000': 'Đỏ',
    'dc143c': 'Đỏ thẫm',
    'ff6b6b': 'Đỏ hồng',
    'ff4757': 'Đỏ tươi',
    'ee5a6f': 'Đỏ san hô',
    'c23616': 'Đỏ gạch',
    'e74c3c': 'Đỏ cam',
    
    // Cam
    'ffa500': 'Cam',
    'ff7f50': 'Cam san hô',
    'ff8c00': 'Cam đậm',
    'ffa07a': 'Cam nhạt',
    'ff6348': 'Cam đỏ',
    
    // Vàng
    'ffff00': 'Vàng',
    'ffd700': 'Vàng kim',
    'ffeb3b': 'Vàng tươi',
    'ffc312': 'Vàng chanh',
    'f9ca24': 'Vàng mơ',
    'fff200': 'Vàng neon',
    
    // Xanh lá
    '008000': 'Xanh lá',
    '00ff00': 'Xanh lá neon',
    '32cd32': 'Xanh lá nhạt',
    '228b22': 'Xanh lá rừng',
    '7bed9f': 'Xanh lá mint',
    '2ecc71': 'Xanh lá tươi',
    '27ae60': 'Xanh lá đậm',
    '1abc9c': 'Xanh lá ngọc',
    
    // Xanh dương
    '0000ff': 'Xanh dương',
    '00bfff': 'Xanh dương nhạt',
    '1e90ff': 'Xanh dương đậm',
    '4169e1': 'Xanh hoàng gia',
    '3498db': 'Xanh dương tươi',
    '2980b9': 'Xanh dương đậm',
    '5f27cd': 'Xanh tím',
    
    // Xanh da trời
    '87ceeb': 'Xanh da trời',
    '87cefa': 'Xanh da trời nhạt',
    '00ced1': 'Xanh ngọc lam',
    '48c9b0': 'Xanh ngọc',
    
    // Tím
    '800080': 'Tím',
    '9b59b6': 'Tím nhạt',
    '8e44ad': 'Tím đậm',
    'ee82ee': 'Tím hoa cà',
    'dda0dd': 'Tím mận',
    'a29bfe': 'Tím lavender',
    '6c5ce7': 'Tím than',
    
    // Hồng
    'ffc0cb': 'Hồng',
    'ff69b4': 'Hồng đậm',
    'ffb3ba': 'Hồng nhạt',
    'fd79a8': 'Hồng sen',
    'e84393': 'Hồng cánh sen',
    'fab1a0': 'Hồng đào',
    
    // Nâu
    'a52a2a': 'Nâu',
    '8b4513': 'Nâu đậm',
    'd2691e': 'Nâu sô cô la',
    'cd853f': 'Nâu vàng',
    
    // Xám
    '808080': 'Xám',
    'a9a9a9': 'Xám đậm',
    'd3d3d3': 'Xám nhạt',
    'c0c0c0': 'Bạc',
    'dcdde1': 'Xám trắng',
    '95a5a6': 'Xám đá',
    '7f8c8d': 'Xám thép',
    
    // Trắng đen
    'ffffff': 'Trắng',
    '000000': 'Đen',
    'f5f5f5': 'Trắng ngà',
    '2f3640': 'Đen nhạt',
    '353b48': 'Đen xanh',
    
    // Màu đặc biệt
    '1c78fa': 'Xanh nước biển',
    'be93e4': 'Tím pastel',
    'ffcccc': 'Hồng pastel',
    'ccffcc': 'Xanh pastel',
    'ccccff': 'Tím nhạt pastel',
  };
  
  // Tìm màu chính xác
  if (colorMap[hex]) {
    return colorMap[hex];
  }
  
  // Nếu không tìm thấy, tìm màu gần nhất
  return findClosestColorName(hex, colorMap);
};

// Hàm tìm màu gần nhất
const findClosestColorName = (hex, colorMap) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'Màu tùy chỉnh';
  
  let minDistance = Infinity;
  let closestColor = 'Màu tùy chỉnh';
  
  Object.keys(colorMap).forEach(colorHex => {
    const colorRgb = hexToRgb(colorHex);
    if (colorRgb) {
      const distance = Math.sqrt(
        Math.pow(rgb.r - colorRgb.r, 2) +
        Math.pow(rgb.g - colorRgb.g, 2) +
        Math.pow(rgb.b - colorRgb.b, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestColor = colorMap[colorHex];
      }
    }
  });
  
  return minDistance < 100 ? closestColor : 'Màu tùy chỉnh';
};

// Chuyển HEX sang RGB
const hexToRgb = (hex) => {
  hex = hex.replace('#', '');
  
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  if (hex.length !== 6) {
    return null;
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
};

// Hàm kiểm tra màu sáng hay tối
const isLightColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
};

// ===== ✅ HELPER FUNCTION CẬP NHẬT CART =====
const updateCartInLocalStorage = (cart) => {
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("cartLength", cart.length.toString());
  
  // ✅ DISPATCH EVENT ĐỂ HEADER CẬP NHẬT
  window.dispatchEvent(new Event('cartUpdated'));
  
  console.log('🛒 Cart updated - Length:', cart.length);
};

const Cart = () => {
  const [productDetail, setProductDetail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartLength, setCartLength] = useState(0);
  const [originalTotal, setOriginalTotal] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [form] = Form.useForm();
  let { id } = useParams();
  const history = useHistory();
  
  const [availablePromotions, setAvailablePromotions] = useState([]);
  
  const [activePromotions, setActivePromotions] = useState([]);
  const [productDiscountAmount, setProductDiscountAmount] = useState(0);
  
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [appliedFreeship, setAppliedFreeship] = useState(null);
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState(0);
  
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [freeshipLoading, setFreeshipLoading] = useState(false);

  const calculateDiscountedPrice = (product) => {
    const now = new Date();
    let finalPrice = product.price;
    let maxDiscountPercent = 0;
    let appliedPromotion = null;

    console.log('=== CART PROMOTION DEBUG ===');
    console.log('Product ID:', product._id);
    console.log('Product name:', product.name);
    console.log('Active promotions:', activePromotions.length);

    const validPromotions = activePromotions.filter(promotion => {
      console.log('Checking promotion:', promotion.tenKhuyenMai);
      
      if (promotion.loai !== 'dot_giam_gia') {
        console.log('-> Not dot_giam_gia, actual:', promotion.loai);
        return false;
      }
      
      if (promotion.trangThai !== 'active') {
        console.log('-> Not active, actual:', promotion.trangThai);
        return false;
      }
      
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
      
      if (!promotion.sanPhamApDung || promotion.sanPhamApDung.length === 0) {
        console.log('-> No products applied');
        return false;
      }
      
      console.log('-> Products in promotion:', promotion.sanPhamApDung);
      
      const productInPromotion = promotion.sanPhamApDung.some(productId => {
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
        
        let currentProductId;
        if (typeof product._id === 'string') {
          currentProductId = product._id;
        } else if (product._id && product._id.$oid) {
          currentProductId = product._id.$oid;
        } else if (product._id && product._id.toString) {
          currentProductId = product._id.toString();
        } else {
          currentProductId = product._id;
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

    validPromotions.forEach(promotion => {
      console.log('-> Applying promotion:', promotion.tenKhuyenMai, promotion.phanTramKhuyenMai + '%');
      if (promotion.phanTramKhuyenMai > maxDiscountPercent) {
        maxDiscountPercent = promotion.phanTramKhuyenMai;
        appliedPromotion = promotion;
      }
    });

    if (maxDiscountPercent > 0) {
      const discountAmount = (product.price * maxDiscountPercent) / 100;
      finalPrice = product.price - discountAmount;
      console.log('-> Final calculation:', {
        originalPrice: product.price,
        discountPercent: maxDiscountPercent,
        finalPrice: Math.round(finalPrice)
      });
    }

    console.log('=== END CART DEBUG ===');

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
      console.log('=== FETCHING CART PROMOTIONS DEBUG ===');
      console.log('Starting to fetch active promotions...');
      
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
        sanPhamApDung: ["689eab3c9a03e6c3477fb6c6"],
        thoiGianBD: "2025-10-02T00:00:00.000Z",
        thoiGianKT: "2025-10-28T00:00:00.000Z",
        trangThai: "active",
        moTa: "test4"
      };
      
      setActivePromotions([testPromotion]);
      console.log('Using test data - promotion set successfully');
      
    } catch (error) {
      console.error('=== CART PROMOTION FETCH ERROR ===');
      console.error('Error details:', error);
      setActivePromotions([]);
    }
  };

  const handlePay = () => {
    if (appliedVoucher) {
      localStorage.setItem("appliedVoucherID", appliedVoucher._id);
      localStorage.setItem("appliedVoucher", JSON.stringify(appliedVoucher));
    }
    
    if (appliedFreeship) {
      localStorage.setItem("appliedFreeshipID", appliedFreeship._id);
    }
    
    console.log("🛒 Navigating to pay with promotions:", {
      voucher: appliedVoucher?.maKhuyenMai,
      freeship: appliedFreeship?.maKhuyenMai,
      productDiscountAmount,
      voucherDiscountAmount
    });
    
    history.push("/pay");
  };

  const deleteCart = () => {
    Modal.confirm({
      title: 'Xác nhận xóa giỏ hàng',
      content: 'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
      okText: 'Xóa',
      cancelText: 'Hủy',
      onOk: () => {
        localStorage.removeItem("cart");
        localStorage.removeItem("cartLength");
        localStorage.removeItem("appliedVoucherID");
        localStorage.removeItem("appliedFreeshipID");
        localStorage.removeItem("appliedVoucher");
        
        // ✅ DISPATCH EVENT TRƯỚC KHI RELOAD
        window.dispatchEvent(new Event('cartUpdated'));
        
        setProductDetail([]);
        setCartLength(0);
        
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    });
  };

  const updateQuantity = useCallback((productId, cartItemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setProductDetail(prevDetail => {
      const updatedCart = prevDetail.map((item) => {
        if (item.cartItemId === cartItemId) {
          return {
            ...item,
            quantity: newQuantity,
          };
        }
        return item;
      });

      // ✅ SỬ DỤNG HELPER FUNCTION
      updateCartInLocalStorage(updatedCart);
      
      return updatedCart;
    });
  }, []);

  const handleDelete = useCallback((cartItemId) => {
    const updatedCart = JSON.parse(localStorage.getItem("cart")) || [];
    const filteredCart = updatedCart.filter(
      (product) => product.cartItemId !== cartItemId
    );
    
    // ✅ SỬ DỤNG HELPER FUNCTION
    updateCartInLocalStorage(filteredCart);
    
    setCartLength(filteredCart.length);
    setProductDetail(filteredCart);
    
    notification.success({
      message: 'Thành công',
      description: 'Đã xóa sản phẩm khỏi giỏ hàng'
    });
  }, []);

  const isPromotionActive = (promotion) => {
    return promotion.trangThai === 'active' || promotion.trangThai === 'scheduled';
  };

  const applyVoucherFromDropdown = useCallback(async (voucher) => {
    if (appliedVoucher && appliedVoucher._id === voucher._id) {
      notification.warning({
        message: 'Thông báo',
        description: 'Mã voucher này đã được áp dụng'
      });
      return;
    }

    const discountedTotal = originalTotal - productDiscountAmount;
    
    if (voucher.giaTriToiThieu && discountedTotal < voucher.giaTriToiThieu) {
      notification.error({
        message: 'Không đủ điều kiện',
        description: `Đơn hàng tối thiểu ${voucher.giaTriToiThieu?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })} để sử dụng voucher này`
      });
      return;
    }

    setAppliedVoucher(voucher);
    
    notification.success({
      message: 'Áp dụng thành công',
      description: `Mã voucher ${voucher.maKhuyenMai} đã được áp dụng (${voucher.phanTramKhuyenMai}%)`
    });

    console.log("🎫 Applied voucher:", voucher);
  }, [originalTotal, productDiscountAmount, appliedVoucher]);

  const applyFreeshipFromDropdown = useCallback(async (freeship) => {
    if (appliedFreeship && appliedFreeship._id === freeship._id) {
      notification.warning({
        message: 'Thông báo',
        description: 'Mã freeship này đã được áp dụng'
      });
      return;
    }

    const discountedTotal = originalTotal - productDiscountAmount;
    
    if (freeship.giaTriToiThieu && discountedTotal < freeship.giaTriToiThieu) {
      notification.error({
        message: 'Không đủ điều kiện',
        description: `Đơn hàng tối thiểu ${freeship.giaTriToiThieu?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })} để sử dụng mã freeship này`
      });
      return;
    }

    setAppliedFreeship(freeship);
    
    notification.success({
      message: 'Áp dụng thành công',
      description: `Mã freeship ${freeship.maKhuyenMai} đã được áp dụng`
    });

    console.log("🚚 Applied freeship:", freeship);
  }, [originalTotal, productDiscountAmount, appliedFreeship]);

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherDiscountAmount(0);
    notification.info({
      message: 'Đã hủy mã voucher',
      description: 'Mã voucher đã được gỡ bỏ khỏi đơn hàng'
    });
  };

  const removeFreeship = () => {
    setAppliedFreeship(null);
    notification.info({
      message: 'Đã hủy mã freeship',
      description: 'Mã freeship đã được gỡ bỏ khỏi đơn hàng'
    });
  };

  const handleCart = useCallback(async () => {
    try {
      await fetchActivePromotions();
      
      const res = await promotionManagementApi.listPromotionManagement();
      
      const promotionsData = Array.isArray(res.data?.docs) ? res.data.docs : [];
      setAvailablePromotions(promotionsData);
      
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      
      const cartWithIds = cart.map((item, index) => {
        if (!item.cartItemId) {
          const uniqueId = `${item._id}-${item.selectedColor || item.color || ''}-${item.selectedSize || item.size || item.productSize || ''}-${index}`;
          return {
            ...item,
            cartItemId: uniqueId
          };
        }
        return item;
      });
      
      // ✅ SỬ DỤNG HELPER FUNCTION
      updateCartInLocalStorage(cartWithIds);
      
      setProductDetail(cartWithIds);
      const cartLength = cartWithIds.length;
      setCartLength(cartLength);
      
      const savedVoucherID = localStorage.getItem("appliedVoucherID");
      const savedFreeshipID = localStorage.getItem("appliedFreeshipID");
      const savedVoucher = localStorage.getItem("appliedVoucher");
      
      if (savedVoucherID && savedVoucher) {
        const voucher = JSON.parse(savedVoucher);
        setAppliedVoucher(voucher);
      }
      
      if (savedFreeshipID && promotionsData.length > 0) {
        const freeship = promotionsData.find(item => item._id === savedFreeshipID);
        if (freeship) {
          setAppliedFreeship(freeship);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("❌ Failed to fetch cart data:", error);
      
      setAvailablePromotions([]);
      setLoading(false);
      
      notification.error({
        message: 'Lỗi tải dữ liệu',
        description: 'Không thể tải thông tin khuyến mãi. Vui lòng thử lại.'
      });
    }
  }, []);

  useEffect(() => {
    if (activePromotions.length >= 0 && productDetail.length > 0) {
      console.log("🔄 Recalculating totals with active promotions:", {
        activePromotions: activePromotions.length,
        productDetail: productDetail.length
      });
      
      let originalSum = 0;
      let totalProductDiscount = 0;

      productDetail.forEach((item) => {
        const priceInfo = calculateDiscountedPrice(item);
        const itemOriginal = item.quantity * priceInfo.originalPrice;
        const itemDiscounted = item.quantity * priceInfo.finalPrice;
        
        originalSum += itemOriginal;
        totalProductDiscount += (itemOriginal - itemDiscounted);
      });
      
      console.log("📊 New totals calculated:", {
        originalSum,
        totalProductDiscount,
        cartLength: productDetail.length
      });
      
      setOriginalTotal(originalSum);
      setProductDiscountAmount(totalProductDiscount);
    }
  }, [activePromotions, productDetail]);

  useEffect(() => {
    if (appliedVoucher && originalTotal > 0) {
      const discountedTotal = originalTotal - productDiscountAmount;
      let voucherDiscount = (discountedTotal * appliedVoucher.phanTramKhuyenMai) / 100;
      
      if (appliedVoucher.giamToiDa && voucherDiscount > appliedVoucher.giamToiDa) {
        voucherDiscount = appliedVoucher.giamToiDa;
      }
      
      setVoucherDiscountAmount(voucherDiscount);
    } else {
      setVoucherDiscountAmount(0);
    }
  }, [appliedVoucher, originalTotal, productDiscountAmount]);

  useEffect(() => {
    const discountedTotal = originalTotal - productDiscountAmount;
    const finalTotal = discountedTotal - voucherDiscountAmount;
    setCartTotal(Math.max(0, finalTotal));
    
    console.log("💰 CART TOTALS DEBUG:", {
      originalTotal,
      productDiscountAmount,
      voucherDiscountAmount,
      cartTotal: Math.max(0, finalTotal),
      calculation: `${originalTotal} - ${productDiscountAmount} - ${voucherDiscountAmount} = ${Math.max(0, finalTotal)}`
    });
  }, [originalTotal, productDiscountAmount, voucherDiscountAmount]);

  useEffect(() => {
    handleCart();
    window.scrollTo(0, 0);
    
    return () => {
      // Cleanup if needed
    };
  }, [handleCart]);

  const voucherMenu = (
    <Menu>
      {(() => {
        if (!Array.isArray(availablePromotions) || availablePromotions.length === 0) {
          return (
            <Menu.Item disabled key="no-voucher">
              <Text type="secondary">Không có voucher nào khả dụng</Text>
            </Menu.Item>
          );
        }
        
        const vouchers = availablePromotions.filter(item => {
          return item && item.loai === 'voucher';
        });
        
        if (vouchers.length === 0) {
          return (
            <Menu.Item disabled key="no-voucher-filtered">
              <Text type="secondary">Không có voucher nào khả dụng</Text>
            </Menu.Item>
          );
        }
        
        const activeVouchers = vouchers.filter(voucher => {
          return isPromotionActive(voucher);
        });
        
        if (activeVouchers.length === 0) {
          return (
            <Menu.Item disabled key="no-active-voucher">
              <Text type="secondary">Không có voucher nào đang hoạt động</Text>
            </Menu.Item>
          );
        }
        
        return activeVouchers.map(voucher => {
          const discountedTotal = originalTotal - productDiscountAmount;
          const isEligible = !voucher.giaTriToiThieu || discountedTotal >= voucher.giaTriToiThieu;
          
          return (
            <Menu.Item 
              key={voucher._id}
              disabled={!isEligible}
              onClick={() => {
                if (isEligible) {
                  applyVoucherFromDropdown(voucher);
                }
              }}
            >
              <div className="voucher-menu-item">
                <div className="voucher-header">
                  <Text strong>{voucher.maKhuyenMai}</Text>
                  <Tag color="volcano">{voucher.phanTramKhuyenMai}%</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {voucher.tenKhuyenMai || 'Mã giảm giá'}
                </Text>
                {voucher.giaTriToiThieu && (
                  <div style={{ marginTop: '4px' }}>
                    <Text type={isEligible ? "success" : "danger"} style={{ fontSize: '11px' }}>
                      Đơn tối thiểu: {voucher.giaTriToiThieu?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                    </Text>
                  </div>
                )}
                {voucher.giamToiDa && (
                  <div style={{ marginTop: '2px' }}>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      Giảm tối đa: {voucher.giamToiDa?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                    </Text>
                  </div>
                )}
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '10px' }}>
                    Hết hạn: {new Date(voucher.thoiGianKT).toLocaleDateString('vi-VN')}
                  </Text>
                </div>
              </div>
            </Menu.Item>
          );
        });
      })()}
    </Menu>
  );

  const freeshipMenu = (
    <Menu>
      {(() => {
        if (!Array.isArray(availablePromotions) || availablePromotions.length === 0) {
          return (
            <Menu.Item disabled key="no-freeship">
              <Text type="secondary">Không có mã freeship nào khả dụng</Text>
            </Menu.Item>
          );
        }
        
        const freeships = availablePromotions.filter(item => {
          return item && item.loai === 'free_shipping';
        });
        
        if (freeships.length === 0) {
          return (
            <Menu.Item disabled key="no-freeship-filtered">
              <Text type="secondary">Không có mã freeship nào khả dụng</Text>
            </Menu.Item>
          );
        }
        
        const activeFreeships = freeships.filter(freeship => {
          return isPromotionActive(freeship);
        });
        
        if (activeFreeships.length === 0) {
          return (
            <Menu.Item disabled key="no-active-freeship">
              <Text type="secondary">Không có mã freeship nào đang hoạt động</Text>
            </Menu.Item>
          );
        }
        
        return activeFreeships.map(freeship => {
          const discountedTotal = originalTotal - productDiscountAmount;
          const isEligible = !freeship.giaTriToiThieu || discountedTotal >= freeship.giaTriToiThieu;
          
          return (
            <Menu.Item 
              key={freeship._id}
              disabled={!isEligible}
              onClick={() => {
                if (isEligible) {
                  applyFreeshipFromDropdown(freeship);
                }
              }}
            >
              <div className="freeship-menu-item">
                <div className="freeship-header">
                  <Text strong>{freeship.maKhuyenMai}</Text>
                  <Tag color="green">Miễn phí ship</Tag>
                </div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {freeship.tenKhuyenMai || 'Miễn phí vận chuyển'}
                </Text>
                {freeship.giaTriToiThieu && (
                  <div style={{ marginTop: '4px' }}>
                    <Text type={isEligible ? "success" : "danger"} style={{ fontSize: '11px' }}>
                      Đơn tối thiểu: {freeship.giaTriToiThieu?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                    </Text>
                  </div>
                )}
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '10px' }}>
                    Hết hạn: {new Date(freeship.thoiGianKT).toLocaleDateString('vi-VN')}
                  </Text>
                </div>
              </div>
            </Menu.Item>
          );
        });
      })()}
    </Menu>
  );

  return (
    <div className="cart-page">
      <div className="py-5">
        <Spin spinning={loading}>
          <Card className="container">
            <div className="box_cart">
              <Layout className="box_cart">
                <Content className="site-layout-background">
                  <Breadcrumb>
                    <Breadcrumb.Item href="http://localhost:3500/product-list/643cd88879b4192efedda4e6">
                      <LeftSquareOutlined style={{ fontSize: "24px" }} />
                      <span> Tiếp tục mua sắm</span>
                    </Breadcrumb.Item>
                  </Breadcrumb>
                  <hr></hr>
                  <br></br>
                  
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Title level={4}>
                        <ShoppingCartOutlined /> <strong>{cartLength}</strong> sản phẩm trong giỏ hàng
                      </Title>
                    </Col>
                    <Col>
                      <Button type="default" danger onClick={deleteCart}>
                        Xóa tất cả
                      </Button>
                    </Col>
                  </Row>
                  <br></br>
                  
                  <div className="custom-table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>STT</th>
                          <th>Ảnh</th>
                          <th>Tên sản phẩm</th>
                          <th>Màu sắc</th>
                          <th>Kích thước</th>
                          <th>Giá</th>
                          <th>Số lượng</th>
                          <th>Thành tiền</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productDetail.length > 0 ? (
                          productDetail.map((item, index) => {
                            const priceInfo = calculateDiscountedPrice(item);
                            const displayPrice = priceInfo.finalPrice;
                            const originalPrice = priceInfo.originalPrice;
                            
                            return (
                              <tr key={item.cartItemId || `cart-item-${index}`}>
                                <td>{index + 1}</td>
                                <td>
                                  <div style={{ position: 'relative' }}>
                                    <img 
                                      src={item.image} 
                                      style={{ 
                                        height: 80, 
                                        width: 80, 
                                        objectFit: 'cover',
                                        borderRadius: '8px',
                                        border: '1px solid #f0f0f0'
                                      }} 
                                      alt="Sản phẩm" 
                                    />
                                    {priceInfo.hasDiscount && (
                                      <div 
                                        style={{
                                          position: 'absolute',
                                          top: '-5px',
                                          right: '-5px',
                                          background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)',
                                          color: 'white',
                                          padding: '2px 6px',
                                          borderRadius: '10px',
                                          font: '9px bold',
                                          zIndex: 2,
                                          boxShadow: '0 2px 8px rgba(255, 65, 108, 0.4)',
                                          border: '1px solid rgba(255, 255, 255, 0.3)',
                                        }}
                                      >
                                        -{priceInfo.discountPercent}%
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <div className="product-name-cell">
                                    <Text strong>{item.name}</Text>
                                    {priceInfo.appliedPromotion && (
                                      <div style={{ marginTop: '4px' }}>
                                        <Tag 
                                          color="success" 
                                          size="small"
                                          style={{
                                            fontSize: '10px',
                                            padding: '0 4px',
                                            border: 'none',
                                            borderRadius: '8px'
                                          }}
                                        >
                                          🎉 {priceInfo.appliedPromotion.tenKhuyenMai}
                                        </Tag>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                {/* ===== ✅ PHẦN HIỂN THỊ MÀU ĐÃ CẬP NHẬT ===== */}
                                <td>
                                  {(item.selectedColor || item.color) && (item.selectedColor || item.color) !== '-' ? (
                                    <div className="color-display">
                                      <Tooltip title={hexToColorName(item.selectedColor || item.color)}>
                                        <div
                                          className="color-dot"
                                          style={{
                                            backgroundColor: item.selectedColor || item.color,
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            border: isLightColor(item.selectedColor || item.color) 
                                              ? '2px solid #d9d9d9' 
                                              : '2px solid #fff',
                                            boxShadow: '0 0 0 1px #d9d9d9',
                                            display: 'inline-block',
                                            marginRight: '8px',
                                            verticalAlign: 'middle'
                                          }}
                                        />
                                      </Tooltip>
                                      <Text style={{ verticalAlign: 'middle' }}>
                                        {hexToColorName(item.selectedColor || item.color)}
                                      </Text>
                                    </div>
                                  ) : (
                                    <Text type="secondary">-</Text>
                                  )}
                                </td>
                                <td>
                                  {item.selectedSize || item.size || item.productSize ? (
                                    <Tag color="blue">
                                      {item.selectedSize || item.size || item.productSize}
                                    </Tag>
                                  ) : (
                                    <Text type="secondary">-</Text>
                                  )}
                                </td>
                                <td>
                                  <div className="price-cell">
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                      <Text strong style={{ color: '#ff4d4f', fontSize: '14px' }}>
                                        {displayPrice.toLocaleString("vi", {
                                          style: "currency", 
                                          currency: "VND"
                                        })}
                                      </Text>
                                      {priceInfo.hasDiscount && (
                                        <Text 
                                          style={{ 
                                            color: '#999', 
                                            fontSize: '12px', 
                                            textDecoration: 'line-through',
                                            marginTop: '2px'
                                          }}
                                        >
                                          {originalPrice.toLocaleString("vi", {
                                            style: "currency", 
                                            currency: "VND"
                                          })}
                                        </Text>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <InputNumber
                                    min={1}
                                    max={item.variantQuantity || 9999}
                                    value={item.quantity}
                                    onChange={(value) => updateQuantity(item._id, item.cartItemId, value)}
                                    style={{ width: '80px' }}
                                  />
                                </td>
                                <td>
                                  <div className="total-cell">
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                      <Text strong style={{ color: '#ff4d4f', fontSize: '15px' }}>
                                        {(displayPrice * item.quantity).toLocaleString("vi", {
                                          style: "currency",
                                          currency: "VND"
                                        })}
                                      </Text>
                                      {priceInfo.hasDiscount && (
                                        <div style={{ marginTop: '2px' }}>
                                          <Text 
                                            style={{ 
                                              color: '#999', 
                                              fontSize: '11px', 
                                              textDecoration: 'line-through'
                                            }}
                                          >
                                            {(originalPrice * item.quantity).toLocaleString("vi", {
                                              style: "currency",
                                              currency: "VND"
                                            })}
                                          </Text>
                                          <div style={{ marginTop: '2px' }}>
                                            <Text style={{ color: '#52c41a', fontSize: '10px', fontWeight: '600' }}>
                                              Tiết kiệm: {((originalPrice - displayPrice) * item.quantity).toLocaleString("vi", {
                                                style: "currency",
                                                currency: "VND"
                                              })}
                                            </Text>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td>
                                  <Button 
                                    type="link" 
                                    danger
                                    onClick={() => handleDelete(item.cartItemId)}
                                  >
                                    Xóa
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="9" style={{ textAlign: "center", padding: '40px' }}>
                              <div>
                                <Text type="secondary" style={{ fontSize: '16px' }}>
                                  Giỏ hàng trống
                                </Text>
                                <div style={{ marginTop: '8px' }}>
                                  <Button type="primary" href="/product-list/643cd88879b4192efedda4e6">
                                    Tiếp tục mua sắm
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <br></br>

                  <Card 
                    title={
                      <Space>
                        <GiftOutlined />
                        <span>Khuyến mãi & Ưu đãi</span>
                      </Space>
                    }
                    className="promotion-card"
                  >
                    <Row gutter={[24, 16]}>
                      <Col xs={24} md={12}>
                        <div className="promotion-section">
                          <div className="promotion-header">
                            <TagOutlined />
                            <span>Mã giảm giá</span>
                          </div>
                          
                          {appliedVoucher ? (
                            <div className="applied-promotion">
                              <div className="applied-info">
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                <span>
                                  <Text strong>{appliedVoucher.maKhuyenMai}</Text> - Giảm {appliedVoucher.phanTramKhuyenMai}%
                                </span>
                              </div>
                              <Button size="small" type="link" onClick={removeVoucher}>
                                Hủy
                              </Button>
                            </div>
                          ) : (
                            <Dropdown 
                              overlay={voucherMenu} 
                              trigger={['click']}
                              placement="bottomLeft"
                            >
                              <Button className="dropdown-button">
                                <Space>
                                  Chọn mã giảm giá
                                  <DownOutlined />
                                </Space>
                              </Button>
                            </Dropdown>
                          )}
                        </div>
                      </Col>

                      <Col xs={24} md={12}>
                        <div className="promotion-section">
                          <div className="promotion-header">
                            <CarOutlined />
                            <span>Miễn phí vận chuyển</span>
                          </div>
                          
                          {appliedFreeship ? (
                            <div className="applied-promotion">
                              <div className="applied-info">
                                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                <span>
                                  <Text strong>{appliedFreeship.maKhuyenMai}</Text> - Miễn phí ship
                                </span>
                              </div>
                              <Button size="small" type="link" onClick={removeFreeship}>
                                Hủy
                              </Button>
                            </div>
                          ) : (
                            <Dropdown 
                              overlay={freeshipMenu} 
                              trigger={['click']}
                              placement="bottomLeft"
                            >
                              <Button className="dropdown-button">
                                <Space>
                                  Chọn mã freeship
                                  <DownOutlined />
                                </Space>
                              </Button>
                            </Dropdown>
                          )}
                        </div>
                      </Col>
                    </Row>
                  </Card>

                  <Divider orientation="left">Chính sách</Divider>
                  <Row justify="start">
                    <Col>
                      <ol>
                        <li>
                          Sản phẩm chuẩn chất lượng, đúng với hình ảnh và video
                          mà shop cung cấp với giá cả tốt trên thị trường.
                        </li>
                        <li>
                          Dịch vụ khách hàng chu đáo, nhiệt tình, tận tâm.
                        </li>
                        <li>
                          Đổi trả sản phẩm nếu có lỗi từ nhà sản xuất theo quy
                          định của nhà sách:<br></br>- Sản phẩm phải còn nguyên,
                          chưa qua sử dụng, giặt tẩy, không bị bẩn hoặc bị hư
                          hỏng bởi các tác nhân bên ngoài. <br></br>- Sản phẩm
                          hư hỏng do vận chuyển hoặc do nhà sản xuất.
                          <br></br>- Không đủ số lượng, không đủ bộ như trong
                          đơn hàng.
                        </li>
                      </ol>
                    </Col>
                  </Row>
                  <br></br>

                  <div className="payment-section">
                    <Card className="payment-summary-modern">
                      <div className="payment-header">
                        <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
                          <CreditCardOutlined /> Thanh toán
                        </Title>
                      </div>
                      
                      <div className="payment-details">
                        <div className="payment-row">
                          <Text className="payment-label">Tổng {cartLength} sản phẩm (giá gốc)</Text>
                          <Text className="payment-value">
                            {originalTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                          </Text>
                        </div>

                        {productDiscountAmount > 0 && (
                          <div className="payment-row discount-row">
                            <Text className="payment-label product-discount">
                              <PercentageOutlined /> Đợt giảm giá sản phẩm
                            </Text>
                            <Text className="payment-value product-discount">
                              -{productDiscountAmount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                            </Text>
                          </div>
                        )}

                        <div className="payment-row">
                          <Text className="payment-label">Tạm tính</Text>
                          <Text className="payment-value">
                            {(originalTotal - productDiscountAmount).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                          </Text>
                        </div>

                        {voucherDiscountAmount > 0 && appliedVoucher && (
                          <div className="payment-row discount-row">
                            <Text className="payment-label voucher">
                              <TagOutlined /> Voucher ({appliedVoucher.phanTramKhuyenMai}%)
                            </Text>
                            <Text className="payment-value voucher">
                              -{voucherDiscountAmount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                            </Text>
                          </div>
                        )}

                        {appliedFreeship && (
                          <div className="payment-row discount-row">
                            <Text className="payment-label freeship">
                              <CarOutlined /> Miễn phí vận chuyển
                            </Text>
                            <Text className="payment-value freeship">
                              Miễn phí
                            </Text>
                          </div>
                        )}

                        <Divider style={{ margin: '16px 0' }} />

                        <div className="payment-total">
                          <Text className="total-label">Tổng thanh toán</Text>
                          <Text className="total-amount">
                            {cartTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                          </Text>
                        </div>

                        <Button
                          type="primary"
                          size="large"
                          block
                          className="pay-button"
                          onClick={handlePay}
                          disabled={!productDetail || productDetail.length === 0}
                          icon={<CreditCardOutlined />}
                        >
                          Thanh toán ngay
                        </Button>

                        <div className="security-info">
                          <Text type="secondary">
                            🔒 Bảo mật thanh toán SSL 256-bit
                          </Text>
                        </div>
                      </div>
                    </Card>
                  </div>

                </Content>
              </Layout>
            </div>
          </Card>
        </Spin>
      </div>
    </div>
  );
};

export default Cart;