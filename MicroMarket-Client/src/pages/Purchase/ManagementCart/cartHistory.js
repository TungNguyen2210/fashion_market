import {
  Breadcrumb, Card, Form,
  Input,
  Select, Spin, Table, Tag, Typography, notification,

  Modal, Button, Rate
} from "antd";
import moment from "moment";
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import axiosClient from "../../../apis/axiosClient";
import eventApi from "../../../apis/eventApi";
import productApi from "../../../apis/productApi";

const { Meta } = Card;
const { Option } = Select;

const { Title } = Typography;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { TextArea } = Input;

const CartHistory = () => {
  const [orderList, setOrderList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggest, setSuggest] = useState([]);
  const [visible, setVisible] = useState(false);
  const [dataForm, setDataForm] = useState([]);
  const [lengthForm, setLengthForm] = useState();
  const [form] = Form.useForm();
  const [template_feedback, setTemplateFeedback] = useState();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [comment, setComment] = useState("");




  let { id } = useParams();
  const history = useHistory();

  const hideModal = () => {
    setVisible(false);
  };


  const showModal = (order) => {
    setSelectedOrder(order);
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setSelectedOrder(null);
  };
  const handleRatingSubmit = async () => {
    try {
      if (!ratingValue) {
        notification.error({
          message: "Lỗi",
          description: "Vui lòng chọn số sao đánh giá.",
        });
        return;
      }

      const payload = {
        rating: ratingValue,
        comment: comment || "",
      };

      await axiosClient.post(`/order/${selectedOrder._id}/rating`, payload);

      notification.success({
        message: "Thành công",
        description: "Cảm ơn bạn đã đánh giá đơn hàng!",
      });


      // Cập nhật trạng thái đánh giá trong orderList
      setOrderList((prev) => ({
        ...prev,
        data: prev.data.map((order) =>
          order._id === selectedOrder._id
            ? { ...order, rated: true, rating: ratingValue, comment }
            : order
        ),
      }));


      handleModalClose();
      setRatingValue(0);
      setComment("");
    } catch (error) {
      notification.error({
        message: "Lỗi",
        description: "Không thể gửi đánh giá. Vui lòng thử lại.",
      });
    }
  };



  const handleJointEvent = async (id) => {
    try {
      await eventApi.joinEvent(id).then((response) => {
        if (response === undefined) {
          notification["error"]({
            message: `Notification`,
            description: "Joint Event Failed",
          });
        } else {
          notification["success"]({
            message: `Thông báo`,
            description: "Successfully Joint Event",
          });
          listEvent();
        }
      });
    } catch (error) {
      console.log("Failed to fetch event list:" + error);
    }
  };

  const handleCancelJointEvent = async (id) => {
    try {
      await eventApi.cancelJoinEvent(id).then((response) => {
        if (response === undefined) {
          notification["error"]({
            message: `Notification`,
            description: "Cancel Join Event Failed",
          });
        } else {
          notification["success"]({
            message: `Thông báo`,
            description: "Successfully Cancel Joint Event",
          });
          listEvent();
        }
      });
    } catch (error) {
      console.log("Failed to fetch event list:" + error);
    }
  };

  const listEvent = () => {
    setLoading(true);
    (async () => {
      try {
        const response = await eventApi.getDetailEvent(id);
        console.log(response);
        setOrderList(response);
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

  const handleDirector = () => {
    history.push("/evaluation/" + id);
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

  const columns = [
    // {
    //     title: 'Mã đơn hàng',
    //     dataIndex: '_id',
    //     key: '_id',
    // },
    {
      title: "Sản phẩm",
      dataIndex: "products",
      key: "products",
      render: (products) => (
        <div>
          {products.map((item, index) => (
            <div key={index}>{item.product?.name}</div>
          ))}
        </div>
      ),
    },
    {
      title: "Giá",
      dataIndex: "products",
      key: "products",
      render: (products) => (
        <div>
          {products.map((item, index) => (
            <div key={index}>
              {item.product?.price.toLocaleString("vi", {
                style: "currency",
                currency: "VND",
              })}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "products",
      key: "products",
      render: (products) => (
        <div>
          {products?.map((item, index) => (
            <div key={index}>{item?.quantity}</div>
          ))}
        </div>
      ),
    },
    {
      title: "Tổng đơn hàng",
      dataIndex: "orderTotal",
      key: "orderTotal",
      render: (products) => (
        <div>
          {products.toLocaleString("vi", {
            style: "currency",
            currency: "VND",
          })}
        </div>
      ),
    },
    {
      title: "Địa chỉ",
      dataIndex: "address",
      key: "address",
    },
    {
      title: "Hình thức thanh toán",
      dataIndex: "billing",
      key: "billing",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (slugs) => (
        <span>
          {slugs === "rejected" ? (
            <Tag style={{ width: 90, textAlign: "center" }} color="red">
              Đã hủy
            </Tag>
          ) : slugs === "approved" ? (
            <Tag
              style={{ width: 90, textAlign: "center" }}
              color="geekblue"
              key={slugs}
            >
              Vận chuyển
            </Tag>
          ) : slugs === "final" ? (
            <Tag color="green" style={{ width: 90, textAlign: "center" }}>
              Đã giao
            </Tag>
          ) : (
            <Tag color="blue" style={{ width: 90, textAlign: "center" }}>
              Đợi xác nhận
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: "Ngày đặt",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (createdAt) => (
        <span>{moment(createdAt).format("DD/MM/YYYY HH:mm")}</span>
      ),
    },

    {
      title: "Đánh giá",
      key: "action",
      render: (text, record) => {
        const isDelivered = record.status === "final";
        const isRated = record.rated === true;

        return isDelivered && !isRated ? (
          <Button type="primary" onClick={() => showModal(record)}>
            Đánh giá
          </Button>
        ) : isRated ? (
          <Tag color="green">Đã đánh giá</Tag>
        ) : null;
      },
    }



  ];

  useEffect(() => {
    (async () => {
      try {
        await productApi.getOrderByUser().then((item) => {
          console.log(item);
          setOrderList(item);
        });
        setLoading(false);
      } catch (error) {
        console.log("Failed to fetch event detail:" + error);
      }
    })();
    window.scrollTo(0, 0);
  }, []);

  return (
    <div>
      <Spin spinning={false}>
        <Card className="container_details">
          <div className="product_detail">
            <div style={{ marginLeft: 5, marginBottom: 10, marginTop: 10 }}>
              <Breadcrumb>
                <Breadcrumb.Item href="http://localhost:3500/home">
                  <span>Trang chủ</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item href="">
                  <span>Quản lý đơn hàng </span>
                </Breadcrumb.Item>
              </Breadcrumb>
            </div>
            <hr></hr>
            <div className="container" style={{ marginBottom: 30 }}>
              {/* <h1 style={{ fontSize: 30, marginTop: 25, paddingBottom: 10 }}>
            Quản lý đơn hàng
          </h1> */}
              <br></br>
              <Card>
                <Table
                  columns={columns}
                  dataSource={orderList.data}
                  rowKey="_id"
                  pagination={{ position: ["bottomCenter"] }}
                />

                <Modal
                  title="Đánh giá đơn hàng"
                  visible={isModalVisible}
                  onCancel={handleModalClose}
                  footer={[
                    <Button key="cancel" onClick={handleModalClose}>
                      Hủy
                    </Button>,
                    <Button key="submit" type="primary" onClick={handleRatingSubmit}>
                      Gửi đánh giá
                    </Button>,
                  ]}
                >
                  {selectedOrder && (
                    <div>
                      {/* <p><strong>Địa chỉ:</strong> {selectedOrder.address}</p>
    <p><strong>Hình thức thanh toán:</strong> {selectedOrder.billing}</p>
    <p><strong>Tổng đơn hàng:</strong> {selectedOrder.orderTotal.toLocaleString("vi", {
      style: "currency",
      currency: "VND",
    })}</p>
    <p><strong>Trạng thái:</strong> {selectedOrder.status}</p>    
    <p><strong>Ngày đặt:</strong> {moment(selectedOrder.createdAt).format(DATE_TIME_FORMAT)}</p> */}
                      <div>
                        <strong>Sản phẩm:</strong>
                        <ul>
                          {selectedOrder.products.map((item, index) => (
                            <li key={index}>
                              Tên sản phẩm: {item.product?.name || "Không có tên"}<br />
                              Số lượng: {item.quantity}<br />
                              Giá: {item.price.toLocaleString("vi", {
                                style: "currency",
                                currency: "VND",
                              })}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <hr />
                      <div style={{ marginTop: 16 }}>
                        <strong>Đánh giá đơn hàng:</strong>
                        <div>
                          <Rate onChange={setRatingValue} value={ratingValue} />
                        </div>
                        <TextArea
                          rows={4}
                          style={{ marginTop: 12 }}
                          placeholder="Viết nhận xét (không bắt buộc)..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                </Modal>

              </Card>
            </div>
          </div>
        </Card>
      </Spin>
    </div>
  );
};

export default CartHistory;
