import QueueAnim from "rc-queue-anim";
import { OverPack } from "rc-scroll-anim";
import Texty from "rc-texty";
import TweenOne from "rc-tween-one";
import React, { useEffect, useRef, useState } from "react";
import eventApi from "../../apis/eventApi";
import productApi from "../../apis/productApi";
import axiosClient from "../../apis/axiosClient";
import triangleTopRight from "../../assets/icon/Triangle-Top-Right.svg";
import service10 from "../../assets/image/service/service10.png";
import service6 from "../../assets/image/service/service6.png";
import service7 from "../../assets/image/service/service7.png";
import service8 from "../../assets/image/service/service8.png";
import service9 from "../../assets/image/service/service9.png";
import "../Home/home.css";

// ===== IMPORT CHATBOT =====
import Chatbot from "../chatbot/chatbot";
// ==========================

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
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categorizedProducts, setCategorizedProducts] = useState([]);
  const [visible, setVisible] = useState(true);
  const [activePromotions, setActivePromotions] = useState([]);
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

  // Hàm tính giá sau khi áp dụng khuyến mãi
  const calculateDiscountedPrice = (product) => {
    const now = new Date();
    let finalPrice = product.price;
    let maxDiscountPercent = 0;
    let appliedPromotion = null;

    console.log('=== HOME DEBUG PROMOTION ===');
    console.log('Product ID:', product._id);
    console.log('Product name:', product.name);
    console.log('Active promotions:', activePromotions.length);

    const validPromotions = activePromotions.filter(promotion => {
      console.log('Checking promotion:', promotion.tenKhuyenMai);
      
      if (promotion.loai !== 'dot_giam_gia') {
        console.log('-> Not dot_giam_gia, actual:', promotion.loai);
        return false;
      }
      
      if (promotion.trangThai !== 'active') {
        console.log('-> Not active, actual:', promotion.trangThai);
        return false;
      }
      
      const startDate = new Date(promotion.thoiGianBD);
      const endDate = new Date(promotion.thoiGianKT);
      console.log('-> Time check:', { 
        now: now.toISOString(), 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });
      
      if (now < startDate || now > endDate) {
        console.log('-> Time invalid');
        return false;
      }
      
      if (!promotion.sanPhamApDung || promotion.sanPhamApDung.length === 0) {
        console.log('-> No products applied');
        return false;
      }
      
      console.log('-> Products in promotion:', promotion.sanPhamApDung);
      
      const productInPromotion = promotion.sanPhamApDung.some(productId => {
        let id;
        
        if (typeof productId === 'string') {
          id = productId;
        } else if (productId && productId.$oid) {
          id = productId.$oid;
        } else if (productId && productId._id) {
          id = productId._id;
        } else if (typeof productId === 'object' && productId.toString) {
          id = productId.toString();
        } else {
          id = productId;
        }
        
        let currentProductId;
        if (typeof product._id === 'string') {
          currentProductId = product._id;
        } else if (product._id && product._id.$oid) {
          currentProductId = product._id.$oid;
        } else if (product._id && product._id.toString) {
          currentProductId = product._id.toString();
        } else {
          currentProductId = product._id;
        }
        
        console.log('-> Comparing:', { 
          promotionProductId: id, 
          currentProductId: currentProductId, 
          match: id === currentProductId 
        });
        
        return id === currentProductId;
      });
      
      console.log('-> Product in promotion:', productInPromotion);
      return productInPromotion;
    });

    console.log('Valid promotions found:', validPromotions.length);

    validPromotions.forEach(promotion => {
      console.log('-> Applying promotion:', promotion.tenKhuyenMai, promotion.phanTramKhuyenMai + '%');
      if (promotion.phanTramKhuyenMai > maxDiscountPercent) {
        maxDiscountPercent = promotion.phanTramKhuyenMai;
        appliedPromotion = promotion;
      }
    });

    if (maxDiscountPercent > 0) {
      const discountAmount = (product.price * maxDiscountPercent) / 100;
      finalPrice = product.price - discountAmount;
      console.log('-> Final calculation:', {
        originalPrice: product.price,
        discountPercent: maxDiscountPercent,
        discountAmount,
        finalPrice: Math.round(finalPrice)
      });
    }

    console.log('=== END HOME DEBUG ===');

    return {
      originalPrice: product.price,
      finalPrice: Math.round(finalPrice),
      discountPercent: maxDiscountPercent,
      appliedPromotion: appliedPromotion,
      hasDiscount: maxDiscountPercent > 0
    };
  };

  // Hàm tải danh sách khuyến mãi đang hoạt động
  const fetchActivePromotions = async () => {
    try {
      console.log('=== HOME FETCHING PROMOTIONS DEBUG ===');
      console.log('Starting to fetch active promotions...');
      
      const possibleEndpoints = [
        '/promotion-management',
        '/promotions',
        '/promotion',
        '/khuyenmai',
        '/promotion-management/search'
      ];
      
      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          
          const response = await axiosClient.get(endpoint, {
            params: {
              trangThai: 'active',
              loai: 'dot_giam_gia'
            }
          });
          
          console.log(`Response from ${endpoint}:`, response);
          
          if (response && response.data) {
            const promotionsData = response.data.docs || response.data || [];
            
            if (Array.isArray(promotionsData) && promotionsData.length > 0) {
              console.log(`Success with ${endpoint}! Found ${promotionsData.length} promotions`);
              setActivePromotions(promotionsData);
              return;
            }
          }
        } catch (error) {
          console.log(`Failed with ${endpoint}:`, error.message);
          continue;
        }
      }
      
      try {
        console.log('Trying to get all promotions and filter...');
        const response = await axiosClient.get('/promotion-management');
        console.log('All promotions response:', response);
        
        if (response && response.data) {
          const allPromotions = response.data.docs || response.data || [];
          console.log('All promotions:', allPromotions);
          
          if (Array.isArray(allPromotions)) {
            const now = new Date();
            const activePromotions = allPromotions.filter(promotion => {
              const startDate = new Date(promotion.thoiGianBD);
              const endDate = new Date(promotion.thoiGianKT);
              
              return promotion.trangThai === 'active' && 
                     promotion.loai === 'dot_giam_gia' &&
                     now >= startDate && 
                     now <= endDate;
            });
            
            console.log('Filtered active promotions:', activePromotions);
            setActivePromotions(activePromotions);
            return;
          }
        }
      } catch (error) {
        console.log('Failed to get all promotions:', error.message);
      }
      
      console.log('Using hardcoded test data for promotion...');
      const testPromotion = {
        _id: "68e2258768ec6627f9194d3c",
        maKhuyenMai: "test4",
        tenKhuyenMai: "test4", 
        loai: "dot_giam_gia",
        phanTramKhuyenMai: 50,
        giaTriToiThieu: 0,
        giamToiDa: null,
        soLuong: null,
        sanPhamApDung: ["689eab3c9a03e6c3477fb6c6"],
        thoiGianBD: "2025-10-02T00:00:00.000Z",
        thoiGianKT: "2025-10-28T00:00:00.000Z",
        trangThai: "active",
        moTa: "test4"
      };
      
      setActivePromotions([testPromotion]);
      console.log('Using test data - promotion set successfully');
      
    } catch (error) {
      console.error('=== HOME PROMOTION FETCH ERROR ===');
      console.error('Error details:', error);
      setActivePromotions([]);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await fetchActivePromotions();
        
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

    // fetchData();

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
                {categoryGroup.products.map((item) => {
                  const priceInfo = calculateDiscountedPrice(item);
                  
                  return (
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
                          
                          {priceInfo.hasDiscount && (
                            <div 
                              className="discount-badge-home"
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: '#ff4d4f',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                zIndex: 2
                              }}
                            >
                              -{priceInfo.discountPercent}%
                            </div>
                          )}
                        </div>
                        
                        <div className="wrapper-products">
                          <Paragraph
                            className="title-product"
                            ellipsis={{ rows: 2, tooltip: item.name }}
                          >
                            {item.name}
                          </Paragraph>
                          
                          {priceInfo.appliedPromotion && (
                            <div 
                              className="promotion-info-home"
                              style={{ marginBottom: '8px' }}
                            >
                              <span 
                                className="promotion-name-home"
                                style={{
                                  color: '#52c41a',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  backgroundColor: '#f6ffed',
                                  padding: '3px 8px',
                                  borderRadius: '10px',
                                  border: '1px solid #b7eb8f'
                                }}
                              >
                                🎉 {priceInfo.appliedPromotion.tenKhuyenMai}
                              </span>
                            </div>
                          )}
                          
                          <div className="price-amount">
                            <span className="price-product">
                              {numberWithCommas(priceInfo.finalPrice)} đ
                            </span>
                            
                            {priceInfo.hasDiscount && (
                              <span className="price-cross">
                                {numberWithCommas(priceInfo.originalPrice)} đ
                              </span>
                            )}
                          </div>
                          
                          <div className="stock-status-container">
                            {item.variants && item.variants.some(v => v.quantity > 0) ? (
                              <span className="stock-status in-stock">Còn hàng</span>
                            ) : (
                              <span className="stock-status out-of-stock">Hết hàng</span>
                            )}
                          </div>
                        </div>
                        
                        {priceInfo.hasDiscount && (
                          <div className="badge">
                            <span>Giảm giá</span>
                            <img src={triangleTopRight} alt="Discount badge icon" />
                          </div>
                        )}
                      </div>
                    </Col>
                  );
                })}
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
      
      {/* ===== THÊM CHATBOT Ở ĐÂY ===== */}
      <Chatbot />
      {/* ================================ */}
    </Spin>
  );
};

export default Home;