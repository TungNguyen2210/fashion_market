import React, { useState } from 'react';
import "./login.css";
import userApi from "../../apis/userApi";
import { useHistory, Link } from "react-router-dom";
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Form, Input, Button, Divider, Row, notification, Spin } from 'antd';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  let history = useHistory();

  // =====================================================
  // ĐĂNG NHẬP BẰNG EMAIL & PASSWORD
  // =====================================================
  const onFinish = async (values) => {
    setLoading(true);
    
    try {
      console.log('📧 Đang đăng nhập với email:', values.email);
      
      const response = await userApi.login(values.email, values.password);
      
      console.log('✅ Login response:', response);
      
      // ✅ KIỂM TRA response.success (không phải response.status)
      if (response && response.success === true && response.user) {
        
        // ✅ LƯU TOKEN VỚI CẢ 2 KEY
        if (response.token) {
          localStorage.setItem("client", response.token);
          localStorage.setItem("token", response.token); // ✅ THÊM DÒNG NÀY
          console.log('💾 Token saved to localStorage with both keys');
        }
        localStorage.setItem("user", JSON.stringify(response.user));
        
        // Hiển thị notification thành công
        notification.success({
          message: '✅ Đăng nhập thành công!',
          description: `Chào mừng ${response.user.username || response.user.name || response.user.email}`,
          placement: 'topRight',
          duration: 3,
        });
        
        // Reset form
        form.resetFields();
        
        // Redirect về trang chủ sau 500ms
        setTimeout(() => {
          history.push("/");
        }, 500);
        
      } else {
        // Đăng nhập thất bại
        notification.error({
          message: '❌ Đăng nhập thất bại!',
          description: response.message || 'Email hoặc mật khẩu không đúng',
          placement: 'topRight',
          duration: 4,
        });
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Xử lý lỗi từ backend
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Có lỗi xảy ra khi đăng nhập';
      
      notification.error({
        message: '❌ Lỗi đăng nhập!',
        description: errorMessage,
        placement: 'topRight',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GOOGLE LOGIN - XỬ LÝ THÀNH CÔNG
  // =====================================================
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    
    try {
      console.log('🔐 Google credential token:', credentialResponse.credential);
      
      // Gọi API backend để verify Google token
      const response = await userApi.googleLogin(credentialResponse.credential);
      
      console.log('✅ Google login response:', response);
      
      // ✅ KIỂM TRA response.success (không phải response.status)
      if (response && response.success === true && response.user) {
        
        // ✅ LƯU TOKEN VỚI CẢ 2 KEY
        if (response.token) {
          localStorage.setItem("client", response.token);
          localStorage.setItem("token", response.token); // ✅ THÊM DÒNG NÀY
          console.log('💾 Google token saved to localStorage with both keys');
        }
        localStorage.setItem("user", JSON.stringify(response.user));
        
        // Hiển thị notification thành công
        notification.success({
          message: '✅ Đăng nhập Google thành công!',
          description: `Chào mừng ${response.user.name || response.user.username || response.user.email}`,
          placement: 'topRight',
          duration: 3,
        });
        
        // Redirect về trang chủ
        console.log('🔄 Redirecting to home page...');
        setTimeout(() => {
          history.push("/");
        }, 500);
        
      } else {
        // Đăng nhập thất bại
        console.error('❌ Google login failed - response.success is not true');
        notification.error({
          message: '❌ Đăng nhập Google thất bại!',
          description: response.message || 'Bạn không có quyền truy cập',
          placement: 'topRight',
          duration: 4,
        });
      }
      
    } catch (error) {
      console.error('❌ Google login error:', error);
      
      // Xử lý lỗi
      const errorMessage = error.response?.data?.message 
        || error.message 
        || 'Có lỗi xảy ra khi đăng nhập bằng Google';
      
      notification.error({
        message: '❌ Lỗi đăng nhập Google!',
        description: errorMessage,
        placement: 'topRight',
        duration: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // GOOGLE LOGIN - XỬ LÝ THẤT BẠI
  // =====================================================
  const handleGoogleError = () => {
    console.error('❌ Google login failed or cancelled');
    
    notification.warning({
      message: '⚠️ Đăng nhập Google thất bại!',
      description: 'Bạn đã hủy đăng nhập hoặc có lỗi xảy ra. Vui lòng thử lại hoặc sử dụng email/mật khẩu.',
      placement: 'topRight',
      duration: 4,
    });
  };

  // =====================================================
  // XỬ LÝ LỖI HÌNH ẢNH
  // =====================================================
  const handleImageError = (e) => {
    console.log('⚠️ Image failed to load, using fallback');
    e.target.onerror = null; // Ngăn infinite loop
    e.target.src = "https://cdni.iconscout.com/illustration/premium/thumb/user-account-sign-up-4489360-3723267.png";
  };

  // =====================================================
  // RENDER UI
  // =====================================================
  return (
    <div className="login-page">
      <div className="login-box">
        
        {/* ===== HÌNH ẢNH MINH HỌA - CẢI TIẾN VỚI FALLBACK ===== */}
        <div className="illustration-wrapper">
          <img 
            src="https://mixkit.imgix.net/art/preview/mixkit-left-handed-man-sitting-at-a-table-writing-in-a-notebook-27-original-large.png?q=80&auto=format%2Ccompress&h=700" 
            alt="Login Illustration"
            onError={handleImageError}
          />
        </div>

        {/* ===== FORM ĐĂNG NHẬP ===== */}
        <Form
          form={form}
          name="login-form"
          onFinish={onFinish}
          layout="vertical"
          autoComplete="off"
        >
          {/* ===== TIÊU ĐỀ ===== */}
          <p className="form-title">Chào mừng trở lại</p>
          <p>Đăng nhập vào tài khoản của bạn</p>

          {/* ===== INPUT EMAIL ===== */}
          <Form.Item
            name="email"
            rules={[
              { 
                required: true, 
                message: 'Vui lòng nhập email!' 
              },
              { 
                type: 'email', 
                message: 'Email không hợp lệ!' 
              }
            ]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Email" 
              size="large"
              disabled={loading}
              autoComplete="email"
            />
          </Form.Item>

          {/* ===== INPUT PASSWORD ===== */}
          <Form.Item
            name="password"
            rules={[
              { 
                required: true, 
                message: 'Vui lòng nhập mật khẩu!' 
              },
              {
                min: 6,
                message: 'Mật khẩu phải có ít nhất 6 ký tự!'
              }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
              placeholder="Mật khẩu"
              size="large"
              disabled={loading}
              autoComplete="current-password"
            />
          </Form.Item>

          {/* ===== NÚT ĐĂNG NHẬP ===== */}
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              size="large"
              loading={loading}
              disabled={loading}
            >
              {loading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
            </Button>
          </Form.Item>

          {/* ===== DIVIDER ===== */}
          <Divider plain>hoặc</Divider>

          {/* ===== GOOGLE LOGIN BUTTON ===== */}
          <Form.Item>
            <Row justify="center">
              <div style={{ width: '100%', maxWidth: '400px' }}>
                {loading ? (
                  // Hiển thị loading khi đang xử lý
                  <div style={{ textAlign: 'center', padding: '10px' }}>
                    <Spin tip="Đang xử lý..." />
                  </div>
                ) : (
                  // Nút Google Login
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="outline"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    width="100%"
                    locale="vi"
                    useOneTap={false}
                  />
                )}
              </div>
            </Row>
          </Form.Item>

          {/* ===== LINK ĐĂNG KÝ ===== */}
          <p className="text-center" style={{ marginTop: '20px' }}>
            Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
          </p>

          {/* ===== LINK QUÊN MẬT KHẨU (OPTIONAL) ===== */}
          <p className="text-center" style={{ marginTop: '10px' }}>
            <Link to="/forgot-password">Quên mật khẩu?</Link>
          </p>

        </Form>
      </div>
    </div>
  );
};

export default Login;