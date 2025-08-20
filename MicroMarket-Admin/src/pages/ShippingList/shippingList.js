import React, { useEffect, useMemo, useState } from 'react';
import {
  BackTop, Breadcrumb, Button, Col, Drawer, Empty, Form, Input, Modal,
  Row, Select, Space, Spin, Table, Tag, notification, Card, Statistic, DatePicker, Avatar, Typography, List
} from 'antd';
import {
  HomeOutlined, CarOutlined, ReloadOutlined, PlusOutlined, EyeOutlined,
  EditOutlined, DeleteOutlined, FileTextOutlined, PrinterOutlined, BugOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import './shippingList.css';
import orderApi from "../../apis/orderApi";
import axiosClient from '../../apis/axiosClient';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text } = Typography;

// ====== Generate auto ship code ======
const SEQ_KEY = 'shipping_seq_v1';

const nextSequence = () => {
  const n = Number(localStorage.getItem(SEQ_KEY) || 0) + 1;
  localStorage.setItem(SEQ_KEY, String(n));
  return n;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const genShipCode = (orderId) => {
  const suffix = String(Math.floor(1000 + Math.random() * 9000)); // 4 số ngẫu nhiên
  return `SHP${(orderId || '').slice(-6).toUpperCase()}-${suffix}`;
};

/* ====== public tracking URL (mở ngoài) ====== */
const buildTrackingUrl = (carrier, trackingNumber) => {
  if (!carrier || !trackingNumber) return null;
  const c = carrier.toLowerCase();
  if (c === 'ghn') return `https://donhang.ghn.vn/?order_code=${encodeURIComponent(trackingNumber)}`;
  if (c === 'ghtk') return `https://i.ghtk.vn/${encodeURIComponent(trackingNumber)}`;
  if (c === 'j&t' || c === 'jt') return `https://www.jtexpress.vn/vi/tracking?billcode=${encodeURIComponent(trackingNumber)}`;
  if (c === 'vnpost') return `https://www.vnpost.vn/tra-cuu-hanh-trinh?key=${encodeURIComponent(trackingNumber)}`;
  return null;
};

/* ====== NO-API: localStorage store ====== */
const LS_KEY = 'shipping_map_v1';

const getMap = () => { 
  try { 
    return JSON.parse(localStorage.getItem(LS_KEY)) || {}; 
  } catch (e) { 
    console.error("Lỗi khi đọc localStorage:", e);
    return {}; 
  } 
};

const saveMap = (m) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(m));
  } catch (e) {
    console.error("Lỗi khi lưu localStorage:", e);
  }
};

const getAll = () => Object.entries(getMap()).map(([orderId, v]) => ({ _id: orderId, orderId, ...v }));

const getOne = (orderId) => getMap()[orderId];

const setOne = (orderId, data) => {
  const now = new Date().toISOString();
  const m = getMap();
  const prev = m[orderId] || {};
  m[orderId] = { 
    ...prev, 
    ...data, 
    status: data.status || prev.status || 'created', 
    createdAt: prev.createdAt || now, 
    updatedAt: now 
  };
  saveMap(m);
  return m[orderId];
};

const removeOne = (orderId) => { 
  const m = getMap(); 
  delete m[orderId]; 
  saveMap(m); 
};

/* ====== UI constants ====== */
const STATUS = {
  created: { color: 'default', text: 'Tạo vận đơn' },
  picking: { color: 'purple', text: 'Đang lấy hàng' },
  out_for_delivery: { color: 'gold', text: 'Đang giao' },
  delivered: { color: 'green', text: 'Đã giao' },
  failed: { color: 'red', text: 'Giao thất bại' },
  returned: { color: 'volcano', text: 'Hoàn hàng' },
};

const CARRIERS = ['ghn', 'ghtk', 'j&t', 'vnpost'];

