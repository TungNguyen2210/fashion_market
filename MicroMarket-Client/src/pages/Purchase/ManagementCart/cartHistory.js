import {
  Breadcrumb, Card, Form,
  Input,
  Select, Spin, Table, Tag, Typography, notification,
  Modal, Button, Rate, Image, Tooltip, Badge, Space, Divider, Avatar, List, Collapse, Row, Col
} from "antd";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import axiosClient from "../../../apis/axiosClient";
import eventApi from "../../../apis/eventApi";
import productApi from "../../../apis/productApi";
import { ShoppingOutlined, RightOutlined, CalendarOutlined, DollarOutlined, HomeOutlined, InfoCircleOutlined } from '@ant-design/icons';
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


  let { id } = useParams();
  const history = useHistory();


  const showModal = (order) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };


  const showRatingModal = (order, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (order.status === "final") {
      setSelectedOrder(order);
      
      // Khởi tạo state cho việc đánh giá sản phẩm
      if (order.products && order.products.length > 0) {
        const ratings = order.products.map(item => {
          // Kiểm tra item.product có tồn tại không
          if (!item.product) {
            return {
              productId: `temp-${Date.now()}-${Math.random()}`, // Tạo ID tạm thời
              productName: "Sản phẩm không xác định",
              productImage: "https://placeholder.pics/svg/80x80",
              rating: 0,
              comment: ""
            };
          }
          
          return {
            productId: item.product._id,
            productName: item.product.name || "Sản phẩm không xác định",
            productImage: item.product.image || "https://placeholder.pics/svg/80x80",
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
      // Tạo đúng định dạng mà server mong đợi
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
      
      // Update local state to mark rated products
      const updatedOrders = orderList.data.map((order) => {
        if (order._id !== selectedOrder._id) return order;
        return {
          ...order,
          products: order.products.map((p) => {
            // Cẩn thận kiểm tra p.product trước khi truy cập p.product._id
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
          rated: true, // Đánh dấu đơn hàng đã được đánh giá
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


  // Tạo render cho thông tin màu sắc
  const renderColorInfo = (color) => {
    if (!color || color === '-') return <span>-</span>;
    
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div
          className="color-dot"
          style={{
            backgroundColor: color,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            marginRight: '8px',
            border: '1px solid #ddd'
          }}
        />
        <span>{color}</span>
      </div>
    );
  };
  
  // Hàm mới để hiển thị kích thước
  const renderSizeInfo = (item) => {
    const size = item.selectedSize || item.size || item.productSize ||
              (item.product && item.product.details && item.product.details.size) ||
              (item.product && item.product.options && item.product.options.size) ||
              (item.product && item.product.size);
              
    if (!size || size === '-') return <span>-</span>;
    
    return <Tag color="blue">{size}</Tag>;
  };


  // Hàm mới để tính tổng số lượng sản phẩm
  const calculateTotalProductQuantity = (products) => {
    if (!products || !Array.isArray(products)) return 0;
    
    // Tính tổng số lượng từ tất cả sản phẩm trong đơn hàng
    return products.reduce((total, product) => total + (product.quantity || 0), 0);
  };


  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await productApi.getOrderByUser().then((item) => {
          // Sắp xếp đơn hàng từ mới nhất đến cũ nhất
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


  // Tính toán phân trang
  const getPaginatedData = () => {
    if (!orderList.data || orderList.data.length === 0) return [];
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return orderList.data.slice(startIndex, endIndex);
  };


  // Xử lý chuyển trang
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };


  // Component phân trang đơn giản
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
  
  
  // Function để render nút đánh giá hoặc trạng thái đánh giá dựa trên trạng thái đơn hàng
  const renderRatingStatus = (order) => {
    if (order.status === "final") {
      // Đơn hàng đã giao
      if (order.rated) {
        // Đã đánh giá
        return (
          <Button type="default" size="small" disabled className="rated-button" onClick={(e) => e.stopPropagation()}>
            Đã đánh giá
          </Button>
        );
      } else {
        // Chưa đánh giá
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
      // Đơn hàng đã hủy
      return (
        <Tooltip title="Đơn hàng đã hủy không thể đánh giá">
          <Button type="default" size="small" disabled className="no-rating-button" onClick={(e) => e.stopPropagation()}>
            Không khả dụng
          </Button>
        </Tooltip>
      );
    } else {
      // Đơn hàng chưa giao (pending hoặc approved)
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
                {/* Bảng HTML tùy chỉnh */}
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ width: "5%" }}>STT</th>
                        <th style={{ width: "15%" }}>Mã đơn hàng</th>
                        <th style={{ width: "15%" }}>Ảnh</th>
                        <th style={{ width: "10%" }}>Số lượng SP</th>
                        <th style={{ width: "15%" }}>Trạng thái</th>
                        <th style={{ width: "15%" }}>Tổng đơn hàng</th>
                        <th style={{ width: "15%" }}>Ngày đặt</th>
                        <th style={{ width: "10%" }}>Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPaginatedData().length > 0 ? (
                        getPaginatedData().map((order, index) => {
                          // Lấy ảnh từ sản phẩm đầu tiên để hiển thị
                          const firstProduct = order.products && order.products.length > 0 ? order.products[0] : null;
                          const productImage = firstProduct?.product?.image || "https://placeholder.pics/svg/80x80";
                          
                          // Tính tổng số lượng sản phẩm
                          const totalProductQuantity = calculateTotalProductQuantity(order.products);
                          
                          // Xác định trạng thái đơn hàng
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
                                  <span>{order._id.substring(0, 8)}...</span>
                                </Tooltip>
                              </td>
                              <td>
                                <img src={productImage} style={{ height: 80, maxWidth: '100%', objectFit: 'cover' }} alt="Sản phẩm" />
                                {order.products.length > 1 && (
                                  <div style={{ color: '#999', fontSize: '0.9em', marginTop: '5px' }}>
                                    ...và {order.products.length - 1} sản phẩm khác
                                  </div>
                                )}
                              </td>
                              <td>
                                <strong>{totalProductQuantity}</strong> sản phẩm
                              </td>
                              <td>
                                <Tag color={statusColor}>{statusText}</Tag>
                              </td>
                              <td>
                                <Text strong type="danger">
                                  {order.orderTotal.toLocaleString("vi", {
                                    style: "currency",
                                    currency: "VND",
                                  })}
                                </Text>
                              </td>
                              <td>
                                <div>{moment(order.createdAt).format("DD/MM/YYYY")}</div>
                                <div style={{ color: "#888" }}>{moment(order.createdAt).format("HH:mm")}</div>
                              </td>
                              <td>
                                {renderRatingStatus(order)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center" }}>
                            Không có đơn hàng nào
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Phân trang */}
                {orderList.data && orderList.data.length > 0 && (
                  <Pagination
                    current={currentPage}
                    total={orderList.data.length}
                    pageSize={pageSize}
                    onChange={handlePageChange}
                  />
                )}


                {/* Modal thông tin đơn hàng */}
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
                  width={700}
                  className="order-detail-modal"
                >
                  {selectedOrder && (
                    <div className="order-modal-content">
                      <Card title="Thông tin đơn hàng" bordered={false} style={{ marginBottom: 16 }} className="order-summary-card">
                        <p><strong>Mã đơn hàng:</strong> {selectedOrder._id}</p>
                        <p><strong>Ngày đặt:</strong> {moment(selectedOrder.createdAt).format(DATE_TIME_FORMAT)}</p>
                        <p><strong>Tổng đơn hàng:</strong> {selectedOrder.orderTotal.toLocaleString("vi", {
                          style: "currency",
                          currency: "VND",
                        })}</p>
                        <p><strong>Địa chỉ:</strong> {selectedOrder.address}</p>
                        <p>
                          <strong>Trạng thái:</strong> {
                            selectedOrder.status === "rejected" ? "Đã hủy" :
                            selectedOrder.status === "approved" ? "Đang vận chuyển" :
                            selectedOrder.status === "final" ? "Đã giao hàng" : "Đợi xác nhận"
                          }
                        </p>
                        <p><strong>Hình thức thanh toán:</strong> {selectedOrder.billing === 'cod' ? 'Tiền mặt (COD)' : 'PayPal'}</p>
                        <p><strong>Tổng số lượng sản phẩm:</strong> {calculateTotalProductQuantity(selectedOrder.products)}</p>
                      </Card>
                      
                      <Card title="Chi tiết sản phẩm" bordered={false} style={{ marginBottom: 16 }} className="order-products-card">
                        <List
                          dataSource={selectedOrder.products}
                          renderItem={(item) => {
                            const price = item.price || item.product?.price || 0;
                            const quantity = item.quantity || 0;
                            const subtotal = price * quantity;
                            
                            return (
                              <List.Item className="modal-product-item">
                                <List.Item.Meta
                                  avatar={
                                    <Avatar 
                                      shape="square" 
                                      size={64} 
                                      src={item.product?.image || "https://placeholder.pics/svg/64x64"}
                                    />
                                  }
                                  title={<Text strong>{item.product?.name || "Không có tên sản phẩm"}</Text>}
                                  description={
                                    <div className="product-specs">
                                      <div><Text type="secondary">Số lượng: {quantity}</Text></div>
                                      <div className="product-color">
                                        <Text type="secondary">Màu sắc: {renderColorInfo(
                                          item.selectedColor || item.color || 
                                          (item.product?.color) || 
                                          (item.product?.details && item.product?.details.color) || 
                                          '-'
                                        )}</Text>
                                      </div>
                                      <div className="product-size">
                                        <Text type="secondary">Kích thước: </Text>{' '}
                                        {renderSizeInfo(item)}
                                      </div>
                                      <div className="product-subtotal">
                                        <Text type="secondary">Thành tiền: </Text>
                                        <Text strong type="danger">
                                          {`${price.toLocaleString("vi")} × ${quantity} = ${subtotal.toLocaleString("vi", {
                                            style: "currency",
                                            currency: "VND",
                                          })}`}
                                        </Text>
                                      </div>
                                    </div>
                                  }
                                />
                              </List.Item>
                            );
                          }}
                        />
                        <div className="order-total">
                          <span>Tổng tiền:</span>
                          <span className="total-price">
                            {selectedOrder.orderTotal.toLocaleString("vi", {
                              style: "currency",
                              currency: "VND",
                            })}
                          </span>
                        </div>
                      </Card>


                      {/* Hiển thị thông tin đánh giá nếu đã có */}
                      {selectedOrder.rated ? (
                        <Card title="Đánh giá của bạn" bordered={false} className="rating-display-card">
                          {/* Hiển thị đánh giá cho từng sản phẩm */}
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
                          {/* Hiển thị thông báo nếu chưa có sản phẩm nào được đánh giá */}
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
                
                {/* Modal đánh giá sản phẩm trong đơn hàng - Đã được thay đổi theo yêu cầu */}
                <Modal
                  title="Đánh giá sản phẩm trong đơn hàng"
                  visible={isRatingModalVisible}
                  onOk={handleRatingSubmit}
                  onCancel={handleRatingModalClose}
                  okText="Gửi đánh giá"
                  cancelText="Hủy"
                  width={600}
                  className="rating-modal"
                >
                  {productRatings.map((item, index) => (
                    <div key={item.productId} style={{ marginBottom: 24 }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                        <Avatar 
                          shape="square" 
                          size={64} 
                          src={item.productImage || "https://placeholder.pics/svg/64x64"}
                          style={{ marginRight: 12 }}
                        />
                        <div>
                          <p><strong>{item.productName}</strong></p>
                          <Rate
                            value={item.rating}
                            onChange={(value) => handleRatingChange(value, index)}
                          />
                        </div>
                      </div>
                      <TextArea
                        rows={3}
                        value={item.comment}
                        onChange={(e) => handleCommentChange(e, index)}
                        placeholder="Nhận xét sản phẩm"
                        style={{ marginTop: 8 }}
                      />
                      <Divider style={{ margin: '16px 0' }} />
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