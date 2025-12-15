import React, { useState, useEffect, useCallback } from 'react';
import "./accountManagement.css";
import { 
    Button, Spin, Row, Card, Popconfirm, Table, Input, Col, 
    notification, BackTop, Tag, Breadcrumb, Space, Select, Modal, Form 
} from 'antd';
import { 
    HomeOutlined, PlusOutlined, UserOutlined, StopOutlined, 
    CheckCircleOutlined, EditOutlined 
} from '@ant-design/icons';
import userApi from "../../apis/userApi";
import { useHistory } from 'react-router-dom';
import debounce from 'lodash/debounce';

const { Option } = Select;

const AccountManagement = () => {
    const [user, setUser] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [selectedInput, setSelectedInput] = useState('');
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    
    // State cho modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [form] = Form.useForm();

    const history = useHistory();

    const titleCase = (str) => {
        var splitStr = str?.toLowerCase().split(' ');
        for (var i = 0; i < splitStr.length; i++) {
            splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
        }
        return splitStr.join(' ');
    }

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'index',
            render: (value, item, index) => (
                (page - 1) * 10 + (index + 1)
            ),
        },
        {
            title: 'Tên',
            dataIndex: 'username',
            key: 'username',
            render: (text, record) => (
                <Space size="middle">
                    {
                        text == null || text == undefined ? "" :
                            <p style={{ margin: 0 }}>{titleCase(text)}</p>
                    }
                </Space>
            ),
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
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            width: '12%',
            render: (text, record) => (
                <Space size="middle">
                    {
                        text === "isAdmin" ?
                            <Tag color="blue" key={text} style={{ width: 100, textAlign: "center" }}>
                                Quản lý
                            </Tag> : text === "isCompany" ? <Tag color="green" key={text} style={{ width: 100, textAlign: "center" }}>
                                Công ty
                            </Tag> : <Tag color="magenta" key={text} style={{ width: 100, textAlign: "center" }}>
                                Khách hàng
                            </Tag>
                    }
                </Space>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (text, record) => (
                <Space size="middle">
                    {
                        text === "actived" ?
                            <Tag color="green" key={text} style={{ width: 80, textAlign: "center" }}>
                                Hoạt động
                            </Tag> : text == "newer" ? <Tag color="blue" key={text} style={{ width: 80, textAlign: "center" }}>
                                Newer
                            </Tag>
                                : <Tag color="default" key={text} style={{ width: 80, textAlign: "center" }}>
                                    Chặn
                                </Tag>
                    }
                </Space>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (text, record) => (
                <div>
                    <Row>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                style={{ width: 190, borderRadius: 15, height: 30 }}
                                onClick={() => handleEditUser(record)}
                            >
                                Chỉnh sửa thông tin
                            </Button>

                            {!record.role.includes('isAdmin') && (
                                record.status !== "actived" ? (
                                    <Popconfirm
                                        title="Bạn muốn mở khóa tài khoản này?"
                                        onConfirm={() => handleUnBanAccount(record)}
                                        okText="Yes"
                                        cancelText="No"
                                    >
                                        <Button
                                            size="small"
                                            icon={<CheckCircleOutlined />}
                                            style={{ width: 190, borderRadius: 15, height: 30 }}
                                        >
                                            Mở khóa tài khoản
                                        </Button>
                                    </Popconfirm>
                                ) : (
                                    <Popconfirm
                                        title="Bạn muốn chặn tài khoản này?"
                                        onConfirm={() => handleBanAccount(record)}
                                        okText="Yes"
                                        cancelText="No"
                                    >
                                        <Button
                                            size="small"
                                            icon={<StopOutlined />}
                                            style={{ width: 190, borderRadius: 15, height: 30 }}
                                            danger
                                        >
                                            Chặn tài khoản
                                        </Button>
                                    </Popconfirm>
                                )
                            )}
                        </div>
                    </Row>
                </div>
            ),
        },
    ];

    // ==================== MODAL FUNCTIONS ====================
    
    const handleEditUser = (record) => {
        console.log('Edit user:', record);
        setSelectedUser(record);
        
        // Chỉ set các field không phải password
        form.setFieldsValue({
            name: record.username,
            email: record.email,
            phone: record.phone,
            role: record.role,
        });
        
        setEditModalVisible(true);
    }

    const handleUpdateUser = async (values) => {
        setModalLoading(true);
        try {
            const formatData = {
                "username": values.name,
                "email": values.email,
                "phone": values.phone,
                "role": values.role,
                "status": selectedUser.status
            }
            
            // Chỉ thêm password nếu người dùng đã nhập
            if (values.password && values.password.trim() !== '') {
                formatData.password = values.password;
            }
            
            console.log('Updating user:', selectedUser._id, formatData);
            
            await userApi.updateUser(selectedUser._id, formatData);
            
            notification["success"]({
                message: `Thành công`,
                description: values.password ? 
                    'Cập nhật thông tin và mật khẩu người dùng thành công!' : 
                    'Cập nhật thông tin người dùng thành công!',
            });
            
            form.resetFields();
            setEditModalVisible(false);
            setSelectedUser(null);
            
            handleListUser();
        } catch (error) {
            console.error('Error updating user:', error);
            
            // Xử lý lỗi từ backend
            const errorMessage = error.response?.data?.message || error.message;
            
            if (error.status === 400 || error.response?.status === 400) {
                if (errorMessage === "User already exists" || 
                    errorMessage.includes("Email đã tồn tại")) {
                    notification["error"]({
                        message: `Email đã tồn tại`,
                        description: 'Email này đã được đăng ký bởi người dùng khác!',
                        duration: 5,
                    });
                } else if (errorMessage.includes("Email has already been taken")) {
                    notification["error"]({
                        message: `Email đã tồn tại`,
                        description: 'Email này đã được sử dụng!',
                        duration: 5,
                    });
                } else if (errorMessage.includes("Số điện thoại đã tồn tại") || 
                           errorMessage.includes("Phone has already been taken")) {
                    notification["error"]({
                        message: `Số điện thoại đã tồn tại`,
                        description: 'Số điện thoại này đã được sử dụng!',
                        duration: 5,
                    });
                } else if (errorMessage.includes("Mật khẩu phải có ít nhất 6 ký tự")) {
                    notification["error"]({
                        message: `Lỗi mật khẩu`,
                        description: 'Mật khẩu phải có ít nhất 6 ký tự!',
                        duration: 5,
                    });
                } else {
                    notification["error"]({
                        message: `Lỗi`,
                        description: errorMessage || 'Cập nhật thông tin thất bại!',
                        duration: 5,
                    });
                }
            } else if (error.status === 404 || error.response?.status === 404) {
                notification["error"]({
                    message: `Không tìm thấy`,
                    description: 'Không tìm thấy người dùng này!',
                    duration: 5,
                });
            } else {
                notification["error"]({
                    message: `Lỗi`,
                    description: errorMessage || 'Cập nhật thông tin thất bại!',
                    duration: 5,
                });
            }
        } finally {
            setModalLoading(false);
        }
    }

    const handleModalCancel = () => {
        form.resetFields();
        setEditModalVisible(false);
        setSelectedUser(null);
    }

    // ==================== OTHER FUNCTIONS ====================

    const handleListUser = async () => {
        try {
            setLoading(true);
            const response = await userApi.listUserByAdmin({ page: 1, limit: 1000 });
            console.log(response);
            setUser(response.data.docs);
            setLoading(false);
        } catch (error) {
            console.log('Failed to fetch event list:' + error);
            setLoading(false);
        }
    }

    const handleUnBanAccount = async (data) => {
        const params = {
            status: "actived"
        }
        try {
            await userApi.unBanAccount(params, data._id).then(response => {
                if (response.message === "Email already exists") {
                    notification["error"]({
                        message: `Thông báo`,
                        description: 'Mở khóa thất bại',
                    });
                }
                else {
                    notification["success"]({
                        message: `Thông báo`,
                        description: 'Mở khóa thành công',
                    });
                    handleListUser();
                }
            });
        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleBanAccount = async (data) => {
        console.log(data);
        const params = {
            status: "noactive"
        }
        try {
            await userApi.banAccount(params, data._id).then(response => {
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description: 'Chặn thất bại',
                    });
                }
                else {
                    notification["success"]({
                        message: `Thông báo`,
                        description: 'Chặn thành công',
                    });
                    handleListUser();
                }
            });
        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleCreateAccount = () => {
        history.push("/account-create")
    }

    const filterUsers = useCallback(
        debounce(async (searchText, role, status) => {
            setLoading(true);
            try {
                const response = await userApi.listUserByAdmin({ page: 1, limit: 1000 });
                let filteredData = response.data.docs;

                if (searchText) {
                    filteredData = filteredData.filter(user => 
                        user.email?.toLowerCase().includes(searchText.toLowerCase()) ||
                        user.username?.toLowerCase().includes(searchText.toLowerCase())
                    );
                }

                if (role !== 'all') {
                    filteredData = filteredData.filter(user => user.role === role);
                }

                if (status !== 'all') {
                    filteredData = filteredData.filter(user => user.status === status);
                }

                setUser(filteredData);
                setLoading(false);
            } catch (error) {
                console.log('Failed to filter users:' + error);
                setLoading(false);
            }
        }, 500),
        []
    );

    const handleFilterEmail = (e) => {
        const value = e.target.value;
        setSelectedInput(value);
        filterUsers(value, selectedRole, selectedStatus);
    }

    const handleRoleChange = (value) => {
        setSelectedRole(value);
        filterUsers(selectedInput, value, selectedStatus);
    }

    const handleStatusChange = (value) => {
        setSelectedStatus(value);
        filterUsers(selectedInput, selectedRole, value);
    }

    useEffect(() => {
        (async () => {
            try {
                const response = await userApi.listUserByAdmin({ page: 1, limit: 1000 });
                console.log(response);
                setUser(response.data.docs);
                setLoading(false);
            } catch (error) {
                console.log('Failed to fetch user list:' + error);
            }
        })();
        window.scrollTo(0, 0);
    }, [])

    return (
        <div>
            <Spin spinning={loading}>
                <div style={{ marginTop: 20, marginLeft: 24 }}>
                    <Breadcrumb>
                        <Breadcrumb.Item href="">
                            <HomeOutlined />
                        </Breadcrumb.Item>
                        <Breadcrumb.Item href="">
                            <UserOutlined />
                            <span>Quản lý tài khoản</span>
                        </Breadcrumb.Item>
                    </Breadcrumb>
                </div>
                
                <div id="account">
                    <div id="account_container">
                        <div style={{ 
                            fontSize: 14, 
                            background: '#fff',
                            padding: '20px 24px',
                            marginBottom: 16,
                            borderRadius: 8
                        }}>
                            <Row gutter={[16, 16]}>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Space wrap>
                                        <Input
                                            placeholder="Tìm kiếm theo email hoặc tên"
                                            allowClear
                                            style={{ width: 250 }}
                                            onChange={handleFilterEmail}
                                            value={selectedInput}
                                        />
                                        <Select
                                            placeholder="Vai trò"
                                            style={{ width: 150 }}
                                            value={selectedRole}
                                            onChange={handleRoleChange}
                                        >
                                            <Option value="all">Tất cả vai trò</Option>
                                            <Option value="isAdmin">Quản lý</Option>
                                            <Option value="isClient">Khách hàng</Option>
                                        </Select>
                                        <Select
                                            placeholder="Trạng thái"
                                            style={{ width: 150 }}
                                            value={selectedStatus}
                                            onChange={handleStatusChange}
                                        >
                                            <Option value="all">Tất cả trạng thái</Option>
                                            <Option value="actived">Hoạt động</Option>
                                            <Option value="noactive">Chặn</Option>
                                        </Select>
                                    </Space>
                                </Col>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Row justify="end">
                                        <Button 
                                            style={{ marginLeft: 10 }} 
                                            icon={<PlusOutlined />} 
                                            size="middle" 
                                            onClick={() => handleCreateAccount()}
                                        >
                                            Tạo tài khoản
                                        </Button>
                                    </Row>
                                </Col>
                            </Row>
                        </div>
                    </div>
                </div>
                
                <div style={{ marginTop: 20, marginRight: 5 }}>
                    <div id="account">
                        <div id="account_container">
                            <Card title="Quản lý tài khoản" bordered={false}>
                                <Table 
                                    columns={columns} 
                                    dataSource={user} 
                                    pagination={{ 
                                        position: ['bottomCenter'],
                                        current: page,
                                        onChange: (page) => setPage(page)
                                    }}
                                    rowKey="_id"
                                />
                            </Card>
                        </div>
                    </div>
                </div>
                <BackTop style={{ textAlign: 'right' }} />
            </Spin>

            {/* ==================== EDIT USER MODAL ==================== */}
            <Modal
                title="Chỉnh sửa thông tin người dùng"
                visible={editModalVisible}
                onCancel={handleModalCancel}
                onOk={() => form.submit()}
                okText="Cập nhật"
                cancelText="Hủy"
                confirmLoading={modalLoading}
                width={600}
                centered
                destroyOnClose
            >
                <Spin spinning={modalLoading}>
                    <Form
                        form={form}
                        onFinish={handleUpdateUser}
                        layout="vertical"
                        scrollToFirstError
                    >
                        <Form.Item
                            name="name"
                            label="Tên"
                            hasFeedback
                            rules={[
                                { required: true, message: 'Vui lòng nhập tên!' },
                                { max: 100, message: 'Tên tối đa 100 ký tự' },
                                { min: 4, message: 'Tên ít nhất 4 ký tự' },
                            ]}
                        >
                            <Input placeholder="Tên" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email"
                            hasFeedback
                            rules={[
                                { type: 'email', message: 'Email không hợp lệ!' },
                                { required: true, message: 'Vui lòng nhập email!' },
                            ]}
                        >
                            <Input placeholder="Email" />
                        </Form.Item>

                        <Form.Item
                            name="phone"
                            label="Số điện thoại"
                            hasFeedback
                            rules={[
                                { required: true, message: 'Vui lòng nhập số điện thoại!' },
                                { pattern: /^[0-9]{10}$/, message: "Số điện thoại phải có 10 chữ số" },
                            ]}
                        >
                            <Input placeholder="Số điện thoại" />
                        </Form.Item>

                        <Form.Item
                            name="role"
                            label="Vai trò"
                            hasFeedback
                            rules={[{ required: true, message: 'Vui lòng chọn vai trò!' }]}
                        >
                            <Select placeholder="Chọn vai trò">
                                <Option value="isAdmin">Quản lý</Option>
                                <Option value="isClient">Khách hàng</Option>
                            </Select>
                        </Form.Item>

                        {/* ==================== MẬT KHẨU MỚI ==================== */}
                        <Form.Item
                            name="password"
                            label="Mật khẩu mới"
                            hasFeedback
                            rules={[
                                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' },
                            ]}
                            extra="Để trống nếu không muốn thay đổi mật khẩu"
                        >
                            <Input.Password 
                                placeholder="Nhập mật khẩu mới (để trống nếu không đổi)" 
                                autoComplete="new-password"
                            />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            label="Xác nhận mật khẩu"
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        const password = getFieldValue('password');
                                        
                                        // Nếu không nhập mật khẩu thì không cần xác nhận
                                        if (!password || password.trim() === '') {
                                            return Promise.resolve();
                                        }
                                        
                                        // Nếu có nhập mật khẩu thì phải xác nhận
                                        if (!value) {
                                            return Promise.reject(new Error('Vui lòng xác nhận mật khẩu!'));
                                        }
                                        
                                        if (password === value) {
                                            return Promise.resolve();
                                        }
                                        
                                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password 
                                placeholder="Xác nhận mật khẩu mới" 
                                autoComplete="new-password"
                            />
                        </Form.Item>
                    </Form>
                </Spin>
            </Modal>
        </div>
    )
}

export default AccountManagement;