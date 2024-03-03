import React, { useState, useEffect } from 'react';
import "./supplierList.css";
import {
    Col, Row, Typography, Spin, Button, Card, Badge, Empty, Input, Space,
    Form, Pagination, Modal, Popconfirm, notification, BackTop, Tag, Breadcrumb, Select, Table
} from 'antd';
import {
    AppstoreAddOutlined, QrcodeOutlined, DeleteOutlined, PlusOutlined, EyeOutlined, ExclamationCircleOutlined, SearchOutlined,
    CalendarOutlined, UserOutlined, TeamOutlined, HomeOutlined, HistoryOutlined, ShoppingOutlined, FormOutlined, TagOutlined, EditOutlined
} from '@ant-design/icons';
import supplierApi from "../../apis/supplierApi";
import { useHistory } from 'react-router-dom';
import { DateTime } from "../../utils/dateTime";
import axiosClient from '../../apis/axiosClient';
import { PageHeader } from '@ant-design/pro-layout';
const { confirm } = Modal;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { Title } = Typography;

const SupplierList = () => {

    const [category, setCategory] = useState([]);
    const [openModalCreate, setOpenModalCreate] = useState(false);
    const [openModalUpdate, setOpenModalUpdate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const [form2] = Form.useForm();
    const [total, setTotalList] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [id, setId] = useState();
    const [image, setImage] = useState();

    const history = useHistory();

    const showModal = () => {
        setOpenModalCreate(true);
    };

    const handleOkUser = async (values) => {
        setLoading(true);
        try {
            var formData = new FormData();
            formData.append("image", image);
            await axiosClient.post("/uploadFile", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }).then(response => {
                const categoryList = {
                    "name": values.name,
                    "contactPerson": values.contactPerson,
                    "email": values.email,
                    "phone": values.phone,
                    "address": values.address,
                    "image": response.image_url
                }
                return axiosClient.post("/suppliers/create", categoryList).then(response => {
                    if (response === undefined) {
                        notification["error"]({
                            message: `Thông báo`,
                            description:
                                'Tạo nhà cung cấp thất bại',
                        });
                    }
                    else {
                        notification["success"]({
                            message: `Thông báo`,
                            description:
                                'Tạo nhà cung cấp thành công',
                        });
                        setOpenModalCreate(false);
                        handleCategoryList();
                    }
                })
            })
            setLoading(false);

        } catch (error) {
            throw error;
        }
    }

    const handleUpdateCategory = async (values) => {
        console.log(image);
        setLoading(true);
        if (image) {
            var formData = new FormData();
            formData.append("image", image);
            await axiosClient.post("/uploadFile", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }).then(response => {
                try {
                    const categoryList = {
                        "name": values.name,
                        "contactPerson": values.contactPerson,
                        "email": values.email,
                        "phone": values.phone,
                        "address": values.address,
                        "image": response.image_url
                    }
                    return axiosClient.put("/suppliers/" + id, categoryList).then(response => {
                        if (response === undefined) {
                            notification["error"]({
                                message: `Thông báo`,
                                description:
                                    'Chỉnh sửa nhà cung cấp thất bại',
                            });
                        }
                        else {
                            notification["success"]({
                                message: `Thông báo`,
                                description:
                                    'Chỉnh sửa nhà cung cấp thành công',
                            });
                            handleCategoryList();
                            setOpenModalUpdate(false);
                        }
                    })

                } catch (error) {
                    throw error;
                }
            })
        } else {

            try {
                const categoryList = {
                    "name": values.name,
                    "contactPerson": values.contactPerson,
                    "email": values.email,
                    "phone": values.phone,
                    "address": values.address,
                }
                await axiosClient.put("/suppliers/" + id, categoryList).then(response => {
                    if (response === undefined) {
                        notification["error"]({
                            message: `Thông báo`,
                            description:
                                'Chỉnh sửa nhà cung cấp thất bại',
                        });
                    }
                    else {
                        notification["success"]({
                            message: `Thông báo`,
                            description:
                                'Chỉnh sửa nhà cung cấp thành công',
                        });
                        handleCategoryList();
                        setOpenModalUpdate(false);
                    }
                })
                setLoading(false);

            } catch (error) {
                throw error;
            }
        }
    }

    const handleCancel = (type) => {
        if (type === "create") {
            setOpenModalCreate(false);
        } else {
            setOpenModalUpdate(false)
        }
        console.log('Clicked cancel button');
    };

    const handleCategoryList = async () => {
        try {
            await supplierApi.getAllSuppliers({ page: 1, limit: 10000 }).then((res) => {
                console.log(res);
                setTotalList(res.totalDocs)
                setCategory(res.data.docs);
                setLoading(false);
            });
            ;
        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        };
    }

    const handleDeleteCategory = async (id) => {
        setLoading(true);
        try {
            await supplierApi.deleteSupplier(id).then(response => {
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            'Xóa nhà cung cấp thất bại',

                    });
                    setLoading(false);
                }
                else {
                    notification["success"]({
                        message: `Thông báo`,
                        description:
                            'Xóa nhà cung cấp thành công',

                    });
                    setCurrentPage(1);
                    handleCategoryList();
                    setLoading(false);
                }
            }
            );

        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleDetailView = (id) => {
        history.push("/category-detail/" + id)
    }

    const handleEditCategory = (id) => {
        setOpenModalUpdate(true);
        (async () => {
            try {
                const response = await supplierApi.getSupplierById(id);
                setId(id);
                form2.setFieldsValue({
                    name: response.data.name,
                    contactPerson: response.data.contactPerson,
                    email: response.data.email,
                    phone: response.data.phone,
                    address: response.data.address,
                });
                console.log(form2);
                setLoading(false);
            } catch (error) {
                throw error;
            }
        })();
    }

    const handleFilter = async (name) => {
        try {
            const res = await supplierApi.searchSupplierByName(name);
            setTotalList(res.totalDocs)
            setCategory(res.data.docs);
        } catch (error) {
            console.log('search to fetch category list:' + error);
        }
    }

    const handleChangeImage = (event) => {
        setImage(event.target.files[0]);
    }

    function NoData() {
        return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    }

    const columns = [
        {
            title: 'ID',
            key: 'index',
            render: (text, record, index) => index + 1,
        },
        {
            title: 'Ảnh',
            dataIndex: 'image',
            key: 'image',
            render: (image) => <img src={image} style={{ height: 60 }} />,
            width: '10%'
        },
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <a>{text}</a>,
        },
        {
            title: 'Người liên hệ',
            dataIndex: 'contactPerson',
            key: 'contactPerson',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Địa chỉ',
            dataIndex: 'address',
            key: 'address',
        },
        {
            title: 'Action',
            key: 'action',
            render: (text, record) => (
                <div>
                    <Row>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            style={{ width: 150, borderRadius: 15, height: 30 }}
                            onClick={() => handleEditCategory(record._id)}
                        >{"Chỉnh sửa"}
                        </Button>
                        <div
                            style={{ marginLeft: 10 }}>
                            <Popconfirm
                                title="Bạn có chắc chắn xóa nhà cung cấp này?"
                                onConfirm={() => handleDeleteCategory(record._id)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    style={{ width: 150, borderRadius: 15, height: 30 }}
                                >{"Xóa"}
                                </Button>
                            </Popconfirm>
                        </div>
                    </Row>
                </div >
            ),
        },
    ];


    useEffect(() => {
        (async () => {
            try {
                await supplierApi.getAllSuppliers({ page: 1, limit: 10000 }).then((res) => {
                    console.log(res);
                    setTotalList(res.totalDocs)
                    setCategory(res.data.docs);
                    setLoading(false);
                });
                ;
            } catch (error) {
                console.log('Failed to fetch category list:' + error);
            }
        })();
    }, [])
    return (
        <div>
            <Spin spinning={loading}>
                <div className='container'>
                    <div style={{ marginTop: 20 }}>
                        <Breadcrumb>
                            <Breadcrumb.Item href="">
                                <HomeOutlined />
                            </Breadcrumb.Item>
                            <Breadcrumb.Item href="">
                                <ShoppingOutlined />
                                <span>Nhà cung cấp</span>
                            </Breadcrumb.Item>
                        </Breadcrumb>
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <div id="my__event_container__list">
                            <PageHeader
                                subTitle=""
                                style={{ fontSize: 14 }}
                            >
                                <Row>
                                    <Col span="18">
                                        <Input
                                            placeholder="Tìm kiếm"
                                            allowClear
                                            onChange={handleFilter}
                                            style={{ width: 300 }}
                                        />
                                    </Col>
                                    <Col span="6">
                                        <Row justify="end">
                                            <Space>
                                                <Button onClick={showModal} icon={<PlusOutlined />} style={{ marginLeft: 10 }} >Tạo nhà cung cấp</Button>
                                            </Space>
                                        </Row>
                                    </Col>
                                </Row>

                            </PageHeader>
                        </div>
                    </div>

                    <div style={{ marginTop: 30 }}>
                        <Table columns={columns} pagination={{ position: ['bottomCenter'] }} dataSource={category} />
                    </div>
                </div>

                <Modal
                    title="Tạo nhà cung cấp mới"
                    visible={openModalCreate}
                    style={{ top: 100 }}
                    onOk={() => {
                        form
                            .validateFields()
                            .then((values) => {
                                form.resetFields();
                                handleOkUser(values);
                            })
                            .catch((info) => {
                                console.log('Validate Failed:', info);
                            });
                    }}
                    onCancel={() => handleCancel("create")}
                    okText="Hoàn thành"
                    cancelText="Hủy"
                    width={600}
                >
                    <Form
                        form={form}
                        name="eventCreate"
                        layout="vertical"
                        initialValues={{
                            residence: ['zhejiang', 'hangzhou', 'xihu'],
                            prefix: '86',
                        }}
                        scrollToFirstError
                    >
                        <Form.Item
                            name="name"
                            label="Tên"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập tên!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Tên" />
                        </Form.Item>
                        <Form.Item
                            name="contactPerson" // Thêm trường contactPerson
                            label="Người liên hệ"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập người liên hệ!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Người liên hệ" />
                        </Form.Item>
                        <Form.Item
                            name="email" // Thêm trường email
                            label="Email"
                            rules={[
                                {
                                    type: 'email',
                                    message: 'Email không hợp lệ!',
                                },
                                {
                                    required: true,
                                    message: 'Vui lòng nhập email!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Email" />
                        </Form.Item>
                        <Form.Item
                            name="phone" // Thêm trường phone
                            label="Điện thoại"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập số điện thoại!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Điện thoại" />
                        </Form.Item>
                        <Form.Item
                            name="address" // Thêm trường address
                            label="Địa chỉ"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập địa chỉ!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Địa chỉ" />
                        </Form.Item>
                        <Form.Item
                            name="image"
                            label="Ảnh"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn ảnh!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <input type="file" onChange={handleChangeImage} id="avatar" name="file" accept="image/png, image/jpeg" />
                        </Form.Item>
                        
                    </Form>
                </Modal>


                <Modal
                    title="Chỉnh sửa nhà cung cấp"
                    visible={openModalUpdate}
                    style={{ top: 100 }}
                    onOk={() => {
                        form2
                            .validateFields()
                            .then((values) => {
                                form2.resetFields();
                                handleUpdateCategory(values);
                            })
                            .catch((info) => {
                                console.log('Validate Failed:', info);
                            });
                    }}
                    onCancel={handleCancel}
                    okText="Hoàn thành"
                    cancelText="Hủy"
                    width={600}
                >
                    <Form
                        form={form2}
                        name="eventCreate"
                        layout="vertical"
                        initialValues={{
                            residence: ['zhejiang', 'hangzhou', 'xihu'],
                            prefix: '86',
                        }}
                        scrollToFirstError
                    >
                        <Form.Item
                            name="name"
                            label="Tên"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập tên!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Tên" />
                        </Form.Item>
                        <Form.Item
                            name="contactPerson" // Thêm trường contactPerson
                            label="Người liên hệ"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập người liên hệ!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Người liên hệ" />
                        </Form.Item>
                        <Form.Item
                            name="email" // Thêm trường email
                            label="Email"
                            rules={[
                                {
                                    type: 'email',
                                    message: 'Email không hợp lệ!',
                                },
                                {
                                    required: true,
                                    message: 'Vui lòng nhập email!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Email" />
                        </Form.Item>
                        <Form.Item
                            name="phone" // Thêm trường phone
                            label="Điện thoại"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập số điện thoại!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Điện thoại" />
                        </Form.Item>
                        <Form.Item
                            name="address" // Thêm trường address
                            label="Địa chỉ"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập địa chỉ!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Địa chỉ" />
                        </Form.Item>
                        <Form.Item
                            name="image"
                            label="Ảnh"
                            style={{ marginBottom: 10 }}
                        >
                            <input type="file" onChange={handleChangeImage} id="avatar" name="file" accept="image/png, image/jpeg" />
                        </Form.Item>
                    </Form>
                </Modal>
                <BackTop style={{ textAlign: 'right' }} />
            </Spin>
        </div >
    )
}

export default SupplierList;