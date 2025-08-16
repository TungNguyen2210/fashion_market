// src/pages/ShippingList/ShippingList.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  BackTop, Breadcrumb, Button, Col, Drawer, Empty, Form, Input, Modal,
  Row, Select, Space, Spin, Table, Tag, notification, Card, Statistic, DatePicker
} from 'antd';
import {
  HomeOutlined, CarOutlined, ReloadOutlined, PlusOutlined, EyeOutlined,
  EditOutlined, DeleteOutlined, FileTextOutlined, PrinterOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import './shippingList.css';
import orderApi from "../../apis/orderApi";
import axiosClient from '../../apis/axiosClient'; // 🔁 dùng để cập nhật trạng thái đơn hàng

const { Option } = Select;
const { RangePicker } = DatePicker;

const getMap = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };
const saveMap = (m) => localStorage.setItem(LS_KEY, JSON.stringify(m));
const getAll = () => Object.entries(getMap()).map(([orderId, v]) => ({ _id: orderId, orderId, ...v }));
const getOne = (orderId) => getMap()[orderId];
const setOne = (orderId, data) => {
  const now = new Date().toISOString();
  const m = getMap();
  const prev = m[orderId] || {};
  m[orderId] = { ...prev, ...data, status: data.status || prev.status || 'created', createdAt: prev.createdAt || now, updatedAt: now };
  saveMap(m);
  return m[orderId];
};
const removeOne = (orderId) => { const m = getMap(); delete m[orderId]; saveMap(m); };
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
// Lấy chi tiết đơn hàng từ backend
const fetchOrderDetail = async (orderId) => {
  try {
    const res = await axiosClient.get(`/order/${orderId}`);
    const order = res?.data?.data ?? res?.data ?? res;
    let user = order?.user;
    console.log('Order data:', order);
    // nếu chỉ là userId -> gọi thêm API user
    if (user && typeof user === 'string') {
      const userRes = await axiosClient.get(`/user/${user}`);
      user = userRes?.data?.data ?? userRes?.data ?? userRes;
    }
    return {
      customerName: user?.username || '',
      customerEmail: user?.email || '',
      customerPhone: user?.phone || '',
      address: order?.address || '',
    };
  } catch (e) {
    console.error(e);
    notification.warning({ message: 'Không lấy được thông tin đơn hàng để đồng bộ' });
    return { customerName: null, customerEmail: null, customerPhone: null, address: null };
  }
};

const updateOrderStatus = async (orderId, shipStatus, note = '') => {
  const next = mapShipmentToOrder(shipStatus);
  if (!next) return;
  try {
    await axiosClient.put(`/order/${orderId}`, { status: next, description: note });
  } catch (e) {
    console.error(e);
    notification.warning({ message: 'Không cập nhật được trạng thái đơn hàng' });
  }
};