/* ====== sync trạng thái Shipment -> Order ====== */
const mapShipmentToOrder = (shipStatus) => {
  switch (shipStatus) {
    case 'created':
    case 'picking':
      return 'pending';        // Đợi xác nhận
    case 'out_for_delivery':
      return 'approved';       // Đang vận chuyển
    case 'delivered':
      return 'final';          // Đã giao
    case 'failed':
    case 'returned':
      return 'rejected';       // Đã hủy
    default:
      return undefined;
  }
};

// Lấy chi tiết đơn hàng từ backend - ĐÃ SỬA ĐỔI
const fetchOrderDetail = async (orderId) => {
  try {
    console.log(`[DEBUG] Đang lấy thông tin đơn hàng: ${orderId}`);
    
    // Gọi API với đúng endpoint
    // Lưu ý: axiosClient đã được cấu hình để trả về response.data trực tiếp
    const orderData = await axiosClient.get(`/order/shipping/${orderId}`);
    
    console.log('[DEBUG] API response:', orderData);
    
    // Kiểm tra dữ liệu
    if (!orderData || !orderData._id) {
      throw new Error('API không trả về dữ liệu hợp lệ');
    }
    
    // Xử lý thông tin người dùng
    const user = orderData.user || {};
    
    // Chuyển đổi dữ liệu theo cấu trúc mà component cần
    return {
      customerName: user.username || 'Khách hàng',
      customerEmail: user.email || '',
      customerPhone: user.phone || '',
      address: orderData.address || '',
      products: orderData.products || [],
      orderTotal: orderData.orderTotal || 0
    };
  } catch (error) {
    console.error('[ERROR] Lỗi khi lấy thông tin đơn hàng:', error);
    notification.warning({ message: 'Không lấy được thông tin đơn hàng để đồng bộ' });
    
    // Thử API backup (endpoint khác)
    try {
      console.log(`[DEBUG] Thử API backup cho OrderID: ${orderId}`);
      const order = await axiosClient.get(`/order/${orderId}`);
      
      console.log(`[DEBUG] Dữ liệu từ API backup:`, order);
      
      if (!order) {
        throw new Error('API backup không trả về dữ liệu');
      }
      
      // Xử lý thông tin user
      let user = order.user || {};
      let username = '';
      let email = '';
      let phone = '';
      
      // Nếu user là object có username
      if (typeof user === 'object' && user.username) {
        username = user.username;
        email = user.email || '';
        phone = user.phone || '';
      } 
      // Nếu user là object MongoDB với $oid
      else if (typeof user === 'object' && user.$oid) {
        username = 'User';
        try {
          const userData = await axiosClient.get(`/user/${user.$oid}`);
          if (userData?.username) {
            username = userData.username;
            email = userData.email || '';
            phone = userData.phone || '';
          }
        } catch (err) {
          console.error('Không lấy được thông tin user:', err);
        }
      } 
      // Nếu user là string (có thể là username hoặc id)
      else if (typeof user === 'string') {
        username = user;
      }
      
      // Xử lý thông tin sản phẩm
      let products = [];
      
      if (Array.isArray(order.products)) {
        // Trường hợp products là mảng chuỗi (tên sản phẩm)
        if (order.products.length > 0 && typeof order.products[0] === 'string') {
          products = order.products.map((name, index) => ({
            product: {
              _id: `product-${index}`,
              name,
              image: null
            },
            quantity: 1,
            price: Math.round(order.orderTotal / order.products.length),
            color: '#CCCCCC',
            size: '-'
          }));
        } 
        // Trường hợp products là mảng object
        else {
          products = order.products.map(item => {
            // Xử lý trường hợp product là Object
            let productData = item.product || {};
            
            if (typeof productData === 'string' || (productData && productData.$oid)) {
              const productId = typeof productData === 'string' ? productData : productData.$oid;
              return {
                ...item,
                product: {
                  _id: productId,
                  name: 'Sản phẩm',
                  image: null
                }
              };
            }
            
            return {
              ...item,
              product: {
                ...productData,
                name: productData.name || 'Sản phẩm',
                image: productData.image || productData.thumbnail || null
              }
            };
          });
        }
      }
      
      return {
        customerName: username || 'Khách hàng',
        customerEmail: email || '',
        customerPhone: phone || '',
        address: order?.address || '',
        products: products || [],
        orderTotal: order?.orderTotal || 0
      };
    } catch (fallbackErr) {
      console.error('Lỗi khi sử dụng API fallback:', fallbackErr);
      // Trả về giá trị mặc định để tránh lỗi UI
      return { 
        customerName: 'Khách hàng', 
        customerEmail: '', 
        customerPhone: '', 
        address: '',
        products: [],
        orderTotal: 0
      };
    }
  }
};

