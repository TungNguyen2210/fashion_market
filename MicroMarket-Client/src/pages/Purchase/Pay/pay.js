import React, { useState, useEffect } from "react";
import styles from "./pay.css";
import axiosClient from "../../../apis/axiosClient";
import { useParams } from "react-router-dom";
import eventApi from "../../../apis/eventApi";
import userApi from "../../../apis/userApi";
import productApi from "../../../apis/productApi";
import { useHistory } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Col, Row, Tag, Spin, Card } from "antd";
import { DateTime } from "../../../utils/dateTime";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
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
  message,
  Radio,
} from "antd";
import {
  HistoryOutlined,
  AuditOutlined,
  CloseOutlined,
  UserOutlined,
  MehOutlined,
  TeamOutlined,
  HomeOutlined,
  LeftSquareOutlined,
} from "@ant-design/icons";

import Slider from "react-slick";

const { Meta } = Card;
const { Option } = Select;

const { Title } = Typography;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { TextArea } = Input;

const Pay = () => {
  const [productDetail, setProductDetail] = useState([]);
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderTotal, setOrderTotal] = useState(0);
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

  const hideModal = () => {
    setVisible(false);
  };

  // Cập nhật hàm này để xử lý thông tin size và color
  const accountCreate = async (values) => {
    if (values.billing === "paypal") {
      localStorage.setItem("description", values.description);
      localStorage.setItem("address", values.address);
      try {
        const approvalUrl = await handlePayment(values);
        console.log(approvalUrl);
        if (approvalUrl) {
          window.location.href = approvalUrl; // Chuyển hướng đến URL thanh toán PayPal
        } else {
          notification["error"]({
            message: `Thông báo`,
            description: "Thanh toán thất bại",
          });
        }
      } catch (error) {
        console.error("Error:", error);
        notification["error"]({
          message: `Thông báo`,
          description: "Thanh toán thất bại",
        });
      }
    } else {
      try {
        // Xử lý và chuẩn bị dữ liệu sản phẩm với đầy đủ thông tin
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const processedProducts = cart.map(item => {
          // Lấy thông tin sản phẩm từ cart
          return {
            product: item._id,
            quantity: item.quantity,
            price: item.promotion || item.price,
            // Thêm thông tin size và color
            size: item.selectedSize || item.size || item.productSize || 
                (item.details && item.details.size) || 
                (item.options && item.options.size) || null,
            color: item.selectedColor || item.color || null,
            variantId: item.variantId || 
                    `${item._id}-${item.selectedSize || item.size || ''}-${(item.selectedColor || item.color || '').replace('#', '')}`
          };
        });

        const formatData = {
          userId: userData._id,
          address: values.address,
          billing: values.billing,
          description: values.description,
          status: "pending",
          products: processedProducts, // Sử dụng dữ liệu đã xử lý
          orderTotal: orderTotal,
        };

        console.log("Dữ liệu đơn hàng:", formatData);
        await axiosClient.post("/order", formatData).then((response) => {
          console.log("Kết quả từ API:", response);
          if (response.error === "Insufficient quantity for one or more products.") {
            return notification["error"]({
              message: `Thông báo`,
              description: "Sản phẩm đã hết hàng!",
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
            
            // Lưu thông tin đơn hàng thành công vào localStorage cho trang thành công
            localStorage.setItem('orderComplete', JSON.stringify({
              orderId: response._id,
              orderDate: new Date().toISOString(),
              totalAmount: orderTotal
            }));
            
            history.push("/final-pay");
            localStorage.removeItem("cart");
            localStorage.removeItem("cartLength");
          }
        });
      } catch (error) {
        console.error("Lỗi khi đặt hàng:", error);
        notification["error"]({
          message: `Thông báo`,
          description: "Đặt hàng thất bại, vui lòng thử lại sau.",
        });
      }
      setTimeout(function () {
        setLoading(false);
      }, 1000);
    }
  };

  const handlePayment = async (values) => {
    try {
      const productPayment = {
        price: "800",
        description: values.bookingDetails,
        return_url: "http://localhost:3500" + location.pathname,
        cancel_url: "http://localhost:3500" + location.pathname,
      };
      const response = await axiosClient.post("/payment/pay", productPayment);
      if (response.approvalUrl) {
        localStorage.setItem("session_paypal", response.accessToken);
        return response.approvalUrl; // Trả về URL thanh toán
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

  const handleModalConfirm = async () => {
    try {
      const queryParams = new URLSearchParams(window.location.search);
      const paymentId = queryParams.get("paymentId");
      const PayerID = queryParams.get("PayerID");
      const token = localStorage.getItem("session_paypal");
      const description = localStorage.getItem("description");
      const address = localStorage.getItem("address");

      // Gọi API executePayment để thực hiện thanh toán
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

        // Xử lý dữ liệu sản phẩm với đầy đủ thông tin
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        const processedProducts = cart.map(item => {
          return {
            product: item._id,
            quantity: item.quantity,
            price: item.promotion || item.price,
            // Thêm thông tin size và color
            size: item.selectedSize || item.size || item.productSize || 
                  (item.details && item.details.size) || 
                  (item.options && item.options.size) || null,
            color: item.selectedColor || item.color || null,
            variantId: item.variantId || 
                    `${item._id}-${item.selectedSize || item.size || ''}-${(item.selectedColor || item.color || '').replace('#', '')}`
          };
        });

        const formatData = {
          userId: currentUser.user._id,
          address: address,
          billing: "paypal",
          description: description,
          status: "pending",
          products: processedProducts, // Sử dụng dữ liệu đã xử lý
          orderTotal: orderTotal,
        };

        console.log("Dữ liệu đơn hàng PayPal:", formatData);
        await axiosClient.post("/order", formatData).then((response) => {
          console.log("Kết quả từ API:", response);
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
            localStorage.removeItem("phanTramKhuyenMai");
          }
        });
        notification["success"]({
          message: `Thông báo`,
          description: "Thanh toán thành công",
        });

        setShowModal(false);
      } else {
        notification["error"]({
          message: `Thông báo`,
          description: "Thanh toán thất bại",
        });
      }

      setShowModal(false);
    } catch (error) {
      console.error("Error executing payment:", error);
      notification["error"]({
        message: `Thông báo`,
        description: "Thanh toán thất bại",
      });
    }
  };

  const CancelPay = () => {
    form.resetFields();
    history.push("/cart");
  };

  useEffect(() => {
    (async () => {
      try {
        if (paymentId) {
          setShowModal(true);
        }

        await productApi.getDetailProduct(id).then((item) => {
          setProductDetail(item);
        });
        const response = await userApi.getProfile();
        localStorage.setItem("user", JSON.stringify(response));
        console.log("User profile:", response);
        
        form.setFieldsValue({
          name: response.user.username,
          email: response.user.email,
          phone: response.user.phone,
        });
        
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        console.log("Cart data:", cart);
        
        // Đảm bảo thông tin size và color được lấy chính xác
        const enhancedCart = cart.map(item => {
          return {
            ...item,
            size: item.selectedSize || item.size || item.productSize || 
                  (item.details && item.details.size) || 
                  (item.options && item.options.size) || null,
            color: item.selectedColor || item.color || null,
            variantId: item.variantId || 
                    `${item._id}-${item.selectedSize || item.size || ''}-${(item.selectedColor || item.color || '').replace('#', '')}`
          };
        });
        
        // Lưu lại giỏ hàng đã cập nhật
        localStorage.setItem("cart", JSON.stringify(enhancedCart));

        const transformedData = enhancedCart.map(
          ({ _id: product, quantity, promotion, price, size, color, variantId }) => 
          ({ product, quantity, promotion, price, size, color, variantId })
        );
        
        let totalPrice = 0;

        for (let i = 0; i < transformedData.length; i++) {
          let product = transformedData[i];
          console.log("Processing product:", product);
          let price = product.promotion * product.quantity;
          totalPrice += price;
        }

        const phanTramKhuyenMai = localStorage.getItem("phanTramKhuyenMai");
        const discount = phanTramKhuyenMai ? (totalPrice * phanTramKhuyenMai) / 100 : 0;

        console.log("Total price after discount:", totalPrice - discount);
        setOrderTotal(totalPrice - discount);
        setProductDetail(transformedData);
        setUserData(response.user);
        setLoading(false);
        
        console.log("Processed products for order:", transformedData);
      } catch (error) {
        console.log("Failed to fetch event detail:" + error);
        setLoading(false);
      }
    })();
    window.scrollTo(0, 0);
  }, []);

  // Tạo bảng sản phẩm đặt hàng
  const renderOrderTable = () => {
    if (!productDetail || productDetail.length === 0) {
      return <p>Không có sản phẩm trong giỏ hàng</p>;
    }

    return (
      <div className="order-table">
        <h3>Thông tin sản phẩm</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Sản phẩm</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Kích thước</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Màu sắc</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Số lượng</th>
              <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #ddd' }}>Giá</th>
            </tr>
          </thead>
          <tbody>
            {productDetail.map((item, index) => (
              <tr key={index}>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>Sản phẩm #{index + 1}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {item.size ? <Tag color="blue">{item.size}</Tag> : '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {item.color ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        backgroundColor: item.color,
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        marginRight: '8px',
                        border: '1px solid #ddd'
                      }}></div>
                      <span>{item.color}</span>
                    </div>
                  ) : '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{item.quantity}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {((item.promotion || item.price) * item.quantity).toLocaleString('vi')} VND
                </td>
              </tr>
            ))}
            <tr style={{ backgroundColor: '#f9f9f9' }}>
              <td colSpan="4" style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'right', fontWeight: 'bold' }}>
                Tổng cộng:
              </td>
              <td style={{ padding: '10px', border: '1px solid #ddd', fontWeight: 'bold' }}>
                {orderTotal.toLocaleString('vi')} VND
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

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

              {renderOrderTable()}

              <div className="information_pay">
                <Form
                  form={form}
                  onFinish={accountCreate}
                  name="eventCreate"
                  layout="vertical"
                  initialValues={{
                    residence: ["zhejiang", "hangzhou", "xihu"],
                    prefix: "86",
                  }}
                  scrollToFirstError
                >
                  <Form.Item
                    name="name"
                    label="Tên"
                    hasFeedback
                    style={{ marginBottom: 10 }}
                  >
                    <Input disabled placeholder="Tên" />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label="Email"
                    hasFeedback
                    style={{ marginBottom: 10 }}
                  >
                    <Input disabled placeholder="Email" />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label="Số điện thoại"
                    hasFeedback
                    style={{ marginBottom: 10 }}
                  >
                    <Input disabled placeholder="Số điện thoại" />
                  </Form.Item>

                  <Form.Item
                    name="address"
                    label="Địa chỉ"
                    hasFeedback
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng nhập địa chỉ",
                      },
                    ]}
                    style={{ marginBottom: 15 }}
                  >
                    <Input placeholder="Địa chỉ" />
                  </Form.Item>

                  <Form.Item
                    name="description"
                    label="Lưu ý cho đơn hàng"
                    hasFeedback
                    style={{ marginBottom: 15 }}
                  >
                    <Input.TextArea rows={4} placeholder="Lưu ý" />
                  </Form.Item>

                  <Form.Item
                    name="billing"
                    label="Phương thức thanh toán"
                    hasFeedback
                    rules={[
                      {
                        required: true,
                        message: "Vui lòng chọn phương thức thanh toán!",
                      },
                    ]}
                    style={{ marginBottom: 10 }}
                  >
                    <Radio.Group>
                      <Radio value={"cod"}>COD</Radio>
                      <Radio value={"paypal"}>PAYPAL</Radio>
                    </Radio.Group>
                  </Form.Item>

                  <Form.Item>
                    <Button
                      style={{
                        background: "#FF8000",
                        color: "#FFFFFF",
                        float: "right",
                        marginTop: 20,
                        marginLeft: 8,
                      }}
                      htmlType="submit"
                    >
                      Hoàn thành
                    </Button>
                    <Button
                      style={{
                        background: "#FF8000",
                        color: "#FFFFFF",
                        float: "right",
                        marginTop: 20,
                      }}
                      onClick={CancelPay}
                    >
                      Trở về
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            </div>
          </div>
        </Card>
        <Modal
          visible={showModal}
          onOk={handleModalConfirm}
          onCancel={() => setShowModal(false)}
        >
          <p>Bạn có chắc chắn muốn xác nhận thanh toán?</p>
        </Modal>
      </Spin>
    </div>
  );
};

export default Pay;