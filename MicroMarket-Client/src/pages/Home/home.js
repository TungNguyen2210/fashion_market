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
  const [eventListHome, setEventListHome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categorizedProducts, setCategorizedProducts] = useState([]);
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
    history.push("product-list");
  };

  const onLoad = () => {
    setVisible(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const categoryResponse = await productApi.getCategory({ limit: 5, page: 1 });
        const fetchedCategories = categoryResponse.data.docs;
        setCategories(fetchedCategories);

        if (fetchedCategories && fetchedCategories.length > 0) {
          const productsPromises = fetchedCategories.map(async (category) => {
            try {
              const productsResponse = await productApi.getProductsByCategory(
                { limit: 4, page: 1 },
                category._id
              );
              return {
                categoryName: category.name,
                categoryId: category._id,
                products: productsResponse.data.docs,
              };
            } catch (prodError) {
              console.error(`Failed to fetch products for category ${category.name || category._id}:`, prodError);
              return { categoryName: category.name, categoryId: category._id, products: [] };
            }
          });

          const allCategorizedProducts = await Promise.all(productsPromises);
          setCategorizedProducts(allCategorizedProducts.filter(cp => cp.products && cp.products.length > 0));
        }
      } catch (error) {
        console.log("Failed to fetch home page data:", error);
        setEventListHome([]);
        setCategories([]);
        setCategorizedProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    localStorage.setItem("countdownDate", countdownDate.toString());
    const interval = setInterval(() => {
      const newTimeLeft = parseInt(localStorage.getItem("countdownDate"), 10) - new Date().getTime();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Spin spinning={loading}>
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
                    src="https://theme.hstatic.net/200000964164/1001330875/14/slider_1.jpg?v=220"
                    alt="Slider 1"
                  />
                </div>
                <div className="img">
                  <img
                    style={{ width: "100%", height: 750 }}
                    src="https://theme.hstatic.net/200000964164/1001330875/14/slider_2.jpg?v=220"
                    alt="Slider 2"
                  />
                </div>
                <div className="img">
                  <img
                    style={{ width: "100%", height: 750 }}
                    src="https://theme.hstatic.net/200000964164/1001330875/14/slider_3.jpg?v=220"
                    alt="Slider 3"
                  />
                </div>
              </Carousel>
            </Col>
          </Row>
        </div>

        {categorizedProducts.map((categoryGroup) => (
          <div className="category-section container" key={categoryGroup.categoryId} style={{ marginTop: 30, marginBottom: 30 }}>
            <div className="texty-demo" style={{ marginBottom: 10 }}>
              <Texty>{categoryGroup.categoryName}</Texty>
            </div>
            <div className="list-products">
              <Row
                gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}
                className="row-product"
              >
                {categoryGroup.products.map((item) => (
                  <Col
                    xl={{ span: 6 }}
                    lg={{ span: 6 }}
                    md={{ span: 8 }}
                    sm={{ span: 12 }}
                    xs={{ span: 24 }}
                    className="col-product"
                    key={item._id}
                  >
                    <div className="show-product" onClick={() => handleReadMore(item._id)}>
                      <div className="product-image-container">
                        {item.image ? (
                          <img className="image-product" src={item.image} alt={item.name} />
                        ) : (
                          <img
                            className="image-product"
                            src={require("../../assets/image/NoImageAvailable.jpg")}
                            alt="No image available"
                          />
                        )}
                      </div>
                      <div className="wrapper-products">
                        <Paragraph
                          className="title-product"
                          ellipsis={{ rows: 2, tooltip: item.name }}
                        >
                          {item.name}
                        </Paragraph>
                        <div className="price-amount">
                          <span className="price-product">
                            {numberWithCommas(item.promotion)} đ
                          </span>
                          {item.price && item.promotion < item.price && (
                            <span className="price-cross">
                              {numberWithCommas(item.price)} đ
                            </span>
                          )}
                        </div>
                        
                        {/* Phần hiển thị trạng thái tồn kho đã được cập nhật */}
                        <div className="stock-status-container">
                          {item.variants && item.variants.some(v => v.quantity > 0) ? (
                            <span className="stock-status in-stock">Còn hàng</span>
                          ) : (
                            <span className="stock-status out-of-stock">Hết hàng</span>
                          )}
                        </div>
                      </div>
                      {item.price && item.promotion < item.price && (
                        <div className="badge">
                          <span>Giảm giá</span>
                          <img src={triangleTopRight} alt="Discount badge icon" />
                        </div>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          </div>
        ))}

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
                <img src={service6} alt="Fast and Secure Shipping"></img>
                <p className="card-text mt-3 fw-bold text-center">
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
                <img src={service7} alt="100% Genuine Guarantee"></img>
                <p className="card-text mt-3 fw-bold text-center">
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
                <img src={service8} alt="24 Hour Return"></img>
                <p className="card-text mt-3 fw-bold text-center">
                  24 Giờ <br /> Đổi Trả
                </p>
              </Card>
            </div>
            <div>
              <Card
                bordered={false}
                className="card_suggest card_why card_slogan"
              >
                <img src={service9} alt="Fastest Delivery"></img>
                <p className="card-text mt-3 fw-bold text-center">
                  Giao hàng <br /> Nhanh nhất
                </p>
              </Card>
            </div>
            <div>
              <Card
                bordered={false}
                className="card_suggest card_why card_slogan"
              >
                <img src={service10} alt="Quick Support"></img>
                <p className="card-text mt-3 fw-bold text-center">
                  Hỗ trợ <br /> Nhanh chóng
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <BackTop style={{ textAlign: "right" }} />
    </Spin>
  );
};

export default Home;
