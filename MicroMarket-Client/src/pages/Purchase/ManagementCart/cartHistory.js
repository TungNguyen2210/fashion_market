import {
  Breadcrumb, Card, Form,
  Input,
  Select, Spin, Table, Tag, Typography, notification,
  Modal, Button, Rate, Image, Tooltip, Badge, Space, Divider, Avatar, List, Collapse, Row, Col
} from "antd";
import moment from "moment";
import React, { useEffect, useState, useCallback } from "react";
import { useHistory, useParams } from "react-router-dom";
import axiosClient from "../../../apis/axiosClient";
import eventApi from "../../../apis/eventApi";
import productApi from "../../../apis/productApi";
import promotionApi from "../../../apis/promotionManagementApi";
import colorApi from "../../../apis/colorApi";
import { ShoppingOutlined, RightOutlined, CalendarOutlined, DollarOutlined, HomeOutlined, InfoCircleOutlined, PercentageOutlined, TruckOutlined } from '@ant-design/icons';
import './cartHistory.css';

const { Meta } = Card;
const { Option } = Select;
const { Title, Text } = Typography;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { TextArea } = Input;
const { Panel } = Collapse;

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

const isLightColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
};

const CartHistory = () => {
  const [orderList, setOrderList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [comment, setComment] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [productRatings, setProductRatings] = useState([]);

  // State cho promotion data
  const [promotionsAtOrderTime, setPromotionsAtOrderTime] = useState({});
  const [loadingPromotions, setLoadingPromotions] = useState(false);

  const [colorList, setColorList] = useState([]);
  const [colorMapping, setColorMapping] = useState({});

  let { id } = useParams();
  const history = useHistory();

  const getColorNameFromDB = useCallback((hex) => {
    if (!hex) return 'Màu tùy chỉnh';
    
    const normalizedHex = hex.toLowerCase().replace('#', '');
    
    // Tìm trong colorMapping
    if (colorMapping[normalizedHex]) {
      return colorMapping[normalizedHex];
    }
    
    // Fallback về hex code nếu không tìm thấy
    return `#${normalizedHex.toUpperCase()}`;
  }, [colorMapping]);

  const hexToColorName = useCallback((hex) => {
    return getColorNameFromDB(hex);
  }, [getColorNameFromDB]);


  const fetchColors = async () => {
    try {
      const response = await colorApi.getAllColors({
        page: 1,
        limit: 1000
      });
      
      if (response.success && response.data.docs) {
        const colors = response.data.docs;
        setColorList(colors);
        
        // Tạo mapping hex -> tên
        const mapping = {};
        colors.forEach(color => {
          const hex = color.description.toLowerCase().replace('#', '');
          mapping[hex] = color.name;
        });
        setColorMapping(mapping);
        
        console.log('✅ [CART] Đã tải', colors.length, 'màu từ database');
      }
    } catch (error) {
      console.error('❌ [CART] Lỗi khi tải danh sách màu:', error);
      notification.warning({
        message: 'Thông báo',
        description: 'Không thể tải danh sách màu từ server'
      });
    }
  };

  // ✅ FIXED: Mapping đúng field names từ API response
  const fetchPromotionsAtOrderTime = async (orderDate) => {
    try {
      console.log("🔍 Fetching promotions for order date:", orderDate);
      
      const response = await promotionApi.listPromotionManagement();
      console.log("📦 Raw promotion response:", response);
      
      // ✅ XỬ LÝ RESPONSE DATA VỚI ĐÚNG STRUCTURE
      let promotionData = [];
      if (response?.data?.data?.docs) {
        promotionData = response.data.data.docs;
        console.log(`📋 Found ${promotionData.length} total promotions from docs`);
      } else if (response?.data?.docs) {
        promotionData = response.data.docs;
        console.log(`📋 Found ${promotionData.length} total promotions from data.docs`);
      } else {
        console.log("❌ Unknown response structure:", response?.data);
        return [];
      }

      if (promotionData.length === 0) {
        console.log("⚠️ No promotions found in API response");
        return [];
      }

      // ✅ FILTER PROMOTIONS THEO THỜI GIAN VỚI FIELD NAMES ĐÚNG
      const orderDateTime = new Date(orderDate);
      console.log("📅 Order date parsed:", orderDateTime);
      
      const activePromotionsAtOrderTime = promotionData.filter(promotion => {
        // ✅ MAPPING ĐÚNG FIELD NAMES
        const startDate = new Date(promotion.thoiGianBD); // thay vì startDate
        const endDate = new Date(promotion.thoiGianKT);   // thay vì endDate
        const isActive = orderDateTime >= startDate && orderDateTime <= endDate;
        
        // ✅ CHỈ LẤY PROMOTION LOẠI dot_giam_gia (product promotion)
        const isProductPromotion = promotion.loai === 'dot_giam_gia';
        const hasProducts = promotion.sanPhamApDung && promotion.sanPhamApDung.length > 0;
        
        console.log(`🏷️ Checking promotion "${promotion.tenKhuyenMai}":`, {
          promotionId: promotion._id,
          type: promotion.loai,
          isProductPromotion,
          hasProducts,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          orderDate: orderDateTime.toISOString(),
          isActive,
          productCount: promotion.sanPhamApDung?.length || 0,
          discountPercent: promotion.phanTramKhuyenMai,
          status: promotion.trangThai
        });
        
        return isActive && isProductPromotion && hasProducts && promotion.trangThai === 'active';
      });
      
      console.log(`✅ Found ${activePromotionsAtOrderTime.length} active product promotions:`, activePromotionsAtOrderTime);
      return activePromotionsAtOrderTime;
      
    } catch (error) {
      console.error("❌ Error fetching promotions:", error);
      return [];
    }
  };

  // ✅ FIXED: Tính giá với field names đúng
  const calculatePriceAtOrderTime = (product, orderDate, promotions) => {
    console.log("💰 Calculating price for product:", {
      productId: product.product?._id,
      productName: product.product?.name,
      originalPrice: product.price,
      orderDate,
      availablePromotions: promotions.length
    });

    if (!product || !product.product) {
      console.log("❌ Invalid product data");
      return {
        originalPrice: product?.price || 0,
        finalPrice: product?.price || 0,
        hasDiscount: false,
        discountPercent: 0,
        appliedPromotion: null,
        discountAmount: 0
      };
    }

    const productData = product.product;
    const originalPrice = product.price || productData.price || 0;
    
    console.log("🔍 Looking for applicable promotions for product ID:", productData._id);
    
    // ✅ TÌM PROMOTION VỚI FIELD NAMES ĐÚNG
    const applicablePromotion = promotions.find(promo => {
      const productIds = promo.sanPhamApDung?.map(p => p._id) || []; // ✅ Lấy _id từ sanPhamApDung
      const hasProductId = productIds.includes(productData._id);
      
      console.log(`🎯 Checking promotion "${promo.tenKhuyenMai}":`, {
        promotionId: promo._id,
        sanPhamApDung: promo.sanPhamApDung,
        extractedProductIds: productIds,
        targetProductId: productData._id,
        hasThisProduct: hasProductId,
        discountPercent: promo.phanTramKhuyenMai
      });
      
      return hasProductId;
    });

    if (applicablePromotion) {
      const discountPercent = applicablePromotion.phanTramKhuyenMai || 0; // ✅ Field name đúng
      const discountAmount = (originalPrice * discountPercent) / 100;
      const finalPrice = originalPrice - discountAmount;

      console.log(`🎉 FOUND APPLICABLE PROMOTION:`, {
        promotionName: applicablePromotion.tenKhuyenMai, // ✅ Field name đúng
        originalPrice,
        discountPercent: `${discountPercent}%`,
        discountAmount,
        finalPrice,
        productName: productData.name
      });

      return {
        originalPrice,
        finalPrice: finalPrice > 0 ? finalPrice : originalPrice,
        hasDiscount: true,
        discountPercent,
        appliedPromotion: applicablePromotion,
        discountAmount
      };
    }

    console.log(`❌ No applicable promotion found for product: ${productData.name}`);
    return {
      originalPrice,
      finalPrice: originalPrice,
      hasDiscount: false,
      discountPercent: 0,
      appliedPromotion: null,
      discountAmount: 0
    };
  };

  // Modal hiển thị chi tiết đơn hàng
  const showModal = async (order) => {
    console.log("🔓 Opening modal for order:", order._id);
    setSelectedOrder(order);
    setIsModalVisible(true);
    
    try {
      setLoadingPromotions(true);
      const promotions = await fetchPromotionsAtOrderTime(order.createdAt);
      
      console.log("💾 Setting promotions for order:", {
        orderId: order._id,
        promotionCount: promotions.length,
        promotions
      });
      
      setPromotionsAtOrderTime(prev => ({
        ...prev,
        [order._id]: promotions
      }));
    } catch (error) {
      console.error("❌ Error in showModal:", error);
    } finally {
      setLoadingPromotions(false);
    }
  };

  const showRatingModal = (order, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (order.status === "final") {
      setSelectedOrder(order);
      
      if (order.products && order.products.length > 0) {
        const ratings = order.products.map(item => {
          if (!item.product) {
            return {
              productId: `temp-${Date.now()}-${Math.random()}`,
              productName: "Sản phẩm không xác định",
              productImage: "https://placeholder.pics/svg/80x80",
              productColor: item.color || '-',
              productSize: item.size || '-',
              rating: 0,
              comment: ""
            };
          }
          
          return {
            productId: item.product._id,
            productName: item.product.name || "Sản phẩm không xác định",
            productImage: item.product.image || "https://placeholder.pics/svg/80x80",
            productColor: item.color || (item.product && item.product.color) || '-',
            productSize: item.size || (item.product && item.product.size) || '-',
            rating: 0,
            comment: ""
          };
        });
        setProductRatings(ratings);
      }
      
      setIsRatingModalVisible(true);
    } else {
      notification.info({
        message: "Thông báo",
        description: "Bạn chỉ có thể đánh giá đơn hàng đã giao thành công.",
      });
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedOrder(null);
  };
  
  const handleRatingModalClose = () => {
    setIsRatingModalVisible(false);
    setSelectedOrder(null);
    setProductRatings([]);
  };

  const handleRatingChange = (value, index) => {
    const updated = [...productRatings];
    updated[index].rating = value;
    setProductRatings(updated);
  };

  const handleCommentChange = (e, index) => {
    const updated = [...productRatings];
    updated[index].comment = e.target.value;
    setProductRatings(updated);
  };

  const handleRatingSubmit = async () => {
    const ratedProducts = productRatings.filter(p => p.rating && p.rating >= 1);
    if (ratedProducts.length === 0) {
      return notification.error({
        message: "Lỗi",
        description: "Vui lòng chọn ít nhất một sản phẩm để đánh giá.",
      });
    }
    
    try {
      const payload = {
        ratings: ratedProducts.map(p => ({
          productId: p.productId,
          rating: p.rating,
          comment: p.comment || ""
        }))
      };
      
      console.log("Gửi payload đến API:", payload);
      
      const response = await axiosClient.post(`/order/${selectedOrder._id}/rate-products`, payload);
      
      console.log("Phản hồi từ server:", response);
      
      const updatedOrders = orderList.data.map((order) => {
        if (order._id !== selectedOrder._id) return order;
        return {
          ...order,
          products: order.products.map((p) => {
            if (!p.product) return p;
            
            const ratedProduct = ratedProducts.find(r => r.productId === p.product._id);
            if (ratedProduct) {
              return {
                ...p,
                rated: true,
                rating: ratedProduct.rating,
                comment: ratedProduct.comment,
              };
            }
            return p; 
          }),
          rated: true,
        };
      });
      setOrderList({ ...orderList, data: updatedOrders });
      notification.success({
        message: "Thành công",
        description: "Đánh giá sản phẩm thành công.",
      });
      handleRatingModalClose();
    } catch (error) {
      console.error("Chi tiết lỗi:", error);
      let errorMsg = "Không thể gửi đánh giá";
      
      if (error.response) {
        errorMsg += `: ${error.response.data?.message || error.response.statusText || ''}`;
      } else if (error.request) {
        errorMsg += ": Không nhận được phản hồi từ server";
      } else {
        errorMsg += `: ${error.message || ''}`;
      }
      
      notification.error({
        message: "Lỗi",
        description: errorMsg,
      });
    }
  };

  // Render functions
    const renderColorInfo = (color) => {
    if (!color || color === '-') {
      return <Text type="secondary">-</Text>;
    }
    
    return (
      <Tooltip title={hexToColorName(color)}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          cursor: 'help'
        }}>
          <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: color,
            border: isLightColor(color) 
              ? '2px solid #d9d9d9' 
              : '2px solid #fff',
            boxShadow: '0 0 0 1px #d9d9d9',
            flexShrink: 0
          }} />
          <Text>{hexToColorName(color)}</Text> {/* ✅ Hiển thị tên tiếng Việt */}
        </div>
      </Tooltip>
    );
  };
  
  const renderSizeInfo = (size) => {
    if (!size || size === '-') return <span>-</span>;
    return <Tag color="blue">{size}</Tag>;
  };

  const calculateTotalProductQuantity = (products) => {
    if (!products || !Array.isArray(products)) return 0;
    return products.reduce((total, product) => total + (product.quantity || 0), 0);
  };

  const renderPromotionInfo = (order) => {
    const hasVoucher = order.voucherPromotionID;
    const hasFreeship = order.freeShipPromotionID;
    const discountAmount = order.discountAmount || 0;
    
    if (!hasVoucher && !hasFreeship) {
      return <span style={{ color: '#999' }}>Không có</span>;
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {hasVoucher && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <PercentageOutlined style={{ color: '#1890ff', marginRight: '4px' }} />
            <span style={{ fontSize: '12px', color: '#1890ff' }}>
              Voucher: -{discountAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        )}
        {hasFreeship && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TruckOutlined style={{ color: '#52c41a', marginRight: '4px' }} />
            <span style={{ fontSize: '12px', color: '#52c41a' }}>
              Miễn phí ship
            </span>
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await productApi.getOrderByUser().then((item) => {
          if (item && item.data) {
            const sortedData = [...item.data].sort((a, b) => 
              new Date(b.createdAt) - new Date(a.createdAt)
            );
            setOrderList({ ...item, data: sortedData });
          } else {
            setOrderList(item);
          }
        });
        setLoading(false);
      } catch (error) {
        console.log("Failed to fetch order history:", error);
        setLoading(false);
      }
    })();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
      fetchColors();
    }, []);

  // Pagination
  const getPaginatedData = () => {
    if (!orderList.data || orderList.data.length === 0) return [];
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return orderList.data.slice(startIndex, endIndex);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const Pagination = ({ current, total, pageSize, onChange }) => {
    const totalPages = Math.ceil(total / pageSize);
    
    if (totalPages <= 1) return null;
    
    return (
      <div className="custom-pagination">
        <Button 
          disabled={current === 1} 
          onClick={() => onChange(current - 1)}
          style={{ margin: '0 5px' }}
        >
          Trước
        </Button>
        
        <span style={{ margin: '0 10px' }}>
          Trang {current} / {totalPages}
        </span>
        
        <Button 
          disabled={current === totalPages} 
          onClick={() => onChange(current + 1)}
          style={{ margin: '0 5px' }}
        >
          Tiếp
        </Button>
      </div>
    );
  };
  
  const renderRatingStatus = (order) => {
    if (order.status === "final") {
      if (order.rated) {
        return (
          <Button type="default" size="small" disabled className="rated-button" onClick={(e) => e.stopPropagation()}>
            Đã đánh giá
          </Button>
        );
      } else {
        return (
          <Button type="primary" size="small" onClick={(e) => {
            e.stopPropagation();
            showRatingModal(order, e);
          }}>
            Đánh giá
          </Button>
        );
      }
    } else if (order.status === "rejected") {
      return (
        <Tooltip title="Đơn hàng đã hủy không thể đánh giá">
          <Button type="default" size="small" disabled className="no-rating-button" onClick={(e) => e.stopPropagation()}>
            Không khả dụng
          </Button>
        </Tooltip>
      );
    } else {
      return (
        <Tooltip title="Bạn có thể đánh giá khi đơn hàng đã giao">
          <Button type="default" size="small" disabled className="waiting-button" onClick={(e) => e.stopPropagation()}>
            Chờ giao hàng
          </Button>
        </Tooltip>
      );
    }
  };

  return (
    <div className="cart-history-page">
      <Spin spinning={loading}>
        <Card className="container">
          <div className="product_detail">
            <div className="breadcrumb-container">
              <Breadcrumb>
                <Breadcrumb.Item href="http://localhost:3500/home">
                  <HomeOutlined />
                  <span> Trang chủ</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item>
                  <ShoppingOutlined />
                  <span> Quản lý đơn hàng </span>
                </Breadcrumb.Item>
              </Breadcrumb>
            </div>
            <Divider className="divider-margin" />
            
            <div className="order-history-container">
              <div className="order-history-header">
                <Title level={4}>
                  <ShoppingOutlined /> Lịch sử đơn hàng của bạn
                </Title>
                <div className="rating-info">
                  <Text type="secondary">
                    <InfoCircleOutlined style={{ marginRight: 5 }} /> 
                    Bạn chỉ có thể đánh giá đơn hàng khi trạng thái là "Đã giao"
                  </Text>
                </div>
              </div>
              
              <div className="order-history-content">
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: "4%" }}>STT</th>
                        <th style={{ width: "12%" }}>Mã đơn hàng</th>
                        <th style={{ width: "10%" }}>Ảnh</th>
                        <th style={{ width: "8%" }}>SL SP</th>
                        <th style={{ width: "10%" }}>Trạng thái</th>
                        <th style={{ width: "12%" }}>Tổng đơn hàng</th>
                        <th style={{ width: "12%" }}>Thành tiền</th>
                        <th style={{ width: "12%" }}>Ưu đãi</th>
                        <th style={{ width: "10%" }}>Ngày đặt</th>
                        <th style={{ width: "10%" }}>Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData().length > 0 ? (
                        getPaginatedData().map((order, index) => {
                          const firstProduct = order.products && order.products.length > 0 ? order.products[0] : null;
                          const productImage = firstProduct?.product?.image || "https://placeholder.pics/svg/80x80";
                          
                          const totalProductQuantity = calculateTotalProductQuantity(order.products);
                          
                          let statusColor, statusText;
                          switch(order.status) {
                            case 'rejected':
                              statusColor = 'red';
                              statusText = 'Đã hủy';
                              break;
                            case 'approved':
                              statusColor = 'geekblue';
                              statusText = 'Vận chuyển';
                              break;
                            case 'final':
                              statusColor = 'green';
                              statusText = 'Đã giao';
                              break;
                            default:
                              statusColor = 'blue';
                              statusText = 'Đợi xác nhận';
                          }
                          
                          const actualIndex = (currentPage - 1) * pageSize + index + 1;
                          
                          return (
                            <tr key={order._id} 
                                onClick={() => showModal(order)} 
                                style={{ cursor: "pointer" }}>
                              <td>{actualIndex}</td>
                              <td>
                                <Tooltip title={order._id}>
                                  <span style={{ fontSize: '12px' }}>{order._id.substring(0, 8)}...</span>
                                </Tooltip>
                              </td>
                              <td>
                                <img src={productImage} style={{ height: 60, width: 60, objectFit: 'cover', borderRadius: '4px' }} alt="Sản phẩm" />
                                {order.products.length > 1 && (
                                  <div style={{ color: '#999', fontSize: '10px', marginTop: '2px' }}>
                                    +{order.products.length - 1} SP
                                  </div>
                                )}
                              </td>
                              <td>
                                <strong>{totalProductQuantity}</strong>
                              </td>
                              <td>
                                <Tag color={statusColor}>{statusText}</Tag>
                              </td>
                              <td>
                                <div style={{ fontSize: '13px' }}>
                                  <Text strong style={{ color: '#d70018' }}>
                                    {order.orderTotal.toLocaleString("vi-VN")}đ
                                  </Text>
                                </div>
                              </td>
                              <td>
                                <div style={{ fontSize: '13px' }}>
                                  <Text strong style={{ color: '#52c41a' }}>
                                    {order.finalAmount.toLocaleString("vi-VN")}đ
                                  </Text>
                                  {order.shippingFee > 0 && (
                                    <div style={{ fontSize: '10px', color: '#999' }}>
                                      +{order.shippingFee.toLocaleString("vi-VN")}đ ship
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td>
                                {renderPromotionInfo(order)}
                              </td>
                              <td>
                                <div style={{ fontSize: '12px' }}>{moment(order.createdAt).format("DD/MM/YY")}</div>
                                <div style={{ color: "#888", fontSize: '11px' }}>{moment(order.createdAt).format("HH:mm")}</div>
                              </td>
                              <td>
                                {renderRatingStatus(order)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="10" style={{ textAlign: "center" }}>
                            Không có đơn hàng nào
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {orderList.data && orderList.data.length > 0 && (
                  <Pagination
                    current={currentPage}
                    total={orderList.data.length}
                    pageSize={pageSize}
                    onChange={handlePageChange}
                  />
                )}

                {/* ✅ MODAL CHI TIẾT ĐƠN HÀNG VỚI PROMOTION ĐÃ SỬA */}
                <Modal
                  title="Chi tiết đơn hàng"
                  visible={isModalVisible}
                  onCancel={handleModalClose}
                  footer={[
                    <Button key="close" type="primary" onClick={handleModalClose}>
                      Đóng
                    </Button>,
                    selectedOrder && selectedOrder.status === "final" && !selectedOrder.rated && (
                      <Button key="rate" type="primary" onClick={() => {
                        handleModalClose();
                        showRatingModal(selectedOrder);
                      }}>
                        Đánh giá đơn hàng
                      </Button>
                    )
                  ]}
                  width={900}
                  className="order-detail-modal"
                >
                  {selectedOrder && (
                    <div className="order-modal-content">
                      {/* ORDER SUMMARY */}
                      <Card title="Thông tin đơn hàng" bordered={false} style={{ marginBottom: 16 }} className="order-summary-card">
                        <Row gutter={[16, 8]}>
                          <Col xs={24} md={12}>
                            <p><strong>Mã đơn hàng:</strong> <Text copyable>{selectedOrder._id}</Text></p>
                          </Col>
                          <Col xs={24} md={12}>
                            <p><strong>Ngày đặt:</strong> {moment(selectedOrder.createdAt).format(DATE_TIME_FORMAT)}</p>
                          </Col>
                          <Col xs={24} md={12}>
                            <p><strong>Tổng đơn hàng:</strong> <Text strong style={{ color: '#d70018' }}>
                              {selectedOrder.orderTotal.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                            </Text></p>
                          </Col>
                          <Col xs={24} md={12}>
                            <p><strong>Giảm giá:</strong> <Text style={{ color: '#1890ff' }}>
                              -{(selectedOrder.discountAmount || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                            </Text></p>
                          </Col>
                          <Col xs={24} md={12}>
                            <p><strong>Phí vận chuyển:</strong> <Text style={{ color: selectedOrder.shippingFee > 0 ? '#faad14' : '#52c41a' }}>
                              {selectedOrder.shippingFee > 0 
                                ? selectedOrder.shippingFee.toLocaleString("vi-VN") + 'đ'
                                : 'Miễn phí'
                              }
                            </Text></p>
                          </Col>
                          <Col xs={24} md={12}>
                            <p><strong>Thành tiền:</strong> <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                              {selectedOrder.finalAmount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                            </Text></p>
                          </Col>
                          <Col xs={24}>
                            <p><strong>Địa chỉ:</strong> {selectedOrder.address}</p>
                          </Col>
                          <Col xs={24} md={12}>
                            <p>
                              <strong>Trạng thái:</strong> {
                                selectedOrder.status === "rejected" ? <Tag color="red">Đã hủy</Tag> :
                                selectedOrder.status === "approved" ? <Tag color="geekblue">Đang vận chuyển</Tag> :
                                selectedOrder.status === "final" ? <Tag color="green">Đã giao hàng</Tag> : 
                                <Tag color="blue">Đợi xác nhận</Tag>
                              }
                            </p>
                          </Col>
                          <Col xs={24} md={12}>
                            <p><strong>Thanh toán:</strong> {selectedOrder.billing === 'cod' ? 'Tiền mặt (COD)' : 'PayPal'}</p>
                          </Col>
                          {selectedOrder.description && (
                            <Col xs={24}>
                              <p><strong>Ghi chú:</strong> {selectedOrder.description}</p>
                            </Col>
                          )}
                        </Row>

                        {(selectedOrder.voucherPromotionID || selectedOrder.freeShipPromotionID) && (
                          <Divider style={{ margin: '16px 0' }} />
                        )}
                        {selectedOrder.voucherPromotionID && (
                          <div style={{ marginBottom: '8px' }}>
                            <Badge status="processing" text={
                              <span>
                                <PercentageOutlined style={{ marginRight: '4px' }} />
                                Voucher ID: <Text code>{selectedOrder.voucherPromotionID}</Text>
                                <Text style={{ color: '#1890ff', marginLeft: '8px' }}>
                                  (Tiết kiệm: {(selectedOrder.discountAmount || 0).toLocaleString("vi-VN")}đ)
                                </Text>
                              </span>
                            } />
                          </div>
                        )}
                        {selectedOrder.freeShipPromotionID && (
                          <div>
                            <Badge status="success" text={
                              <span>
                                <TruckOutlined style={{ marginRight: '4px' }} />
                                Freeship ID: <Text code>{selectedOrder.freeShipPromotionID}</Text>
                                <Text style={{ color: '#52c41a', marginLeft: '8px' }}>
                                  (Miễn phí vận chuyển)
                                </Text>
                              </span>
                            } />
                          </div>
                        )}
                      </Card>
                      
                      {/* ✅ PRODUCT DETAILS VỚI HISTORICAL PROMOTIONS ĐÃ SỬA */}
                      <Card title="Chi tiết sản phẩm" bordered={false} style={{ marginBottom: 16 }} className="order-products-card">
                        <Spin spinning={loadingPromotions}>
                          <List
                            dataSource={selectedOrder.products}
                            renderItem={(item, index) => {
                              const currentOrderPromotions = promotionsAtOrderTime[selectedOrder._id] || [];
                              
                              console.log("🎨 Rendering product item:", {
                                productId: item.product?._id,
                                productName: item.product?.name,
                                orderPromotions: currentOrderPromotions.length,
                                orderDate: selectedOrder.createdAt
                              });
                              
                              const priceInfo = calculatePriceAtOrderTime(item, selectedOrder.createdAt, currentOrderPromotions);
                              
                              console.log("💸 Price calculation result:", priceInfo);
                              
                              const quantity = item.quantity || 0;
                              const originalSubtotal = priceInfo.originalPrice * quantity;
                              const finalSubtotal = priceInfo.finalPrice * quantity;
                              const savedAmount = originalSubtotal - finalSubtotal;
                              
                              return (
                                <List.Item className="modal-product-item" style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                                  <List.Item.Meta
                                    avatar={
                                      <div style={{ position: 'relative' }}>
                                        <Avatar 
                                          shape="square" 
                                          size={80} 
                                          src={item.product?.image || "https://placeholder.pics/svg/80x80"}
                                        />
                                        {priceInfo.hasDiscount && (
                                          <div style={{
                                            position: 'absolute',
                                            top: '-5px',
                                            left: '-5px',
                                            background: '#ff4d4f',
                                            color: 'white',
                                            borderRadius: '50%',
                                            width: '30px',
                                            height: '30px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                          }}>
                                            -{priceInfo.discountPercent}%
                                          </div>
                                        )}
                                      </div>
                                    }
                                    title={
                                      <div>
                                        <Text strong style={{ fontSize: '16px' }}>
                                          {item.product?.name || "Không có tên sản phẩm"}
                                        </Text>
                                        {priceInfo.appliedPromotion && (
                                          <div style={{ marginTop: '4px' }}>
                                            <Tag color="red" size="small">
                                              🏷️ {priceInfo.appliedPromotion.tenKhuyenMai}
                                            </Tag>
                                          </div>
                                        )}
                                        {item.variantId && (
                                          <div style={{ marginTop: '4px' }}>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                              Variant ID: {item.variantId}
                                            </Text>
                                          </div>
                                        )}
                                      </div>
                                    }
                                    description={
                                      <div className="product-specs">
                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text type="secondary">Số lượng:</Text>
                                            <Tag color="blue">{quantity}</Tag>
                                          </div>
                                          
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text type="secondary">Màu sắc:</Text>
                                            {renderColorInfo(item.color || (item.product?.color) || '-')}
                                          </div>
                                          
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text type="secondary">Kích thước:</Text>
                                            {renderSizeInfo(item.size || (item.product?.size) || '-')}
                                          </div>
                                          
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text type="secondary">Đơn giá:</Text>
                                            <div style={{ textAlign: 'right' }}>
                                              {priceInfo.hasDiscount ? (
                                                <>
                                                  <div>
                                                    <Text delete type="secondary" style={{ fontSize: '12px' }}>
                                                      {priceInfo.originalPrice.toLocaleString("vi-VN")}đ
                                                    </Text>
                                                  </div>
                                                  <div>
                                                    <Text strong style={{ color: '#ff4d4f' }}>
                                                      {priceInfo.finalPrice.toLocaleString("vi-VN")}đ
                                                    </Text>
                                                  </div>
                                                </>
                                              ) : (
                                                <Text strong>{priceInfo.originalPrice.toLocaleString("vi-VN")}đ</Text>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <Divider style={{ margin: '8px 0' }} />
                                          
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text strong>Thành tiền:</Text>
                                            <div style={{ textAlign: 'right' }}>
                                              {priceInfo.hasDiscount ? (
                                                <>
                                                  <div>
                                                    <Text delete type="secondary" style={{ fontSize: '12px' }}>
                                                      {originalSubtotal.toLocaleString("vi-VN")}đ
                                                    </Text>
                                                  </div>
                                                  <div>
                                                    <Text strong style={{ color: '#d70018', fontSize: '16px' }}>
                                                      {finalSubtotal.toLocaleString("vi-VN")}đ
                                                    </Text>
                                                  </div>
                                                  <div>
                                                    <Text style={{ color: '#52c41a', fontSize: '12px' }}>
                                                      Tiết kiệm: {savedAmount.toLocaleString("vi-VN")}đ
                                                    </Text>
                                                  </div>
                                                </>
                                              ) : (
                                                <Text strong style={{ color: '#d70018', fontSize: '16px' }}>
                                                  {finalSubtotal.toLocaleString("vi-VN")}đ
                                                </Text>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                            <Text type="secondary">Đánh giá sản phẩm:</Text>
                                            {item.rated ? (
                                              <div>
                                                <Rate disabled value={item.rating || 0} style={{ fontSize: '14px' }} />
                                                {item.comment && (
                                                  <div style={{ 
                                                    marginTop: '4px', 
                                                    padding: '4px 8px', 
                                                    background: '#f5f5f5', 
                                                    borderRadius: '4px',
                                                    fontSize: '12px'
                                                  }}>
                                                    "{item.comment}"
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              <Text type="secondary" style={{ fontSize: '12px' }}>Chưa đánh giá</Text>
                                            )}
                                          </div>
                                        </Space>
                                      </div>
                                    }
                                  />
                                </List.Item>
                              );
                            }}
                          />
                        </Spin>

                        {/* ORDER TOTAL WITH HISTORICAL PROMOTIONS */}
                        <div style={{ 
                          marginTop: '16px', 
                          padding: '16px', 
                          background: '#fafafa', 
                          borderRadius: '8px',
                          border: '1px solid #f0f0f0'
                        }}>
                          {(() => {
                            const currentOrderPromotions = promotionsAtOrderTime[selectedOrder._id] || [];
                            let totalOriginal = 0;
                            let totalWithProductPromotions = 0;
                            
                            selectedOrder.products.forEach(item => {
                              const priceInfo = calculatePriceAtOrderTime(item, selectedOrder.createdAt, currentOrderPromotions);
                              const quantity = item.quantity || 0;
                              totalOriginal += priceInfo.originalPrice * quantity;
                              totalWithProductPromotions += priceInfo.finalPrice * quantity;
                            });
                            
                            const productPromotionSavings = totalOriginal - totalWithProductPromotions;
                            
                            return (
                              <Row gutter={[16, 8]}>
                                {productPromotionSavings > 0 && (
                                  <>
                                    <Col span={12}>
                                      <Text>Tổng giá niêm yết:</Text>
                                    </Col>
                                    <Col span={12} style={{ textAlign: 'right' }}>
                                      <Text delete type="secondary">{totalOriginal.toLocaleString("vi-VN")}đ</Text>
                                    </Col>
                                    
                                    <Col span={12}>
                                      <Text>Giảm giá sản phẩm:</Text>
                                    </Col>
                                    <Col span={12} style={{ textAlign: 'right' }}>
                                      <Text style={{ color: '#52c41a' }}>-{productPromotionSavings.toLocaleString("vi-VN")}đ</Text>
                                    </Col>
                                  </>
                                )}
                                
                                <Col span={12}>
                                  <Text>Tổng tiền hàng:</Text>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                  <Text strong>{selectedOrder.orderTotal.toLocaleString("vi-VN")}đ</Text>
                                </Col>
                                
                                {selectedOrder.discountAmount > 0 && (
                                  <>
                                    <Col span={12}>
                                      <Text>Giảm giá voucher:</Text>
                                    </Col>
                                    <Col span={12} style={{ textAlign: 'right' }}>
                                      <Text style={{ color: '#1890ff' }}>-{selectedOrder.discountAmount.toLocaleString("vi-VN")}đ</Text>
                                    </Col>
                                  </>
                                )}
                                
                                <Col span={12}>
                                  <Text>Phí vận chuyển:</Text>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                  <Text style={{ color: selectedOrder.shippingFee > 0 ? '#faad14' : '#52c41a' }}>
                                    {selectedOrder.shippingFee > 0 ? `+${selectedOrder.shippingFee.toLocaleString("vi-VN")}đ` : 'Miễn phí'}
                                  </Text>
                                </Col>
                                
                                <Col span={24}>
                                  <Divider style={{ margin: '8px 0' }} />
                                </Col>
                                
                                <Col span={12}>
                                  <Text strong style={{ fontSize: '16px' }}>Tổng thanh toán:</Text>
                                </Col>
                                <Col span={12} style={{ textAlign: 'right' }}>
                                  <Text strong style={{ color: '#52c41a', fontSize: '18px' }}>
                                    {selectedOrder.finalAmount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                  </Text>
                                </Col>
                              </Row>
                            );
                          })()}
                        </div>
                      </Card>

                      {/* RATING DISPLAY */}
                      {selectedOrder.rated ? (
                        <Card title="Đánh giá của bạn" bordered={false} className="rating-display-card">
                          {selectedOrder.products.filter(p => p.rated).map((product, index) => (
                            <div key={index} className="product-rating-item">
                              <div className="product-rating-header" style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                                <Avatar 
                                  shape="square" 
                                  size={64} 
                                  src={product.product?.image || "https://placeholder.pics/svg/64x64"}
                                  style={{ marginRight: 12 }}
                                />
                                <div>
                                  <Text strong>{product.product?.name || "Sản phẩm không xác định"}</Text>
                                  <div>
                                    <Rate disabled value={product.rating || 0} />
                                    <div className="rating-date">
                                      {moment(selectedOrder.updatedAt).format(DATE_TIME_FORMAT)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {product.comment && (
                                <div className="rating-comment">
                                  <div className="comment-box" style={{ 
                                    background: '#f5f5f5', 
                                    padding: '10px 15px', 
                                    borderRadius: '5px',
                                    marginBottom: '15px' 
                                  }}>
                                    {product.comment}
                                  </div>
                                </div>
                              )}
                              {index < selectedOrder.products.filter(p => p.rated).length - 1 && (
                                <Divider style={{ margin: '10px 0 20px' }} />
                              )}
                            </div>
                          ))}
                          {selectedOrder.products.filter(p => p.rated).length === 0 && (
                            <div style={{ textAlign: 'center', padding: '20px 0' }}>
                              <InfoCircleOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 10 }} />
                              <div>Đơn hàng đã được đánh dấu là đã đánh giá, nhưng không tìm thấy đánh giá cho sản phẩm cụ thể.</div>
                            </div>
                          )}
                        </Card>
                      ) : (
                        <div className="rating-status-info">
                          {selectedOrder.status === "final" ? (
                            <div className="can-rate-notice">
                              <InfoCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                              <Text>Đơn hàng đã giao thành công. Bạn có thể đánh giá đơn hàng này.</Text>
                            </div>
                          ) : selectedOrder.status === "rejected" ? (
                            <div className="cannot-rate-notice rejected">
                              <InfoCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                              <Text type="danger">Đơn hàng đã bị hủy. Không thể đánh giá.</Text>
                            </div>
                          ) : (
                            <div className="cannot-rate-notice pending">
                              <InfoCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
                              <Text type="warning">
                                Đơn hàng đang xử lý. Bạn có thể đánh giá sau khi đơn hàng được giao thành công.
                              </Text>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Modal>
                
                {/* RATING MODAL */}
                <Modal
                  title="Đánh giá sản phẩm trong đơn hàng"
                  visible={isRatingModalVisible}
                  onOk={handleRatingSubmit}
                  onCancel={handleRatingModalClose}
                  okText="Gửi đánh giá"
                  cancelText="Hủy"
                  width={700}
                  className="rating-modal"
                >
                  {productRatings.map((item, index) => (
                    <div key={item.productId} style={{ marginBottom: 24 }}>
                      <div className="product-rating-container" style={{ 
                        border: '1px solid #f0f0f0', 
                        borderRadius: '8px', 
                        padding: '16px',
                        backgroundColor: '#fafafa'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
                          <Avatar 
                            shape="square" 
                            size={80} 
                            src={item.productImage || "https://placeholder.pics/svg/80x80"}
                            style={{ marginRight: 16, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: 8 }}>
                              <Text strong style={{ fontSize: '16px' }}>{item.productName}</Text>
                            </div>
                            
                            <div style={{ marginBottom: 12 }}>
                              <Space direction="vertical" size={4}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <Text type="secondary" style={{ marginRight: 8, minWidth: '80px' }}>
                                    Màu sắc:
                                  </Text>
                                  {item.productColor && item.productColor !== '-' ? (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <div
                                        style={{
                                          backgroundColor: item.productColor,
                                          width: '16px',
                                          height: '16px',
                                          borderRadius: '50%',
                                          marginRight: '8px',
                                          border: '1px solid #ddd'
                                        }}
                                      />
                                      <span>{item.productColor}</span>
                                    </div>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <Text type="secondary" style={{ marginRight: 8, minWidth: '80px' }}>
                                    Kích thước:
                                  </Text>
                                  {item.productSize && item.productSize !== '-' ? (
                                    <Tag color="blue">{item.productSize}</Tag>
                                  ) : (
                                    <span>-</span>
                                  )}
                                </div>
                              </Space>
                            </div>
                            
                            <div style={{ marginBottom: 12 }}>
                              <Text style={{ marginRight: 8 }}>Đánh giá:</Text>
                              <Rate
                                value={item.rating}
                                onChange={(value) => handleRatingChange(value, index)}
                                style={{ fontSize: '20px' }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <Text>Nhận xét về sản phẩm:</Text>
                          </div>
                          <TextArea
                            rows={3}
                            value={item.comment}
                            onChange={(e) => handleCommentChange(e, index)}
                            placeholder={`Chia sẻ trải nghiệm của bạn về sản phẩm "${item.productName}"`}
                            style={{ borderRadius: '6px' }}
                          />
                        </div>
                      </div>
                      
                      {index < productRatings.length - 1 && (
                        <Divider style={{ margin: '24px 0' }} />
                      )}
                    </div>
                  ))}
                </Modal>
              </div>
            </div>
          </div>
        </Card>
      </Spin>
    </div>
  );
};

export default CartHistory;