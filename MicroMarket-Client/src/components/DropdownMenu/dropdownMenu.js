import React, { useEffect, useState } from 'react';
import { Avatar, Dropdown, Row, notification } from 'antd';
import { Menu } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useHistory } from "react-router-dom";
import styles from '../layout/Header/header.module.css'
import userApi from "../../apis/userApi";

// ✅ NHẬN userData TỪ PROPS
function DropdownAvatar({ userData }) {
  const [isLogin, setIsLogin] = useState(false);
  let history = useHistory();

  const Logout = async () => {
    try {
      console.log('🚪 Đang đăng xuất...');
      
      localStorage.removeItem('client');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      notification.success({
        message: '✅ Đăng xuất thành công!',
        description: 'Bạn có thể tiếp tục xem sản phẩm',
        placement: 'topRight',
        duration: 2,
      });
      
      setTimeout(() => {
        window.location.href = '/home';
      }, 500);
      
      console.log('✅ Đăng xuất hoàn tất');
      
    } catch (error) {
      console.error('❌ Logout error:', error);
      localStorage.removeItem('client');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      notification.warning({
        message: '⚠️ Đăng xuất',
        description: 'Đã đăng xuất khỏi hệ thống',
        placement: 'topRight',
        duration: 2,
      });
      
      window.location.href = '/home';
    }
  }

  const Login = () => {
    history.push("/login");
  }

  const handleRouter = (link) => {
    history.push(link);
  }

  // ✅ KIỂM TRA ĐĂNG NHẬP DỰA VÀO userData HOẶC TOKEN
  useEffect(() => {
    const token = localStorage.getItem("client") || localStorage.getItem("token");
    
    if (userData || (token && token !== 'undefined' && token !== 'null')) {
      setIsLogin(true);
      console.log('✅ User is logged in');
    } else {
      setIsLogin(false);
      console.log('ℹ️ User is not logged in');
    }
  }, [userData])

  // ✅ HÀM FORMAT TÊN NGƯỜI DÙNG
  const formatUserName = (name) => {
    if (!name) return '';
    if (name.length <= 15) return name;
    return `${name.substring(0, 12)}...`;
  };

  const avatarPrivate = (
    <Menu>
      <Menu.Item icon={<UserOutlined />}>
        <a onClick={() => handleRouter("/profile")}>
          Trang cá nhân
        </a>
      </Menu.Item>
      <Menu.Item icon={<ShoppingCartOutlined />}>
        <a onClick={() => handleRouter("/cart-history")}>
          Quản lý đơn hàng
        </a>
      </Menu.Item>
      <Menu.Item key="3" icon={<LogoutOutlined />} onClick={Logout} danger>
        <a>
          Đăng xuất
        </a>
      </Menu.Item>
    </Menu>
  );

  return (
    <div>
      {isLogin ?
        <Dropdown key="avatar" placement="bottomCenter" overlay={avatarPrivate} arrow>
          <Row
            style={{
              paddingLeft: 5, paddingRight: 8, cursor: 'pointer'
            }}
            className={styles.container}
          >
            <div style={{ display: 'flex', alignItems: "center", justifyContent: "center", gap: '8px' }}>
              <UserOutlined style={{ fontSize: '18px' }} />
              <p style={{ padding: 0, margin: 0, textTransform: 'capitalize', color: "#000000" }}>
                {formatUserName(userData?.username || userData?.name || 'User')}
              </p>
            </div>
          </Row>
        </Dropdown>
        :
        <span
          className={styles.loginSpan}
          onClick={Login}
          style={{color: '#000000', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'}}
        >
          <UserOutlined style={{ fontSize: '16px' }} />
          Đăng nhập
        </span>
      }
    </div>
  );
};

export default DropdownAvatar;