import React, { useState, useEffect } from "react";
import "./dashBoard.css";
import {
  Col,
  Row,
  Typography,
  Spin,
  Card,
  Empty,
  Modal,
  BackTop,
  Tag,
  Breadcrumb,
  Table,
} from "antd";
import {
  DashboardOutlined,
  HomeOutlined,
  ShopTwoTone,
  ContactsTwoTone,
  HddTwoTone,
  ShoppingTwoTone,
} from "@ant-design/icons";
import statisticApi from "../../apis/statistic";
import { useHistory } from "react-router-dom";
import { DateTime } from "../../utils/dateTime";
import axiosClient from "../../apis/axiosClient";
import orderApi from "../../apis/orderApi";

import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const { confirm } = Modal;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";
const { Title } = Typography;

const DashBoard = () => {
  const [order, setOrder] = useState([]);
  const [statisticList, setStatisticList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotalList] = useState();
  const [data, setData] = useState(null);

  const history = useHistory();

  function NoData() {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const columns = [
    {
      title: "ID",
      key: "index",
      render: (text, record, index) => index + 1,
    },
    {
      title: "Tên",
      dataIndex: "user",
      key: "user",
      render: (text, record) => <a>{text.username}</a>,
    },
    {
      title: "Email",
      dataIndex: "user",
      key: "user",
      render: (text, record) => <a>{text.email}</a>,
    },
    {
      title: "Tổng tiền",
      dataIndex: "orderTotal",
      key: "orderTotal",
      render: (text) => <a>{text}</a>,
    },
    {
      title: "Hình thức thanh toán",
      dataIndex: "billing",
      key: "billing",
    },
    {
      title: "Trạng thái",
      key: "status",
      dataIndex: "status",
      render: (slugs) => (
        <span>
          <Tag color="geekblue" key={slugs}>
            {slugs?.toUpperCase()}
          </Tag>
        </span>
      ),
    },
  ];

  useEffect(() => {
    (async () => {
      try {
        await statisticApi.getTotal().then((res) => {
          console.log(res);
          setTotalList(res);
          setStatisticList(res.data);
          setData(res.data.data);
          setLoading(false);
        });
        await orderApi.getListOrder({ page: 1, limit: 6 }).then((res) => {
          console.log(res);
          setTotalList(res.totalDocs);
          setOrder(res.data.docs);
          setLoading(false);
        });
      } catch (error) {
        console.log("Failed to fetch event list:" + error);
      }
    })();
  }, []);
  return (
    <div>
      <Spin spinning={false}>
        <div className="container">
          <div style={{ marginTop: 20 }}>
            <Breadcrumb>
              <Breadcrumb.Item href="">
                <HomeOutlined />
              </Breadcrumb.Item>
              <Breadcrumb.Item href="">
                <DashboardOutlined />
                <span>DashBoard</span>
              </Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <Row gutter={12} style={{ marginTop: 20 }}>
            <Col span={6}>
              <Card className="card_total" bordered={false}>
                <div className="card_number">
                  <div>
                    <div className="number_total">
                      {statisticList.totalIncome?.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                    </div>
                    <div className="title_total">Tổng doanh thu</div>
                  </div>
                  <div>
                    <ContactsTwoTone style={{ fontSize: 48 }} />
                  </div>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="card_total" bordered={false}>
                <div className="card_number">
                  <div>
                    <div className="number_total">
                      {statisticList.productTotal}
                    </div>
                    <div className="title_total">Số sản phẩm</div>
                  </div>
                  <div>
                    <ShopTwoTone style={{ fontSize: 48 }} />
                  </div>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="card_total" bordered={false}>
                <div className="card_number">
                  <div>
                    <div className="number_total">
                      {statisticList.categoryTotal}
                    </div>
                    <div className="title_total">Số danh mục</div>
                  </div>
                  <div>
                    <HddTwoTone style={{ fontSize: 48 }} />
                  </div>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card className="card_total" bordered={false}>
                <div className="card_number">
                  <div>
                    <div className="number_total">
                      {statisticList.orderTotal}
                    </div>
                    <div className="title_total">Số đặt hàng</div>
                  </div>
                  <div>
                    <ShoppingTwoTone style={{ fontSize: 48 }} />
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <div className="chart">
                <div className="title">Thống kê đơn hàng trong 12 tháng</div>
                <ResponsiveContainer width="100%" aspect={2 / 1}>
                  <AreaChart
                    width={730}
                    height={250}
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="total" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#8884d8"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8884d8"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="gray" />
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="chartGrid"
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="Total"
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#total)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Col>
            <Col span={12}>
              <div className="chart">
                <div className="title">Đơn hàng mới nhất</div>
                <div style={{ marginTop: 10 }}>
                  <Table
                    columns={columns}
                    pagination={{ position: ["bottomCenter"] }}
                    dataSource={order}
                  />
                </div>
              </div>
            </Col>
          </Row>
        </div>
        <BackTop style={{ textAlign: "right" }} />
      </Spin>
    </div>
  );
};

export default DashBoard;
