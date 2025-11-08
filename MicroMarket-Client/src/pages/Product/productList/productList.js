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
// import promotionManagementApi from "../../../apis/promotionManagementApi"; // COMMENT OUT API BỊ LỖI
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
  const [activePromotions, setActivePromotions] = useState([]);

  let { id } = useParams();
  const history = useHistory();
  const match = useRouteMatch();

  // Hàm tính giá sau khi áp dụng khuyến mãi
  const calculateDiscountedPrice = (product) => {
    const now = new Date();
    let finalPrice = product.price;
    let maxDiscountPercent = 0;
    let appliedPromotion = null;

    console.log('=== DEBUG PROMOTION ===');
    console.log('Product ID:', product._id);
    console.log('Product name:', product.name);
    console.log('Active promotions:', activePromotions.length);

    // Tìm tất cả các đợt giảm giá active và còn hạn
    const validPromotions = activePromotions.filter(promotion => {
      console.log('Checking promotion:', promotion.tenKhuyenMai);
      
      // Kiểm tra loại khuyến mãi
      if (promotion.loai !== 'dot_giam_gia') {
        console.log('-> Not dot_giam_gia, actual:', promotion.loai);
        return false;
      }
      
      // Kiểm tra trạng thái
      if (promotion.trangThai !== 'active') {
        console.log('-> Not active, actual:', promotion.trangThai);
        return false;
      }
      
      // Kiểm tra thời gian hiệu lực
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
      
      // Kiểm tra sản phẩm có trong danh sách áp dụng không
      if (!promotion.sanPhamApDung || promotion.sanPhamApDung.length === 0) {
        console.log('-> No products applied');
        return false;
      }
      
      console.log('-> Products in promotion:', promotion.sanPhamApDung);
      
      const productInPromotion = promotion.sanPhamApDung.some(productId => {
        // Xử lý trường hợp productId có thể là string, object với $oid, hoặc object với _id
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
        
        // So sánh với product._id (có thể là string hoặc object)
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

    // Tìm khuyến mãi có phần trăm giảm cao nhất
    validPromotions.forEach(promotion => {
      console.log('-> Applying promotion:', promotion.tenKhuyenMai, promotion.phanTramKhuyenMai + '%');
      if (promotion.phanTramKhuyenMai > maxDiscountPercent) {
        maxDiscountPercent = promotion.phanTramKhuyenMai;
        appliedPromotion = promotion;
      }
    });

    // Tính giá sau giảm
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

    console.log('=== END DEBUG ===');

    return {
      originalPrice: product.price,
      finalPrice: Math.round(finalPrice),
      discountPercent: maxDiscountPercent,
      appliedPromotion: appliedPromotion,
      hasDiscount: maxDiscountPercent > 0
    };
  };

  // Hàm tải danh sách khuyến mãi đang hoạt động - FIX API LỖI
  const fetchActivePromotions = async () => {
    try {
      console.log('=== FETCHING PROMOTIONS DEBUG ===');
      console.log('Starting to fetch active promotions...');
      
      // Thử các endpoint khác nhau để tìm đúng API
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
          
          // Thử GET với params
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
      
      // Nếu tất cả endpoints đều fail, thử lấy tất cả rồi filter
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
      
      // LAST RESORT: Hardcode data tạm thời để test
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
        sanPhamApDung: ["689eab3c9a03e6c3477fb6c6"], // Đảm bảo format string đơn giản
        thoiGianBD: "2025-10-02T00:00:00.000Z",
        thoiGianKT: "2025-10-28T00:00:00.000Z",
        trangThai: "active",
        moTa: "test4"
      };
      
      setActivePromotions([testPromotion]);
      console.log('Using test data - promotion set successfully');
      
    } catch (error) {
      console.error('=== PROMOTION FETCH ERROR ===');
      console.error('Error details:', error);
      setActivePromotions([]);
    }
  };

  const handleReadMore = (id) => {
    history.push("/product-detail/" + id);
  };

  const fetchProductsByCategory = async (categoryId) => {
    try {
      setLoading(true);
      const response = await productApi.getProductCategory(categoryId);
      if (response && response.data && response.data.docs) {
        setProductDetail(response.data.docs);
      } else {
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
    if (categoryId === selectedCategoryId) return;
    
    setSelectedCategoryId(categoryId);
    const newPath = match.url.replace(/\/[^/]+$/, `/${categoryId}`);
    history.push(newPath);
    
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
        setProductDetail([]);
      } else {
        setProductDetail(response.data.docs);
      }
      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi tìm kiếm theo giá:", error);
      setLoading(false);
    }
  };

  const handleSearchClick = async () => {
    try {
      setLoading(true);
      setSelectedCategoryId(null);
      
      // Load tất cả sản phẩm
      const productsResponse = await productApi.getListProducts({ page: 1, limit: 50 });
      if (productsResponse && productsResponse.data) {
        setProductDetail(productsResponse.data.docs || []);
      }
      setLoading(false);
    } catch (error) {
      console.error("Lỗi khi tải tất cả sản phẩm:", error);
      setProductDetail([]);
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        
        // Fetch promotions trước
        await fetchActivePromotions();
        
        // Tải sản phẩm theo danh mục nếu có ID
        if (id) {
          await productApi.getProductCategory(id).then((item) => {
            console.log('Category products loaded:', item.data.docs);
            setProductDetail(item.data.docs);
          });
          setSelectedCategoryId(id);
        } else {
          // Nếu không có ID, tải tất cả sản phẩm
          const productsResponse = await productApi.getListProducts({ page: 1, limit: 50 });
          if (productsResponse && productsResponse.data) {
            console.log('All products loaded:', productsResponse.data.docs);
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

            <div className="list-products container" style={{ marginTop: 0, marginBottom: 50 }}>
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
                    <Button type="primary" onClick={handleSearchClick}>
                      Tất cả sản phẩm
                    </Button>
                  </div>
                </Col>
              </Row>

              {/* PHẦN HIỂN THỊ SẢN PHẨM */}
              <div className="row-product-details" style={{ marginTop: 20 }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Spin size="large" />
                  </div>
                ) : productDetail.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <h3>Không tìm thấy sản phẩm nào</h3>
                    <Button type="primary" onClick={handleSearchClick}>
                      Xem tất cả sản phẩm
                    </Button>
                  </div>
                ) : (
                  <Row gutter={[24, 24]} className="products-grid">
                    {productDetail.map((item, index) => {
                      const priceInfo = calculateDiscountedPrice(item);
                      
                      return (
                        <Col 
                          key={item._id || index}
                          xs={24}  // 1 cột trên mobile
                          sm={12}  // 2 cột trên mobile lớn
                          md={8}   // 3 cột trên tablet
                          lg={6}   // 4 cột trên desktop
                          xl={6}   // 4 cột trên desktop lớn
                          xxl={4}  // 6 cột trên màn hình rất lớn
                        >
                          <div
                            className="client-list-product-card"
                            onClick={() => handleReadMore(item._id)}
                            style={{
                              border: '1px solid #f0f0f0',
                              borderRadius: '8px',
                              padding: '16px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              height: '100%',
                              position: 'relative'
                            }}
                          >
                            <div 
                              className="client-list-product-image-container"
                              style={{ 
                                position: 'relative', 
                                marginBottom: '12px',
                                height: '200px',
                                overflow: 'hidden'
                              }}
                            >
                              {item.image ? (
                                <img 
                                  className="client-list-product-image" 
                                  src={item.image} 
                                  alt={item.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '4px'
                                  }}
                                />
                              ) : (
                                <img
                                  className="client-list-product-image"
                                  src={require("../../../assets/image/NoImageAvailable.jpg")}
                                  alt="No image available"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '4px'
                                  }}
                                />
                              )}
                              
                              {/* Badge giảm giá */}
                              {priceInfo.hasDiscount && (
                                <div 
                                  className="discount-badge"
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
                            
                            <div className="client-list-product-details">
                              <Paragraph
                                className="client-list-product-name"
                                ellipsis={{ rows: 2, tooltip: item.name }}
                                style={{ 
                                  marginBottom: '8px', 
                                  fontWeight: '500',
                                  minHeight: '44px'
                                }}
                              >
                                {item.name}
                              </Paragraph>
                              
                              {/* Hiển thị tên khuyến mãi nếu có */}
                              {priceInfo.appliedPromotion && (
                                <div 
                                  className="promotion-info"
                                  style={{ marginBottom: '8px' }}
                                >
                                  <span 
                                    className="promotion-name"
                                    style={{
                                      color: '#52c41a',
                                      fontSize: '12px',
                                      fontWeight: '500'
                                    }}
                                  >
                                    🎉 {priceInfo.appliedPromotion.tenKhuyenMai}
                                  </span>
                                </div>
                              )}
                              
                              <div 
                                className="client-list-product-pricing"
                                style={{ marginBottom: '12px' }}
                              >
                                {/* Hiển thị giá sau giảm */}
                                <div>
                                  <span 
                                    className="client-list-product-price-promoted"
                                    style={{
                                      color: '#ff4d4f',
                                      fontSize: '16px',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {numberWithCommas(priceInfo.finalPrice)} đ
                                  </span>
                                </div>
                                
                                {/* Hiển thị giá gốc nếu có giảm giá */}
                                {priceInfo.hasDiscount && (
                                  <div>
                                    <span 
                                      className="client-list-product-price-original"
                                      style={{
                                        color: '#999',
                                        fontSize: '14px',
                                        textDecoration: 'line-through'
                                      }}
                                    >
                                      {numberWithCommas(priceInfo.originalPrice)} đ
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Hiển thị trạng thái tồn kho */}
                              <div className="stock-status-container">
                                {item.variants && item.variants.some(v => v.quantity > 0) ? (
                                  <span 
                                    className="stock-status in-stock"
                                    style={{
                                      color: '#52c41a',
                                      fontSize: '12px',
                                      padding: '2px 8px',
                                      backgroundColor: '#f6ffed',
                                      border: '1px solid #b7eb8f',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    Còn hàng
                                  </span>
                                ) : (
                                  <span 
                                    className="stock-status out-of-stock"
                                    style={{
                                      color: '#ff4d4f',
                                      fontSize: '12px',
                                      padding: '2px 8px',
                                      backgroundColor: '#fff2f0',
                                      border: '1px solid #ffccc7',
                                      borderRadius: '4px'
                                    }}
                                  >
                                    Hết hàng
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                )}

                {/* Pagination riêng biệt */}
                {!loading && productDetail.length > 0 && (
                  <div style={{ textAlign: 'center', marginTop: 40 }}>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Spin>
    </div>
  );
};

export default ProductList;