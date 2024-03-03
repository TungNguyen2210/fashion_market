import QueueAnim from "rc-queue-anim";
import { OverPack } from "rc-scroll-anim";
import Texty from "rc-texty";
import TweenOne from "rc-tween-one";
import React, { useEffect, useRef, useState } from "react";
import eventApi from "../../apis/eventApi";
import productApi from "../../apis/productApi";
import triangleTopRight from "../../assets/icon/Triangle-Top-Right.svg";
import service10 from "../../assets/image/service/service10.png";
import service6 from "../../assets/image/service/service6.png";
import service7 from "../../assets/image/service/service7.png";
import service8 from "../../assets/image/service/service8.png";
import service9 from "../../assets/image/service/service9.png";
import "../Home/home.css";

import {
  BackTop,
  Card,
  Carousel,
  Col,
  Row,
  Spin
} from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import { useHistory } from "react-router-dom";
import { numberWithCommas } from "../../utils/common";

const Home = () => {
  const [productList, setProductList] = useState([]);
  const [eventListHome, setEventListHome] = useState([]);
  const [totalEvent, setTotalEvent] = useState(Number);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [productsPhone, setProductsPhone] = useState([]);
  const [productsPC, setProductsPC] = useState([]);
  const [productsTablet, setProductsTablet] = useState([]);
  const [visible, setVisible] = useState(true);
  const initialCountdownDate = new Date().getTime() + 24 * 60 * 60 * 1000;
  const [countdownDate, setCountdownDate] = useState(
    localStorage.getItem("countdownDate") || initialCountdownDate
  );

  const [timeLeft, setTimeLeft] = useState(
    countdownDate - new Date().getTime()
  );

  const history = useHistory();

  const handleReadMore = (id) => {
    console.log(id);
    history.push("product-detail/" + id);
  };

  const handleCategoryDetails = (id) => {
    console.log(id);
    history.push("product-list/" + id);
  };

  const onLoad = () => {
    setVisible(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const response = await productApi.getListProducts({
          page: 1,
          limit: 10,
        });
        setProductList(response.data.docs);
        setTotalEvent(response);
        setLoading(false);
      } catch (error) {
        console.log("Failed to fetch event list:" + error);
      }

      try {
        const response = await productApi.getListEvents(1, 6);
        setEventListHome(response.data);
        setTotalEvent(response.total_count);
      } catch (error) {
        console.log("Failed to fetch event list:" + error);
      }
      try {
        const response = await productApi.getCategory({ limit: 10, page: 1 });
        console.log(response);
        setCategories(response.data.docs);
      } catch (error) {
        console.log(error);
      }
      try {
        const data = { limit: 10, page: 1 };
        const response = await productApi.getProductsByCategory(
          data,
          "643cd88879b4192efedda4e6"
        );
        console.log(response);
        setProductsPhone(response.data.docs);
        const response2 = await productApi.getProductsByCategory(
          data,
          "643cd89a79b4192efedda4ee"
        );
        console.log(response2);
        setProductsPC(response2.data.docs);
        const response3 = await productApi.getProductsByCategory(
          data,
          "643d030051fc7a906603da39"
        );
        console.log(response3);
        setProductsTablet(response3.data.docs);
      } catch (error) {
        console.log(error);
      }

      localStorage.setItem("countdownDate", countdownDate);

      const interval = setInterval(() => {
        const newTimeLeft = countdownDate - new Date().getTime();
        setTimeLeft(newTimeLeft);

        if (newTimeLeft <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    })();
  }, [countdownDate]);

  return (
    <Spin spinning={false}>
      <div
        style={{
          background: "#FFFFFF",
          overflowX: "hidden",
          overflowY: "hidden",
        }}
        className="home"
      >
        <div
          style={{ background: "#FFFFFF" }}
          className="container-home banner-promotion"
        >
          <Row justify="center" align="top" key="1">
            <Col span={24}>
              <Carousel autoplay className="carousel-image">
                <div className="img">
                  <img
                    style={{ width: "100%", height: 750 }}
                    src="https://theme.hstatic.net/200000549029/1000902525/14/home_slider_image_1.jpg?v=3037"
                    alt=""
                  />
                </div>
                <div className="img">
                  <img
                    style={{ width: "100%", height: 750 }}
                    src="https://theme.hstatic.net/200000549029/1000902525/14/home_slider_image_1.jpg?v=3037"
                    alt=""
                  />
                </div>
                <div className="img">
                  <img
                    style={{ width: "100%", height: 750 }}
                    src="https://theme.hstatic.net/200000549029/1000902525/14/home_slider_image_1.jpg?v=3037"
                    alt=""
                  />
                </div>
                <div className="img">
                  <img
                    style={{ width: "100%", height: 750 }}
                    src="https://theme.hstatic.net/200000549029/1000902525/14/home_slider_image_1.jpg?v=3037"
                  />
                </div>
              </Carousel>

            </Col>
          </Row>
        </div>

        <div className="image-one">
          <div className="texty-demo">
            <Texty>Khuyến Mãi</Texty>
          </div>
          <div className="texty-title">
            <p>
              Sản Phẩm <strong style={{ color: "#3b1d82" }}>Mới</strong>
            </p>
          </div>


          <div className="list-products container" key="1">

            <Row
              gutter={{ xs: 8, sm: 16, md: 24, lg: 48 }}
              className="row-product"
            >
              {productsPhone.map((item) => (
                <Col
                  xl={{ span: 6 }}
                  lg={{ span: 8 }}
                  md={{ span: 12 }}
                  sm={{ span: 12 }}
                  xs={{ span: 24 }}
                  className="col-product"
                  onClick={() => handleReadMore(item._id)}
                  key={item._id}
                >
                  <div className="show-product">
                    {item.image ? (
                      <img className="image-product" src={item.image} />
                    ) : (
                      <img
                        className="image-product"
                        src={require("../../assets/image/NoImageAvailable.jpg")}
                      />
                    )}
                    <div className="wrapper-products">
                      <Paragraph
                        className="title-product"
                        ellipsis={{ rows: 2 }}
                      >
                        {item.name}
                      </Paragraph>
                      <div className="price-amount">
                        <Paragraph className="price-product">
                          {numberWithCommas(item.promotion)} đ
                        </Paragraph>
                        {item.promotion !== 0 && (
                          <Paragraph className="price-cross">
                            {numberWithCommas(item.price)} đ
                          </Paragraph>
                        )}
                      </div>
                    </div>
                  </div>
                  <Paragraph
                    className="badge"
                    style={{ position: "absolute", top: 10, left: 9 }}
                  >
                    <span>Giảm giá</span>
                    <img src={triangleTopRight} />
                  </Paragraph>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        <div className="image-one">
          <div className="heading_slogan">
            <div>Tại sao</div>
            <div>Nên chọn chúng tôi</div>
          </div>
          <div className="card_wrap container-home container">
            <div>
              <Card
                bordered={false}
                className="card_suggest card_why card_slogan"
              >
                <img src={service6}></img>
                <p class="card-text mt-3 fw-bold text-center">
                  Nhanh chóng & Bảo mật <br />
                  Vận chuyển
                </p>
              </Card>
            </div>
            <div>
              <Card
                bordered={false}
                className="card_suggest card_why card_slogan"
              >
                <img src={service7}></img>
                <p class="card-text mt-3 fw-bold text-center">
                  Đảm bảo 100% <br />
                  Chính Hãng
                </p>
              </Card>
            </div>
            <div>
              <Card
                bordered={false}
                className="card_suggest card_why card_slogan"
              >
                <img src={service8}></img>
                <p class="card-text mt-3 fw-bold text-center">
                  24 Giờ <br /> Đổi Trả
                </p>
              </Card>
            </div>
            <div>
              <Card
                bordered={false}
                className="card_suggest card_why card_slogan"
              >
                <img src={service9}></img>
                <p class="card-text mt-3 fw-bold text-center">
                  Giao hàng <br /> Nhanh nhất
                </p>
              </Card>
            </div>
            <div>
              <Card
                bordered={false}
                className="card_suggest card_why card_slogan"
              >
                <img src={service10}></img>
                <p class="card-text mt-3 fw-bold text-center">
                  Hỗ trợ <br /> Nhanh chóng
                </p>
              </Card>
            </div>
          </div>
        </div>

        <div className="image-footer">
          <OverPack style={{ overflow: "hidden", height: 800, marginTop: 20 }}>
            <TweenOne
              key="0"
              animation={{ opacity: 1 }}
              className="code-box-shape"
              style={{ opacity: 0 }}
            />
            <QueueAnim
              key="queue"
              animConfig={[
                { opacity: [1, 0], translateY: [0, 50] },
                { opacity: [1, 0], translateY: [0, -50] },
              ]}
            >
              <div className="texty-demo-footer">
                <Texty>NHANH LÊN! </Texty>
              </div>
              <div className="texty-title-footer">
                <p>
                  Tham Dự Buổi <strong>Ra Bộ Sưu Tập Mới</strong>
                </p>
              </div>
              <Row
                justify="center"
                style={{ marginBottom: 30, fill: "#FFFFFF" }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="71px"
                  height="11px"
                >
                  {" "}
                  <path
                    fill-rule="evenodd"
                    d="M59.669,10.710 L49.164,3.306 L39.428,10.681 L29.714,3.322 L20.006,10.682 L10.295,3.322 L1.185,10.228 L-0.010,8.578 L10.295,0.765 L20.006,8.125 L29.714,0.765 L39.428,8.125 L49.122,0.781 L59.680,8.223 L69.858,1.192 L70.982,2.895 L59.669,10.710 Z"
                  ></path>
                </svg>
              </Row>
              <Row justify="center">
                <a href="#" class="footer-button" role="button">
                  <span>ĐĂNG KÝ NGAY</span>
                </a>
              </Row>
            </QueueAnim>
          </OverPack>
        </div>
      </div>

      <BackTop style={{ textAlign: "right" }} />
    </Spin>
  );
};

export default Home;
