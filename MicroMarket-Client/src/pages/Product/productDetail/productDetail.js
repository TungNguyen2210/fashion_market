import {
  Breadcrumb, Button, Card, Carousel, Col, Form, Modal,
  Rate, Row, Skeleton, Tabs, message, Input,
  Spin, Tag, Badge, Tooltip, Divider
} from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import React, { useEffect, useState, useCallback } from "react";
import { useHistory, useParams, Link } from "react-router-dom";
import { 
  ShoppingCartOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import productApi from "../../../apis/productApi";
import axiosClient from "../../../apis/axiosClient";
import colorApi from "../../../apis/colorApi";
import triangleTopRight from "../../../assets/icon/Triangle-Top-Right.svg";
import userApi from "../../../apis/userApi";
import { numberWithCommas } from "../../../utils/common";
import "./productDetail.css";

const { TabPane } = Tabs;
const { TextArea } = Input;

// ===== ✅ HÀM CHUYỂN ĐỔI HEX SANG RGB =====
const hexToRgb = (hex) => {
  hex = hex.replace('#', '');
  
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  
  if (hex.length !== 6) {
    return null;
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
};

// ===== ✅ HÀM KIỂM TRA MÀU SÁNG HAY TỐI =====
const isLightColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
};

const ProductDetail = () => {
  const [productDetail, setProductDetail] = useState(null);
  const [recommend, setRecommend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartLength, setCartLength] = useState(0);
  const [form] = Form.useForm();
  const [reviews, setProductReview] = useState([]);
  const [reviewsCount, setProductReviewCount] = useState({});
  const [avgRating, setAvgRating] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [userInfo, setUserInfo] = useState(null);
  const [variants, setVariants] = useState([]);
  const [productRatings, setProductRatings] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [activePromotions, setActivePromotions] = useState([]);
  const [colorList, setColorList] = useState([]);
  const [colorMapping, setColorMapping] = useState({}); 

  let { id } = useParams();
  const history = useHistory();

  const checkUserLoggedIn = useCallback(() => {
    const userJson = localStorage.getItem('user');

    if (!userJson) {
      return false;
    }
    try {
      const user = JSON.parse(userJson);
      setUserInfo(user);
      return Boolean(user);
    } catch (e) {
      return false;
    }
  }, []);

  // ✅ HÀM LẤY TÊN MÀU TỪ DATABASE
  const getColorNameFromDB = useCallback((hex) => {
    if (!hex) return 'Màu tùy chỉnh';
    
    const normalizedHex = hex.toLowerCase().replace('#', '');
    
    // Tìm trong colorMapping
    if (colorMapping[normalizedHex]) {
      return colorMapping[normalizedHex];
    }
    
    // Fallback về hex code nếu không tìm thấy
    return `#${normalizedHex.toUpperCase()}`;
  }, [colorMapping]);

  // ✅ HÀM TẢI DANH SÁCH MÀU TỪ DATABASE
  const fetchColors = async () => {
    try {
      const response = await colorApi.getAllColors({
        page: 1,
        limit: 1000 // Lấy tất cả màu
      });
      
      if (response.success && response.data.docs) {
        const colors = response.data.docs;
        setColorList(colors);
        
        // Tạo mapping hex -> tên
        const mapping = {};
        colors.forEach(color => {
          const hex = color.description.toLowerCase().replace('#', '');
          mapping[hex] = color.name;
        });
        setColorMapping(mapping);
        
        console.log('✅ Đã tải', colors.length, 'màu từ database');
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách màu:', error);
      message.warning('Không thể tải danh sách màu từ server');
    }
  };

  // ✅ HÀM CHUYỂN ĐỔI TÊN MÀU (SỬ DỤNG DATABASE)
  const hexToColorName = useCallback((hex) => {
    return getColorNameFromDB(hex);
  }, [getColorNameFromDB]);

  const calculateDiscountedPrice = (product) => {
    const now = new Date();
    let finalPrice = product.price;
    let maxDiscountPercent = 0;
    let appliedPromotion = null;

    console.log('=== PRODUCT DETAIL DEBUG PROMOTION ===');
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

    console.log('=== END PRODUCT DETAIL DEBUG ===');

    return {
      originalPrice: product.price,
      finalPrice: Math.round(finalPrice),
      discountPercent: maxDiscountPercent,
      appliedPromotion: appliedPromotion,
      hasDiscount: maxDiscountPercent > 0,
      savedAmount: Math.round(product.price - finalPrice)
    };
  };

  const fetchActivePromotions = async () => {
    try {
      console.log('=== PRODUCT DETAIL FETCHING PROMOTIONS DEBUG ===');
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
      console.error('=== PRODUCT DETAIL PROMOTION FETCH ERROR ===');
      console.error('Error details:', error);
      setActivePromotions([]);
    }
  };

  const formatPrice = (price) => {
    return numberWithCommas(price) + " đ";
  };

  const findVariant = useCallback(() => {
    if (!selectedColor || !selectedSize || !variants || variants.length === 0) {
      return null;
    }

    return variants.find(
      v => v.color === selectedColor && v.size === selectedSize
    );
  }, [selectedColor, selectedSize, variants]);

  useEffect(() => {
    const variant = findVariant();
    setSelectedVariant(variant);
  }, [selectedColor, selectedSize, findVariant]);

  const addCart = () => {
    try {
      if (!productDetail) return;

      if (variants && variants.length > 0) {
        if (!selectedVariant) {
          return message.warning('Vui lòng chọn màu sắc và kích thước!');
        }

        if (selectedVariant.quantity < quantity) {
          return message.error(`Chỉ còn ${selectedVariant.quantity} sản phẩm với màu ${hexToColorName(selectedColor)} và kích thước ${selectedSize}!`);
        }
      } else if (productDetail.quantity < quantity) {
        return message.error(`Chỉ còn ${productDetail.quantity} sản phẩm!`);
      }

      const existingItems = JSON.parse(localStorage.getItem("cart")) || [];
      let updatedItems;

      const cartItemId = selectedVariant 
        ? `${productDetail._id}-${selectedVariant.color}-${selectedVariant.size}`
        : productDetail._id;

      const existingItemIndex = existingItems.findIndex(
        (item) => item.cartItemId === cartItemId
      );

      if (existingItemIndex !== -1) {
        updatedItems = existingItems.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = item.quantity + quantity;
            
            const maxQuantity = selectedVariant 
              ? selectedVariant.quantity 
              : productDetail.quantity;

            if (newQuantity > maxQuantity) {
              message.warning(`Chỉ còn ${maxQuantity} sản phẩm trong kho!`);
              return {
                ...item,
                quantity: maxQuantity,
              };
            }

            return {
              ...item,
              quantity: newQuantity,
            };
          }
          return item;
        });
      } else {
        const newItem = {
          ...productDetail,
          quantity: quantity,
          cartItemId,
          selectedColor,
          selectedSize,
          variantQuantity: selectedVariant ? selectedVariant.quantity : productDetail.quantity
        };

        updatedItems = [...existingItems, newItem];
      }

      setCartLength(updatedItems.length);
      localStorage.setItem("cart", JSON.stringify(updatedItems));
      localStorage.setItem("cartLength", updatedItems.length);
      
      // ✅ DISPATCH EVENT ĐỂ HEADER CẬP NHẬT
      window.dispatchEvent(new Event('cartUpdated'));
      
      message.success('Đã thêm sản phẩm vào giỏ hàng!');
    } catch (error) {
      console.error('Lỗi khi thêm vào giỏ hàng:', error);
      message.error('Không thể thêm sản phẩm vào giỏ hàng!');
    }
  };

  const paymentCard = () => {
    addCart();
    history.push("/cart");
  };

  const handleReadMore = (id) => {
    history.push("/product-detail/" + id);
    fetchProductDetail(id);
  };

  const handleColorClick = (color) => {
    const newColor = color === selectedColor ? null : color;
    setSelectedColor(newColor);
    setSelectedSize(null);
  };

  const getAvailableSizesForColor = (color) => {
    if (!color) return [];
    return variants
      .filter(v => v.color === color && v.quantity > 0)
      .map(v => v.size);
  };

  const fetchProductDetail = async (productId) => {
    try {
      setLoading(true);
      
      await fetchActivePromotions();
      
      const productResponse = await productApi.getDetailProduct(productId);
      setProductDetail(productResponse.product);
      setProductReview(productResponse.reviews || []);
      setProductReviewCount(productResponse.reviewStats || {});
      setAvgRating(productResponse.avgRating || 0);
      
      try {
        const variantsResponse = await productApi.getAllVariants(productId);
        if (variantsResponse && variantsResponse.success && variantsResponse.variants) {
          setVariants(variantsResponse.variants);
        } else if (productResponse.product && productResponse.product.variants) {
          setVariants(productResponse.product.variants);
        } else {
          console.warn("Không tìm thấy thông tin biến thể");
          if (productResponse.product.color && productResponse.product.sizes) {
            generateVariantsFromProductDetails(productResponse.product);
          }
        }
      } catch (variantError) {
        console.error("Lỗi khi tải biến thể:", variantError);
        if (productResponse.product && productResponse.product.variants) {
          setVariants(productResponse.product.variants);
        } else if (productResponse.product.color && productResponse.product.sizes) {
          generateVariantsFromProductDetails(productResponse.product);
        }
      }

      try {
        let recommendResponse = null;

        const response = await userApi.getProfile();

        let currentUser = response.user;

        console.log("Current user for recommendations:", currentUser?._id);
        if (currentUser?._id) {
          try {
            const userRecommend = await productApi.getRecommendByUser(currentUser._id);
            console.log("Recommend by user response:", userRecommend);

            if (userRecommend?.recommendations?.length > 0) {
              recommendResponse = userRecommend;
            } else {
              recommendResponse = await productApi.getRecommendProduct(productId);
            }
          } catch (err) {
            console.error("Recommend by user error:", err);
            recommendResponse = await productApi.getRecommendProduct(productId);
          }
        } else {
          recommendResponse = await productApi.getRecommendProduct(productId);
        }

        setRecommend(recommendResponse?.recommendations || []);
      } catch (recommendError) {
        let recommendResponse = await productApi.getRecommendProduct(productId);
        setRecommend(recommendResponse?.recommendations || []);
      }

      try {
          const reviewResponse = await productApi.getProductReviews(productId);
          
          console.log('Review response:', reviewResponse);
          
          if (reviewResponse && reviewResponse.data) {
              const reviews = reviewResponse.data || [];
              setProductRatings(reviews);

              if (reviews.length > 0) {
                  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
                  const avg = total / reviews.length;
                  setAverageRating(Number(avg.toFixed(1)));
              } else {
                  setAverageRating(0);
              }
          } else {
              setProductRatings([]);
              setAverageRating(0);
          }
      } catch (error) {
          console.error('Lỗi khi tải đánh giá:', error);
          setProductRatings([]);
          setAverageRating(0);
      }
      
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectedVariant(null);
      setQuantity(1);

      setLoading(false);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Lỗi khi tải chi tiết sản phẩm:", error);
      message.error("Không thể tải thông tin sản phẩm. Vui lòng thử lại sau!");
      setLoading(false);
    }
  };

  const generateVariantsFromProductDetails = (product) => {
    if (!product.color || !product.sizes || product.color.length === 0 || product.sizes.length === 0) {
      return;
    }

    const generatedVariants = [];
    const totalQuantity = product.quantity || 0;
    const variantCount = product.color.length * product.sizes.length;
    const quantityPerVariant = Math.floor(totalQuantity / variantCount);
    let remainingQuantity = totalQuantity % variantCount;

    product.color.forEach(color => {
      product.sizes.forEach(size => {
        let variantQuantity = quantityPerVariant;
        if (remainingQuantity > 0) {
          variantQuantity++;
          remainingQuantity--;
        }

        generatedVariants.push({
          variantId: `${product._id}-${color}-${size}`,
          color: color,
          size: size,
          quantity: variantQuantity
        });
      });
    });

    setVariants(generatedVariants);
  };

  const increaseQuantity = () => {
    const maxQuantity = selectedVariant ? selectedVariant.quantity : (productDetail?.quantity || 0);
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    } else {
      message.warning(`Chỉ còn ${maxQuantity} sản phẩm trong kho!`);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // ✅ GỌI API MÀU KHI COMPONENT MOUNT
  useEffect(() => {
    fetchColors();
  }, []);

  useEffect(() => {
    fetchProductDetail(id);
    checkUserLoggedIn();
    
    const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
    setCartLength(cartItems.length);
  }, [id, checkUserLoggedIn]);

  if (loading) {
    return (
      <Card className="container_details">
        <div className="product_detail">
          <Skeleton active paragraph={{ rows: 2 }} />
          <Row gutter={12} style={{ marginTop: 20, marginBottom: 20 }}>
            <Col span={14}>
              <Skeleton.Image style={{ width: '100%', height: 400 }} active />
            </Col>
            <Col span={10}>
              <Skeleton active paragraph={{ rows: 8 }} />
            </Col>
          </Row>
          <Skeleton active paragraph={{ rows: 10 }} />
        </div>
      </Card>
    );
  }

  if (!productDetail) {
    return (
      <div className="container_details">
        <Card>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <h2>Không tìm thấy sản phẩm</h2>
            <Button type="primary" onClick={() => history.push('/product-list/643cd88879b4192efedda4e6')}>
              Quay lại danh sách sản phẩm
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const priceInfo = calculateDiscountedPrice(productDetail);

  const stockStatus = selectedVariant
    ? selectedVariant.quantity > 0
    : productDetail.quantity > 0;

  const availableSizesForSelectedColor = getAvailableSizesForColor(selectedColor);

  return (
    <div>
      <Card className="container_details">
        <div className="product_detail">
          <div style={{ marginLeft: 5, marginBottom: 10 }}>
            <Breadcrumb>
              <Breadcrumb.Item>
                <Link to="/home">Trang chủ</Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                <Link to="/product-list/643cd88879b4192efedda4e6">Sản phẩm</Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>{productDetail.name}</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <hr />
          
          <Row gutter={24} style={{ marginTop: 20, marginBottom: 20 }}>
            <Col lg={14} md={24}>
              <div className="product-image-section">
                {productDetail?.slide?.length > 0 ? (
                  <Carousel autoplay className="carousel-image">
                    {productDetail.slide.map((item, index) => (
                      <div className="img" key={index}>
                        <img
                          style={{ width: '100%', objectFit: 'contain', height: '500px' }}
                          src={item}
                          alt={`${productDetail.name} - ${index + 1}`}
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </Carousel>
                ) : (
                  <Card className="card_image" bordered={false}>
                    <img src={productDetail.image} alt={productDetail.name} />
                  </Card>
                )}

                {priceInfo.hasDiscount && (
                  <div className="image-discount-overlay">
                    <div className="discount-badge-large">
                      <span className="discount-percent">-{priceInfo.discountPercent}%</span>
                      <span className="discount-text">GIẢM GIÁ</span>
                    </div>
                  </div>
                )}
              </div>
            </Col>

            <Col lg={10} md={24}>
              <div className="product-info-section">
                <div className="product-header">
                  <h1 className="product_name">{productDetail.name}</h1>
                </div>

                {averageRating > 0 && (
                  <div className="product-rating">
                    <Rate disabled allowHalf value={averageRating} />
                    <span className="rating-text">
                      {averageRating.toFixed(1)} ({productRatings.length} đánh giá)
                    </span>
                  </div>
                )}
                
                <Card className="price-card" bordered={false}>
                  {priceInfo.appliedPromotion && (
                    <div className="promotion-banner">
                      <div className="promotion-header">
                        <InfoCircleOutlined style={{ color: '#52c41a' }} />
                        <span>🎉 {priceInfo.appliedPromotion.tenKhuyenMai}</span>
                      </div>
                      <div className="savings-info">
                        Tiết kiệm: <strong>{formatPrice(priceInfo.savedAmount)}</strong>
                      </div>
                    </div>
                  )}

                  <div className="price-section">
                    <div className="price-row">
                      <span className="current-price">
                        {formatPrice(priceInfo.finalPrice)}
                      </span>
                      
                      {priceInfo.hasDiscount && (
                        <>
                          <span className="original-price">
                            {formatPrice(priceInfo.originalPrice)}
                          </span>
                          <Badge 
                            count={`-${priceInfo.discountPercent}%`} 
                            style={{ backgroundColor: '#ff4d4f' }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="box-product-promotion">
                    <div className="box-product-promotion-header">
                      <p>🎁 Ưu đãi đặc biệt</p>
                    </div>
                    <div className="box-content-promotion">
                      <ul>
                        <li>✅ Miễn phí vận chuyển cho đơn hàng trên 500.000đ</li>
                        <li>✅ Tặng thêm voucher cho lần mua tiếp theo</li>
                        <li>✅ Hỗ trợ đổi trả trong 30 ngày</li>
                        {priceInfo.hasDiscount && (
                          <li>🔥 <strong>Giảm {priceInfo.discountPercent}% - Tiết kiệm {formatPrice(priceInfo.savedAmount)}</strong></li>
                        )}
                      </ul>
                    </div>
                  </div>
                  
                  {/* ===== ✅ PHẦN CHỌN MÀU SẮC ĐÃ CẬP NHẬT - SỬ DỤNG DATABASE ===== */}
                  {productDetail.color && productDetail.color.length > 0 && (
                    <div className="color-product">
                      <div className="option-label">
                        Màu sắc: 
                        {selectedColor && (
                          <span className="selected-option"> {hexToColorName(selectedColor)}</span>
                        )}
                      </div>
                      <div className="color-options">
                        {productDetail.color.map((color) => {
                          const hasColorInStock = variants.some(
                            v => v.color === color && v.quantity > 0
                          );
                          
                          const colorName = hexToColorName(color);
                          const isLight = isLightColor(color);
                          
                          return (
                            <Tooltip 
                              key={color} 
                              title={`${colorName}${!hasColorInStock ? ' (Hết hàng)' : ''}`}
                            >
                              <div
                                style={{ 
                                  backgroundColor: color,
                                  opacity: hasColorInStock ? 1 : 0.5,
                                  cursor: hasColorInStock ? 'pointer' : 'not-allowed',
                                  border: isLight ? '2px solid #d9d9d9' : '2px solid transparent'
                                }}
                                className={`color-dot ${selectedColor === color ? "active" : ""} ${!hasColorInStock ? 'out-of-stock' : ''}`}
                                onClick={() => hasColorInStock && handleColorClick(color)}
                              >
                                {selectedColor === color && (
                                  <CheckCircleOutlined 
                                    className="check-icon"
                                    style={{ color: isLight ? '#000' : '#fff' }}
                                  />
                                )}
                                <span className="color-name" style={{ color: isLight ? '#000' : '#fff' }}>
                                  {colorName}
                                </span>
                              </div>
                            </Tooltip>
                          );
                        })}
                      </div>
                      {!selectedColor && productDetail.sizes && productDetail.sizes.length > 0 && (
                        <div className="selection-notice">
                          Vui lòng chọn màu sắc trước
                        </div>
                      )}
                    </div>
                  )}
                  
                  {productDetail.sizes && productDetail.sizes.length > 0 && (
                    <div className="size-product">
                      <div className="option-label">
                        Kích thước: 
                        {selectedSize && <span className="selected-option"> {selectedSize}</span>}
                      </div>
                      <div className="size-options">
                        {productDetail.sizes.map((size) => {
                          const isSizeAvailable = selectedColor && availableSizesForSelectedColor.includes(size);
                          
                          return (
                            <Tooltip 
                              key={size} 
                              title={!selectedColor ? 'Vui lòng chọn màu sắc trước' : (!isSizeAvailable ? 'Hết hàng' : '')}
                            >
                              <div
                                onClick={() => selectedColor && isSizeAvailable && setSelectedSize(size === selectedSize ? null : size)}
                                className={`size-option ${size === selectedSize ? 'active' : ''} ${!(selectedColor && isSizeAvailable) ? 'disabled' : ''}`}
                              >
                                {size}
                              </div>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* ===== ✅ HIỂN THỊ TÊN MÀU TỪ DATABASE TRONG VARIANT INFO ===== */}
                  {selectedVariant && (
                    <div className="variant-info">
                      <Tag 
                        icon={selectedVariant.quantity > 0 ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                        color={selectedVariant.quantity > 0 ? "success" : "error"}
                      >
                        {selectedVariant.quantity > 0 
                          ? `Còn ${selectedVariant.quantity} sản phẩm ${hexToColorName(selectedColor)} - ${selectedSize}` 
                          : `Hết hàng ${hexToColorName(selectedColor)} - ${selectedSize}`}
                      </Tag>
                    </div>
                  )}
                  
                  <div className="quantity-selector">
                    <div className="option-label">Số lượng:</div>
                    <div className="quantity-controls">
                      <Button 
                        onClick={decreaseQuantity} 
                        disabled={quantity <= 1}
                        className="quantity-btn"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={selectedVariant ? selectedVariant.quantity : productDetail.quantity}
                        value={quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          const maxQuantity = selectedVariant ? selectedVariant.quantity : productDetail.quantity;
                          setQuantity(Math.min(val, maxQuantity));
                        }}
                        className="quantity-input"
                      />
                      <Button 
                        onClick={increaseQuantity}
                        disabled={!stockStatus || quantity >= (selectedVariant ? selectedVariant.quantity : productDetail.quantity)}
                        className="quantity-btn"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  
                  <div className="purchase-buttons">
                    <Button
                      type="primary"
                      size="large"
                      onClick={paymentCard}
                      disabled={!stockStatus || (variants.length > 0 && !selectedVariant)}
                      className="buy-now-btn"
                      block
                    >
                      Mua ngay
                    </Button>
                    <Button
                      size="large"
                      onClick={addCart}
                      disabled={!stockStatus || (variants.length > 0 && !selectedVariant)}
                      className="add-cart-btn"
                      icon={<ShoppingCartOutlined />}
                      block
                    >
                      Thêm vào giỏ
                    </Button>
                  </div>
                </Card>
              </div>
            </Col>
          </Row>
          
          <Divider />
          
          <div className="describe">
            <div className="title_total">
              Mô tả sản phẩm
            </div>
            <div
              className="describe_detail_description"
              dangerouslySetInnerHTML={{ __html: productDetail.description }}
            ></div>

            <Divider />
            <div className="product-reviews">
              <h3 className="reviews-title">
                Đánh giá từ khách hàng
                {productRatings.length > 0 && (
                  <div className="reviews-summary">
                    <Rate disabled allowHalf value={averageRating} />
                    <span>
                      {averageRating.toFixed(1)} / 5 ({productRatings.length} đánh giá)
                    </span>
                  </div>
                )}
              </h3>

              {productRatings.length === 0 ? (
                <div className="no-reviews">
                  <p>Chưa có đánh giá nào cho sản phẩm này.</p>
                  <p>Hãy là người đầu tiên đánh giá sản phẩm!</p>
                </div>
              ) : (
                <div className="reviews-list">
                  {productRatings.map((review, index) => (
                    <Card key={index} className="review-item">
                      <div className="review-header">
                        <Rate disabled defaultValue={review.rating} />
                        <span className="review-date">
                          {new Date(review.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <div className="reviewer-name">
                        <strong>{review.customer}</strong>
                      </div>
                      <p className="review-content">{review.comment}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <Divider />
          
          {/* ===== ✅ PHẦN RECOMMEND ĐÃ CẬP NHẬT - SỬ DỤNG TÊN MÀU TỪ DATABASE ===== */}
          {recommend && recommend.length > 0 && (
            <>
              <div className="recommend-section">
                <h2 className="recommend-title">Sản phẩm bạn có thể quan tâm</h2>
              </div>
              
              <Row gutter={[16, 16]} className="recommend-products">
                {recommend.map((item) => {
                  const itemPriceInfo = calculateDiscountedPrice(item);
                  
                  return (
                    <Col
                      xl={6} lg={6} md={8} sm={12} xs={24}
                      key={item._id}
                      onClick={() => handleReadMore(item._id)}
                    >
                      <Card className="recommend-card" hoverable>
                        <div className="recommend-image">
                          {item.image ? (
                            <img src={item.image} alt={item.name} />
                          ) : (
                            <img
                              src={require("../../../assets/image/NoImageAvailable.jpg")}
                              alt="No image available"
                            />
                          )}
                          
                          {itemPriceInfo.hasDiscount && (
                            <div className="recommend-discount-badge">
                              -{itemPriceInfo.discountPercent}%
                            </div>
                          )}
                        </div>
                        
                        <div className="recommend-info">
                          <Paragraph 
                            className="recommend-name"
                            ellipsis={{ rows: 2, tooltip: item.name }}
                          >
                            {item.name}
                          </Paragraph>
                          
                          <div className="recommend-price">
                            <span className="current-price">
                              {formatPrice(itemPriceInfo.finalPrice)}
                            </span>
                            {itemPriceInfo.hasDiscount && (
                              <span className="original-price">
                                {formatPrice(itemPriceInfo.originalPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="recommend-badge">
                          <span>Gợi ý</span>
                          <img src={triangleTopRight} alt="Triangle" />
                        </div>
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ProductDetail;