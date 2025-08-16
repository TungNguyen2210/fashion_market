import React, { useState, useEffect, useRef } from "react";
import styles from "./pay.css";
import axiosClient from "../../../apis/axiosClient";
import { useParams } from "react-router-dom";
import eventApi from "../../../apis/eventApi";
import userApi from "../../../apis/userApi";
import productApi from "../../../apis/productApi";
import { useHistory } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
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
  EnvironmentOutlined
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
  const [orderTotal, setOrderTotal] = useState([]);
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
  const [selectedLL, setSelectedLL] = useState(null); // {lat, lng}

  const debounceRef = useRef(null);

  // Nominatim search: địa chỉ -> lat/lon
  async function geocodeAddress(q) {
    if (!q || q.trim().length < 3) return;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&countrycodes=vn&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'vi' } });
      const list = await res.json();

      if (Array.isArray(list) && list.length > 0) {
        const first = list[0];
        const lat = Number(first.lat);
        const lng = Number(first.lon); // Nominatim trả "lon", ta đổi sang "lng"

        // Cập nhật form + state để map hiển thị
        form.setFieldsValue({ address: first.display_name, lat, lng });
        setAddrQuery(first.display_name);
        setSelectedLL({ lat, lng });
      }
    } catch (e) {
      console.error(e);
    }
  }

  // onChange của Input: debounce để tránh gọi API liên tục
  const onAddressChange = (e) => {
    const v = e.target.value;
    setAddrQuery(v);
    form.setFieldsValue({ address: v, lat: undefined, lng: undefined }); // gõ lại => reset lat/lng

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
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;

        // Reverse geocode to address string
        const addr = await reverseGeocode(lat, lng);

        // Update map + form + input
        setSelectedLL({ lat, lng });
        form.setFieldsValue({ lat, lng, address: addr || form.getFieldValue('address') });
        setAddrQuery(addr || form.getFieldValue('address'));

        setAddrLoading(false);
      },
      (err) => {
        setAddrLoading(false);
        notification.error({ message: 'Không lấy được vị trí hiện tại', description: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Toạ độ kho/shop của bạn
  const STORE_COORD = { lat: 10.870319219700491, lng: 106.79061359058457 }; // ptit

  // State hiển thị
  const [distKm, setDistKm] = useState(null);
  const [shipFee, setShipFee] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0); // tổng cuối cùng (hàng + ship)

  const getDrivingDistanceKm = async (from, to) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('osrm fail');
      const j = await res.json();
      const meters = j?.routes?.[0]?.distance;
      if (!meters && meters !== 0) throw new Error('no distance');
      return meters / 1000; // km
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
      setShipFee(0);
      const lat = form.getFieldValue('lat');
      const lng = form.getFieldValue('lng');
      if (!lat || !lng) { setGrandTotal(orderTotal || 0); return; }

      const to = { lat: Number(lat), lng: Number(lng) };
      // 1) thử OSRM
      let km = await getDrivingDistanceKm(STORE_COORD, to);
      // 2) fallback Haversine
      if (km == null) km = haversineKm(STORE_COORD, to);

      const fee = calcShipFee(km);
      setDistKm(km);
      setShipFee(fee);
      setGrandTotal((orderTotal || 0) + fee);
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latWatch, lngWatch, orderTotal]);

  const hideModal = () => {
    setVisible(false);
  };

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
          products: productDetail,
          orderTotal: orderTotal,
          subtotal,               // tiền hàng
          shippingFee,            // phí ship
          distanceKm,             // km ước tính
          orderTotal: total,      // tổng cuối cùng (subtotal + ship)
          shipping: {             // block vận chuyển
            address: values.address,
            lat,
            lng
          }
        };

        console.log(formatData);
        await axiosClient.post("/order", formatData).then((response) => {
          console.log(response);
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
            history.push("/final-pay");
            localStorage.removeItem("cart");
            localStorage.removeItem("cartLength");
          }
        });
      } catch (error) {
        throw error;
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
      // const token = queryParams.get('token');
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

        const formatData = {
          userId: currentUser.user._id,
          address: address,
          billing: "paypal",
          description: description,
          status: "pending",
          products: productDetail,
          orderTotal: orderTotal,
        };

        console.log(formatData);
        await axiosClient.post("/order", formatData).then((response) => {
          console.log(response);
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
      // Xử lý lỗi
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
        console.log(response);
        form.setFieldsValue({
          name: response.user.username,
          email: response.user.email,
          phone: response.user.phone,
        });
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        console.log(cart);

        const transformedData = cart.map(
          ({ _id: product, quantity, promotion, price }) => ({ product, quantity, promotion, price })
        );
        let totalPrice = 0;

        for (let i = 0; i < transformedData.length; i++) {
          let product = transformedData[i];
          console.log(product);
          let price = product.promotion * product.quantity;
          totalPrice += price;
        }

        const phanTramKhuyenMai = localStorage.getItem("phanTramKhuyenMai");
        const discount = (totalPrice * phanTramKhuyenMai) / 100;

        console.log(totalPrice - discount)
        setOrderTotal(totalPrice - discount);
        setProductDetail(transformedData);
        console.log(transformedData);
        setUserData(response.user);
        setLoading(false);
      } catch (error) {
        console.log("Failed to fetch event detail:" + error);
      }
    })();
    window.scrollTo(0, 0);
  }, []);

  return (
    <div class="py-5">
      <Spin spinning={false}>
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
                    {/* LEFT COLUMN */}
                    <Col xs={24} lg={16} >
                      {/* Customer Information */}
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

                        {/* Map preview */}
                        <div style={{ marginTop: 8 }}>
                          <div style={{ marginBottom: 6, fontWeight: 500 }}>Location Preview</div>

                          {(() => {
                            const lat = selectedLL?.lat ?? form.getFieldValue('lat');
                            const lng = selectedLL?.lng ?? form.getFieldValue('lng');
                            const hasLL = !!lat && !!lng;

                            // bbox nhỏ quanh marker để map focus
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
                                        inset: 0,           // top:0,right:0,bottom:0,left:0
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

                                {/* Link mở to bản đồ OSM (đặt dưới khung, không chèn vào trong để khỏi che map) */}
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

                          {/* Estimated distance */}
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
                        {/* hidden để lưu lat/lng nếu bạn đang dùng */}
                        <Form.Item name="lat" hidden><Input /></Form.Item>
                        <Form.Item name="lng" hidden><Input /></Form.Item>
                      </Card>
                    </Col>

                    {/* RIGHT COLUMN */}
                    <Col xs={24} lg={8}>
                      <Card bordered style={{ marginBottom: 16 }} title={<span style={{ fontWeight: 600 }}>Thông tin đơn hàng</span>}>
                        {/* danh sách sản phẩm */}
                        <div style={{ marginBottom: 12, padding: '0 10px' }}>
                          {Array.isArray(productDetail) && productDetail.length > 0 ? (
                            productDetail.map((p, i) => (
                              <div key={i}
                                style={{
                                  display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0',
                                  borderBottom: '1px dashed rgba(255,255,255,0.08)'
                                }}>
                                <div>
                                  <div style={{ fontWeight: 500 }}>{p.product?.name || 'Sản phẩm'}</div>
                                  <div style={{ fontSize: 12, color: '#999' }}>Số lượng: {p.quantity}</div>
                                </div>
                                <div>{(p.promotion || p.price || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</div>
                              </div>
                            ))
                          ) : (
                            <div style={{ color: '#999' }}>No items</div>
                          )}
                        </div>

                        {/* tiền */}
                        <div style={{ display: 'grid', gap: 6, padding: '0 10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tạm tính</span>
                            <span>{(orderTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                            <span>Tiền vận chuyển{distKm != null ? `(${distKm.toFixed(2)} km)` : ''}</span>
                            <span>{(shipFee || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                          </div>
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                            <span>Tổng tiền</span>
                            <span>{(grandTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                          </div>
                        </div>

                        {/* phương thức thanh toán */}
                        <div style={{ marginTop: 16 }}>
                          <div style={{ marginBottom: 8, fontWeight: 600 }}>Chọn phương thức thanh toán</div>
                          <Form.Item name="billing" rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán!' }]} style={{ marginBottom: 0, padding: '0 10px' }}>
                            <Radio.Group style={{ display: 'grid', gap: 8 }}>
                              <Radio value="cod">COD</Radio>
                              <Radio value="paypal">PayPal</Radio>
                            </Radio.Group>
                          </Form.Item>
                        </div>

                        {/* nút submit */}
                        <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                          <Button htmlType="submit" block style={{ height: 40, fontWeight: 600 }}>
                            Thanh toán
                          </Button>
                        </Form.Item>

                        <div style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
                          Your payment information is secure
                        </div>
                      </Card>
                    </Col>
                  </Row>
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
