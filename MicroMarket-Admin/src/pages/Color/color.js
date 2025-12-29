import {
    BarsOutlined,
    DeleteOutlined,
    EditOutlined,
    HomeOutlined,
    PlusOutlined
} from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import {
    BackTop,
    Breadcrumb,
    Button,
    Col,
    ColorPicker,
    Form,
    Input,
    Modal,
    Popconfirm,
    Row,
    Space,
    Spin,
    Table,
    notification
} from 'antd';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import 'suneditor/dist/css/suneditor.min.css';
import newsApi from "../../apis/newsApi";
import "./color.css";

const Color = () => {

    const [colorList, setColorList] = useState([]);
    const [openModalCreate, setOpenModalCreate] = useState(false);
    const [openModalUpdate, setOpenModalUpdate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const [form2] = Form.useForm();
    const [total, setTotalList] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [id, setId] = useState();
    const [color, setColor] = useState('#000000');

    const history = useHistory();

    const showModal = () => {
        setColor('#000000');
        form.resetFields();
        setOpenModalCreate(true);
    };

    const handleOkUser = async (values) => {
        setLoading(true);
        try {
            const colorData = {
                name: values.name.trim(),
                description: color.toLowerCase(),
            };
            
            const response = await newsApi.createColor(colorData);
            
            if (response && response.success === false) {
                notification.error({
                    message: 'Thông báo',
                    description: response.message || 'Tạo màu mới thất bại',
                });
                setLoading(false);
                return;
            }
            
            notification.success({
                message: 'Thông báo',
                description: response?.message || 'Tạo màu mới thành công',
            });
            
            setOpenModalCreate(false);
            form.resetFields();
            setColor('#000000');
            await handleColorList();
            
        } catch (error) {
            console.error('Error creating color:', error);
            
            let errorMessage = 'Có lỗi xảy ra khi tạo màu mới';
            
            if (error.response) {
                if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.status === 400) {
                    errorMessage = 'Dữ liệu không hợp lệ hoặc màu đã tồn tại';
                } else if (error.response.status === 500) {
                    errorMessage = 'Lỗi server. Vui lòng thử lại sau';
                }
            } else if (error.request) {
                errorMessage = 'Không thể kết nối đến server';
            }
            
            notification.error({
                message: 'Thông báo',
                description: errorMessage,
            });
            
            setLoading(false);
        }
    };

    const handleUpdateColor = async (values) => {
        setLoading(true);
        try {
            const colorData = {
                name: values.name.trim(),
                description: color.toLowerCase(),
            };
            
            const response = await newsApi.updateColor(id, colorData);
            
            if (response && response.success === false) {
                notification.error({
                    message: 'Thông báo',
                    description: response.message || 'Chỉnh sửa màu sắc thất bại',
                });
                setLoading(false);
                return;
            }
            
            notification.success({
                message: 'Thông báo',
                description: response?.message || 'Chỉnh sửa màu sắc thành công',
            });
            
            setOpenModalUpdate(false);
            form2.resetFields();
            await handleColorList();
            
        } catch (error) {
            console.error('Error updating color:', error);
            
            let errorMessage = 'Có lỗi xảy ra khi chỉnh sửa màu';
            
            if (error.response) {
                if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.status === 400) {
                    errorMessage = 'Dữ liệu không hợp lệ hoặc màu đã tồn tại';
                } else if (error.response.status === 404) {
                    errorMessage = 'Không tìm thấy màu cần chỉnh sửa';
                } else if (error.response.status === 500) {
                    errorMessage = 'Lỗi server. Vui lòng thử lại sau';
                }
            } else if (error.request) {
                errorMessage = 'Không thể kết nối đến server';
            }
            
            notification.error({
                message: 'Thông báo',
                description: errorMessage,
            });
            
            setLoading(false);
        }
    };

    const handleCancel = (type) => {
        if (type === "create") {
            setOpenModalCreate(false);
            form.resetFields();
            setColor('#000000');
        } else {
            setOpenModalUpdate(false);
            form2.resetFields();
        }
    };

    const handleColorList = async () => {
        setLoading(true);
        try {
            const res = await newsApi.getListColor({ page: 1, limit: 100 });
            if (res && res.data) {
                setTotalList(res.data.totalDocs);
                setColorList(res.data.docs);
            }
            setLoading(false);
        } catch (error) {
            console.log('Failed to fetch color list:', error);
            notification.error({
                message: 'Thông báo',
                description: 'Không thể tải danh sách màu',
            });
            setLoading(false);
        }
    };

    const handleDeleteColor = async (id) => {
        setLoading(true);
        try {
            const response = await newsApi.deleteColor(id);
            
            if (response === undefined || (response && response.success === false)) {
                notification.error({
                    message: 'Thông báo',
                    description: response?.message || 'Xóa màu sắc thất bại',
                });
            } else {
                notification.success({
                    message: 'Thông báo',
                    description: response?.message || 'Xóa màu sắc thành công',
                });
                setCurrentPage(1);
                await handleColorList();
            }
        } catch (error) {
            console.log('Failed to delete color:', error);
            notification.error({
                message: 'Thông báo',
                description: 'Có lỗi xảy ra khi xóa màu sắc',
            });
            setLoading(false);
        }
    };

    const handleEditColor = async (id) => {
    setLoading(true);
    try {
        const response = await newsApi.getDetailColor(id, { 
            _t: Date.now() // Cache buster
        });
        
        // Xử lý cả case 304 - browser trả cached data
        const data = response?.data || response;
        
        if (!data || !data.name) {
            throw new Error('Dữ liệu không hợp lệ');
        }
        
        setId(id);
        const colorValue = data.description || '#000000';
        setColor(colorValue);
        
        form2.setFieldsValue({
            name: data.name,
            description: colorValue,
        });
        
        setLoading(false);
        setOpenModalUpdate(true);
    } catch (error) {
        console.error('Error:', error);
        notification.error({
            message: 'Thông báo',
            description: 'Không thể tải thông tin màu',
        });
        setLoading(false);
    }
};

    const handleFilter = async (e) => {
        const name = e.target.value;
        try {
            if (name) {
                const res = await newsApi.searchColor(name);
                if (res && res.data) {
                    setTotalList(res.data.totalDocs);
                    setColorList(res.data.docs);
                }
            } else {
                await handleColorList();
            }
        } catch (error) {
            console.log('Failed to search colors:', error);
        }
    };

    const columns = [
        {
            title: 'ID',
            key: 'index',
            render: (text, record, index) => index + 1,
            width: '10%'
        },
        {
            title: 'Màu sắc',
            dataIndex: 'description',
            key: 'description',
            render: (color) => (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <div style={{
                        width: '60px',
                        height: '40px',
                        backgroundColor: color,
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }} />
                    <span style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '13px',
                        fontWeight: '500'
                    }}>
                        {color?.toUpperCase()}
                    </span>
                </div>
            ),
            width: '30%'
        },
        {
            title: 'Tên màu',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <strong>{text}</strong>,
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (text, record) => (
                <div>
                    <Row gutter={8}>
                        <Col>
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                style={{ borderRadius: 5 }}
                                onClick={() => handleEditColor(record._id)}
                            >
                                Chỉnh sửa
                            </Button>
                        </Col>
                        <Col>
                            <Popconfirm
                                title="Xác nhận xóa"
                                description="Bạn có chắc chắn muốn xóa màu này?"
                                onConfirm={() => handleDeleteColor(record._id)}
                                okText="Có"
                                cancelText="Không"
                                okButtonProps={{ danger: true }}
                            >
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    style={{ borderRadius: 5 }}
                                >
                                    Xóa
                                </Button>
                            </Popconfirm>
                        </Col>
                    </Row>
                </div>
            ),
            width: '25%'
        },
    ];

    useEffect(() => {
        handleColorList();
    }, []);

    const handleColorChange = (value) => {
        const hexColor = value.toHexString();
        setColor(hexColor);
        
        if (openModalCreate) {
            form.setFieldsValue({ description: hexColor });
        } else if (openModalUpdate) {
            form2.setFieldsValue({ description: hexColor });
        }
    };

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
                                <BarsOutlined />
                                <span>Quản lý màu sắc</span>
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
                                            placeholder="Tìm kiếm theo tên màu..."
                                            allowClear
                                            onChange={handleFilter}
                                            style={{ width: 300 }}
                                        />
                                    </Col>
                                    <Col span="6">
                                        <Row justify="end">
                                            <Space>
                                                <Button 
                                                    type="primary"
                                                    onClick={showModal} 
                                                    icon={<PlusOutlined />}
                                                >
                                                    Tạo màu mới
                                                </Button>
                                            </Space>
                                        </Row>
                                    </Col>
                                </Row>

                            </PageHeader>
                        </div>
                    </div>

                    <div style={{ marginTop: 30 }}>
                        <Table 
                            columns={columns} 
                            pagination={{ 
                                position: ['bottomCenter'],
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: (total) => `Tổng số ${total} màu`
                            }} 
                            dataSource={colorList}
                            rowKey="_id"
                        />
                    </div>
                </div>

                <Modal
                    title="Tạo màu mới"
                    visible={openModalCreate}
                    style={{ top: 100 }}
                    onOk={() => {
                        form
                            .validateFields()
                            .then((values) => {
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
                    confirmLoading={loading}
                >
                    <Form
                        form={form}
                        name="colorCreate"
                        layout="vertical"
                        scrollToFirstError
                    >
                        <Form.Item
                            name="name"
                            label="Tên màu"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập tên màu!',
                                },
                                {
                                    whitespace: true,
                                    message: 'Tên màu không được để trống!',
                                },
                                {
                                    min: 2,
                                    message: 'Tên màu phải có ít nhất 2 ký tự!',
                                }
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input 
                                placeholder="Ví dụ: Đỏ đậm, Xanh nhạt..." 
                                showCount
                                maxLength={50}
                            />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Chọn màu"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn màu!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <div>
                                <ColorPicker 
                                    value={color}
                                    onChange={handleColorChange} 
                                    showText 
                                    format="hex"
                                    size="large"
                                    presets={[
                                        {
                                            label: 'Màu phổ biến',
                                            colors: [
                                                '#FF0000',
                                                '#00FF00',
                                                '#0000FF',
                                                '#FFFF00',
                                                '#FF00FF',
                                                '#00FFFF',
                                                '#000000',
                                                '#FFFFFF',
                                            ],
                                        },
                                    ]}
                                />
                                <div style={{ 
                                    marginTop: 10, 
                                    padding: '8px', 
                                    background: '#f5f5f5',
                                    borderRadius: '4px'
                                }}>
                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                        Mã màu đã chọn: <strong>{color}</strong>
                                    </span>
                                </div>
                            </div>
                        </Form.Item>

                    </Form>
                </Modal>

                <Modal
                    title="Chỉnh sửa màu sắc"
                    visible={openModalUpdate}
                    style={{ top: 100 }}
                    onOk={() => {
                        form2
                            .validateFields()
                            .then((values) => {
                                handleUpdateColor(values);
                            })
                            .catch((info) => {
                                console.log('Validate Failed:', info);
                            });
                    }}
                    onCancel={() => handleCancel("update")}
                    okText="Hoàn thành"
                    cancelText="Hủy"
                    width={600}
                    confirmLoading={loading}
                >
                    <Form
                        form={form2}
                        name="colorUpdate"
                        layout="vertical"
                        scrollToFirstError
                    >
                        <Form.Item
                            name="name"
                            label="Tên màu"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập tên màu!',
                                },
                                {
                                    whitespace: true,
                                    message: 'Tên màu không được để trống!',
                                },
                                {
                                    min: 2,
                                    message: 'Tên màu phải có ít nhất 2 ký tự!',
                                }
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input 
                                placeholder="Ví dụ: Đỏ đậm, Xanh nhạt..." 
                                showCount
                                maxLength={50}
                            />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Chọn màu"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn màu!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <div>
                                <ColorPicker 
                                    value={color}
                                    onChange={handleColorChange} 
                                    showText 
                                    format="hex"
                                    size="large"
                                    presets={[
                                        {
                                            label: 'Màu phổ biến',
                                            colors: [
                                                '#FF0000',
                                                '#00FF00',
                                                '#0000FF',
                                                '#FFFF00',
                                                '#FF00FF',
                                                '#00FFFF',
                                                '#000000',
                                                '#FFFFFF',
                                            ],
                                        },
                                    ]}
                                />
                                <div style={{ 
                                    marginTop: 10, 
                                    padding: '8px', 
                                    background: '#f5f5f5',
                                    borderRadius: '4px'
                                }}>
                                    <span style={{ fontSize: '12px', color: '#666' }}>
                                        Mã màu đã chọn: <strong>{color}</strong>
                                    </span>
                                </div>
                            </div>
                        </Form.Item>

                    </Form>
                </Modal>

                <BackTop style={{ textAlign: 'right' }} />
            </Spin>
        </div>
    )
}

export default Color;