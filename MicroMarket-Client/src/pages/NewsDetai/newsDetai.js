import { Breadcrumb, Card, Spin } from "antd";
import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import productApi from "../../apis/productApi";
import "./newsDetai.css";

// const { Search } = Input;

const NewsDetai = () => {
  const [news, setNews] = useState([]);
  let history = useHistory();
  const { id } = useParams();

  useEffect(() => {
    (async () => {
      try {
        await productApi.getNewDetail(id).then((item) => {
          console.log(item.data);
          setNews(item.data);
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
                  <span>Trang chủ</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item href="http://localhost:3500/news">
                  <span>Tin tức</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item href="">
                  <span>{news.name}</span>
                </Breadcrumb.Item>
              </Breadcrumb>
            </div>
            <hr></hr>
            <div class="pt-5-container">
              <div class="newsdetaititle">{news.name}</div>
              <div dangerouslySetInnerHTML={{ __html: news.description }}></div>
            </div>
          </div>
        </Card>
      </Spin>
    </div>
  );
};

export default NewsDetai;
