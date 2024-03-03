import React, { useState, useEffect } from "react";
import styles from "./finalPay.css";
import axiosClient from "../../../apis/axiosClient";
import { useParams } from "react-router-dom";
import eventApi from "../../../apis/eventApi";
import userApi from "../../../apis/userApi";
import productApi from "../../../apis/productApi";
import { useHistory } from 'react-router-dom';
import { Col, Row, Tag, Spin, Card } from "antd";
import { DateTime } from "../../../utils/dateTime";
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Typography, Button, Steps, Breadcrumb, Popconfirm, notification, Form, Input, Select, Result, Radio } from 'antd';
import { HistoryOutlined, AuditOutlined, CloseOutlined, UserOutlined, MehOutlined, TeamOutlined, HomeOutlined, CheckOutlined } from '@ant-design/icons';

import Slider from "react-slick";

const { Meta } = Card;
const { Option } = Select;

const { Title } = Typography;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { TextArea } = Input;

const FinalPay = () => {

    const [productDetail, setProductDetail] = useState([]);
    const [userData, setUserData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [orderTotal, setOrderTotal] = useState([]);
    const [visible, setVisible] = useState(false);
    const [dataForm, setDataForm] = useState([]);
    const [lengthForm, setLengthForm] = useState();
    const [form] = Form.useForm();
    const [template_feedback, setTemplateFeedback] = useState();
    let { id } = useParams();
    const history = useHistory();

    const hideModal = () => {
        setVisible(false);
    };

    const accountCreate = async (values) => {
        try {
            console.log(userData)
            const formatData = {
                "userId": userData._id,
                "address": values.address,
                "billing": "cod",
                "description": values.description,
                "status": "pending",
                "products": productDetail,
                "orderTotal": orderTotal,
            }

            console.log(formatData);
            await axiosClient.post("/order", formatData)
                .then(response => {
                    console.log(response)
                    if (response == undefined) {
                        notification["error"]({
                            message: `Notification`,
                            description:
                                'Account create failed',

                        });
                    }
                    else {
                        notification["success"]({
                            message: `Notification`,
                            description:
                                'Successfully account create',
                        });
                        form.resetFields();
                        history.push("/account-management");
                    }
                }
                );
        } catch (error) {
            throw error;
        }
        setTimeout(function () {
            setLoading(false);
        }, 1000);
    }

    const CancelPay = () => {
        form.resetFields();
        history.push("/cart");
    }



    const listEvent = () => {
        setLoading(true);
        (async () => {
            try {
                const response = await eventApi.getDetailEvent(id);
                console.log(response);
                setProductDetail(response);
                setLoading(false);

            } catch (error) {
                console.log('Failed to fetch event detail:' + error);
            }
        })();
        window.scrollTo(0, 0);
    }

    const handleDetailEvent = (id) => {
        history.replace("/event-detail/" + id);
        window.location.reload();
        window.scrollTo(0, 0);
    }

    const getDataForm = async (uid) => {
        try {
            await axiosClient.get("/event/" + id + "/template_feedback/" + uid + "/question")
                .then(response => {
                    console.log(response);
                    setDataForm(response);
                    let tabs = [];
                    for (let i = 0; i < response.length; i++) {
                        tabs.push({
                            content: response[i]?.content,
                            uid: response[i]?.uid,
                            is_rating: response[i]?.is_rating
                        })
                    }
                    form.setFieldsValue({
                        users: tabs
                    })
                    setLengthForm(tabs.length)
                }
                );

        } catch (error) {
            throw error;
        }
    }

    const handleDirector = () => {
        history.push("/evaluation/" + id)
    }

    const onFinish = async (values) => {
        console.log(values.users);
        let tabs = [];
        for (let i = 0; i < values.users.length; i++) {
            tabs.push({
                scope: values.users[i]?.scope == undefined ? null : values.users[i]?.scope,
                comment: values.users[i]?.comment == undefined ? null : values.users[i]?.comment,
                question_uid: values.users[i]?.uid,

            })
        }
        console.log(tabs);
        setLoading(true);
        try {
            const dataForm = {
                "answers": tabs
            }
            await axiosClient.post("/event/" + id + "/answer", dataForm)
                .then(response => {
                    if (response === undefined) {
                        notification["error"]({
                            message: `Notification`,
                            description:
                                'Answer event question failed',

                        });
                        setLoading(false);
                    }
                    else {
                        notification["success"]({
                            message: `Notification`,
                            description:
                                'Successfully answer event question',

                        });
                        setLoading(false);
                        form.resetFields();
                    }
                }
                );

        } catch (error) {
            throw error;
        }
    };

    const handleFinal = () => {
        history.push("/")
    }

    useEffect(() => {
        (async () => {
            try {
                await productApi.getDetailProduct(id).then((item) => {
                    setProductDetail(item);
                });
                const response = await userApi.getProfile();
                console.log(response);
                form.setFieldsValue({
                    name: response.user.username,
                    email: response.user.email,
                    phone: response.user.phone,
                });
                const cart = JSON.parse(localStorage.getItem('cart')) || [];
                const transformedData = cart.map(({ _id: product, quantity, price }) => ({ product, quantity, price }));
                let totalPrice = 0;

                for (let i = 0; i < transformedData.length; i++) {
                    let product = transformedData[i];
                    let price = product.price * product.quantity;
                    totalPrice += price;
                }

                setOrderTotal(totalPrice);
                setProductDetail(transformedData)
                console.log(transformedData);
                setUserData(response.user);
                setLoading(false);


            } catch (error) {
                console.log('Failed to fetch event detail:' + error);
            }
        })();
        window.scrollTo(0, 0);
    }, [])

    return (
        <div class="py-5">
            <Spin spinning={false} >
                <Card className="container" >
                    <div className="product_detail">

                        <div style={{ marginLeft: 5, marginBottom: 10, marginTop: 10 }}>
                            <Breadcrumb>
                                <Breadcrumb.Item href="">
                                    <HomeOutlined />
                                </Breadcrumb.Item>
                                <Breadcrumb.Item href="">
                                    <AuditOutlined />
                                    <span>Thanh toán</span>
                                </Breadcrumb.Item>
                            </Breadcrumb>

                            <div className="payment_progress">
                                <Steps
                                    current={2}
                                    percent={100}
                                    items={[
                                        {
                                            title: 'Chọn sản phẩm',
                                        },
                                        {
                                            title: 'Thanh toán',
                                        },
                                        {
                                            title: 'Hoàn thành',
                                        },
                                    ]}
                                />
                            </div>
                            <Result
                                status="success"
                                title="Đặt hàng thành công!"
                                subTitle="Bạn có thể xem lịch sử đặt hàng ở quản lý đơn hàng."
                                extra={[
                                    <Button type="primary" key="console" onClick={() => handleFinal()}>
                                        Hoàn thành
                                    </Button>,
                                ]}
                            />
                        </div>
                    </div>
                </Card>
            </Spin>
        </div >
    );
};

export default FinalPay;
