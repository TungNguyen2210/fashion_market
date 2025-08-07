import {
  Breadcrumb, Button, Card, Carousel, Col, Form, Modal,
  Rate, Row, Skeleton, Tabs, message, Input,
  Spin, Tag
} from "antd";
import Paragraph from "antd/lib/typography/Paragraph";
import React, { useEffect, useState, useCallback } from "react";
import { useHistory, useParams, Link } from "react-router-dom";
import productApi from "../../../apis/productApi";
import triangleTopRight from "../../../assets/icon/Triangle-Top-Right.svg";
import { numberWithCommas } from "../../../utils/common";
import "./productDetail.css";


const { TabPane } = Tabs;
const { TextArea } = Input;


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


  let { id } = useParams();
  const history = useHistory();


  // Kiểm tra người dùng đã đăng nhập chưa
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


  // Định dạng giá tiền
  const formatPrice = (price) => {
    return numberWithCommas(price) + " đ";
  };


  // Tìm biến thể dựa trên màu sắc và kích thước đã chọn
  const findVariant = useCallback(() => {
    if (!selectedColor || !selectedSize || !variants || variants.length === 0) {
      return null;
    }


    return variants.find(
      v => v.color === selectedColor && v.size === selectedSize
    );
  }, [selectedColor, selectedSize, variants]);


  // Cập nhật biến thể được chọn khi màu sắc hoặc kích thước thay đổi
  useEffect(() => {
    const variant = findVariant();
    setSelectedVariant(variant);
  }, [selectedColor, selectedSize, findVariant]);


  // Thêm sản phẩm vào giỏ hàng
  const addCart = () => {
    try {
      if (!productDetail) return;


      // Kiểm tra đã chọn biến thể chưa nếu sản phẩm có biến thể
      if (variants && variants.length > 0) {
        if (!selectedVariant) {
          return message.warning('Vui lòng chọn màu sắc và kích thước!');
        }


        if (selectedVariant.quantity < quantity) {
          return message.error(`Chỉ còn ${selectedVariant.quantity} sản phẩm với màu ${selectedColor} và kích thước ${selectedSize}!`);
        }
      } else if (productDetail.quantity < quantity) {
        return message.error(`Chỉ còn ${productDetail.quantity} sản phẩm!`);
      }


      const existingItems = JSON.parse(localStorage.getItem("cart")) || [];
      let updatedItems;


      // Xác định ID giỏ hàng duy nhất cho sản phẩm+biến thể
      const cartItemId = selectedVariant 
        ? `${productDetail._id}-${selectedVariant.color}-${selectedVariant.size}`
        : productDetail._id;


      const existingItemIndex = existingItems.findIndex(
        (item) => item.cartItemId === cartItemId
      );


      if (existingItemIndex !== -1) {
        // Cập nhật số lượng nếu sản phẩm đã có trong giỏ hàng
        updatedItems = existingItems.map((item, index) => {
          if (index === existingItemIndex) {
            const newQuantity = item.quantity + quantity;
            
            // Kiểm tra số lượng tồn kho
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
        // Thêm sản phẩm mới vào giỏ hàng
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
      message.success('Đã thêm sản phẩm vào giỏ hàng!');
    } catch (error) {
      console.error('Lỗi khi thêm vào giỏ hàng:', error);
      message.error('Không thể thêm sản phẩm vào giỏ hàng!');
    }
  };


  // Mua ngay
  const paymentCard = () => {
    addCart();
    history.push("/cart");
  };


  // Chuyển đến trang chi tiết sản phẩm khác
  const handleReadMore = (id) => {
    history.push("/product-detail/" + id);
    // Không reload trang, tải dữ liệu mới
    fetchProductDetail(id);
  };


  // Chọn màu sắc
  const handleColorClick = (color) => {
    // Thiết lập màu mới
    const newColor = color === selectedColor ? null : color;
    setSelectedColor(newColor);
    
    // Reset kích thước khi thay đổi màu
    setSelectedSize(null);
  };


  // Lấy danh sách kích thước có sẵn cho màu đã chọn
  const getAvailableSizesForColor = (color) => {
    if (!color) return [];
    return variants
      .filter(v => v.color === color && v.quantity > 0)
      .map(v => v.size);
  };


  // Tải dữ liệu chi tiết sản phẩm
  const fetchProductDetail = async (productId) => {
    try {
      setLoading(true);
      
      // Tải thông tin sản phẩm
      const productResponse = await productApi.getDetailProduct(productId);
      setProductDetail(productResponse.product);
      setProductReview(productResponse.reviews || []);
      setProductReviewCount(productResponse.reviewStats || {});
      setAvgRating(productResponse.avgRating || 0);
      
      // Tải các biến thể
      try {
        const variantsResponse = await productApi.getAllVariants(productId);
        if (variantsResponse && variantsResponse.success && variantsResponse.variants) {
          setVariants(variantsResponse.variants);
        } else if (productResponse.product && productResponse.product.variants) {
          setVariants(productResponse.product.variants);
        } else {
          console.warn("Không tìm thấy thông tin biến thể");
          // Tạo biến thể từ color và sizes nếu có
          if (productResponse.product.color && productResponse.product.sizes) {
            generateVariantsFromProductDetails(productResponse.product);
          }
        }
      } catch (variantError) {
        console.error("Lỗi khi tải biến thể:", variantError);
        // Nếu API getAllVariants gặp lỗi, sử dụng dữ liệu từ product
        if (productResponse.product && productResponse.product.variants) {
          setVariants(productResponse.product.variants);
        } else if (productResponse.product.color && productResponse.product.sizes) {
          // Tạo biến thể từ color và sizes nếu có
          generateVariantsFromProductDetails(productResponse.product);
        }
      }
      
      // Tải sản phẩm gợi ý
      const recommendResponse = await productApi.getRecommendProduct(productId);
      setRecommend(recommendResponse?.recommendations || []);
      
      // Hiển thị phần đánh giá sản phẩm giống file 2
      await productApi.getProductReviews(productId).then((response) => {
        const reviews = response.data || [];
        setProductRatings(reviews);

        if (reviews.length > 0) {
          const total = reviews.reduce((sum, r) => sum + r.rating, 0);
          const avg = total / reviews.length;
          setAverageRating(avg);
        } else {
          setAverageRating(0);
        }
      });
      
      // Reset lựa chọn
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectedVariant(null);
      setQuantity(1);
      
      setLoading(false);
      
      // Scroll lên đầu trang
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Lỗi khi tải chi tiết sản phẩm:", error);
      message.error("Không thể tải thông tin sản phẩm. Vui lòng thử lại sau!");
      setLoading(false);
    }
  };


  // Tạo biến thể từ thông tin màu sắc và kích thước
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


  // Tăng số lượng
  const increaseQuantity = () => {
    const maxQuantity = selectedVariant ? selectedVariant.quantity : (productDetail?.quantity || 0);
    if (quantity < maxQuantity) {
      setQuantity(quantity + 1);
    } else {
      message.warning(`Chỉ còn ${maxQuantity} sản phẩm trong kho!`);
    }
  };


  // Giảm số lượng
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };


  // Tải dữ liệu khi component được mount
  useEffect(() => {
    fetchProductDetail(id);
    checkUserLoggedIn();
    
    // Lấy số lượng sản phẩm trong giỏ hàng
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


  // Kiểm tra tình trạng tồn kho
  const stockStatus = selectedVariant 
    ? selectedVariant.quantity > 0 
    : productDetail.quantity > 0;


  // Lấy danh sách kích thước có sẵn cho màu đã chọn
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
          
          <Row gutter={12} style={{ marginTop: 20, marginBottom: 20 }}>
            {/* Hình ảnh sản phẩm */}
            <Col span={14}>
              {productDetail?.slide?.length > 0 ? (
                <Carousel autoplay className="carousel-image">
                  {productDetail.slide.map((item) => (
                    <div className="img" key={item}>
                      <img
                        style={{ width: '100%', objectFit: 'contain', height: '500px' }}
                        src={item}
                        alt={productDetail.name}
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
            </Col>
            
            {/* Thông tin sản phẩm */}
            <Col span={10}>
              <div className="price">
                <h1 className="product_name">{productDetail.name}</h1>
              </div>
              
              <Card className="card_total" bordered={false} style={{ width: "90%" }}>
                {/* Giá sản phẩm */}
                <div className="price_product">
                  {formatPrice(productDetail.promotion || productDetail.price)}
                </div>
                
                {productDetail.promotion && productDetail.promotion < productDetail.price && (
                  <div className="promotion_product">
                    {formatPrice(productDetail.price)}
                  </div>
                )}
                
                
                {/* Khuyến mãi */}
                <div className="box-product-promotion">
                  <div className="box-product-promotion-header">
                    <p>Ưu đãi</p>
                  </div>
                  <div className="box-content-promotion">
                    <ul>
                      <li>Nhiều ưu đãi - Giá hấp dẫn nhất</li>
                      <li>Tặng thêm phiếu mua hàng</li>
                      <li>Giảm giá cho khách hàng mới</li>
                    </ul>
                  </div>
                </div>
                
                {/* Chọn màu sắc */}
                {productDetail.color && productDetail.color.length > 0 && (
                  <div className="color-product">
                    <div className="option-label">Màu sắc: 
                      {selectedColor && <span className="selected-option"> {selectedColor}</span>}
                    </div>
                    <div className="color-options">
                      {productDetail.color.map((color) => {
                        // Kiểm tra xem màu này có còn hàng ở bất kỳ size nào không
                        const hasColorInStock = variants.some(
                          v => v.color === color && v.quantity > 0
                        );
                        
                        return (
                          <span
                            key={color}
                            style={{ 
                              backgroundColor: color,
                              opacity: hasColorInStock ? 1 : 0.5,
                              cursor: hasColorInStock ? 'pointer' : 'not-allowed'
                            }}
                            className={`dot ${selectedColor === color ? "active" : ""} ${!hasColorInStock ? 'out-of-stock' : ''}`}
                            onClick={() => hasColorInStock && handleColorClick(color)}
                            title={`${color}${!hasColorInStock ? ' (Hết hàng)' : ''}`}
                          ></span>
                        );
                      })}
                    </div>
                    {!selectedColor && productDetail.sizes && productDetail.sizes.length > 0 && (
                      <div className="color-selection-notice" style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>
                        Vui lòng chọn màu sắc trước
                      </div>
                    )}
                  </div>
                )}
                
                {/* Chọn kích thước */}
                {productDetail.sizes && productDetail.sizes.length > 0 && (
                  <div className="size-product" style={{ marginTop: 15 }}>
                    <div className="option-label">Kích thước: 
                      {selectedSize && <span className="selected-option"> {selectedSize}</span>}
                    </div>
                    <div className="product-sizes">
                      {productDetail.sizes.map((size) => {
                        // Nếu chưa chọn màu, tất cả size đều bị disabled
                        // Nếu đã chọn màu, chỉ hiển thị các size có sẵn cho màu đó
                        const isSizeAvailable = selectedColor && availableSizesForSelectedColor.includes(size);
                        
                        return (
                          <span
                            key={size}
                            onClick={() => selectedColor && isSizeAvailable && setSelectedSize(size === selectedSize ? null : size)}
                            style={{ 
                              transform: size === selectedSize ? 'scale(1.1)' : 'scale(1)',
                              opacity: selectedColor && isSizeAvailable ? 1 : 0.5,
                              cursor: selectedColor && isSizeAvailable ? 'pointer' : 'not-allowed'
                            }}
                            className={`size-option ${!(selectedColor && isSizeAvailable) ? 'out-of-stock' : ''}`}
                            title={!selectedColor ? 'Vui lòng chọn màu sắc trước' : (!isSizeAvailable ? 'Hết hàng' : '')}
                          >
                            {size}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Hiển thị thông tin biến thể đã chọn */}
                {selectedVariant && (
                  <div style={{ marginTop: 10, marginBottom: 10 }}>
                    <Tag color={selectedVariant.quantity > 0 ? "green" : "red"}>
                      {selectedVariant.quantity > 0 
                        ? `Còn ${selectedVariant.quantity} sản phẩm ${selectedColor} - ${selectedSize}` 
                        : `Hết hàng ${selectedColor} - ${selectedSize}`}
                    </Tag>
                  </div>
                )}
                
                {/* Số lượng */}
                <div className="quantity-selector" style={{ marginTop: 20 }}>
                  <div className="option-label">Số lượng:</div>
                  <div className="quantity-controls">
                    <Button 
                      onClick={decreaseQuantity} 
                      disabled={quantity <= 1}
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
                      style={{ width: 60, textAlign: 'center' }}
                    />
                    <Button 
                      onClick={increaseQuantity}
                      disabled={!stockStatus || quantity >= (selectedVariant ? selectedVariant.quantity : productDetail.quantity)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                
                {/* Nút mua hàng */}
                <div className="box_cart_1">
                  <Button
                    type="primary"
                    className="by"
                    size={"large"}
                    onClick={paymentCard}
                    disabled={!stockStatus || (variants.length > 0 && !selectedVariant)}
                  >
                    Mua ngay
                  </Button>
                  <Button
                    type="primary"
                    className="cart"
                    size={"large"}
                    onClick={addCart}
                    disabled={!stockStatus || (variants.length > 0 && !selectedVariant)}
                  >
                    Thêm vào giỏ
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
          <hr />
          
          <div className="describe">
            <div className="title_total" style={{ fontSize: 20, marginBottom: 10, fontWeight: 'bold' }}>
              Giới thiệu sản phẩm: "{productDetail.name}"
            </div>
            <div
              className="describe_detail_description"
              dangerouslySetInnerHTML={{ __html: productDetail.description }}
            ></div>

            {/* Phần đánh giá sản phẩm (thay thế TabPane từ file 1 bằng đánh giá từ file 2) */}
            <hr />
            <div className="product-reviews" style={{ marginTop: 30 }}>
              <h3 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                Đánh giá từ người dùng
                {productRatings.length > 0 && (
                  <>
                    <Rate disabled allowHalf value={averageRating} />
                    <span style={{ fontSize: 14 }}>
                      {averageRating.toFixed(1)} / 5
                    </span>
                  </>
                )}
              </h3>

              {productRatings.length === 0 ? (
                <p>Chưa có đánh giá nào cho sản phẩm này.</p>
              ) : (
                productRatings.map((review, index) => (
                  <Card key={index} style={{ marginBottom: 10 }}>
                    <Rate disabled defaultValue={review.rating} />
                    <p style={{ marginTop: 5, marginBottom: 5 }}>
                      <strong>{review.customer}</strong>: {review.comment}
                    </p>
                    <p style={{ fontSize: 12, color: "#888" }}>
                      {new Date(review.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </Card>
                ))
              )}
            </div>
          </div>
          
          <hr />
          
          {/* Sản phẩm gợi ý */}
          {recommend && recommend.length > 0 && (
            <>
              <div className="price" style={{ marginTop: 20, fontSize: 20 }}>
                <h1 className="product_name" style={{ fontWeight: 'bold' }}>Sản phẩm bạn có thể quan tâm</h1>
              </div>
              
              <Row
                style={{ marginTop: 40 }}
                className="row-product"
              >
                {recommend.map((item) => (
                  <Col
                    xl={{ span: 6 }}
                    lg={{ span: 6 }}
                    md={{ span: 12 }}
                    sm={{ span: 12 }}
                    xs={{ span: 24 }}
                    onClick={() => handleReadMore(item._id)}
                    key={item._id}
                  >
                    <div className="show-product" style={{ marginRight: 15 }}>
                      {item.image ? (
                        <img className="image-product" src={item.image} alt={item.name} />
                      ) : (
                        <img
                          className="image-product"
                          src={require("../../../assets/image/NoImageAvailable.jpg")}
                          alt="No image available"
                        />
                      )}
                      <div className="wrapper-products">
                        <div className="price-amount">
                          <Paragraph className="price-product">
                            {numberWithCommas(item.price - item.promotion)} đ
                          </Paragraph>
                          {item.promotion !== 0 && (
                            <Paragraph className="price-cross">
                              {numberWithCommas(item.price)} đ
                            </Paragraph>
                          )}
                        </div>
                        <Paragraph
                          className="title-product"
                          ellipsis={{ rows: 2 }}
                        >
                          {item.name}
                        </Paragraph>
                      </div>
                    </div>
                    <Paragraph
                      className="badge"
                      style={{ position: "absolute", top: 10, left: 9 }}
                    >
                      <span>Gợi ý</span>
                      <img src={triangleTopRight} alt="Triangle" />
                    </Paragraph>
                  </Col>
                ))}
              </Row>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};


export default ProductDetail;