/* ====== tiny helpers ====== */
const useQuery = () => {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
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

  const query = useQuery();

  const isMissing = (v) => v == null || v === '' || v === '-';
  const fetchList = async (p = page, l = limit) => {
    setLoading(true);
    const docsRaw = getAll();

    await Promise.all(
      docsRaw.map(async (d) => {
        let changed = false;

        if (!d.shipCode) {
          d.shipCode = genShipCode(d.orderId);
          setOne(d.orderId, { ...d, shipCode: d.shipCode });
        }

        if (
          isMissing(d.customerName) ||
          isMissing(d.address) ||
          isMissing(d.customerEmail) ||
          isMissing(d.customerPhone)
        ) {
          const info = await fetchOrderDetail(d.orderId);
          Object.assign(d, info);
          if (!d.shipper) d.shipper = 'Nguyễn Văn A';
          changed = true;
        }

        if (changed) {
          setOne(d.orderId, d); // lưu lại localStorage
        }
      })
    );

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

    const start = (p - 1) * l;
    const pageDocs = docs.slice(start, start + l);
    setShipments(pageDocs);
    setTotal(docs.length);
    setPage(p);
    setLimit(l);
    setLoading(false);
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, []);

  // nếu đi từ OrderList với ?createFor=ORDER_ID
  useEffect(() => {
    const oid = query.get('createFor');
    if (oid) {
      openCreate();
      setOrderId(oid);
    }
    // eslint-disable-next-line
  }, [query]);

  const onFilter = () => fetchList(1, limit);
  const onReset = () => {
    setFilters({ q: '', carrier: undefined, status: undefined, dateFrom: undefined, dateTo: undefined });
    fetchList(1, limit);
  };

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

  const submitCU = async () => {
    try {
      const vals = await formCU.validateFields();
      if (!orderId) {
        notification.warning({ message: 'Vui lòng chọn đơn hàng' });
        return;
      }

      let backendStatus = null;
      try {
        const res = await axiosClient.get(`/order/${orderId}`);
        const od = res?.data?.data ?? res?.data ?? res;
        backendStatus = od?.status;
      } catch (e) {
        console.error(e);
      }

      if (backendStatus && !(backendStatus === 'pending' || backendStatus === 'đang xác nhận')) {
        notification.warning({ message: 'Chỉ đơn đang xác nhận mới được tạo vận đơn' });
        return;
      }
      // ⤵ lấy thông tin đơn để đồng bộ
      const info = await fetchOrderDetail(orderId);
      console.log('Fetched info for submitCU:', info);
      const current = getOne(orderId);
      const shipCode = (vals.shipCode || '').trim() || current.shipCode || genShipCode(orderId);

      // lưu vận đơn (localStorage) + gán shipper mặc định nếu chưa có
      setOne(orderId, {
        ...vals,
        orderId,
        shipCode,                                 // <— mã vận đơn auto
        shipper: vals.shipper || current?.shipper || 'Nguyễn Văn A',

        customerName: info.customerName,
        customerEmail: info.customerEmail,
        customerPhone: info.customerPhone,
        address: info.address,
      });

      // 🔁 đồng bộ trạng thái đơn hàng như trước
      await updateOrderStatus(orderId, vals.status || 'created', editing ? 'Cập nhật vận đơn' : 'Tạo vận đơn');

      notification.success({ message: editing ? 'Cập nhật vận đơn thành công' : 'Tạo vận đơn thành công' });
      setOpenCU(false);
      fetchList(page, limit);
    } catch {
      notification.error({ message: editing ? 'Cập nhật vận đơn lỗi' : 'Tạo vận đơn lỗi' });
    }
  };


  const removeShipment = async (id) => {
    removeOne(id);
    // 🔁 trả trạng thái đơn hàng về pending
    await updateOrderStatus(id, 'created', 'Xoá vận đơn: chuyển về Đợi xác nhận');
    notification.success({ message: 'Xoá vận đơn' });
    fetchList(page, limit);
  };

  const viewTracking = (oid) => {
    const ship = getOne(oid);
    if (!ship) return notification.warning({ message: 'Đơn này chưa có thông tin vận chuyển' });
    setTrackInfo({ orderId: oid, ...ship });
    setOpenTrack(true);
  };

  const printLabel = (r) => {
    const url = buildTrackingUrl(r.carrier, r.trackingNumber);
    if (!url) return notification.info({ message: 'Hãng chưa hỗ trợ link tra cứu/in tem' });
    window.open(url, '_blank');
  };

  /* KPI numbers */
  const kpi = React.useMemo(() => {
    const all = getAll();
    return {
      delivering: all.filter(x => ['out_for_delivery'].includes(x.status)).length,
      delivered: all.filter(x => x.status === 'delivered').length,
      pending: all.filter(x => ['created', 'picking'].includes(x.status)).length,
      issues: all.filter(x => ['failed', 'returned'].includes(x.status)).length,
    };
  }, [shipments, total]);

  const CARRIER_LABEL = {
    ghn: 'GHN',
    ghtk: 'GHTK',
    'j&t': 'J&T',
    jt: 'J&T',
    vnpost: 'VNPost',
  };
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
      render: (t, r) => (r.customerName ?? (t && typeof t === 'object' ? t.username : null) ?? '-'),
    },

    {
      title: 'EMAIL',
      dataIndex: 'customerEmail',
      key: 'customerEmail',
      render: (t) => t.email || '-',
    },
    {
      title: 'SĐT',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      render: (text, record) => <a>{text.phone}</a>,
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
        <Space wrap>
          <Link to={`/order-details/${r.orderId}`}>
            <Button size="small" icon={<EyeOutlined />}>Xem đơn</Button>
          </Link>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)}>Cập nhật</Button>
          <Button size="small" icon={<PrinterOutlined />} onClick={() => printLabel(r)}>In/Tra cứu</Button>
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => removeShipment(r.orderId)}>Xoá</Button>
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
                <Button icon={<ReloadOutlined />} onClick={() => fetchList(1, limit)}>Lọc</Button>
                <Button onClick={onReset}>Xoá lọc</Button>
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
              <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="VD: 66a1b..." disabled />
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

        <BackTop />
      </div>
    </Spin>
  );
}
