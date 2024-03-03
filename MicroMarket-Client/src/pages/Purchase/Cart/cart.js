import React, { useState, useEffect } from "react";
import styles from "./cart.css";
import axiosClient from "../../../apis/axiosClient";
import { useParams } from "react-router-dom";
import eventApi from "../../../apis/eventApi";
import productApi from "../../../apis/productApi";
import { useHistory } from "react-router-dom";
import { Col, Row, Tag, Spin, Card } from "antd";
import { DateTime } from "../../../utils/dateTime";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import {
  Typography,
  Button,
  Badge,
  Breadcrumb,
  Popconfirm,
  InputNumber,
  notification,
  Form,
  Input,
  Select,
  Rate,
} from "antd";
import { Layout, Table, Divider, Statistic } from "antd";
import {
  HistoryOutlined,
  AuditOutlined,
  AppstoreAddOutlined,
  CloseOutlined,
  UserOutlined,
  DeleteOutlined,
  CreditCardOutlined,
  HomeOutlined,
  CheckOutlined,
  LeftSquareOutlined,
} from "@ant-design/icons";

import Slider from "react-slick";

const { Meta } = Card;
const { Option } = Select;
const { Content } = Layout;
const { Title } = Typography;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { TextArea } = Input;

const Cart = () => {
  const [productDetail, setProductDetail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggest, setSuggest] = useState([]);
  const [visible, setVisible] = useState(false);
  const [dataForm, setDataForm] = useState([]);
  const [lengthForm, setLengthForm] = useState();
  const [cartLength, setCartLength] = useState();
  const [cartTotal, setCartTotal] = useState();
  const [form] = Form.useForm();
  let { id } = useParams();
  const history = useHistory();

  const steps = [
    {
      title: "First",
      content: "First-content",
    },
    {
      title: "Second",
      content: "Second-content",
    },
    {
      title: "Last",
      content: "Last-content",
    },
  ];

  const listEvent = () => {
    setLoading(true);
    (async () => {
      try {
        const response = await eventApi.getDetailEvent(id);
        console.log(response);
        setProductDetail(response);
        setLoading(false);
      } catch (error) {
        console.log("Failed to fetch event detail:" + error);
      }
    })();
    window.scrollTo(0, 0);
  };

  const handleDetailEvent = (id) => {
    history.replace("/event-detail/" + id);
    window.location.reload();
    window.scrollTo(0, 0);
  };

  const getDataForm = async (uid) => {
    try {
      await axiosClient
        .get("/event/" + id + "/template_feedback/" + uid + "/question")
        .then((response) => {
          console.log(response);
          setDataForm(response);
          let tabs = [];
          for (let i = 0; i < response.length; i++) {
            tabs.push({
              content: response[i]?.content,
              uid: response[i]?.uid,
              is_rating: response[i]?.is_rating,
            });
          }
          form.setFieldsValue({
            users: tabs,
          });
          setLengthForm(tabs.length);
        });
    } catch (error) {
      throw error;
    }
  };

  const handlePay = () => {
    history.push("/pay");
  };

  const deleteCart = () => {
    localStorage.removeItem("cart");
    localStorage.removeItem("cartLength");
    window.location.reload(true);
  };

  const onFinish = async (values) => {
    console.log(values.users);
    let tabs = [];
    for (let i = 0; i < values.users.length; i++) {
      tabs.push({
        scope:
          values.users[i]?.scope == undefined ? null : values.users[i]?.scope,
        comment:
          values.users[i]?.comment == undefined
            ? null
            : values.users[i]?.comment,
        question_uid: values.users[i]?.uid,
      });
    }
    console.log(tabs);
    setLoading(true);
    try {
      const dataForm = {
        answers: tabs,
      };
      await axiosClient
        .post("/event/" + id + "/answer", dataForm)
        .then((response) => {
          if (response === undefined) {
            notification["error"]({
              message: `Notification`,
              description: "Answer event question failed",
            });
            setLoading(false);
          } else {
            notification["success"]({
              message: `Notification`,
              description: "Successfully answer event question",
            });
            setLoading(false);
            form.resetFields();
          }
        });
    } catch (error) {
      throw error;
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    console.log(newQuantity);
    // Tìm kiếm sản phẩm trong giỏ hàng
    const updatedCart = productDetail.map((item) => {
      if (item._id === productId) {
        // Cập nhật số lượng và tính toán tổng tiền
        item.quantity = newQuantity;
        item.total = item.promotion * newQuantity;
      }
      return item;
    });
    const total = updatedCart.reduce(
      (acc, item) => acc + item.quantity * item.promotion,
      0
    );
    setCartTotal(total);
    localStorage.setItem("cart", JSON.stringify(updatedCart));
    setProductDetail(updatedCart);
  };

  const handleDelete = async (productId) => {
    const updatedCart = JSON.parse(localStorage.getItem("cart"));
    const filteredCart = updatedCart.filter(
      (product) => product._id !== productId
    );
    localStorage.setItem("cart", JSON.stringify(filteredCart));
    setCartLength(cartLength - 1);
    setProductDetail(filteredCart);
  };

  const columns = [
    {
      title: "ID",
      key: "index",
      render: (text, record, index) => index + 1,
    },
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      render: (image) => <img src={image} style={{ height: 80 }} />,
      width: "10%",
    },
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      render: (text) => <a>{text}</a>,
    },
    {
      title: "Giá",
      dataIndex: "promotion",
      key: "promotion",
      render: (text) => (
        <a>
          {text.toLocaleString("vi", { style: "currency", currency: "VND" })}
        </a>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      render: (text, record) => (
        <InputNumber
          min={1}
          defaultValue={text}
          onChange={(value) => {
            // gọi hàm updateQuantity để cập nhật số lượng sản phẩm
            updateQuantity(record._id, value);
          }}
        />
      ),
    },
    {
      title: "Thành tiền",
      dataIndex: "totalPrice",
      key: "totalPrice",
      render: (text, record) => (
        <div>
          <div className="groupButton">
            {(record.promotion * record.quantity).toLocaleString("vi", {
              style: "currency",
              currency: "VND",
            })}
          </div>
        </div>
      ),
    },
    {
      title: "Hành động",
      key: "action",
      render: (text, record) => (
        <Button type="danger" onClick={() => handleDelete(record._id)}>
          Xóa
        </Button>
      ),
    },
  ];

  useEffect(() => {
    (async () => {
      try {
        // await productApi.getDetailProduct(id).then((item) => {
        //     setProductDetail(item);
        // });
        const cart = JSON.parse(localStorage.getItem("cart")) || [];
        setProductDetail(cart);
        console.log(cart);
        const cartLength = localStorage.getItem("cartLength");
        setCartLength(cartLength);
        const total = cart.reduce(
          (acc, item) => acc + item.quantity * item.promotion,
          0
        );
        setCartTotal(total);
        setLoading(false);
      } catch (error) {
        console.log("Failed to fetch event detail:" + error);
      }
    })();
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      <div class="py-5">
        <Spin spinning={false}>
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
                  <Table
                    columns={columns}
                    dataSource={productDetail}
                    pagination={false}
                  />
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
                  <Divider orientation="right">
                    <p>Thanh toán</p>
                  </Divider>
                  <Row justify="end">
                    <Col>
                      <h6>Tổng {cartLength} sản phẩm</h6>
                      <Statistic
                        title="Tổng tiền (đã bao gồm VAT)."
                        value={`${Math.round(cartTotal).toFixed(0)}`}
                        precision={0}
                      />
                      <Button
                        style={{ marginTop: 16 }}
                        type="primary"
                        onClick={() => handlePay()}
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
