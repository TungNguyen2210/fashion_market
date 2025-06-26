import React, { useState, useEffect } from "react";
import "./news.css";
import { DatePicker, Input, Spin, Breadcrumb } from "antd";
import {
  Card,
  Table,
  Space,
  Tag,
  PageHeader,
  Divider,
  Form,
  List,
  notification,
} from "antd";
import {
  UserOutlined,
  LockOutlined,
  PhoneOutlined,
  MailOutlined,
  AimOutlined,
  MoneyCollectOutlined,
} from "@ant-design/icons";
import { useHistory } from "react-router-dom";
import axiosClient from "../../apis/axiosClient";
import productApi from "../../apis/productApi";
import { BrowserRouter as Router, Link, Route } from "react-router-dom";

const { Search } = Input;

const News = () => {
  const [news, setNews] = useState([]);
  let history = useHistory();

  useEffect(() => {
    (async () => {
      try {
        await productApi.getNews().then((item) => {
          setNews(item.data.docs);
        });
      } catch (error) {
        console.log("Failed to fetch event detail:" + error);
      }
    })();
    window.scrollTo(0, 0);
  }, []);
  return (
    <div>
      <Spin spinning={false}>
        <Card className="container_details">
          <div className="product_detail">
            <div style={{ marginLeft: 5, marginBottom: 10, marginTop: 10 }}>
              <Breadcrumb>
                <Breadcrumb.Item href="http://localhost:3500/home">
                  {/* <HomeOutlined /> */}
                  <span>Trang chủ</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item href="http://localhost:3500/news">
                  {/* <AuditOutlined /> */}
                  <span>Tin tức</span>
                </Breadcrumb.Item>
              </Breadcrumb>
            </div>
            <hr></hr>
            <div class="news">
              <div class="newstitle">TIN TỨC MỚI NHẤT</div>
              <List
                grid={{
                  gutter: 16,
                  xs: 1,
                  sm: 2,
                  md: 4,
                  lg: 4,
                  xl: 4,
                  xxl: 4,
                }}
                dataSource={news}
                renderItem={(item) => (
                  <Link to={`/news/${item._id}`}>
                    <Card
                      hoverable
                      style={{ margin: "20px", borderRadius: "10px" }}
                    >
                      <div style={{ padding: 20 }}>{item.name}</div>
                      <img
                        src={item.image}
                        alt="News Image"
                        style={{
                          width: "100%",
                          height: "160px",
                          borderRadius: "0 0 10px 10px",
                        }}
                      />
                    </Card>
                  </Link>
                )}
              />
            </div>
          </div>
        </Card>
      </Spin>
    </div>
  );
};

export default News;
