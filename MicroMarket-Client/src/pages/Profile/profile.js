import React, { useState, useEffect } from 'react';
import "./profile.css";
import {
    Col, Row, Spin, Button, Card, Divider, Input, Upload,
    Form, notification, Avatar, Modal, Alert
} from 'antd';
import { 
    UserOutlined, 
    CameraOutlined, 
    EditOutlined, 
    SaveOutlined,
    LockOutlined,
    PhoneOutlined
} from '@ant-design/icons';
import userApi from "../../apis/userApi";
import { useHistory, useLocation } from 'react-router-dom';

const Profile = () => {
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const [passwordForm] = Form.useForm();
    const [userData, setUserData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [imageUrl, setImageUrl] = useState('');
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [requirePhone, setRequirePhone] = useState(false); // ✅ THÊM STATE
    const history = useHistory();
    const location = useLocation(); // ✅ THÊM useLocation

    const handleEditProfile = () => {
        form.setFieldsValue({
            username: userData.username,
            email: userData.email,
            phone: userData.phone
        });
        setImageUrl(userData.image || '');
        setIsEditing(true);
    };

    const handleCancel = () => {
        // ✅ KIỂM TRA NẾU ĐANG YÊU CẦU NHẬP SĐT THÌ KHÔNG CHO HỦY
        if (requirePhone && !userData.phone) {
            notification.warning({
                message: '⚠️ Không thể hủy!',
                description: 'Bạn cần nhập số điện thoại để tiếp tục sử dụng hệ thống.',
                placement: 'topRight',
                duration: 4,
            });
            return;
        }

        setIsEditing(false);
        form.resetFields();
        setImageUrl(userData.image || '');
        // Reset form values to original
        form.setFieldsValue({
            username: userData.username,
            email: userData.email,
            phone: userData.phone
        });
    };

    const handleImageChange = (info) => {
        if (info.file.status === 'done') {
            setImageUrl(info.file.response.url);
        }
    };

    const beforeUpload = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            notification.error({ message: 'Bạn chỉ có thể tải lên file ảnh!' });
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            notification.error({ message: 'Ảnh phải nhỏ hơn 2MB!' });
        }
        return isImage && isLt2M;
    };

    const validatePhone = (_, value) => {
        // ✅ NẾU YÊU CẦU NHẬP SĐT THÌ BẮT BUỘC
        if (requirePhone && !value) {
            return Promise.reject(new Error('Số điện thoại là bắt buộc!'));
        }
        
        if (!value) {
            return Promise.resolve();
        }
        
        const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
        if (!phoneRegex.test(value)) {
            return Promise.reject(new Error('Số điện thoại không hợp lệ!'));
        }
        return Promise.resolve();
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            
            setLoading(true);
            const response = await userApi.updateProfile({
                username: values.username,
                phone: values.phone,
                image: imageUrl
            });
            
            notification.success({ 
                message: '✅ Cập nhật thông tin thành công',
                description: requirePhone ? 'Cảm ơn bạn đã cập nhật số điện thoại!' : undefined
            });
            
            // Reload data
            const profileData = await userApi.getProfile();
            setUserData(profileData.user || {});
            localStorage.setItem("user", JSON.stringify(profileData.user));
            
            setIsEditing(false);
            setRequirePhone(false); // ✅ TẮT CHẾ ĐỘ YÊU CẦU NHẬP SĐT
            setLoading(false);
            
            // ✅ XÓA QUERY PARAMETER SAU KHI CẬP NHẬT THÀNH CÔNG
            if (location.search.includes('requirePhone=true')) {
                history.replace('/profile');
            }
            
        } catch (error) {
            console.log('Failed to update profile:', error);
            notification.error({ 
                message: 'Có lỗi xảy ra khi cập nhật thông tin',
                description: error.response?.data?.message || error.message
            });
            setLoading(false);
        }
    };

    const handleChangePassword = async () => {
        try {
            const values = await passwordForm.validateFields();
            setPasswordLoading(true);

            await userApi.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
                confirmPassword: values.confirmPassword
            });

            notification.success({ message: 'Đổi mật khẩu thành công' });
            passwordForm.resetFields();
            setShowChangePassword(false);
        } catch (error) {
            console.log('Error:', error);
            notification.error({ 
                message: 'Đổi mật khẩu thất bại',
                description: error.response?.data?.message || 'Có lỗi xảy ra'
            });
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleCancelChangePassword = () => {
        setShowChangePassword(false);
        passwordForm.resetFields();
    };

    useEffect(() => {
        (async () => {
            try {
                const response = await userApi.getProfile();
                console.log('User data:', response.user);
                localStorage.setItem("user", JSON.stringify(response.user));
                setUserData(response.user || {});
                setImageUrl(response.user?.image || '');
                form.setFieldsValue({
                    username: response.user?.username,
                    email: response.user?.email,
                    phone: response.user?.phone
                });

                //KIỂM TRA QUERY PARAMETER requirePhone
                const params = new URLSearchParams(location.search);
                const needPhone = params.get('requirePhone');
                
                if (needPhone === 'true') {
                    const hasPhone = response.user?.phone || response.user?.phoneNumber || response.user?.mobile;
                    
                    if (!hasPhone) {
                        console.log('📱 User needs to update phone number');
                        setRequirePhone(true);
                        setIsEditing(true); 
                        
                        // Hiển thị notification
                        notification.warning({
                            message: '⚠️ Cập nhật số điện thoại bắt buộc!',
                            description: 'Vui lòng thêm số điện thoại để tiếp tục sử dụng dịch vụ.',
                            placement: 'top',
                            duration: 0, 
                        });
                    } else {
                        history.replace('/profile');
                    }
                }
                
                setLoading(false);
            } catch (error) {
                console.log('Failed to fetch profile user:', error);
                setLoading(false);
            }
        })();
        window.scrollTo(0, 0);
    }, [location]); 

    return (
        <div className="profile-container">
            <Spin spinning={loading}>
                <div className="profile-wrapper">
                    <Row justify="center">
                        <Col xs={22} sm={18} md={14} lg={10} xl={8}>
                            {/* ALERT CỐ ĐỊNH KHI CẦN CẬP NHẬT SĐT */}
                            {requirePhone && !userData.phone && (
                                <Alert
                                    message={
                                        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                                            <PhoneOutlined style={{ marginRight: '8px' }} />
                                            Vui lòng cập nhật số điện thoại
                                        </span>
                                    }
                                    description="Tài khoản của bạn cần có số điện thoại để sử dụng đầy đủ tính năng hệ thống. Vui lòng nhập số điện thoại bên dưới và nhấn 'Lưu'."
                                    type="warning"
                                    showIcon
                                    closable={false}
                                    style={{ 
                                        marginBottom: '20px',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 1000,
                                        border: '2px solid #faad14',
                                        boxShadow: '0 2px 8px rgba(250, 173, 20, 0.2)'
                                    }}
                                />
                            )}

                            <Card hoverable className="profile-card">
                                <Row justify="center" style={{ marginBottom: 30 }}>
                                    <div style={{ position: 'relative' }}>
                                        <Avatar 
                                            size={150}
                                            src={imageUrl || userData.image}
                                            icon={<UserOutlined />}
                                            style={{ border: '4px solid #f0f0f0' }}
                                        />
                                        {isEditing && (
                                            <Upload
                                                name="image"
                                                showUploadList={false}
                                                beforeUpload={beforeUpload}
                                                onChange={handleImageChange}
                                                customRequest={({ file, onSuccess }) => {
                                                    const reader = new FileReader();
                                                    reader.onload = (e) => {
                                                        setImageUrl(e.target.result);
                                                        onSuccess({ url: e.target.result });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                            >
                                                <Button 
                                                    shape="circle"
                                                    icon={<CameraOutlined />}
                                                    size="large"
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 5,
                                                        right: 5,
                                                        backgroundColor: '#fff',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                                                    }}
                                                />
                                            </Upload>
                                        )}
                                    </div>
                                </Row>
                                
                                <Row justify="center">
                                    <Col span={24}>
                                        <Form
                                            form={form}
                                            layout="vertical"
                                        >
                                            <Form.Item
                                                label={<strong style={{ fontSize: 16 }}>Tên người dùng</strong>}
                                                name="username"
                                                rules={[{ required: true, message: 'Vui lòng nhập tên người dùng' }]}
                                                style={{ marginBottom: 20 }}
                                            >
                                                <Input 
                                                    size="large" 
                                                    placeholder="Nhập tên người dùng"
                                                    disabled={!isEditing}
                                                    className={!isEditing ? 'disabled-input' : ''}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                label={<strong style={{ fontSize: 16 }}>Email</strong>}
                                                name="email"
                                                style={{ marginBottom: 20 }}
                                            >
                                                <Input 
                                                    size="large"
                                                    disabled
                                                    className="disabled-input"
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                label={
                                                    <strong style={{ fontSize: 16 }}>
                                                        Số điện thoại
                                                        {requirePhone && !userData.phone && (
                                                            <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                                                        )}
                                                    </strong>
                                                }
                                                name="phone"
                                                rules={[
                                                    { validator: validatePhone }
                                                ]}
                                                style={{ marginBottom: 20 }}
                                                extra={
                                                    requirePhone && !userData.phone && (
                                                        <span style={{ color: '#faad14', fontSize: '13px' }}>
                                                            ⚠️ Trường này là bắt buộc
                                                        </span>
                                                    )
                                                }
                                            >
                                                <Input 
                                                    size="large"
                                                    placeholder="Nhập số điện thoại"
                                                    disabled={!isEditing}
                                                    className={!isEditing ? 'disabled-input' : ''}
                                                    maxLength={10}
                                                    prefix={isEditing ? <PhoneOutlined style={{ color: requirePhone && !userData.phone ? '#faad14' : 'rgba(0,0,0,.25)' }} /> : null}
                                                    style={requirePhone && !userData.phone ? { borderColor: '#faad14' } : {}}
                                                />
                                            </Form.Item>
                                        </Form>

                                        <Divider style={{ margin: '30px 0' }} />

                                        <Row justify="center" gutter={16} style={{ marginTop: 30 }}>
                                            {!isEditing ? (
                                                <>
                                                    <Col xs={24} sm={12} style={{ marginBottom: 10 }}>
                                                        <Button 
                                                            type="primary" 
                                                            size="large"
                                                            icon={<EditOutlined />}
                                                            onClick={handleEditProfile}
                                                            block
                                                        >
                                                            Chỉnh sửa
                                                        </Button>
                                                    </Col>
                                                    <Col xs={24} sm={12} style={{ marginBottom: 10 }}>
                                                        <Button 
                                                            type="primary" 
                                                            size="large"
                                                            icon={<LockOutlined />}
                                                            onClick={() => setShowChangePassword(true)}
                                                            block
                                                        >
                                                            Đổi mật khẩu
                                                        </Button>
                                                    </Col>
                                                </>
                                            ) : (
                                                <>
                                                    <Col xs={12}>
                                                        <Button 
                                                        
                                                            size="large"
                                                            onClick={handleCancel}
                                                            block
                                                            disabled={requirePhone && !userData.phone} 
                                                        >
                                                            Hủy
                                                        </Button>
                                                    </Col>
                                                    <Col xs={12}>
                                                        <Button 
                                                            type="primary" 
                                                            size="large"
                                                            icon={<SaveOutlined />}
                                                            onClick={handleSave}
                                                            block
                                                        >
                                                            Lưu
                                                        </Button>
                                                    </Col>
                                                </>
                                            )}
                                        </Row>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    </Row>
                </div>
            </Spin>

            {/* Modal đổi mật khẩu */}
            <Modal
                title="Đổi mật khẩu"
                visible={showChangePassword}
                onCancel={handleCancelChangePassword}
                footer={null}
                width={500}
                destroyOnClose
            >
                <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handleChangePassword}
                >
                    <Form.Item
                        label={<strong>Mật khẩu hiện tại</strong>}
                        name="currentPassword"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }
                        ]}
                    >
                        <Input.Password 
                            size="large"
                            prefix={<LockOutlined />}
                            placeholder="Nhập mật khẩu hiện tại"
                        />
                    </Form.Item>

                    <Form.Item
                        label={<strong>Mật khẩu mới</strong>}
                        name="newPassword"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                        ]}
                    >
                        <Input.Password 
                            size="large"
                            prefix={<LockOutlined />}
                            placeholder="Nhập mật khẩu mới"
                        />
                    </Form.Item>

                    <Form.Item
                        label={<strong>Xác nhận mật khẩu mới</strong>}
                        name="confirmPassword"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu không khớp!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password 
                            size="large"
                            prefix={<LockOutlined />}
                            placeholder="Xác nhận mật khẩu mới"
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: 30 }}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Button 
                                    size="large"
                                    onClick={handleCancelChangePassword}
                                    block
                                >
                                    Hủy
                                </Button>
                            </Col>
                            <Col span={12}>
                                <Button 
                                    type="primary" 
                                    htmlType="submit"
                                    size="large"
                                    block
                                    loading={passwordLoading}
                                >
                                    Đổi mật khẩu
                                </Button>
                            </Col>
                        </Row>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Profile;