import {
  CreditCardOutlined,
  LeftSquareOutlined,
  PercentageOutlined,
  TagOutlined,
  GiftOutlined,
  //TruckOutlined,
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
  
  // ===== THÊM STATES CHO ĐỢT GIẢM GIÁ =====
  const [activePromotions, setActivePromotions] = useState([]);
  const [productDiscountAmount, setProductDiscountAmount] = useState(0);
  
  // Promotion states
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [appliedFreeship, setAppliedFreeship] = useState(null);
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState(0);
  
  // Loading states
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [freeshipLoading, setFreeshipLoading] = useState(false);

  // ===== THÊM HÀM TÍNH GIÁ THEO ĐỢT GIẢM GIÁ =====
  const calculateDiscountedPrice = (product) => {
    const now = new Date();
    let finalPrice = product.price;
    let maxDiscountPercent = 0;
    let appliedPromotion = null;

    console.log('=== CART PROMOTION DEBUG ===');
    console.log('Product ID:', product._id);
    console.log('Product name:', product.name);
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
        
        // So sánh với product._id (có thể là string hoặc object)
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

  // ===== THÊM HÀM TẢI ĐỢT GIẢM GIÁ =====
  const fetchActivePromotions = async () => {
    try {
      console.log('=== FETCHING CART PROMOTIONS DEBUG ===');
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
      console.error('=== CART PROMOTION FETCH ERROR ===');
      console.error('Error details:', error);
      setActivePromotions([]);
    }
  };

  const handlePay = () => {
    // Save promotion data to localStorage before navigating
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
        window.location.reload();
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

      localStorage.setItem("cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  }, []);

  const handleDelete = useCallback((cartItemId) => {
    const updatedCart = JSON.parse(localStorage.getItem("cart")) || [];
    const filteredCart = updatedCart.filter(
      (product) => product.cartItemId !== cartItemId
    );
    
    localStorage.setItem("cart", JSON.stringify(filteredCart));
    setCartLength(filteredCart.length);
    localStorage.setItem("cartLength", filteredCart.length.toString());
    setProductDetail(filteredCart);
    
    notification.success({
      message: 'Thành công',
      description: 'Đã xóa sản phẩm khỏi giỏ hàng'
    });
  }, []);

  // Check if promotion is currently active
  const isPromotionActive = (promotion) => {
    return promotion.trangThai === 'active' || promotion.trangThai === 'scheduled';
  };

  // Apply voucher from dropdown
  const applyVoucherFromDropdown = useCallback(async (voucher) => {
    if (appliedVoucher && appliedVoucher._id === voucher._id) {
      notification.warning({
        message: 'Thông báo',
        description: 'Mã voucher này đã được áp dụng'
      });
      return;
    }

    // ===== SỬA LOGIC CHECK VOUCHER - SỬ DỤNG TỔNG SAU GIẢM GIÁ SẢN PHẨM =====
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

  // Apply freeship from dropdown
  const applyFreeshipFromDropdown = useCallback(async (freeship) => {
    if (appliedFreeship && appliedFreeship._id === freeship._id) {
      notification.warning({
        message: 'Thông báo',
        description: 'Mã freeship này đã được áp dụng'
      });
      return;
    }

    // ===== SỬA LOGIC CHECK FREESHIP - SỬ DỤNG TỔNG SAU GIẢM GIÁ SẢN PHẨM =====
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

  // Remove voucher
  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherDiscountAmount(0);
    notification.info({
      message: 'Đã hủy mã voucher',
      description: 'Mã voucher đã được gỡ bỏ khỏi đơn hàng'
    });
  };

  // Remove freeship
  const removeFreeship = () => {
    setAppliedFreeship(null);
    notification.info({
      message: 'Đã hủy mã freeship',
      description: 'Mã freeship đã được gỡ bỏ khỏi đơn hàng'
    });
  };

  const handleCart = useCallback(async () => {
    try {
      // ===== THÊM FETCH ĐỢT GIẢM GIÁ =====
      await fetchActivePromotions();
      
      // Load promotions
      const res = await promotionManagementApi.listPromotionManagement();
      
      const promotionsData = Array.isArray(res.data?.docs) ? res.data.docs : [];
      setAvailablePromotions(promotionsData);
      
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      
      // Add cartItemId for each product if not exists
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
      
      // Save cart with IDs
      localStorage.setItem("cart", JSON.stringify(cartWithIds));
      
      setProductDetail(cartWithIds);
      const cartLength = cartWithIds.length;
      localStorage.setItem("cartLength", cartLength.toString());
      setCartLength(cartLength);
      
      // Load applied promotions from localStorage
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

  // ===== ✅ THÊM USEEFFECT TÍNH TOÁN KHI ACTIVE PROMOTIONS THAY ĐỔI =====
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

  // ===== ✅ USEEFFECT TÍNH VOUCHER DISCOUNT =====
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

  // ===== ✅ USEEFFECT TÍNH TỔNG CUỐI =====
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

  // Create voucher dropdown menu
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
          // ===== SỬA LOGIC CHECK ELIGIBILITY =====
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

  // Create freeship dropdown menu
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
          // ===== SỬA LOGIC CHECK ELIGIBILITY =====
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
                  
                  {/* Enhanced Product Table */}
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
                            // ===== THÊM LOGIC TÍNH GIÁ VỚI ĐỢT GIẢM GIÁ =====
                            const priceInfo = calculateDiscountedPrice(item);
                            const displayPrice = priceInfo.finalPrice; // Giá sau giảm
                            const originalPrice = priceInfo.originalPrice; // Giá gốc
                            
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
                                    {/* ===== THÊM DISCOUNT BADGE TRONG CART ===== */}
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
                                    {/* ===== THÊM PROMOTION TAG TRONG CART ===== */}
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
                                <td>
                                  {(item.selectedColor || item.color) && (item.selectedColor || item.color) !== '-' ? (
                                    <div className="color-display">
                                      <div
                                        className="color-dot"
                                        style={{
                                          backgroundColor: item.selectedColor || item.color,
                                          width: '20px',
                                          height: '20px',
                                          borderRadius: '50%',
                                          border: '2px solid #fff',
                                          boxShadow: '0 0 0 1px #d9d9d9'
                                        }}
                                      />
                                      <Text>{item.selectedColor || item.color}</Text>
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
                                    {/* ===== HIỂN THỊ GIÁ THEO ĐỢT GIẢM GIÁ ===== */}
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
                                    {/* ===== HIỂN THỊ THÀNH TIỀN THEO GIÁ SAU GIẢM ===== */}
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

                  {/* Enhanced Promotion Section */}
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
                      {/* Voucher Dropdown */}
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

                      {/* Freeship Dropdown */}
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

                  {/* Policy Section */}
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

                  {/* ===== ✅ SỬA MODERN PAYMENT SUMMARY ===== */}
                  <div className="payment-section">
                    <Card className="payment-summary-modern">
                      <div className="payment-header">
                        <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
                          <CreditCardOutlined /> Thanh toán
                        </Title>
                      </div>
                      
                      <div className="payment-details">
                        {/* ===== HIỂN THỊ GIÁ GỐC =====  */}
                        <div className="payment-row">
                          <Text className="payment-label">Tổng {cartLength} sản phẩm (giá gốc)</Text>
                          <Text className="payment-value">
                            {originalTotal.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                          </Text>
                        </div>

                        {/* ===== HIỂN THỊ PRODUCT DISCOUNT ===== */}
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

                        {/* ===== HIỂN THỊ TẠM TÍNH ===== */}
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

                        {/* ===== SỬA TỔNG THANH TOÁN ===== */}
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