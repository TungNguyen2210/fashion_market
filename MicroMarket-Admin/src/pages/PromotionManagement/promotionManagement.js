import {
    DeleteOutlined,
    EditOutlined,
    HomeOutlined,
    PlusOutlined,
    ShoppingOutlined,
    EyeOutlined
} from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import {
    BackTop, Breadcrumb,
    Button,
    Col,
    Form,
    Input,
    Modal, Popconfirm,
    Row,
    Space,
    Spin,
    Table,
    notification,
    DatePicker
} from 'antd';
import { useEffect, useState } from 'react';
import promotionManagementApi from "../../apis/promotionManagementApi";
import "./promotionManagement.css";
import moment from 'moment';
import dayjs from 'dayjs';


const PromotionManagement = () => {

    const [category, setCategory] = useState([]);
    const [openModalCreate, setOpenModalCreate] = useState(false);
    const [openModalUpdate, setOpenModalUpdate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const [form2] = Form.useForm();
    const [id, setId] = useState();

    const showModal = () => {
        setOpenModalCreate(true);
    };

    const handleOkUser = async (values) => {
        setLoading(true);
        // eslint-disable-next-line no-useless-catch
        try {
            const categoryList = {
                "phanTramKhuyenMai": values.phantramkhuyenmai,
                "thoiGianBD": values.thoigianBD.format("YYYY-MM-DD"),
                "thoiGianKT": values.thoigianKT.format("YYYY-MM-DD"),
                "maKhuyenMai": values.maKhuyenMai
            }
            return promotionManagementApi.createPromotionManagement(categoryList).then(response => {
                if (response.message === "Asset with the same name already exists") {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            'Tên voucher không được trùng',
                    });
                    setLoading(false);
                    return;
                }
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            'Tạo voucher thất bại',
                    });
                }
                else {
                    notification["success"]({
                        message: `Thông báo`,
                        description:
                            'Tạo voucher thành công',
                    });
                    setOpenModalCreate(false);
                    handleCategoryList();
                }
            })

        } catch (error) {
            throw error;
        }
    }

    const handleUpdateCategory = async (values) => {
        setLoading(true);
        // eslint-disable-next-line no-useless-catch
        try {
            const categoryList = {
                "phanTramKhuyenMai": values.phantramkhuyenmai,
                "thoiGianBD": values.thoigianBD.format("YYYY-MM-DD"),
                "thoiGianKT": values.thoigianKT.format("YYYY-MM-DD"),
                "maKhuyenMai": values.maKhuyenMai
            }
            return promotionManagementApi.updatePromotionManagement(categoryList, id).then(response => {
                if (response.message === "Asset with the same name already exists") {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            'Tên voucher không được trùng',
                    });
                    setLoading(false);
                    return;
                }

                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            'Chỉnh sửa voucher thất bại',
                    });
                }
                else {
                    notification["success"]({
                        message: `Thông báo`,
                        description:
                            'Chỉnh sửa voucher thành công',
                    });
                    handleCategoryList();
                    setOpenModalUpdate(false);
                }
            })

        } catch (error) {
            throw error;
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
            await promotionManagementApi.listPromotionManagement().then((res) => {
                setCategory(res.data);
                setLoading(false);
            });

        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleDeleteCategory = async (id) => {
        setLoading(true);
        try {
            await promotionManagementApi.deletePromotionManagement(id).then(response => {
                if (response.message === "Cannot delete the asset because it is referenced in another process or event.") {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            "Không thể xóa voucher vì nó đã được sử dụng trong một sự kiện hoặc quá trình khác.",

                    });
                    setLoading(false);
                    return;
                }
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            'Xóa voucher thất bại',

                    });
                    setLoading(false);
                }
                else {
                    notification["success"]({
                        message: `Thông báo`,
                        description:
                            'Xóa voucher thành công',

                    });
                    handleCategoryList();
                    setLoading(false);
                }
            }
            );

        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleEditCategory = (id) => {
        setOpenModalUpdate(true);
        (async () => {
            // eslint-disable-next-line no-useless-catch
            try {
                const response = await promotionManagementApi.getDetailPromotionManagement(id);
                setId(id);
                form2.setFieldsValue({
                    phantramkhuyenmai: response.data.phanTramKhuyenMai,
                    thoigianBD: dayjs(response.data.thoiGianBD),
                    thoigianKT: dayjs(response.data.thoiGianKT),
                    maKhuyenMai: response.data.maKhuyenMai
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
            const res = await promotionManagementApi.searchPromotionManagement(name);
            setCategory(res);
        } catch (error) {
            console.log('search to fetch category list:' + error);
        }
    }

    const columns = [
        {
            title: 'ID',
            key: 'index',
            render: (text, record, index) => index + 1,
        },
        {
            title: 'Mã khuyến mãi',
            dataIndex: 'maKhuyenMai',
            key: 'maKhuyenMai',
            render: (text) => text,
        },
        {
            title: 'Phần trăm khuyến mãi',
            dataIndex: 'phanTramKhuyenMai',
            key: 'phanTramKhuyenMai',
            render: (text) => text + "%",
        },
        {
            title: 'Thời gian bắt đầu',
            dataIndex: 'thoigianBD',
            key: 'thoigianBD',
            render: (text) => moment(text).format('YYYY-MM-DD'),

        },
        {
            title: 'Thời gian kết thúc',
            dataIndex: 'thoigianKT',
            key: 'thoigianKT',
            render: (text) => moment(text).format('YYYY-MM-DD'),

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
                            style={{ marginLeft: 6 }}>
                            <Popconfirm
                                title="Bạn có chắc chắn xóa voucher này?"
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
                await promotionManagementApi.listPromotionManagement().then((res) => {
                    console.log(res);
                    setCategory(res.data);
                    setLoading(false);
                });
            } catch (error) {
                console.log('Failed to fetch category list:' + error);
            }
        })();
    }, [])
    return (
        <div>
            <Spin spinning={loading}>
                <div className='container-home'>
                    <div style={{ marginTop: 20 }}>
                        <Breadcrumb>
                            <Breadcrumb.Item href="">
                                <HomeOutlined />
                            </Breadcrumb.Item>
                            <Breadcrumb.Item href="">
                                <ShoppingOutlined />
                                <span>Quản lý voucher</span>
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
                                            placeholder="Tìm kiếm theo tên"
                                            allowClear
                                            onChange={handleFilter}
                                            style={{ width: 300 }}
                                        />
                                    </Col>
                                    <Col span="6">
                                        <Row justify="end">
                                            <Space>

                                                <Button onClick={showModal} icon={<PlusOutlined />} style={{ marginLeft: 10 }} >Tạo voucher</Button>
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
                    title="Tạo voucher mới"
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
                        <Spin spinning={loading}>

                            <Form.Item
                                name="maKhuyenMai"
                                label="Mã voucher"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập mã voucher!',
                                    },
                                ]}
                                style={{ marginBottom: 10 }}
                            >
                                <Input placeholder="Mã voucher" />
                            </Form.Item>

                            <Form.Item
                                name="phantramkhuyenmai"
                                label="Phần trăm voucher"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập phần trăm voucher!',
                                    },
                                ]}
                                style={{ marginBottom: 10 }}
                            >
                                <Input type="number" placeholder="Phần trăm voucher" />
                            </Form.Item>
                            <Form.Item
                                name="thoigianBD"
                                label="Thời gian bắt đầu"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập thời gian bắt đầu!',
                                    },
                                ]}
                                style={{ marginBottom: 10 }}
                            >
                                <DatePicker

                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                            <Form.Item
                                name="thoigianKT"
                                label="Thời gian kết thúc"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập thời gian kết thúc!',
                                    },
                                ]}
                                style={{ marginBottom: 10 }}
                            >
                                <DatePicker
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Spin>
                    </Form>
                </Modal>

                <Modal
                    title="Chỉnh sửa voucher"
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
                        <Spin spinning={loading}>
                            <Form.Item
                                name="maKhuyenMai"
                                label="Mã voucher"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập mã voucher!',
                                    },
                                ]}
                                style={{ marginBottom: 10 }}
                            >
                                <Input placeholder="Mã voucher" />
                            </Form.Item>

                            <Form.Item
                                name="phantramkhuyenmai"
                                label="Phần trăm voucher"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập phần trăm voucher!',
                                    },
                                ]}
                                style={{ marginBottom: 10 }}
                            >
                                <Input type="number" placeholder="Phần trăm voucher" />
                            </Form.Item>
                            <Form.Item
                                name="thoigianBD"
                                label="Thời gian bắt đầu"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập thời gian bắt đầu!',
                                    },
                                ]}
                                style={{ marginBottom: 10 }}
                            >
                                <DatePicker

                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                            <Form.Item
                                name="thoigianKT"
                                label="Thời gian kết thúc"
                                rules={[
                                    {
                                        required: true,
                                        message: 'Vui lòng nhập thời gian kết thúc!',
                                    },
                                ]}
                                style={{ marginBottom: 10 }}
                            >
                                <DatePicker
                                    style={{ width: '100%' }}
                                />
                            </Form.Item>
                        </Spin>
                    </Form>
                </Modal>

                <BackTop style={{ textAlign: 'right' }} />
            </Spin>
        </div >
    )
}

export default PromotionManagement;