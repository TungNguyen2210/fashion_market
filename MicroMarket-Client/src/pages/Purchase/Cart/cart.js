import {
  CreditCardOutlined,
  LeftSquareOutlined
} from "@ant-design/icons";
import {
  Breadcrumb, Button, Card, Col, Divider, Form,
  InputNumber, Layout, Row,
  Spin, Statistic, Input, Tag
} from "antd";
import React, { useEffect, useState, useCallback } from "react";
import { useHistory, useParams } from "react-router-dom";
import axiosClient from "../../../apis/axiosClient";
import eventApi from "../../../apis/eventApi";
import "./cart.css";
import promotionManagementApi from "../../../apis/promotionManagementApi";

const { Content } = Layout;

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
  const [cartTotal, setCartTotal] = useState(0);
  const [form] = Form.useForm();
  let { id } = useParams();
  const history = useHistory();
  const [category, setCategory] = useState([]);
  const [phanTramKhuyenMai, setPhanTramKhuyenMai] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(false);

  const handlePay = () => {
    history.push("/pay");
  };

  const deleteCart = () => {
    localStorage.removeItem("cart");
    localStorage.removeItem("cartLength");
    window.location.reload();
  };

  const updateQuantity = useCallback((productId, cartItemId, newQuantity) => {
    setProductDetail(prevDetail => {
      const updatedCart = prevDetail.map((item) => {
        // Sử dụng cartItemId để xác định chính xác sản phẩm cần cập nhật
        if (item.cartItemId === cartItemId) {
          return {
            ...item,
            quantity: newQuantity,
            total: item.promotion * newQuantity
          };
        }
        return item;
      });
      
      const total = updatedCart.reduce(
        (acc, item) => acc + item.quantity * item.promotion,
        0
      );
      
      setCartTotal(total);
      localStorage.setItem("cart", JSON.stringify(updatedCart));
      return updatedCart;
    });
  }, []);

  const handleDelete = useCallback((cartItemId) => {
    const updatedCart = JSON.parse(localStorage.getItem("cart")) || [];
    // Lọc dựa trên cartItemId để xóa chính xác sản phẩm
    const filteredCart = updatedCart.filter(
      (product) => product.cartItemId !== cartItemId
    );
    
    localStorage.setItem("cart", JSON.stringify(filteredCart));
    setCartLength(filteredCart.length);
    localStorage.setItem("cartLength", filteredCart.length.toString());
    setProductDetail(filteredCart);
    
    const total = filteredCart.reduce(
      (acc, item) => acc + item.quantity * item.promotion,
      0
    );
    setCartTotal(total);
  }, []);

  const handleCart = useCallback(async () => {
    try {
      const res = await promotionManagementApi.listPromotionManagement();
      setCategory(res.data);
      
      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      
      // Thêm cartItemId cho mỗi sản phẩm nếu chưa có
      const cartWithIds = cart.map((item, index) => {
        if (!item.cartItemId) {
          // Tạo ID duy nhất dựa trên sản phẩm và thuộc tính của nó
          const uniqueId = `${item._id}-${item.selectedColor || item.color || ''}-${item.selectedSize || item.size || item.productSize || ''}-${index}`;
          return {
            ...item,
            cartItemId: uniqueId
          };
        }
        return item;
      });
      
      // Lưu lại giỏ hàng với ID
      localStorage.setItem("cart", JSON.stringify(cartWithIds));
      
      setProductDetail(cartWithIds);
      const cartLength = cartWithIds.length;
      localStorage.setItem("cartLength", cartLength.toString());
      setCartLength(cartLength);
      
      const total = cartWithIds.reduce(
        (acc, item) => acc + item.quantity * item.promotion,
        0
      );
      setCartTotal(total);
      setLoading(false);
    } catch (error) {
      console.log("Failed to fetch event detail:" + error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    handleCart();
    window.scrollTo(0, 0);
    
    return () => {
      // Cleanup nếu cần
    };
  }, [handleCart]);

  const handleInputChange = useCallback((e) => {
    const { value } = e.target;
    const foundCategory = category.find((item) => item.maKhuyenMai === value);
    
    if (foundCategory && !appliedDiscount) {
      localStorage.setItem("phanTramKhuyenMai", foundCategory.phanTramKhuyenMai);
      setPhanTramKhuyenMai(foundCategory.phanTramKhuyenMai);
      const discount = (cartTotal * foundCategory.phanTramKhuyenMai) / 100;
      setCartTotal(cartTotal - discount);
      setAppliedDiscount(true);
    } else if (!foundCategory && appliedDiscount) {
      handleCart();
      setPhanTramKhuyenMai("");
      setAppliedDiscount(false);
    }
  }, [category, cartTotal, appliedDiscount, handleCart]);

  return (
    <div>
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
                  <Row>
                    <Col span={12}>
                      <h4>
                        <strong>{cartLength}</strong> Sản Phẩm
                      </h4>
                    </Col>
                    <Col span={12}>
                      <Button type="default" danger style={{ float: "right" }}>
                        <span onClick={() => deleteCart()}>Xóa tất cả</span>
                      </Button>
                    </Col>
                  </Row>
                  <br></br>
                  
                  {/* Bảng HTML tùy chỉnh thay vì Ant Design Table */}
                  <div className="custom-table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th style={{ width: "5%" }}>ID</th>
                          <th style={{ width: "10%" }}>Ảnh</th>
                          <th style={{ width: "20%" }}>Tên</th>
                          <th style={{ width: "10%" }}>Màu sắc</th>
                          <th style={{ width: "10%" }}>Kích thước</th>
                          <th>Giá</th>
                          <th>Số lượng</th>
                          <th>Thành tiền</th>
                          <th>Hành động</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productDetail.length > 0 ? (
                          productDetail.map((item, index) => (
                            <tr key={item.cartItemId || `cart-item-${index}`}>
                              <td>{index + 1}</td>
                              <td>
                                <img src={item.image} style={{ height: 80 }} alt="Sản phẩm" />
                              </td>
                              <td>{item.name}</td>
                              <td>
                                {(item.selectedColor || item.color) && (item.selectedColor || item.color) !== '-' ? (
                                  <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div
                                      className="color-dot"
                                      style={{
                                        backgroundColor: item.selectedColor || item.color,
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        marginRight: '8px',
                                        border: '1px solid #ddd'
                                      }}
                                    />
                                    <span>{item.selectedColor || item.color}</span>
                                  </div>
                                ) : (
                                  <span>-</span>
                                )}
                              </td>
                              <td>
                                {item.selectedSize || item.size || item.productSize ||
                                (item.details && item.details.size) ||
                                (item.options && item.options.size) ? (
                                  <Tag color="blue">
                                    {item.selectedSize || item.size || item.productSize ||
                                    (item.details && item.details.size) ||
                                    (item.options && item.options.size)}
                                  </Tag>
                                ) : (
                                  <span>-</span>
                                )}
                              </td>
                              <td>
                                {item.promotion.toLocaleString("vi", {
                                  style: "currency",
                                  currency: "VND"
                                })}
                              </td>
                              <td>
                                <InputNumber
                                  min={1}
                                  max={item.variantQuantity || 9999}
                                  defaultValue={item.quantity}
                                  onChange={(value) => updateQuantity(item._id, item.cartItemId, value)}
                                />
                              </td>
                              <td>
                                {(item.promotion * item.quantity).toLocaleString("vi", {
                                  style: "currency",
                                  currency: "VND"
                                })}
                              </td>
                              <td>
                                <Button 
                                  type="danger" 
                                  onClick={() => handleDelete(item.cartItemId)}
                                >
                                  Xóa
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" style={{ textAlign: "center" }}>
                              Giỏ hàng trống
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  <br></br>
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
                  <Input
                    type="text"
                    placeholder="Nhập mã khuyến mãi"
                    onChange={handleInputChange}
                    style={{width: 300, marginBottom: 10}}
                  />
                  {phanTramKhuyenMai && (
                    <p style={{ color: 'green', marginTop: 5 }}>
                      Mã khuyến mãi: <b>{phanTramKhuyenMai}%</b> đã được áp dụng
                    </p>
                  )}
                  <Divider orientation="right">
                    <p>Thanh toán</p>
                  </Divider>
                  <Row justify="end">
                    <Col>
                      <h6>Tổng {cartLength} sản phẩm</h6>
                      <Statistic
                        title="Tổng tiền (đã bao gồm VAT)."
                        value={`${Math.round(cartTotal || 0).toFixed(0)}`}
                        precision={0}
                        suffix="VND"
                        style={{ fontWeight: 'bold' }}
                      />
                      <Button
                        style={{ marginTop: 16 }}
                        type="primary"
                        onClick={() => handlePay()}
                        disabled={!productDetail || productDetail.length === 0}
                      >
                        Thanh toán ngay{" "}
                        <CreditCardOutlined style={{ fontSize: "20px" }} />
                      </Button>
                    </Col>
                  </Row>
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