import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    (async () => {
      try {
        const response = await userApi.getProfile();
        const cartLength = localStorage.getItem('cartLength');
        console.log('Cart length from localStorage:', cartLength);
        
        setCart(cartLength ? parseInt(cartLength, 10) : 0);
        setUserData(response || null);
      } catch (error) {
        console.log('Failed to fetch profile user:' + error);
        setUserData(null);
        setCart(0);
      }
    })();
  }, [])

  // Hàm xử lý tên người dùng dài
  const formatUserName = (name) => {
    if (!name) return '';
    if (name.length <= 15) return name;
    return `${name.substring(0, 12)}...`;
  };

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
          
          <div className={styles.actionLink}>
            <DropdownAvatar key="avatar" />
            {userData && userData.username && (
              <span className={styles.actionText} title={userData.username}>
                {formatUserName(userData.username)}
              </span>
            )}
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
            <DropdownAvatar key="avatar" />
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