const updateOrderStatus = async (orderId, shipStatus, note = '') => {
  const next = mapShipmentToOrder(shipStatus);
  if (!next) return;
  
  try {
    await axiosClient.put(`/order/${orderId}`, { status: next, description: note });
    console.log(`[DEBUG] Đã cập nhật trạng thái đơn hàng ${orderId} thành ${next}`);
  } catch (e) {
    console.error('Lỗi khi cập nhật trạng thái đơn hàng:', e);
    notification.warning({ message: 'Không cập nhật được trạng thái đơn hàng' });
  }
};

/* ====== tiny helpers ====== */
const useQuery = () => {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
};

// Hiển thị màu sắc
const renderColorInfo = (color) => {
  if (!color || color === '-') return '-';
  
  const colorStyle = {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    marginRight: '5px',
    verticalAlign: 'middle',
    border: '1px solid #ddd',
    backgroundColor: color.startsWith('#') ? color : `#${color}`
  };
  
  return (
    <>
      <span style={colorStyle}></span>
      {color}
    </>
  );
};

// Hiển thị kích thước
const renderSizeInfo = (item) => {
  const size = item.size || 
               (item.product?.size) || 
               (item.product?.details && item.product?.details.size) || 
               '-';
  return size;
};

export default function ShippingList() {
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    q: '',
    carrier: undefined,
    status: undefined,
    dateFrom: undefined,
    dateTo: undefined,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Create/Update
  const [openCU, setOpenCU] = useState(false);
  const [formCU] = Form.useForm();
  const [editing, setEditing] = useState(null);
  const [orderId, setOrderId] = useState('');

  // Tracking Drawer
  const [openTrack, setOpenTrack] = useState(false);
  const [trackInfo, setTrackInfo] = useState(null);

  // Chi tiết đơn hàng
  const [orderDetail, setOrderDetail] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  const query = useQuery();

  // Check if value is missing
  const isMissing = (v) => v == null || v === '' || v === '-';
  
  // Hàm debug dữ liệu
  const debugShippingData = () => {
    const allData = getAll();
    console.log('[DEBUG] Tất cả dữ liệu trong localStorage:', allData);
    
    notification.info({ 
      message: 'Thông tin debug', 
      description: `Hiện có ${allData.length} đơn hàng trong localStorage. Chi tiết đã được ghi vào console.`,
      duration: 5 
    });
    
    // Kiểm tra kết nối API
    const testId = '68a102f1a1094961090bb48c'; // ID mẫu từ JSON của bạn
    axiosClient.get(`/order/shipping/${testId}`)
      .then(res => {
        console.log('[DEBUG] Test API response:', res);
        notification.success({ 
          message: 'Test API thành công', 
          description: 'Đã nhận được dữ liệu từ API. Xem chi tiết trong console.' 
        });
      })
      .catch(err => {
        console.error('[ERROR] Test API failed:', err);
        notification.error({ 
          message: 'Test API thất bại', 
          description: `Lỗi: ${err.message || 'Không xác định'}`
        });
      });
  };
  
  // Xóa và reset dữ liệu
  const resetAllData = () => {
    if (window.confirm('Xóa toàn bộ dữ liệu vận đơn trong localStorage và tải lại trang?')) {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(SEQ_KEY);
      notification.success({ message: 'Đã xóa toàn bộ dữ liệu vận đơn' });
      setTimeout(() => window.location.reload(), 1000);
    }
  };
  
  // HÀM FETCH LIST ĐÃ SỬA ĐỔI
  const fetchList = async (p = page, l = limit) => {
    setLoading(true);
    const docsRaw = getAll();
    
    // Xử lý từng đơn hàng một thay vì Promise.all
    for (const d of docsRaw) {
      let changed = false;
      
      // Tạo mã vận đơn nếu chưa có
      if (!d.shipCode) {
        d.shipCode = genShipCode(d.orderId);
        changed = true;
      }
      
      // Kiểm tra thông tin khách hàng thiếu
      if (
        isMissing(d.customerName) ||
        isMissing(d.address) ||
        isMissing(d.customerEmail) ||
        isMissing(d.customerPhone)
      ) {
        try {
          console.log(`[DEBUG] Lấy thông tin cho đơn hàng: ${d.orderId}`);
          const info = await fetchOrderDetail(d.orderId);
          console.log(`[DEBUG] Thông tin nhận được:`, info);
          
          // Chỉ cập nhật khi có thông tin
          if (info && (info.customerName || info.address || info.customerEmail || info.customerPhone)) {
            d.customerName = info.customerName || 'Khách hàng';
            d.customerEmail = info.customerEmail || '';
            d.customerPhone = info.customerPhone || '';
            d.address = info.address || '';
            d.products = info.products || [];
            d.orderTotal = info.orderTotal || 0;
            
            if (!d.shipper) d.shipper = 'Nguyễn Văn A';
            changed = true;
            console.log(`[DEBUG] Đã cập nhật thông tin cho đơn hàng: ${d.orderId}`);
          } else {
            console.warn(`[DEBUG] Không nhận được thông tin hợp lệ cho đơn hàng: ${d.orderId}`);
          }
        } catch (error) {
          console.error(`[ERROR] Lỗi khi lấy thông tin cho đơn hàng ${d.orderId}:`, error);
        }
      }
      
      // Lưu lại nếu có thay đổi
      if (changed) {
        setOne(d.orderId, d);
      }
    }
    
    // Filter theo điều kiện lọc
    const docs = docsRaw.filter(d => {
      const okQ =
        !filters.q ||
        (d.orderId || '').toLowerCase().includes(filters.q.toLowerCase()) ||
        (d.trackingNumber || '').toLowerCase().includes(filters.q.toLowerCase());
      const okCarrier = !filters.carrier || d.carrier === filters.carrier;
      const okStatus = !filters.status || d.status === filters.status;
      const baseTime = new Date(d.updatedAt || d.createdAt || Date.now()).getTime();
      const okDate =
        (!filters.dateFrom && !filters.dateTo) ||
        (
          (!filters.dateFrom || baseTime >= new Date(filters.dateFrom).getTime()) &&
          (!filters.dateTo || baseTime <= new Date(filters.dateTo).getTime())
        );
      return okQ && okCarrier && okStatus && okDate;
    });
    
    // Phân trang
    const start = (p - 1) * l;
    const pageDocs = docs.slice(start, start + l);
    setShipments(pageDocs);
    setTotal(docs.length);
    setPage(p);
    setLimit(l);
    setLoading(false);
  };
  
  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, []);
  
  // Xử lý tham số URL createFor
  useEffect(() => {
    const oid = query.get('createFor');
    if (oid) {
      openCreate();
      setOrderId(oid);
    }
    // eslint-disable-next-line
  }, [query]);
  
  // Hàm xử lý filter
  const onFilter = () => fetchList(1, limit);
  const onReset = () => {
    setFilters({ q: '', carrier: undefined, status: undefined, dateFrom: undefined, dateTo: undefined });
    fetchList(1, limit);
  };
  
  // Mở modal tạo mới
  const openCreate = () => {
    setEditing(null);
    formCU.resetFields();
    
    const newCode = genShipCode(orderId);
    formCU.setFieldsValue({
      status: 'created',
      shipCode: newCode,
    });
    
    setOpenCU(true);
  };
  
  // Mở modal chỉnh sửa
  const openEdit = (record) => {
    setEditing(record);
    setOrderId(record.orderId);
    const code = record.shipCode || genShipCode();
    formCU.setFieldsValue({
      carrier: record.carrier,
      serviceCode: record.serviceCode,
      trackingNumber: record.trackingNumber,
      weight: record.weight,
      notes: record.notes,
      status: record.status || 'created',
      shipCode: code,
    });
    setOpenCU(true);
  };
  
  // Submit tạo/cập nhật vận đơn
  const submitCU = async () => {
    try {
      const vals = await formCU.validateFields();
      if (!orderId) {
        notification.warning({ message: 'Vui lòng chọn đơn hàng' });
        return;
      }
      
      let backendStatus = null;
      try {
        const order = await axiosClient.get(`/order/${orderId}`);
        backendStatus = order?.status;
      } catch (e) {
        console.error('Lỗi khi kiểm tra trạng thái đơn hàng:', e);
      }
      
      if (backendStatus && !(backendStatus === 'pending' || backendStatus === 'đang xác nhận')) {
        notification.warning({ message: 'Chỉ đơn đang xác nhận mới được tạo vận đơn' });
        return;
      }
      
      // Lấy thông tin đơn hàng
      const info = await fetchOrderDetail(orderId);
      console.log('Thông tin đơn hàng cho submitCU:', info);
      const current = getOne(orderId);
      const shipCode = (vals.shipCode || '').trim() || current?.shipCode || genShipCode(orderId);
      
      // Lưu vận đơn
      setOne(orderId, {
        ...vals,
        orderId,
        shipCode,
        shipper: vals.shipper || current?.shipper || 'Nguyễn Văn A',
        
        customerName: info.customerName,
        customerEmail: info.customerEmail,
        customerPhone: info.customerPhone,
        address: info.address,
        products: info.products,
        orderTotal: info.orderTotal
      });
      
      // Đồng bộ trạng thái đơn hàng
      await updateOrderStatus(orderId, vals.status || 'created', editing ? 'Cập nhật vận đơn' : 'Tạo vận đơn');
      
      notification.success({ message: editing ? 'Cập nhật vận đơn thành công' : 'Tạo vận đơn thành công' });
      setOpenCU(false);
      fetchList(page, limit);
    } catch (error) {
      console.error('Lỗi khi lưu vận đơn:', error);
      notification.error({ message: editing ? 'Cập nhật vận đơn lỗi' : 'Tạo vận đơn lỗi' });
    }
  };
  
  // Xóa vận đơn
  const removeShipment = async (id) => {
    removeOne(id);
    await updateOrderStatus(id, 'created', 'Xoá vận đơn: chuyển về Đợi xác nhận');
    notification.success({ message: 'Xoá vận đơn' });
    fetchList(page, limit);
  };
  
  // Xem tracking
  const viewTracking = (oid) => {
    const ship = getOne(oid);
    if (!ship) return notification.warning({ message: 'Đơn này chưa có thông tin vận chuyển' });
    setTrackInfo({ orderId: oid, ...ship });
    setOpenTrack(true);
  };
  
  // Xem chi tiết đơn hàng
  const viewOrderDetail = async (oid) => {
    setLoading(true);
    try {
      const orderData = await fetchOrderDetail(oid);
      console.log('Chi tiết đơn hàng:', orderData);
      setOrderDetail({ orderId: oid, ...orderData });
      setShowOrderDetail(true);
    } catch (error) {
      console.error('Lỗi khi lấy thông tin chi tiết đơn hàng:', error);
      notification.error({ message: 'Không thể lấy thông tin chi tiết đơn hàng' });
    }
    setLoading(false);
  };
  
  // In tem
  const printLabel = (r) => {
    const url = buildTrackingUrl(r.carrier, r.trackingNumber);
    if (!url) return notification.info({ message: 'Hãng chưa hỗ trợ link tra cứu/in tem' });
    window.open(url, '_blank');
  };
  
  // Tính KPI
  const kpi = React.useMemo(() => {
    const all = getAll();
    return {
      delivering: all.filter(x => ['out_for_delivery'].includes(x.status)).length,
      delivered: all.filter(x => x.status === 'delivered').length,
      pending: all.filter(x => ['created', 'picking'].includes(x.status)).length,
      issues: all.filter(x => ['failed', 'returned'].includes(x.status)).length,
    };
  }, [shipments, total]);
  
  // Tên đơn vị vận chuyển
  const CARRIER_LABEL = {
    ghn: 'GHN',
    ghtk: 'GHTK',
    'j&t': 'J&T',
    jt: 'J&T',
    vnpost: 'VNPost',
  };
  
  // Cấu hình cột bảng
  const columns = useMemo(() => ([
    {
      title: 'MÃ VẬN ĐƠN',
      key: 'code',
      render: (_, r) => <span className="mono">#{r.shipCode || r.trackingNumber || r.orderId}</span>
    },
    {
      title: 'KHÁCH HÀNG',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (t) => (t || '-'),
    },
    {
      title: 'EMAIL',
      dataIndex: 'customerEmail',
      key: 'customerEmail',
      render: (t) => (t || '-'),
    },
    {
      title: 'SĐT',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      render: (t) => (t || '-'),
    },
    {
      title: 'ĐỊA CHỈ',
      dataIndex: 'address',
      key: 'address',
      render: (t) => t || '-',
    },
    {
      title: 'TRẠNG THÁI',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const m = STATUS[s] || { color: 'default', text: s || 'N/A' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: 'NGÀY ĐẶT',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text) => <span>{formatDate(text)}</span>,
    },
    {
      title: 'ĐƠN VỊ VC',
      dataIndex: 'carrier',
      key: 'carrier',
      render: (c) => CARRIER_LABEL[(c || '').toLowerCase()] || '-',
    },
    {
      title: 'SHIPPER',
      dataIndex: 'shipper',
      key: 'shipper',
      render: (t) => t || 'Chưa phân công',
    },
    {
      title: 'THAO TÁC',
      key: 'action',
      render: (_, r) => (
        <Space className="action-buttons">
          <Button size="small" icon={<EyeOutlined />} onClick={() => viewOrderDetail(r.orderId)}>
            Xem đơn
          </Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>
            Cập nhật
          </Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printLabel(r)}>
            In/Tra cứu
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeShipment(r.orderId)}>
            Xoá
          </Button>
        </Space>
      )
    }
  ]), [page, limit]);
  
  return (
    <Spin spinning={loading}>
      <div className="container">
        <div className="mb-16">
          <Breadcrumb>
            <Breadcrumb.Item><HomeOutlined /></Breadcrumb.Item>
            <Breadcrumb.Item><CarOutlined /><span> Quản lý vận chuyển</span></Breadcrumb.Item>
          </Breadcrumb>
        </div>
        
        {/* KPI */}
        <Row gutter={[16, 16]} className="mb-16">
          <Col xs={12} md={6}><Card><Statistic title="Đang vận chuyển" value={kpi.delivering} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="Đã giao" value={kpi.delivered} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="Chờ xử lý" value={kpi.pending} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="Có vấn đề" value={kpi.issues} /></Card></Col>
        </Row>
        
        {/* Filters */}
        <div id="my__event_container__list" className="shipping__panel">
          <Row gutter={[12, 12]} align="middle" className="mb-16">
            <Col>
              <Select placeholder="Trạng thái" allowClear style={{ width: 180 }}
                value={filters.status}
                onChange={(v) => setFilters({ ...filters, status: v })}>
                {Object.entries(STATUS).map(([k, v]) => <Option key={k} value={k}>{v.text}</Option>)}
              </Select>
            </Col>
            <Col>
              <RangePicker onChange={(dates) => {
                setFilters({
                  ...filters,
                  dateFrom: dates?.[0]?.startOf('day')?.toISOString(),
                  dateTo: dates?.[1]?.endOf('day')?.toISOString()
                });
              }} />
            </Col>
            <Col>
              <Input.Search
                placeholder="Tìm kiếm mã đơn / tracking"
                style={{ width: 260 }}
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                onSearch={() => fetchList(1, limit)}
                allowClear
              />
            </Col>
            <Col flex="auto">
              <Space>
                <Button icon={<ReloadOutlined />} onClick={onFilter}>Lọc</Button>
                <Button onClick={onReset}>Xoá lọc</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo vận đơn</Button>
              </Space>
            </Col>
          </Row>
          
          {/* Table */}
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={shipments}
            pagination={{
              position: ['bottomCenter'],
              current: page,
              pageSize: limit,
              total,
              onChange: (p, l) => fetchList(p, l),
              showSizeChanger: true,
            }}
            locale={{ emptyText: <Empty description="Chưa có vận đơn" /> }}
            scroll={{ x: 1100 }}
          />
        </div>
        
        {/* Modal Create/Update */}
        <Modal
          title={editing ? 'Cập nhật vận đơn' : 'Tạo vận đơn'}
          open={openCU}
          onOk={submitCU}
          onCancel={() => setOpenCU(false)}
          okText="Lưu"
          cancelText="Hủy"
          destroyOnClose
        >
          <Form form={formCU} layout="vertical">
            <Form.Item label="ID đơn hàng" required tooltip="Nhập OrderID để liên kết vận đơn">
              <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="VD: 66a1b..." disabled={!!editing} />
            </Form.Item>
            <Form.Item name="carrier" label="Hãng vận chuyển" rules={[{ required: true }]}>
              <Select placeholder="Chọn hãng">
                {CARRIERS.map(c => <Option key={c} value={c}>{c.toUpperCase()}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="serviceCode" label="Dịch vụ (tuỳ chọn)">
              <Select placeholder="Tiêu chuẩn / Nhanh / Hỏa tốc" allowClear />
            </Form.Item>
            {/* Mã vận đơn nội bộ (tự sinh và đồng bộ ra ngoài) */}
            <Form.Item name="shipCode" label="Mã vận đơn" rules={[{ required: true }]}>
              <Input disabled />
            </Form.Item>
            
            {/* Đổi label cho rõ là mã của HÃNG */}
            <Form.Item name="trackingNumber" label="Mã hãng (nếu có)">
              <Input placeholder="Mã tra cứu từ cổng GHN/J&T..." />
            </Form.Item>
            
            <Form.Item name="weight" label="Khối lượng (gram)">
              <Input type="number" placeholder="VD: 500" />
            </Form.Item>
            <Form.Item name="status" label="Trạng thái" initialValue="created">
              <Select>
                {Object.entries(STATUS).map(([k, v]) => <Option key={k} value={k}>{v.text}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="notes" label="Ghi chú nội bộ">
              <Input.TextArea rows={3} placeholder="Ghi chú cho CS/Kho" />
            </Form.Item>
          </Form>
        </Modal>
        
        {/* Drawer Tracking (mở link hãng) */}
        <Drawer
          title={<Space><FileTextOutlined /> <span>Tracking đơn hàng</span></Space>}
          placement="right"
          width={460}
          onClose={() => setOpenTrack(false)}
          open={openTrack}
        >
          {trackInfo ? (
            <>
              <p><b>OrderID:</b> <span className="mono">{trackInfo.orderId}</span></p>
              <p><b>Hãng:</b> {trackInfo.carrier?.toUpperCase()}</p>
              <p><b>Mã vận đơn:</b> <span className="mono">{trackInfo.trackingNumber || '-'}</span></p>
              <p><b>Trạng thái:</b> {STATUS[trackInfo.status]?.text || trackInfo.status || '-'}</p>
              <p><b>Cập nhật:</b> {trackInfo.updatedAt ? dayjs(trackInfo.updatedAt).format('DD/MM/YYYY HH:mm') : '-'}</p>
              <Space>
                <Button
                  type="primary"
                  onClick={() => {
                    const url = buildTrackingUrl(trackInfo.carrier, trackInfo.trackingNumber);
                    if (!url) return notification.info({ message: 'Hãng chưa hỗ trợ link tra cứu' });
                    window.open(url, '_blank');
                  }}
                >
                  Mở trang tra cứu
                </Button>
              </Space>
            </>
          ) : <Empty description="Không có dữ liệu" />}
        </Drawer>
        
        {/* Modal Chi Tiết Đơn Hàng */}
        <Modal
          title="Chi tiết đơn hàng"
          open={showOrderDetail}
          onCancel={() => setShowOrderDetail(false)}
          width={700}
          footer={[
            <Button key="back" onClick={() => setShowOrderDetail(false)}>
              Đóng
            </Button>
          ]}
        >
          {orderDetail ? (
            <div className="order-detail-container">
              <div className="order-info">
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={12}>
                    <Card title="Thông tin khách hàng" className="order-info-card">
                      <p><b>Tên khách hàng:</b> {orderDetail.customerName || 'N/A'}</p>
                      <p><b>Email:</b> {orderDetail.customerEmail || 'N/A'}</p>
                      <p><b>Số điện thoại:</b> {orderDetail.customerPhone || 'N/A'}</p>
                      <p><b>Địa chỉ:</b> {orderDetail.address || 'N/A'}</p>
                    </Card>
                  </Col>
                  <Col xs={24} md={12}>
                    <Card title="Thông tin đơn hàng" className="order-summary-card">
                      <p><b>Mã đơn:</b> <span className="mono">{orderDetail.orderId}</span></p>
                      <p><b>Tổng giá trị:</b> <Text strong type="danger">{orderDetail.orderTotal?.toLocaleString('vi-VN') || 'N/A'} ₫</Text></p>
                      <p><b>Số sản phẩm:</b> {orderDetail.products?.length || 0}</p>
                    </Card>
                  </Col>
                </Row>
                
                <Card title="Chi tiết sản phẩm" className="order-products-card" style={{ marginTop: '16px' }}>
                  {orderDetail.products && orderDetail.products.length > 0 ? (
                    <List
                      dataSource={orderDetail.products}
                      renderItem={(item) => {
                        const price = item.price || 0;
                        const quantity = item.quantity || 0;
                        const subtotal = price * quantity;
                        
                        return (
                          <List.Item className="modal-product-item">
                            <List.Item.Meta
                              avatar={
                                <Avatar 
                                  shape="square" 
                                  size={64} 
                                  src={item.product?.image || "https://placeholder.pics/svg/64x64"}
                                />
                              }
                              title={<Text strong>{item.product?.name || "Sản phẩm"}</Text>}
                              description={
                                <div className="product-specs">
                                  <div><Text type="secondary">Số lượng: {quantity}</Text></div>
                                  <div className="product-color">
                                    <Text type="secondary">Màu sắc: {renderColorInfo(item.color || '-')}</Text>
                                  </div>
                                  <div className="product-size">
                                    <Text type="secondary">Kích thước: {renderSizeInfo(item)}</Text>
                                  </div>
                                  <div className="product-subtotal">
                                    <Text type="secondary">Thành tiền: </Text>
                                    <Text strong type="danger">
                                      {`${price.toLocaleString("vi")} × ${quantity} = ${subtotal.toLocaleString("vi")} ₫`}
                                    </Text>
                                  </div>
                                </div>
                              }
                            />
                          </List.Item>
                        );
                      }}
                    />
                  ) : (
                    <Empty description="Không có dữ liệu sản phẩm" />
                  )}
                  <div className="order-total">
                    <Text strong>Tổng cộng:</Text>
                    <Text className="total-price">{orderDetail.orderTotal?.toLocaleString('vi-VN')} ₫</Text>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <Empty description="Không có dữ liệu đơn hàng" />
          )}
        </Modal>
        
        <BackTop />
      </div>
    </Spin>
  );
}