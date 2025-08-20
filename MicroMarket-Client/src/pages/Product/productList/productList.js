import {
  Breadcrumb, Button, Card, Col, Form,
  List, Row,
  Spin
} from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import React, { useEffect, useState } from "react";
import { useHistory, useParams, useRouteMatch } from "react-router-dom";
import axiosClient from "../../../apis/axiosClient";
import productApi from "../../../apis/productApi";
import triangleTopRight from "../../../assets/icon/Triangle-Top-Right.svg";
import { numberWithCommas } from "../../../utils/common";
import "./productList.css";

const ProductList = () => {
  const [productDetail, setProductDetail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartLength, setCartLength] = useState();
  const [form] = Form.useForm();
  const [categories, setCategories] = useState([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000000);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  let { id } = useParams();
  const history = useHistory();
  const match = useRouteMatch();

  const handleReadMore = (id) => {
    console.log(id);
    history.push("/product-detail/" + id);
    // Không reload trang để trải nghiệm mượt mà hơn
  };

  // Hàm để tải sản phẩm theo danh mục mà không reload trang
  const fetchProductsByCategory = async (categoryId) => {
    try {
      setLoading(true);
      const response = await productApi.getProductCategory(categoryId);
      if (response && response.data && response.data.docs) {
        setProductDetail(response.data.docs);
      } else {
        console.error("Định dạng dữ liệu không như mong đợi:", response);
        setProductDetail([]);
      }
      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải sản phẩm theo danh mục:", error);
      setProductDetail([]);
      setLoading(false);
    }
  };

  const handleCategoryDetails = (categoryId) => {
    // Nếu đã ở danh mục này rồi thì không cần làm gì
    if (categoryId === selectedCategoryId) return;
    
    setSelectedCategoryId(categoryId);
    const newPath = match.url.replace(/\/[^/]+$/, `/${categoryId}`);
    history.push(newPath);
    
    // Tải dữ liệu mới mà không reload trang
    fetchProductsByCategory(categoryId);
  };

  const handleSearchPrice = async (minPrice, maxPrice) => {
    try {
      setLoading(true);
      const dataForm = {
        page: 1,
        limit: 50,
        minPrice: minPrice,
        maxPrice: maxPrice,
      };
      const response = await axiosClient.post("/product/searchByPrice", dataForm);
      
      if (response === undefined) {
        setLoading(false);
        setProductDetail([]);
      } else {
        setProductDetail(response.data.docs);
        setLoading(false);
      }
    } catch (error) {
      console.error("Lỗi khi tìm kiếm theo giá:", error);
      setLoading(false);
    }
  };

  const handleSearchClick = () => {
    // Gọi hàm tìm kiếm theo giá
    handleSearchPrice(minPrice, maxPrice);
    // Giữ nguyên logic của nút "Tất cả sản phẩm" như bạn yêu cầu
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // Tải sản phẩm theo danh mục nếu có ID
        if (id) {
          await productApi.getProductCategory(id).then((item) => {
            setProductDetail(item.data.docs);
          });
          setSelectedCategoryId(id);
        } else {
          // Nếu không có ID, tải tất cả sản phẩm
          const productsResponse = await productApi.getListProducts({ page: 1, limit: 50 });
          if (productsResponse && productsResponse.data) {
            setProductDetail(productsResponse.data.docs || []);
          }
        }
        
        // Tải danh sách danh mục
        const response = await productApi.getCategory({ limit: 50, page: 1 });
        if (response && response.data && response.data.docs) {
          setCategories(response.data.docs);
        }

        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setLoading(false);
      }
    })();
    window.scrollTo(0, 0);
  }, [id]);

  return (
    <div>
      <Spin spinning={loading}>
        <Card className="container_details">
          <div className="product_detail">
            <div style={{ marginLeft: 5, marginBottom: 10, marginTop: 10 }}>
              <Breadcrumb>
                <Breadcrumb.Item href="http://localhost:3500/home">
                  <span>Trang chủ</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item href="/product-list">
                  <span>Sản phẩm </span>
                </Breadcrumb.Item>
                {selectedCategoryId && categories.find(cat => cat._id === selectedCategoryId) && (
                  <Breadcrumb.Item>
                    <span>{categories.find(cat => cat._id === selectedCategoryId).name}</span>
                  </Breadcrumb.Item>
                )}
              </Breadcrumb>
            </div>
            <hr></hr>
            <div className="container box">
              {categories.map((category) => (
                <div
                  key={category.id || category._id}
                  onClick={() => handleCategoryDetails(category._id)}
                  className={`menu-item-1 ${selectedCategoryId === category._id ? "active-category" : ""}`}
                >
                  <div className="menu-category-1">{category.name}</div>
                </div>
              ))}
            </div>

            <div
              className="list-products container"
              key="1"
              style={{ marginTop: 0, marginBottom: 50 }}
            >
              <Row>
                <Col span={12}>
                  <div className="title-category">
                    <div className="title">
                      <h3 style={{ paddingTop: "30px" }}>
                        {selectedCategoryId && categories.find(cat => cat._id === selectedCategoryId) 
                          ? categories.find(cat => cat._id === selectedCategoryId).name.toUpperCase() 
                          : "DANH SÁCH SẢN PHẨM"}
                      </h3>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="button-category">
                    <Button 
                      type="primary" 
                      onClick={() => {
                        setSelectedCategoryId(null);
                        handleSearchClick();
                      }}
                    >
                      Tất cả sản phẩm
                    </Button>
                  </div>
                </Col>
              </Row>
              <Row
                className="row-product-details"
              >
                {loading ? (
                  <div className="loading-container">
                    <Spin size="large" />
                  </div>
                ) : productDetail.length === 0 ? (
                  <div className="no-products-found">
                    <h3>Không tìm thấy sản phẩm nào</h3>
                    <Button type="primary" onClick={() => {
                      setSelectedCategoryId(null);
                      handleSearchClick();
                    }}>
                      Xem tất cả sản phẩm
                    </Button>
                  </div>
                ) : (
                  <List
                    grid={{
                      gutter: 24,
                      column:
                        productDetail.length >= 5 ? 5 : productDetail.length,
                    }}
                    size="large"
                    className="product-list"
                    pagination={{
                      onChange: (page) => {
                        window.scrollTo(0, 0);
                      },
                      pageSize: 12,
                    }}
                    dataSource={productDetail}
                    renderItem={(item) => (
                      <List.Item>
                        <div
                          className="client-list-product-card"
                          onClick={() => handleReadMore(item._id)}
                        >
                          <div className="client-list-product-image-container">
                            {item.image ? (
                              <img className="client-list-product-image" src={item.image} alt={item.name}/>
                            ) : (
                              <img
                                className="client-list-product-image"
                                src={require("../../../assets/image/NoImageAvailable.jpg")}
                                alt="No image available"
                              />
                            )}
                          </div>
                          <div className="client-list-product-details">
                            <Paragraph
                              className="client-list-product-name"
                              ellipsis={{ rows: 2, tooltip: item.name }}
                            >
                              {item.name}
                            </Paragraph>
                            <div className="client-list-product-pricing">
                              <span className="client-list-product-price-promoted">
                                {numberWithCommas(item.promotion)} đ
                              </span>
                              {item.price && item.promotion < item.price && (
                                <span className="client-list-product-price-original">
                                  {numberWithCommas(item.price)} đ
                                </span>
                              )}
                            </div>
                            
                            {/* Hiển thị trạng thái tồn kho - đã cập nhật */}
                            <div className="stock-status-container">
                              {item.variants && item.variants.some(v => v.quantity > 0) ? (
                                <span className="stock-status in-stock">Còn hàng</span>
                              ) : (
                                <span className="stock-status out-of-stock">Hết hàng</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </List.Item>
                    )}
                  ></List>
                )}
              </Row>
            </div>
          </div>
        </Card>
      </Spin>
    </div>
  );
};


export default ProductList;
