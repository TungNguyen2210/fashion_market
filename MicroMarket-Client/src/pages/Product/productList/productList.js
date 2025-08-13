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

  let { id } = useParams();
  const history = useHistory();
  const match = useRouteMatch();

  const handleReadMore = (id) => {
    console.log(id);
    history.push("/product-detail/" + id);
    window.location.reload();
  };

  const handleCategoryDetails = (id) => {
    const newPath = match.url.replace(/\/[^/]+$/, `/${id}`);
    history.push(newPath);
    window.location.reload();
  };

  const handleSearchPrice = async (minPrice, maxPrice) => {
    try {
      const dataForm = {
        page: 1,
        limit: 50,
        minPrice: minPrice,
        maxPrice: maxPrice,
      };
      await axiosClient
        .post("/product/searchByPrice", dataForm)
        .then((response) => {
          if (response === undefined) {
            setLoading(false);
          } else {
            setProductDetail(response.data.docs);
            setLoading(false);
          }
        });
    } catch (error) {
      throw error;
    }
  };

  const handleSearchClick = () => {
    // Gọi hàm tìm kiếm theo giá
    handleSearchPrice(minPrice, maxPrice);
  };

  useEffect(() => {
    (async () => {
      try {
        await productApi.getProductCategory(id).then((item) => {
          setProductDetail(item.data.docs);
        });
        const response = await productApi.getCategory({ limit: 50, page: 1 });
        setCategories(response.data.docs);

        setLoading(false);
      } catch (error) {
        console.log("Failed to fetch event detail:" + error);
      }
    })();
    window.scrollTo(0, 0);
  }, [cartLength]);

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
                <Breadcrumb.Item href="">
                  <span>Sản phẩm </span>
                </Breadcrumb.Item>
              </Breadcrumb>
            </div>
            <hr></hr>
            <div className="container box">
              {categories.map((category) => (
                <div
                  key={category.id}
                  onClick={() => handleCategoryDetails(category._id)}
                  className="menu-item-1"
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
                    <div class="title">
                      <h3 style={{ paddingTop: "30px" }}>DANH SÁCH SẢN PHẨM</h3>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="button-category">
                    <Button type="primary" onClick={() => handleSearchClick()}>
                      Tất cả sản phẩm
                    </Button>
                  </div>
                </Col>
              </Row>
              <Row
                className="row-product-details"
              >
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
                        </div>
                      </div>
                    </List.Item>
                  )}
                ></List>
              </Row>
            </div>
          </div>
        </Card>
      </Spin>
    </div>
  );
};

export default ProductList;
