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
  const [phanTramKhuyenMai, setPhanTramKhuyenMai] = useState(0);
  const [pendingFormValues, setPendingFormValues] = useState(null);

  const debounceRef = useRef(null);

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
      setShipFee(0);
      const lat = form.getFieldValue('lat');
      const lng = form.getFieldValue('lng');
      if (!lat || !lng) { 
        setGrandTotal(orderTotal || 0); 
        return; 
      }

      const to = { lat: Number(lat), lng: Number(lng) };
      
      let km = await getDrivingDistanceKm(STORE_COORD, to);
      
      if (km == null) km = haversineKm(STORE_COORD, to);

      const fee = calcShipFee(km);
      setDistKm(km);
      setShipFee(fee);
      setGrandTotal((orderTotal || 0) + fee);
    };
    run();
  
  }, [latWatch, lngWatch, orderTotal]);

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

  const confirmOrder = async (values) => {
  // Kiểm tra nếu đây là PayPal callback, không xử lý ở đây
  const urlParams = new URLSearchParams(window.location.search);
  const isPayPalCallback = urlParams.get("paymentId") && urlParams.get("PayerID");
  
  if (isPayPalCallback) {
    console.log("Detected PayPal callback, skipping confirmOrder");
    return;
  }

  console.log("ConfirmOrder called with values:", values);

  if (values.billing === "paypal") {
    // Lưu thông tin form trước khi chuyển đến PayPal
    localStorage.setItem("description", values.description || "");
    localStorage.setItem("address", values.address || "");
    
    console.log("Saving to localStorage:", {
      description: values.description,
      address: values.address
    });
    
    try {
      const usdToVndRate = await fetchUsdVndRate();
      console.log("USD to VND rate:", usdToVndRate);

      const cart = JSON.parse(localStorage.getItem("cart")) || [];
      const processedProducts = cart.map(item => {
        const priceVND = item.promotion || item.price;
        const priceUSD = (priceVND / usdToVndRate).toFixed(2);
        return {
          product: item._id,
          quantity: item.quantity,
          price: priceUSD,
          promotion: item.promotion,
          size: item.selectedSize || item.size || item.productSize || null,
          color: item.selectedColor || item.color || null,
          variantId: item.variantId || `${item._id}-${item.selectedSize || item.size || ''}-${(item.selectedColor || item.color || '').replace('#', '')}`
        };
      });

      const totalUSD = processedProducts.reduce(
        (sum, p) => sum + (p.price * p.quantity), 0
      ).toFixed(2);

      console.log("Processed products for PayPal:", processedProducts);
      console.log("Total USD:", totalUSD);

      const approvalUrl = await handlePayment(values, totalUSD);
      if (approvalUrl) {
        console.log("Redirecting to PayPal:", approvalUrl);
        // Chuyển hướng đến PayPal
        window.location.href = approvalUrl;
      } else {
        notification["error"]({
          message: `Thông báo`,
          description: "Thanh toán thất bại",
        });
      }
    } catch (error) {
      console.error("Lỗi PayPal:", error);
      notification["error"]({
        message: `Thông báo`,
        description: "Thanh toán thất bại",
      });
    }
  } else {
    // Xử lý COD
    console.log("Processing COD order");
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
          promotion: item.promotion,
          price: item.price,
          size: item.selectedSize || item.size || item.productSize || null,
          color: item.selectedColor || item.color || null,
          variantId: item.variantId || null
        })),
        subtotal: originalTotal,
        discount: discountAmount,
        discountRate: phanTramKhuyenMai,
        afterDiscount: subtotal,
        shippingFee,
        distanceKm,
        orderTotal: total,
        shipping: {
          address: values.address,
          lat,
          lng
        }
      };

      console.log("Dữ liệu đơn hàng COD gửi đi:", formatData);

      await axiosClient.post("/order", formatData).then((response) => {
        console.log("Phản hồi từ server:", response);

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
          localStorage.removeItem("phanTramKhuyenMai");
        }
      });
    } catch (error) {
      console.error("Lỗi đặt hàng COD:", error);
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
      // Lấy payment parameters từ URL
      const queryParams = new URLSearchParams(window.location.search);
      const paymentId = queryParams.get("paymentId");
      const PayerID = queryParams.get("PayerID");
      
      console.log("Modal confirm - PaymentId:", paymentId, "PayerID:", PayerID);
      console.log("Modal confirm - PendingFormValues:", pendingFormValues);
      
      if (paymentId && PayerID) {
        // Đây là xử lý PayPal callback
        const token = localStorage.getItem("session_paypal");
        const description = localStorage.getItem("description");
        const address = localStorage.getItem("address");

        console.log("Processing PayPal payment:", { paymentId, PayerID, token, description, address });

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

        console.log("PayPal execute response:", response);

        if (response) {
          const local = localStorage.getItem("user");
          const currentUser = JSON.parse(local);

          const cart = JSON.parse(localStorage.getItem("cart")) || [];
          const processedProducts = cart.map(item => {
            return {
              product: item._id,
              quantity: item.quantity,
              price: item.promotion || item.price,
              promotion: item.promotion,
              size: item.selectedSize || item.size || item.productSize || null,
              color: item.selectedColor || item.color || null,
              variantId: item.variantId || `${item._id}-${item.selectedSize || item.size || ''}-${(item.selectedColor || item.color || '').replace('#', '')}`
            };
          });

          const formatData = {
            userId: currentUser.user._id,
            address: address,
            billing: "paypal",
            description: description,
            status: "pending",
            products: processedProducts,
            subtotal: originalTotal,
            discount: discountAmount,
            discountRate: phanTramKhuyenMai,
            afterDiscount: orderTotal,
            orderTotal: orderTotal,
          };

          console.log("Dữ liệu đơn hàng PayPal:", formatData);
          
          const orderResponse = await axiosClient.post("/order", formatData);
          console.log("Kết quả từ API:", orderResponse);
          
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

          // Thành công
          notification["success"]({
            message: `Thông báo`,
            description: "Thanh toán và đặt hàng thành công",
          });
          
          // Cleanup localStorage
          localStorage.removeItem("cart");
          localStorage.removeItem("cartLength");
          localStorage.removeItem("phanTramKhuyenMai");
          localStorage.removeItem("session_paypal");
          localStorage.removeItem("description");
          localStorage.removeItem("address");
          
          // Reset form và chuyển trang
          form.resetFields();
          history.push("/final-pay");
          
        } else {
          notification["error"]({
            message: `Thông báo`,
            description: "Thanh toán thất bại",
          });
        }
      } else if (pendingFormValues) {
        // Xử lý submit form thông thường (COD hoặc PayPal mới)
        console.log("Processing normal form submission:", pendingFormValues);
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
      console.error("Lỗi khi thực hiện thanh toán:", error);
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
        // Kiểm tra nếu đây là callback từ PayPal
        const urlParams = new URLSearchParams(window.location.search);
        const paymentId = urlParams.get("paymentId");
        const PayerID = urlParams.get("PayerID");
        
        if (paymentId && PayerID) {
          // Đây là callback từ PayPal, hiển thị modal xác nhận
          setShowModal(true);
          
          // Restore form data từ localStorage
          const savedDescription = localStorage.getItem("description");
          const savedAddress = localStorage.getItem("address");
          
          console.log("PayPal callback detected:", { paymentId, PayerID });
          console.log("Restored data:", { savedDescription, savedAddress });
        }

        await productApi.getDetailProduct(id).then((item) => {
          setProductDetail(item);
        });
        const response = await userApi.getProfile();
        localStorage.setItem("user", JSON.stringify(response));
        console.log(response);
        
        // Set form fields với thông tin user
        const formData = {
          name: response.user.username,
          email: response.user.email,
          phone: response.user.phone,
        };
        
        // Nếu là PayPal callback, thêm thông tin đã lưu
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
        console.log("Giỏ hàng:", cart);

        const transformedData = cart.map(item => {
          console.log("Item from cart:", item);
          return {
            product: item._id,
            productName: item.name || null,
            quantity: item.quantity,
            promotion: item.promotion,
            originalPrice: item.price || item.promotion,
            price: item.promotion || item.price,
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

        console.log("Dữ liệu chuyển đổi:", transformedData);

        let totalOriginalPrice = 0;
        for (let i = 0; i < transformedData.length; i++) {
          let product = transformedData[i];
          let price = product.originalPrice * product.quantity;
          totalOriginalPrice += price;
        }
        setOriginalTotal(totalOriginalPrice);

        let totalPromotionPrice = 0;
        for (let i = 0; i < transformedData.length; i++) {
          let product = transformedData[i];
          let price = product.promotion * product.quantity;
          totalPromotionPrice += price;
        }

        const phanTramKhuyenMaiValue = localStorage.getItem("phanTramKhuyenMai");
        if (phanTramKhuyenMaiValue) {
          setPhanTramKhuyenMai(parseFloat(phanTramKhuyenMaiValue));

          const couponDiscount = (totalPromotionPrice * parseFloat(phanTramKhuyenMaiValue)) / 100;
          setDiscountAmount(couponDiscount);

          const afterCouponPrice = totalPromotionPrice - couponDiscount;
          setOrderTotal(afterCouponPrice);
        } else {
          setDiscountAmount(totalOriginalPrice - totalPromotionPrice);
          setOrderTotal(totalPromotionPrice);
        }

        setProductDetail(transformedData);
        setUserData(response.user);
        setLoading(false);
      } catch (error) {
        console.log("Failed to fetch event detail:" + error);
      }
    })();
    window.scrollTo(0, 0);
  }, []);

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
                    </Col>

                    <Col xs={24} lg={8}>
                      <Card bordered style={{ marginBottom: 16 }} title={<span style={{ fontWeight: 600 }}>Thông tin đơn hàng</span>}>
                        <div style={{ marginBottom: 12 }}>
                          {Array.isArray(productDetail) && productDetail.length > 0 ? (
                            <div className="custom-table-container" style={{maxHeight: "400px", overflowY: "auto"}}>
                              <table style={{width: "100%", borderCollapse: "collapse"}}>
                                <tbody>
                                  {productDetail.map((item, index) => (
                                    <tr key={index} style={{borderBottom: "1px solid #f0f0f0"}}>
                                      <td style={{padding: "12px 0"}}>
                                        <div style={{display: "flex", flexDirection: "column"}}>
                                          <div style={{fontWeight: "500", marginBottom: "8px", fontSize: "15px"}}>
                                            {item.productName || `Sản phẩm ${index + 1}`}
                                          </div>
                                          <div style={{display: "flex", gap: "15px", fontSize: "13px", color: "#666"}}>
                                            <div>SL: {item.quantity}</div>
                                            {item.selectedSize && (
                                              <div>
                                                <span>Size: </span>
                                                <Tag color="blue">{item.selectedSize}</Tag>
                                              </div>
                                            )}
                                            {item.selectedColor && item.selectedColor !== '-' && (
                                              <div style={{display: "flex", alignItems: "center"}}>
                                                <span>Màu: </span>
                                                <div style={{
                                                  display: "inline-block",
                                                  width: "14px",
                                                  height: "14px",
                                                  borderRadius: "50%",
                                                  background: item.selectedColor,
                                                  border: "1px solid #ddd",
                                                  marginLeft: "4px",
                                                  marginRight: "4px"
                                                }}></div>
                                                <span>{item.selectedColor}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{textAlign: "right", paddingLeft: "10px", verticalAlign: "top"}}>
                                        <div style={{fontWeight: "500"}}>
                                          {(item.promotion || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div style={{ color: '#999', padding: '20px 0', textAlign: 'center' }}>
                              Không có sản phẩm
                            </div>
                          )}
                        </div>

                        <Divider style={{margin: "10px 0"}} />

                        <div style={{ display: 'grid', gap: 8, padding: '8px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Tổng tiền hàng</span>
                            <span>{(originalTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                          </div>
                          {discountAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52c41a' }}>
                              <span style={{ display: 'flex', alignItems: 'center' }}>
                                <PercentageOutlined style={{ marginRight: '5px' }} />
                                Giảm giá {phanTramKhuyenMai > 0 ? `(${phanTramKhuyenMai}%)` : ''}
                              </span>
                              <span>-{(discountAmount || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '500' }}>
                            <span>Tạm tính</span>
                            <span>{(orderTotal || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                            <span>Phí vận chuyển{distKm != null ? ` (${distKm.toFixed(2)} km)` : ''}</span>
                            <span>{(shipFee || 0).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</span>
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

                        <div style={{ marginTop: 16 }}>
                          <div style={{ marginBottom: 8, fontWeight: 600 }}>Chọn phương thức thanh toán</div>
                          <Form.Item name="billing" rules={[{ required: true, message: 'Vui lòng chọn phương thức thanh toán!' }]} style={{ marginBottom: 0 }}>
                            <Radio.Group style={{ display: 'grid', gap: 8 }}>
                              <Radio value="cod">COD</Radio>
                              <Radio value="paypal">PayPal</Radio>
                            </Radio.Group>
                          </Form.Item>
                        </div>

                        <Form.Item style={{ marginTop: 16, marginBottom: 0 }}>
                          <Button type="primary" htmlType="submit" block style={{ height: 40, fontWeight: 600 }}>
                            Thanh toán
                          </Button>
                        </Form.Item>

                        <div style={{ marginTop: 8, fontSize: 12, color: '#999', textAlign: 'center' }}>
                          Thông tin thanh toán của bạn được bảo mật
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
          title="Xác nhận thanh toán"
          visible={showModal}
          onOk={handleModalConfirm}
          onCancel={() => { setShowModal(false); setPendingFormValues(null); }}
          okText="Xác nhận"
          cancelText="Hủy"
        >
          <p>Bạn có chắc chắn muốn xác nhận thanh toán?</p>
        </Modal>
      </Spin>
    </div>
  );
};

export default Pay;