import React, { useEffect, useState, useCallback } from 'react';
import styles from './header.module.css';
import userApi from "../../../apis/userApi";
import logo from "../../../assets/icon/logo.svg";
import DropdownAvatar from "../../DropdownMenu/dropdownMenu";
import { useHistory, NavLink } from "react-router-dom";
import { Layout, Avatar, Badge, Row, Col, List, Popover, Modal, Drawer, Select } from 'antd';
import { BellOutlined, NotificationTwoTone, BarsOutlined, ShoppingCartOutlined, UserOutlined } from '@ant-design/icons';
import axiosClient from "../../../apis/axiosClient";

const { Option } = Select;
const { Header } = Layout;

function Topbar() {
  const [countNotification, setCountNotification] = useState(0);
  const [notification, setNotification] = useState([]);
  const [visible, setVisible] = useState(false);
  const [visiblePopover, setVisiblePopover] = useState(false);
  const [titleNotification, setTitleNotification] = useState('');
  const [contentNotification, setContentNotification] = useState('');
  const [visibleDrawer, setVisibleDrawer] = useState(false);
  const [userData, setUserData] = useState(null);
  const [cart, setCart] = useState(0);

  const history = useHistory();

  const handleLink = (link) => {
    setVisibleDrawer(false);
    history.push(link);
  }

  const content = (
    <div>
      {notification && notification.length > 0 ? (
        notification.map((values, index) => {
          return (
            <div key={index}>
              <List.Item style={{ padding: 0, margin: 0 }}>
                <List.Item.Meta
                  style={{ width: 250, margin: 0 }}
                  avatar={<NotificationTwoTone style={{ fontSize: '20px', color: '#08c' }} />}
                  title={<a onClick={() => handleNotification(values.content, values.title)}>{values.title}</a>}
                  description={<p className={styles.fixLine} dangerouslySetInnerHTML={{ __html: values.content }}></p>}
                />
              </List.Item>
            </div>
          )
        })
      ) : (
        <p style={{ padding: '10px', textAlign: 'center', color: '#999' }}>Không có thông báo</p>
      )}
    </div>
  );

  const handleNotification = (valuesContent, valuesTitile) => {
    setVisible(true);
    setVisiblePopover(!visible)
    setContentNotification(valuesContent);
    setTitleNotification(valuesTitile);
  }

  const handleVisibleChange = (visible) => {
    setVisiblePopover(visible);
  };

  const handleOk = () => {
    setVisible(false);
  }

  const showDrawer = () => {
    setVisibleDrawer(true);
  };

  const onClose = () => {
    setVisibleDrawer(false);
  };

  const [selectedOption, setSelectedOption] = useState(null);
  const [selectOptions, setSelectOptions] = useState([]);

  const handleSelectChange = async (value) => {
    if (value) {
      setSelectedOption(value);
      console.log(value);
      history.push("/product-detail/" + value);
      window.location.reload();
    }
  };

  const updateSelectOptions = (newOptions) => {
    if (Array.isArray(newOptions) && newOptions.length > 0) {
      const updatedOptions = newOptions.map((option) => ({
        value: option._id,
        label: option.name,
      }));
      setSelectOptions(updatedOptions);
    } else {
      setSelectOptions([]);
    }
  };

  const handleSearch = async (value) => {
    if (!value || value.trim() === '') {
      setSelectOptions([]);
      return;
    }

    try {
      const response = await axiosClient.get(`/product/searchByName?name=${value}`);
      const data = response.data;
      
      if (data && data.docs) {
        updateSelectOptions(data.docs);
      } else {
        setSelectOptions([]);
      }
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
      setSelectOptions([]);
    }
  };

  // ✅ HÀM ĐỌC CART COUNT TỪ LOCALSTORAGE - DÙNG useCallback
  const getCartCount = useCallback(() => {
    try {
      const cartLength = localStorage.getItem('cartLength');
      const count = cartLength ? parseInt(cartLength, 10) : 0;
      console.log('📦 Getting cart count from localStorage:', count);
      return count;
    } catch (error) {
      console.error('Error reading cart length:', error);
      return 0;
    }
  }, []);

  // ✅ HÀM CẬP NHẬT CART COUNT - DÙNG useCallback
  const updateCartCount = useCallback(() => {
    const newCount = getCartCount();
    console.log('🔄 Updating cart count in state:', newCount);
    setCart(newCount);
  }, [getCartCount]);

  // ✅ EFFECT CHO USER PROFILE - CHỈ CHẠY 1 LẦN
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('client') || localStorage.getItem('token');
        
        if (token && token !== 'undefined' && token !== 'null') {
          console.log('🔑 Token found - fetching user profile...');
          
          try {
            const response = await userApi.getProfile();
            
            if (response && response.user) {
              setUserData(response.user);
              console.log('✅ User data loaded:', response.user);
            } else {
              setUserData(null);
            }
          } catch (profileError) {
            if (profileError?.response?.status === 401) {
              console.log('⚠️ Invalid token - clearing...');
              localStorage.removeItem('client');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
            setUserData(null);
          }
        } else {
          console.log('ℹ️ No token - browsing as guest');
          setUserData(null);
        }
        
        // ✅ LOAD CART COUNT LẦN ĐẦU
        updateCartCount();
        
      } catch (error) {
        console.log('⚠️ Error in header initialization:', error.message);
        setUserData(null);
        updateCartCount();
      }
    })();
  }, []); // ✅ EMPTY DEPENDENCY - CHỈ CHẠY 1 LẦN

  // ✅ EFFECT RIÊNG CHO EVENT LISTENERS - CẬP NHẬT KHI updateCartCount THAY ĐỔI
  useEffect(() => {
    console.log('🎧 Registering cart event listeners...');

    // ✅ LẮNG NGHE SỰ KIỆN CẬP NHẬT GIỎ HÀNG (CUSTOM EVENT)
    const handleCartUpdate = () => {
      console.log('🔔 Cart update event received!');
      updateCartCount();
    };

    // ✅ LẮNG NGHE STORAGE EVENT (KHI TAB KHÁC THAY ĐỔI)
    const handleStorageChange = (event) => {
      if (event.key === 'cartLength') {
        console.log('🔔 Storage change detected for cartLength');
        updateCartCount();
      }
    };

    // ✅ ĐĂNG KÝ EVENT LISTENERS
    window.addEventListener('cartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleStorageChange);

    // ✅ CLEANUP KHI COMPONENT UNMOUNT HOẶC updateCartCount THAY ĐỔI
    return () => {
      console.log('🧹 Cleaning up cart event listeners...');
      window.removeEventListener('cartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [updateCartCount]); // ✅ DEPENDENCY updateCartCount - TỰ ĐỘNG CẬP NHẬT

  return (
    <Header
      style={{ background: "#FFFFFF" }}
      className={styles.header}
    >
      <div className={styles.logoContainer}>
        <img 
          className={styles.logo}
          src={logo} 
          alt="Logo"
          onClick={() => handleLink("/home")}
          style={{ cursor: 'pointer' }}
        />
      </div>
      
      <BarsOutlined className={styles.bars} onClick={showDrawer} />
      
      <div className={styles.navmenu}>
        <NavLink className={styles.navlink} to="/home" activeClassName={styles.activeLink}>
          Trang chủ
        </NavLink>
        <NavLink className={styles.navlink} to="/product-list/643cd88879b4192efedda4e6" activeClassName={styles.activeLink}>
          Sản phẩm
        </NavLink>
        <NavLink className={styles.navlink} to="/news" activeClassName={styles.activeLink}>
          Tin tức
        </NavLink>
        <NavLink className={styles.navlink} to="/contact" activeClassName={styles.activeLink}>
          Liên hệ
        </NavLink>
        <Select
          showSearch
          className={styles.searchSelect}
          placeholder="Bạn tìm gì..."
          optionFilterProp="children"
          filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
          filterSort={(optionA, optionB) =>
            (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
          }
          options={selectOptions}
          onChange={handleSelectChange}
          onSearch={handleSearch}
          allowClear
          notFoundContent="Không tìm thấy sản phẩm"
        />
      </div>
      
      <div className={styles.logBtn}>
        <div className={styles.headerActions}>
          {/* ✅ LUÔN HIỂN THỊ GIỎ HÀNG (CHO CẢ GUEST VÀ USER) */}
          <div className={styles.actionLink} onClick={() => handleLink("/cart")}>
            <ShoppingCartOutlined className={styles.actionIcon} />
            <span className={styles.actionText}>Giỏ hàng</span>
            {cart > 0 && (
              <Badge 
                count={cart} 
                className={styles.cartBadge}
                overflowCount={99}
              />
            )}
          </div>
          
          {/* ✅ DROPDOWN AVATAR CHO LOGIN/PROFILE */}
          <div className={styles.actionLink}>
            <DropdownAvatar key="avatar" userData={userData} />
          </div>
        </div>
      </div>
      
      <Drawer 
        title="Menu" 
        placement="right" 
        onClose={onClose} 
        open={visibleDrawer}
        className={styles.drawerMenu}
      >
        <div className={styles.navmenu2}>
          <NavLink className={styles.navlink2} to="/home" activeClassName={styles.activeLink2} onClick={onClose}>
            Trang chủ
          </NavLink>
          <NavLink className={styles.navlink2} to="/product-list/643cd88879b4192efedda4e6" activeClassName={styles.activeLink2} onClick={onClose}>
            Sản phẩm
          </NavLink>
          <NavLink className={styles.navlink2} to="/news" activeClassName={styles.activeLink2} onClick={onClose}>
            Tin tức
          </NavLink>
          <NavLink className={styles.navlink2} to="/contact" activeClassName={styles.activeLink2} onClick={onClose}>
            Liên hệ
          </NavLink>
          
          {/* ✅ LUÔN HIỂN THỊ GIỎ HÀNG TRONG DRAWER */}
          <div className={styles.navlink2}>
            <div className={styles.drawerCart} onClick={() => handleLink("/cart")}>
              <ShoppingCartOutlined className={styles.drawerCartIcon} />
              <span>Giỏ hàng</span>
              {cart > 0 && (
                <Badge 
                  count={cart} 
                  overflowCount={99}
                  style={{ marginLeft: '10px' }}
                />
              )}
            </div>
          </div>
          
          <div className={styles.navlink2}>
            <DropdownAvatar key="avatar" userData={userData} />
          </div>
        </div>
      </Drawer>
      
      <Modal
        title={titleNotification}
        visible={visible}
        onOk={handleOk}
        onCancel={handleOk}
        cancelButtonProps={{ style: { display: 'none' } }}
      >
        <p dangerouslySetInnerHTML={{ __html: contentNotification }} ></p>
      </Modal>
    </Header>
  );
}

export default Topbar;