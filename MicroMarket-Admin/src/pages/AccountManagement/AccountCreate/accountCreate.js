import React, { useState, useEffect } from "react";
import axiosClient from "../../../apis/axiosClient";
import { useHistory } from 'react-router-dom';
import { Button, Form, Input, Spin, notification, Select } from 'antd';
import "./accountCreate.css";

const { Option } = Select;

const AccountCreate = () => {
    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();

    const history = useHistory();

    const accountCreate = async (values) => {
        setLoading(true);
        try {
            const formatData = {
                "username": values.name,
                "email": values.email,
                "phone": values.phone,
                "password": values.password,
                "role": values.role,
                "status": "actived"
            }
            
            const response = await axiosClient.post("/user", formatData);
            
            console.log('Response success:', response);
            
            // Trường hợp thành công
            notification["success"]({
                message: `Thành công`,
                description: 'Tạo tài khoản thành công!',
            });
            form.resetFields();
            history.push("/account-management");

        } catch (error) {
            console.error('Error creating account:', error);
            
            // Xử lý khi có lỗi từ server
            if (error.response) {
                const errorData = error.response.data;
                const errorMessage = typeof errorData === 'string' ? errorData : errorData.message;
                
                console.log('Error status:', error.response.status);
                console.log('Error data:', errorData);
                console.log('Error message:', errorMessage);
                
                // Kiểm tra status code 400 và message
                if (error.response.status === 400) {
                    if (errorMessage === 'User already exists') {
                        notification["error"]({
                            message: `Email đã tồn tại`,
                            description: 'Email này đã được đăng ký trong hệ thống. Vui lòng sử dụng email khác!',
                            duration: 5,
                        });
                    } else if (errorMessage && errorMessage.includes("Email has already been taken") && errorMessage.includes("Phone has already been taken")) {
                        notification["error"]({
                            message: `Thông tin đã tồn tại`,
                            description: 'Email và số điện thoại đã được đăng ký. Vui lòng sử dụng thông tin khác!',
                            duration: 5,
                        });
                    } else if (errorMessage && errorMessage.includes("Email has already been taken")) {
                        notification["error"]({
                            message: `Email đã tồn tại`,
                            description: 'Email này đã được đăng ký. Vui lòng sử dụng email khác!',
                            duration: 5,
                        });
                    } else if (errorMessage && errorMessage.includes("Phone has already been taken")) {
                        notification["error"]({
                            message: `Số điện thoại đã tồn tại`,
                            description: 'Số điện thoại này đã được đăng ký. Vui lòng sử dụng số khác!',
                            duration: 5,
                        });
                    } else {
                        notification["error"]({
                            message: `Lỗi`,
                            description: errorMessage || 'Tạo tài khoản thất bại. Vui lòng kiểm tra lại thông tin!',
                            duration: 5,
                        });
                    }
                } else {
                    // Các lỗi khác (500, 403, etc.)
                    notification["error"]({
                        message: `Lỗi ${error.response.status}`,
                        description: errorMessage || 'Đã có lỗi xảy ra. Vui lòng thử lại!',
                        duration: 5,
                    });
                }
            } else if (error.request) {
                // Request được gửi nhưng không nhận được response
                notification["error"]({
                    message: `Lỗi kết nối`,
                    description: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng!',
                    duration: 5,
                });
            } else {
                // Lỗi khác
                notification["error"]({
                    message: `Lỗi`,
                    description: error.message || 'Đã có lỗi xảy ra. Vui lòng thử lại!',
                    duration: 5,
                });
            }
        } finally {
            setLoading(false);
        }
    }

    const CancelCreateRecruitment = () => {
        form.resetFields();
        history.push("/account-management");
    }

    useEffect(() => {
        setTimeout(function () {
            setLoading(false);
        }, 500);
    }, [])

    return (
        <div className="create_account">
            <h1 style={{ 
                borderRadius: 1, 
                marginTop: 40, 
                marginBottom: 0, 
                padding: 15, 
                color: "#FFFFFF", 
                background: "linear-gradient(-135deg, #000000, #000000)" 
            }}>
                Tạo tài khoản
            </h1>
            <div className="create_account__dialog">
                <Spin spinning={loading}>
                    <Form
                        form={form}
                        onFinish={accountCreate}
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
                            hasFeedback
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập tên!',
                                },
                                { max: 100, message: 'Tên tối đa 100 ký tự' },
                                { min: 5, message: 'Tên ít nhất 5 ký tự' },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Tên" />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email"
                            hasFeedback
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
                            name="phone"
                            label="Số điện thoại"
                            hasFeedback
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập số điện thoại!',
                                },
                                {
                                    pattern: /^[0-9]{10}$/,
                                    message: "Số điện thoại phải có 10 chữ số và chỉ chứa số",
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Số điện thoại" />
                        </Form.Item>

                        <Form.Item
                            name="role"
                            label="Vai trò"
                            hasFeedback
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn vai trò!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select placeholder="Chọn vai trò">
                                <Option value="isAdmin">Quản lý</Option>
                                <Option value="isClient">Khách hàng</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            hasFeedback
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập mật khẩu!',
                                },
                                { max: 20, message: 'Mật khẩu tối đa 20 ký tự' },
                                { min: 6, message: 'Mật khẩu ít nhất 6 ký tự' },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input.Password placeholder="Mật khẩu" />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            label="Xác nhận mật khẩu"
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng xác nhận mật khẩu!',
                                },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                    },
                                }),
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input.Password placeholder="Nhập lại mật khẩu" />
                        </Form.Item>

                        <Form.Item>
                            <Button 
                                style={{ 
                                    background: "#000000", 
                                    color: '#FFFFFF', 
                                    float: 'right', 
                                    marginTop: 20, 
                                    marginLeft: 8 
                                }} 
                                htmlType="submit"
                            >
                                Hoàn thành
                            </Button>
                            <Button 
                                style={{ 
                                    background: "#000000", 
                                    color: '#FFFFFF', 
                                    float: 'right', 
                                    marginTop: 20 
                                }} 
                                onClick={CancelCreateRecruitment}
                            >
                                Hủy
                            </Button>
                        </Form.Item>
                    </Form>
                </Spin>
            </div>
        </div>
    )
}

export default AccountCreate;