import React, { useState, useEffect, useCallback } from 'react';
import "./accountManagement.css";
import { 
    Button, Spin, Row, Card, Popconfirm, Table, Input, Col, 
    notification, BackTop, Tag, Breadcrumb, Space, Select, Modal, Form 
} from 'antd';
import { 
    HomeOutlined, PlusOutlined, UserOutlined, StopOutlined, 
    CheckCircleOutlined, EditOutlined, RedoOutlined 
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

                            {/* Button Reset Mật Khẩu */}
                            <Popconfirm
                                title="Bạn có chắc muốn reset mật khẩu về ban đầu không?"
                                onConfirm={() => handleResetPassword(record)}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    size="small"
                                    icon={<RedoOutlined />}
                                    style={{ width: 190, borderRadius: 15, height: 30 }}
                                    type="default"
                                >
                                    Reset mật khẩu
                                </Button>
                            </Popconfirm>

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
    };

    const handleModalCancel = () => {
        setEditModalVisible(false);
        setSelectedUser(null);
        form.resetFields();
    };

    const handleUpdateUser = async (values) => {
        console.log('Update user with values:', values);
        setModalLoading(true);
        
        try {
            const updateData = {
                username: values.name,
                email: values.email,
                phone: values.phone,
                role: values.role,
                status: selectedUser.status
            };

            // FIX: Thứ tự đúng là (userId, userData)
            const response = await userApi.updateUser(selectedUser._id, updateData);
            
            if (response) {
                notification.success({
                    message: 'Thành công',
                    description: 'Cập nhật thông tin người dùng thành công!',
                });
                
                handleModalCancel();
                handleList();
            }
        } catch (error) {
            console.error('Update error:', error);
            notification.error({
                message: 'Lỗi',
                description: error?.message || 'Cập nhật thông tin thất bại!',
            });
        } finally {
            setModalLoading(false);
        }
    };

    // ==================== RESET PASSWORD FUNCTION ====================
    const handleResetPassword = async (record) => {
        try {
            setLoading(true);
            const response = await userApi.resetPassword(record._id, { newPassword: '123456' });
            
            if (response) {
                notification.success({
                    message: 'Thành công',
                    description: 'Đã reset mật khẩu thành công!',
                    duration: 5,
                });
            }
        } catch (error) {
            console.error('Reset password error:', error);
            notification.error({
                message: 'Lỗi',
                description: error?.message || 'Reset mật khẩu thất bại!',
            });
        } finally {
            setLoading(false);
        }
    };

    // ==================== BAN/UNBAN FUNCTIONS ====================
    
    const handleBanAccount = async (record) => {
        try {
            setLoading(true);
            
            const updateData = { 
                username: record.username,
                email: record.email,
                phone: record.phone,
                role: record.role,
                status: "noactive"
            };
            
            // FIX: Thứ tự đúng là (userId, userData)
            const response = await userApi.updateUser(record._id, updateData);
            
            if (response) {
                notification.success({
                    message: 'Thành công',
                    description: 'Chặn tài khoản thành công!',
                });
                handleList();
            }
        } catch (error) {
            console.error('Ban account error:', error);
            notification.error({
                message: 'Lỗi',
                description: error?.message || 'Chặn tài khoản thất bại!',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleUnBanAccount = async (record) => {
        try {
            setLoading(true);
            
            const updateData = { 
                username: record.username,
                email: record.email,
                phone: record.phone,
                role: record.role,
                status: "actived"
            };
            
            // FIX: Thứ tự đúng là (userId, userData)
            const response = await userApi.updateUser(record._id, updateData);
            
            if (response) {
                notification.success({
                    message: 'Thành công',
                    description: 'Mở khóa tài khoản thành công!',
                });
                handleList();
            }
        } catch (error) {
            console.error('Unban account error:', error);
            notification.error({
                message: 'Lỗi',
                description: error?.message || 'Mở khóa tài khoản thất bại!',
            });
        } finally {
            setLoading(false);
        }
    };

    // ==================== DATA FETCHING ====================
    
    const handleList = async () => {
        setLoading(true);
        try {
            const response = await userApi.listUserByAdmin({ page: 1, limit: 10000 });
            console.log('User list:', response);
            
            let filteredUsers = response.data.docs || [];

            // Filter by role
            if (selectedRole !== 'all') {
                filteredUsers = filteredUsers.filter(user => user.role === selectedRole);
            }

            // Filter by status
            if (selectedStatus !== 'all') {
                filteredUsers = filteredUsers.filter(user => user.status === selectedStatus);
            }

            // Filter by search input
            if (selectedInput) {
                filteredUsers = filteredUsers.filter(user =>
                    user.email?.toLowerCase().includes(selectedInput.toLowerCase()) ||
                    user.username?.toLowerCase().includes(selectedInput.toLowerCase()) ||
                    user.phone?.includes(selectedInput)
                );
            }

            setUser(filteredUsers);
        } catch (error) {
            console.error('Fetch users error:', error);
            notification.error({
                message: 'Lỗi',
                description: 'Không thể tải danh sách người dùng!',
            });
        } finally {
            setLoading(false);
        }
    };

    // ==================== SEARCH & FILTER ====================
    
    const debouncedSearch = useCallback(
        debounce((value) => {
            setSelectedInput(value);
        }, 500),
        []
    );

    const handleFilter = (e) => {
        const value = e.target.value;
        debouncedSearch(value);
    };

    const handleRoleChange = (value) => {
        setSelectedRole(value);
    };

    const handleStatusChange = (value) => {
        setSelectedStatus(value);
    };

    // ==================== CREATE ACCOUNT ====================
    
    const handleCreateAccount = () => {
        history.push("/account-create");
    };

    // ==================== EFFECTS ====================
    
    useEffect(() => {
        handleList();
    }, [selectedRole, selectedStatus, selectedInput]);

    // ==================== RENDER ====================
    
    return (
        <div>
            <Spin spinning={loading}>
                <div style={{ marginTop: 20 }}>
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

                <div style={{ marginTop: 20 }}>
                    <div id="account">
                        <div id="account_container">
                            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                                <Col xs={24} sm={24} md={12} lg={12}>
                                    <Space size="middle">
                                        <Input
                                            placeholder="Tìm theo tên, email, số điện thoại"
                                            style={{ width: 300 }}
                                            onChange={handleFilter}
                                            prefix={<UserOutlined />}
                                        />
                                        <Select
                                            placeholder="Vai trò"
                                            style={{ width: 150 }}
                                            value={selectedRole}
                                            onChange={handleRoleChange}
                                        >
                                            <Option value="all">Tất cả vai trò</Option>
                                            <Option value="isAdmin">Quản lý</Option>
                                            <Option value="isCompany">Công ty</Option>
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
                    </Form>
                </Spin>
            </Modal>
        </div>
    )
}

export default AccountManagement;