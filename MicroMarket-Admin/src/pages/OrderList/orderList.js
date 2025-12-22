import {
    DeleteOutlined,
    DownloadOutlined,
    EditOutlined,
    EyeOutlined,
    HomeOutlined,
    ShoppingCartOutlined,
    PercentageOutlined,
    TruckOutlined,
    InfoCircleOutlined,
    CalendarOutlined,
    DollarOutlined,
    SearchOutlined,
    FilterOutlined
} from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import {
    BackTop,
    Breadcrumb,
    Button,
    Col,
    Form,
    Input,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    notification,
    Card,
    Typography,
    Avatar,
    List,
    Divider,
    Badge,
    Rate,
    Tooltip
} from 'antd';
import moment from 'moment';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import axiosClient from '../../apis/axiosClient';
import orderApi from "../../apis/orderApi";
import promotionApi from "../../apis/promotionManagementApi";
import newsApi from '../../apis/newsApi';
import * as XLSX from 'xlsx';
import "./orderList.css";
import debounce from 'lodash/debounce';

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;
const DATE_TIME_FORMAT = "DD/MM/YYYY HH:mm";


// Chuyển HEX sang RGB
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

// Hàm kiểm tra màu sáng hay tối
const isLightColor = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
};

const OrderList = () => {
    const [order, setOrder] = useState([]);
    const [openModalUpdate, setOpenModalUpdate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form2] = Form.useForm();
    const [total, setTotalList] = useState();
    const [currentPage, setCurrentPage] = useState(1);
    const [id, setId] = useState();
    const history = useHistory();

    // Modal states cho detail
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [promotionsAtOrderTime, setPromotionsAtOrderTime] = useState({});
    const [loadingPromotions, setLoadingPromotions] = useState(false);
    const [originalOrder, setOriginalOrder] = useState([]);

    const [colorList, setColorList] = useState([]);
    const [colorMapping, setColorMapping] = useState({});

    // ✅ NEW: Filter states
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterBilling, setFilterBilling] = useState('all');
    const [searchText, setSearchText] = useState('');

    // ✅ NEW: Promotion cache để tối ưu performance
    const promotionsCacheRef = useRef(null);

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

  const hexToColorName = useCallback((hex) => {
    return getColorNameFromDB(hex);
  }, [getColorNameFromDB]);


  const fetchColors = async () => {
    try {
      const response = await newsApi.getAllColors({
        page: 1,
        limit: 1000
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
        
        console.log('✅ [CART] Đã tải', colors.length, 'màu từ database');
      }
    } catch (error) {
      console.error('❌ [CART] Lỗi khi tải danh sách màu:', error);
      notification.warning({
        message: 'Thông báo',
        description: 'Không thể tải danh sách màu từ server'
      });
    }
  };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // ✅ OPTIMIZED: Load tất cả promotions 1 lần và cache lại
    const fetchAllPromotionsOnce = useCallback(async () => {
        // Nếu đã có cache, return luôn
        if (promotionsCacheRef.current) {
            console.log("✅ Using cached promotions");
            return promotionsCacheRef.current;
        }

        try {
            console.log("🔄 Fetching ALL promotions once...");
            const response = await promotionApi.listPromotionManagement();
            
            let promotionData = [];
            if (response?.data?.data?.docs) {
                promotionData = response.data.data.docs;
            } else if (response?.data?.docs) {
                promotionData = response.data.docs;
            }

            // Cache lại
            promotionsCacheRef.current = promotionData;
            console.log(`✅ Cached ${promotionData.length} promotions`);
            return promotionData;
        } catch (error) {
            console.error("❌ Error fetching promotions:", error);
            return [];
        }
    }, []);

    // ✅ OPTIMIZED: Lọc promotions cho 1 đơn hàng từ cache
    const fetchPromotionsAtOrderTime = useCallback(async (orderDate) => {
        try {
            console.log("🔍 Fetching promotions for order date:", orderDate);
            
            // Lấy từ cache thay vì gọi API mỗi lần
            const promotionData = await fetchAllPromotionsOnce();

            if (promotionData.length === 0) {
                console.log("⚠️ No promotions found in cache");
                return [];
            }

            const orderDateTime = new Date(orderDate);
            console.log("📅 Order date parsed:", orderDateTime);
            
            const activePromotionsAtOrderTime = promotionData.filter(promotion => {
                const startDate = new Date(promotion.thoiGianBD);
                const endDate = new Date(promotion.thoiGianKT);
                const isActive = orderDateTime >= startDate && orderDateTime <= endDate;
                
                const isProductPromotion = promotion.loai === 'dot_giam_gia';
                const hasProducts = promotion.sanPhamApDung && promotion.sanPhamApDung.length > 0;
                
                console.log(`🏷️ Checking promotion "${promotion.tenKhuyenMai}":`, {
                    promotionId: promotion._id,
                    type: promotion.loai,
                    isProductPromotion,
                    hasProducts,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                    orderDate: orderDateTime.toISOString(),
                    isActive,
                    productCount: promotion.sanPhamApDung?.length || 0,
                    discountPercent: promotion.phanTramKhuyenMai,
                    status: promotion.trangThai
                });
                
                return isActive && isProductPromotion && hasProducts && promotion.trangThai === 'active';
            });
            
            console.log(`✅ Found ${activePromotionsAtOrderTime.length} active product promotions:`, activePromotionsAtOrderTime);
            return activePromotionsAtOrderTime;
            
        } catch (error) {
            console.error("❌ Error fetching promotions:", error);
            return [];
        }
    }, [fetchAllPromotionsOnce]);

    const calculatePriceAtOrderTime = (product, orderDate, promotions) => {
        console.log("💰 Calculating price for product:", {
            productId: product.product?._id,
            productName: product.product?.name,
            originalPrice: product.price,
            orderDate,
            availablePromotions: promotions.length
        });

        if (!product || !product.product) {
            console.log("❌ Invalid product data");
            return {
                originalPrice: product?.price || 0,
                finalPrice: product?.price || 0,
                hasDiscount: false,
                discountPercent: 0,
                appliedPromotion: null,
                discountAmount: 0
            };
        }

        const productData = product.product;
        const originalPrice = product.price || productData.price || 0;
        
        console.log("🔍 Looking for applicable promotions for product ID:", productData._id);
        
        const applicablePromotion = promotions.find(promo => {
            const productIds = promo.sanPhamApDung?.map(p => p._id) || [];
            const hasProductId = productIds.includes(productData._id);
            
            console.log(`🎯 Checking promotion "${promo.tenKhuyenMai}":`, {
                promotionId: promo._id,
                sanPhamApDung: promo.sanPhamApDung,
                extractedProductIds: productIds,
                targetProductId: productData._id,
                hasThisProduct: hasProductId,
                discountPercent: promo.phanTramKhuyenMai
            });
            
            return hasProductId;
        });

        if (applicablePromotion) {
            const discountPercent = applicablePromotion.phanTramKhuyenMai || 0;
            const discountAmount = (originalPrice * discountPercent) / 100;
            const finalPrice = originalPrice - discountAmount;

            console.log(`🎉 FOUND APPLICABLE PROMOTION:`, {
                promotionName: applicablePromotion.tenKhuyenMai,
                originalPrice,
                discountPercent: `${discountPercent}%`,
                discountAmount,
                finalPrice,
                productName: productData.name
            });

            return {
                originalPrice,
                finalPrice: finalPrice > 0 ? finalPrice : originalPrice,
                hasDiscount: true,
                discountPercent,
                appliedPromotion: applicablePromotion,
                discountAmount
            };
        }

        console.log(`❌ No applicable promotion found for product: ${productData.name}`);
        return {
            originalPrice,
            finalPrice: originalPrice,
            hasDiscount: false,
            discountPercent: 0,
            appliedPromotion: null,
            discountAmount: 0
        };
    };

    // Helper functions
    const renderColorInfo = (color) => {
    if (!color || color === '-') {
        return <Text type="secondary">-</Text>;
    }
    
    const colorName = hexToColorName(color);
    
    return (
        <Tooltip title={colorName}>
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            cursor: 'help'
        }}>
            <div style={{
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: color,
            border: isLightColor(color) 
                ? '2px solid #d9d9d9' 
                : '2px solid #fff',
            boxShadow: '0 0 0 1px #d9d9d9',
            flexShrink: 0
            }} />
            <Text style={{ fontSize: '13px' }}>{colorName}</Text>
        </div>
        </Tooltip>
    );
    };
    
    const renderSizeInfo = (size) => {
        if (!size || size === '-') return <span>-</span>;
        return <Tag color="blue">{size}</Tag>;
    };

    const renderPromotionInfo = (order) => {
        const hasVoucher = order.voucherPromotionID;
        const hasFreeship = order.freeShipPromotionID;
        const discountAmount = order.discountAmount || 0;
        
        if (!hasVoucher && !hasFreeship) {
            return <span style={{ color: '#999' }}>Không có</span>;
        }
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {hasVoucher && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <PercentageOutlined style={{ color: '#1890ff', marginRight: '4px' }} />
                        <span style={{ fontSize: '12px', color: '#1890ff' }}>
                            Voucher: -{discountAmount.toLocaleString('vi-VN')}đ
                        </span>
                    </div>
                )}
                {hasFreeship && (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <TruckOutlined style={{ color: '#52c41a', marginRight: '4px' }} />
                        <span style={{ fontSize: '12px', color: '#52c41a' }}>
                            Miễn phí ship
                        </span>
                    </div>
                )}
            </div>
        );
    };

    const handleUpdateOrder = async (values) => {
        console.log(values);
        setLoading(true);
        try {
            const categoryList = {
                "description": values.description,
                "status": values.status
            }
            await axiosClient.put("/order/" + id, categoryList).then(response => {
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description: 'Cập nhật thất bại',
                    });
                } else {
                    notification["success"]({
                        message: `Thông báo`,
                        description: 'Cập nhật thành công',
                    });
                    setOpenModalUpdate(false);
                    handleCategoryList();
                }
            })
            setLoading(false);
        } catch (error) {
            throw error;
        }
    }

    const handleCancel = (type) => {
        if (type === "update") {
            setOpenModalUpdate(false)
        }
        console.log('Clicked cancel button');
    };

    const handleCategoryList = async () => {
        try {
            await orderApi.getListOrder({ page: 1, limit: 10000 }).then((res) => {
        
                setTotalList(res.totalDocs)
                const sortedData = res.data.docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setOrder(sortedData);
                setOriginalOrder(sortedData); 
                setLoading(false);
            });
        } catch (error) {
            console.log('Failed to fetch event list:' + error);  
        };
    }

    const handleDeleteCategory = async (id) => {
        setLoading(true);
        try {
            await orderApi.deleteOrder(id).then(response => {
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description: 'Xóa đơn hàng thất bại',
                    });
                    setLoading(false);
                } else {
                    notification["success"]({
                        message: `Thông báo`,
                        description: 'Xóa đơn hàng thành công',
                    });
                    setCurrentPage(1);
                    handleCategoryList();
                    setLoading(false);
                }
            });
        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleEditOrder = (id) => {
        setOpenModalUpdate(true);
        (async () => {
            try {
                const response = await orderApi.getDetailOrder(id);
                console.log(response);
                setId(id);
                form2.setFieldsValue({
                    status: response.status,
                    address: response.address,
                    description: response.description,
                    orderTotal: response.orderTotal,
                    products: response.products,
                    user: response.user,
                    billing: response.billing,
                });
                console.log(form2);
                setLoading(false);
            } catch (error) {
                throw error;
            }
        })();
    }

    // ✅ UPDATED: Filter với status và billing
    const applyFilters = useCallback(() => {
        try {
            let filteredData = [...originalOrder];

            // Filter by search text
            if (searchText.trim()) {
                const searchLower = searchText.toLowerCase().trim();
                filteredData = filteredData.filter(ord => {
                    const userName = ord.user?.username?.toLowerCase() || '';
                    const userEmail = ord.user?.email?.toLowerCase() || '';
                    const userPhone = ord.user?.phone?.toLowerCase() || '';
                    const orderId = ord._id?.toLowerCase() || '';
                    
                    return userName.includes(searchLower) || 
                        userEmail.includes(searchLower) || 
                        userPhone.includes(searchLower) ||
                        orderId.includes(searchLower);
                });
            }

            // Filter by status
            if (filterStatus !== 'all') {
                filteredData = filteredData.filter(ord => ord.status === filterStatus);
            }

            // Filter by billing method
            if (filterBilling !== 'all') {
                filteredData = filteredData.filter(ord => ord.billing === filterBilling);
            }

            setOrder(filteredData);
            setTotalList(filteredData.length);
            
            console.log(`🔍 Filtered ${filteredData.length} orders from ${originalOrder.length} total`);
            
        } catch (error) {
            console.log('Error in applyFilters:', error);
        }
    }, [originalOrder, searchText, filterStatus, filterBilling]);

    // Apply filters when any filter changes
    useEffect(() => {
        if (originalOrder.length > 0) {
            applyFilters();
        }
    }, [searchText, filterStatus, filterBilling, originalOrder, applyFilters]);

    const handleFilter = (searchValue) => {
        setSearchText(searchValue);
    };

    // Tạo debounced version để tối ưu performance
    const debouncedFilter = debounce(handleFilter, 300);

    // ✅ NEW: Handle view order detail
    const handleViewOrder = async (orderRecord) => {
        console.log("🔓 Opening modal for order:", orderRecord._id);
        setSelectedOrder(orderRecord);
        setIsDetailModalVisible(true);
        
        try {
            setLoadingPromotions(true);
            const promotions = await fetchPromotionsAtOrderTime(orderRecord.createdAt);
            
            console.log("💾 Setting promotions for order:", {
                orderId: orderRecord._id,
                promotionCount: promotions.length,
                promotions
            });
            
            setPromotionsAtOrderTime(prev => ({
                ...prev,
                [orderRecord._id]: promotions
            }));
        } catch (error) {
            console.error("❌ Error in handleViewOrder:", error);
        } finally {
            setLoadingPromotions(false);
        }
    };

    const handleDetailModalClose = () => {
        setIsDetailModalVisible(false);
        setSelectedOrder(null);
    };

    const columns = [
        {
            title: 'ID',
            key: 'index',
            render: (text, record, index) => index + 1,
            width: 60,
        },
        {
            title: 'Tên',
            dataIndex: 'user',
            key: 'user',
            render: (text, record) => <a>{text?.username || 'N/A'}</a>,
            width: 120,
        },
        {
            title: 'Email',
            dataIndex: 'user',
            key: 'email',
            render: (text, record) => <a>{text?.email || 'N/A'}</a>,
            width: 200,
        },
        {
            title: 'SĐT',
            dataIndex: 'user',
            key: 'phone',
            render: (text, record) => <a>{text?.phone || 'N/A'}</a>,
            width: 120,
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'orderTotal',
            key: 'orderTotal',
            render: (text) => <a>{text?.toLocaleString('vi', { style: 'currency', currency: 'VND' })}</a>,
            width: 120,
        },
        {
            title: 'Hình thức thanh toán',
            dataIndex: 'billing',
            key: 'billing',
            width: 100,
        },
        {
            title: 'Địa chỉ',
            dataIndex: 'address',
            key: 'address',
            ellipsis: true,
            width: 200,
        },
        {
            title: 'Trạng thái',
            key: 'status',
            dataIndex: 'status',
            render: (slugs) => (
                <span>
                    {slugs === "rejected" ? 
                        <Tag style={{ width: 95, textAlign: "center" }} color="red">Đã hủy</Tag> : 
                        slugs === "approved" ? 
                        <Tag style={{ width: 95, textAlign: "center" }} color="geekblue">Vận chuyển</Tag> : 
                        slugs === "final" ? 
                        <Tag color="green" style={{ width: 95, textAlign: "center" }}>Đã giao</Tag> : 
                        <Tag color="blue" style={{ width: 95, textAlign: "center" }}>Đợi xác nhận</Tag>}
                </span>
            ),
            width: 120,
        },
        {
            title: 'Ngày đặt hàng',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => <span>{formatDate(text)}</span>,
            // SỬA: Xóa phần sort mặc định
            width: 150,
        },
        {
            title: 'Ưu đãi',
            key: 'promotions',
            render: (text, record) => renderPromotionInfo(record),
            width: 120,
        },
        {
            title: 'Mô tả',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            width: 150,
        },
        {
            title: 'Action',
            key: 'action',
            fixed: 'right',
            width: 180,
            render: (text, record) => (
                <div>
                    <Space direction="vertical" size="small">
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            style={{ width: 120, borderRadius: 15, height: 30 }}
                            onClick={() => handleViewOrder(record)}
                        >
                            Xem chi tiết
                        </Button>
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            style={{ width: 120, borderRadius: 15, height: 30 }}
                            onClick={() => handleEditOrder(record._id)}
                        >
                            Chỉnh sửa
                        </Button>
                        <Popconfirm
                            title="Bạn có chắc chắn xóa đơn hàng này?"
                            onConfirm={() => handleDeleteCategory(record._id)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                size="small"
                                icon={<DeleteOutlined />}
                                style={{ width: 120, borderRadius: 15, height: 30 }}
                                danger
                            >
                                Xóa
                            </Button>
                        </Popconfirm>
                    </Space>
                </div>
            ),
        },
    ];

    const exportToExcel = () => {
        const exportData = order.map(item => ({
            "ID Đơn hàng": item._id,
            "Email người dùng": item.user?.email || 'N/A',
            "Số điện thoại người dùng": item.user?.phone || 'N/A',
            "Tên người dùng": item.user?.username || 'N/A',
            "Tổng số sản phẩm": item.products?.length || 0,
            "Tổng giá trị đơn hàng": item.orderTotal,
            "Giảm giá": item.discountAmount || 0,
            "Phí vận chuyển": item.shippingFee || 0,
            "Thành tiền": item.finalAmount,
            "Địa chỉ giao hàng": item.address,
            "Hình thức thanh toán": item.billing,
            "Trạng thái đơn hàng": item.status,
            "Mô tả": item.description,
            "Ngày tạo": item.createdAt,
            "Ngày cập nhật": item.updatedAt
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Đơn hàng');
        XLSX.writeFile(wb, 'danh_sach_don_hang.xlsx');
    };

    // ✅ NEW: Clean unnecessary data để giảm payload
    const cleanOrderData = useCallback((orders) => {
        return orders.map(order => ({
            ...order,
            products: order.products?.map(item => ({
                ...item,
                product: item.product ? {
                    _id: item.product._id,
                    name: item.product.name,
                    price: item.product.price,
                    image: item.product.image,
                    color: item.product.color,
                    sizes: item.product.sizes,
                    variants: item.product.variants,
                    // ✅ Bỏ embedding, slide và các field không cần
                } : null
            })) || []
        }));
    }, []);

    useEffect(() => {
        (async () => {
            try {
                await orderApi.getListOrder({ page: 1, limit: 10000 }).then((res) => {
                    console.log("📦 Raw data size:", JSON.stringify(res).length, "characters");
                    const docs = res?.data?.docs || [];
                    
                    // ✅ Clean data trước khi set state
                    const cleanedData = cleanOrderData(docs);
                    console.log("✨ Cleaned data size:", JSON.stringify(cleanedData).length, "characters");
                    
                    const sortedData = cleanedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setTotalList(res.totalDocs);
                    setOrder(sortedData);
                    setOriginalOrder(sortedData);
                    setLoading(false);
                });
                
                // ✅ OPTIMIZED: Preload promotions cache ngay khi load trang
                console.log("⚡ Preloading promotions cache...");
                await fetchAllPromotionsOnce();
                console.log("✅ Promotions cache ready!");
            } catch (error) {
                console.log('Failed to fetch event list:' + error);
            }
        })();
    }, [])

    useEffect(() => {
        fetchColors();
      }, []);

        return (
        <div>
            <Spin spinning={loading}>
                <div className='container'>
                    <div style={{ marginTop: 20 }}>
                        <Breadcrumb>
                            <Breadcrumb.Item href="">
                                <HomeOutlined />
                            </Breadcrumb.Item>
                            <Breadcrumb.Item href="">
                                <ShoppingCartOutlined />
                                <span>Quản lý đơn hàng</span>
                            </Breadcrumb.Item>
                        </Breadcrumb>
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <div id="my__event_container__list">
                            <PageHeader
                                subTitle=""
                                style={{ fontSize: 14 }}
                            >
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} sm={24} md={12} lg={10}>
                                        <Input
                                            placeholder="Tìm kiếm theo tên, email, số điện thoại"
                                            allowClear
                                            onChange={(e) => debouncedFilter(e.target.value)}
                                            prefix={<SearchOutlined />}
                                            style={{ width: '100%' }}
                                        />
                                    </Col>
                                    <Col xs={12} sm={12} md={6} lg={4}>
                                        <Select
                                            placeholder="Trạng thái"
                                            value={filterStatus}
                                            onChange={setFilterStatus}
                                            style={{ width: '100%' }}
                                            suffixIcon={<FilterOutlined />}
                                        >
                                            <Option value="all">Tất cả trạng thái</Option>
                                            <Option value="pending">Đợi xác nhận</Option>
                                            <Option value="approved">Vận chuyển</Option>
                                            <Option value="final">Đã giao</Option>
                                            <Option value="rejected">Đã hủy</Option>
                                        </Select>
                                    </Col>
                                    <Col xs={12} sm={12} md={6} lg={4}>
                                        <Select
                                            placeholder="Thanh toán"
                                            value={filterBilling}
                                            onChange={setFilterBilling}
                                            style={{ width: '100%' }}
                                            suffixIcon={<FilterOutlined />}
                                        >
                                            <Option value="all">Tất cả hình thức</Option>
                                            <Option value="cod">COD</Option>
                                            <Option value="paypal">PayPal</Option>
                                        </Select>
                                    </Col>
                                    <Col xs={24} sm={24} md={24} lg={6}>
                                        <Row justify="end">
                                            <Space>
                                                <Button 
                                                    onClick={exportToExcel} 
                                                    icon={<DownloadOutlined />}
                                                    type="primary"
                                                >
                                                    Xuất Excel
                                                </Button>
                                            </Space>
                                        </Row>
                                    </Col>
                                </Row>
                            </PageHeader>
                        </div>
                    </div>

                    <div style={{ marginTop: 30 }}>
                        <Table 
                            columns={columns} 
                            pagination={{ 
                                position: ['bottomCenter'],
                                showSizeChanger: true,
                                showQuickJumper: true,
                                showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn hàng`
                            }} 
                            dataSource={order} 
                            scroll={{ x: 1800 }}
                            rowKey="_id"
                            size="middle"
                        />
                    </div>
                </div>

                {/* ✅ MODAL CHI TIẾT ĐƠN HÀNG - ĐÃ SỬA: Ẩn SĐT */}
                <Modal
                    title={
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <ShoppingCartOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                            Chi tiết đơn hàng
                        </div>
                    }
                    visible={isDetailModalVisible}
                    onCancel={handleDetailModalClose}
                    footer={[
                        <Button key="close" type="primary" onClick={handleDetailModalClose}>
                            Đóng
                        </Button>
                    ]}
                    width={900}
                    className="order-detail-modal"
                >
                    {selectedOrder && (
                        <div className="order-modal-content">
                            {/* ORDER SUMMARY */}
                            <Card 
                                title={
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <InfoCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                        Thông tin đơn hàng
                                    </div>
                                } 
                                bordered={false} 
                                style={{ marginBottom: 16 }} 
                                className="order-summary-card"
                            >
                                <Row gutter={[16, 8]}>
                                    <Col xs={24} md={12}>
                                        <p><strong>Mã đơn hàng:</strong> <Text copyable>{selectedOrder._id}</Text></p>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <p><strong>Ngày đặt:</strong> {moment(selectedOrder.createdAt).format(DATE_TIME_FORMAT)}</p>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <p>
                                            <strong>Khách hàng:</strong> {selectedOrder.user?.username || 'N/A'}
                                        </p>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <p>
                                            <strong>Email:</strong> {selectedOrder.user?.email || 'N/A'}
                                        </p>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <p>
                                            <strong>Số điện thoại:</strong> {selectedOrder.user?.phone || 'N/A'}
                                        </p>
                                    </Col>
                                    {/* ĐÃ XÓA PHẦN HIỂN THỊ SỐ ĐIỆN THOẠI */}
                                    <Col xs={24} md={12}>
                                        <p><strong>Tổng đơn hàng:</strong> <Text strong style={{ color: '#d70018' }}>
                                            {selectedOrder.orderTotal?.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                        </Text></p>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <p><strong>Giảm giá:</strong> <Text style={{ color: '#1890ff' }}>
                                            -{(selectedOrder.discountAmount || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                        </Text></p>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <p><strong>Phí vận chuyển:</strong> <Text style={{ color: selectedOrder.shippingFee > 0 ? '#faad14' : '#52c41a' }}>
                                            {selectedOrder.shippingFee > 0 
                                                ? selectedOrder.shippingFee.toLocaleString("vi-VN") + 'đ'
                                                : 'Miễn phí'
                                            }
                                        </Text></p>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <p><strong>Thành tiền:</strong> <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>
                                            {selectedOrder.finalAmount?.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                        </Text></p>
                                    </Col>
                                    <Col xs={24}>
                                        <p><strong>Địa chỉ:</strong> {selectedOrder.address}</p>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <p>
                                            <strong>Trạng thái:</strong> {
                                                selectedOrder.status === "rejected" ? <Tag color="red">Đã hủy</Tag> :
                                                selectedOrder.status === "approved" ? <Tag color="geekblue">Đang vận chuyển</Tag> :
                                                selectedOrder.status === "final" ? <Tag color="green">Đã giao hàng</Tag> : 
                                                <Tag color="blue">Đợi xác nhận</Tag>
                                            }
                                        </p>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <p><strong>Thanh toán:</strong> {selectedOrder.billing === 'cod' ? 'Tiền mặt (COD)' : 'PayPal'}</p>
                                    </Col>
                                    {selectedOrder.description && (
                                        <Col xs={24}>
                                            <p><strong>Ghi chú:</strong> {selectedOrder.description}</p>
                                        </Col>
                                    )}
                                </Row>

                                {(selectedOrder.voucherPromotionID || selectedOrder.freeShipPromotionID) && (
                                    <Divider style={{ margin: '16px 0' }} />
                                )}
                                {selectedOrder.voucherPromotionID && (
                                    <div style={{ marginBottom: '8px' }}>
                                        <Badge status="processing" text={
                                            <span>
                                                <PercentageOutlined style={{ marginRight: '4px' }} />
                                                Voucher ID: <Text code>{selectedOrder.voucherPromotionID}</Text>
                                                <Text style={{ color: '#1890ff', marginLeft: '8px' }}>
                                                    (Tiết kiệm: {(selectedOrder.discountAmount || 0).toLocaleString("vi-VN")}đ)
                                                </Text>
                                            </span>
                                        } />
                                    </div>
                                )}
                                {selectedOrder.freeShipPromotionID && (
                                    <div>
                                        <Badge status="success" text={
                                            <span>
                                                <TruckOutlined style={{ marginRight: '4px' }} />
                                                Freeship ID: <Text code>{selectedOrder.freeShipPromotionID}</Text>
                                                <Text style={{ color: '#52c41a', marginLeft: '8px' }}>
                                                    (Miễn phí vận chuyển)
                                                </Text>
                                            </span>
                                        } />
                                    </div>
                                )}
                            </Card>
                            
                            {/* ✅ PRODUCT DETAILS VỚI HISTORICAL PROMOTIONS */}
                            <Card 
                                title={
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <DollarOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                                        Chi tiết sản phẩm
                                    </div>
                                } 
                                bordered={false} 
                                style={{ marginBottom: 16 }} 
                                className="order-products-card"
                            >
                                <Spin spinning={loadingPromotions}>
                                    <List
                                        dataSource={selectedOrder.products}
                                        renderItem={(item, index) => {
                                            const currentOrderPromotions = promotionsAtOrderTime[selectedOrder._id] || [];
                                            
                                            console.log("🎨 Rendering product item:", {
                                                productId: item.product?._id,
                                                productName: item.product?.name,
                                                orderPromotions: currentOrderPromotions.length,
                                                orderDate: selectedOrder.createdAt
                                            });
                                            
                                            const priceInfo = calculatePriceAtOrderTime(item, selectedOrder.createdAt, currentOrderPromotions);
                                            
                                            console.log("💸 Price calculation result:", priceInfo);
                                            
                                            const quantity = item.quantity || 0;
                                            const originalSubtotal = priceInfo.originalPrice * quantity;
                                            const finalSubtotal = priceInfo.finalPrice * quantity;
                                            const savedAmount = originalSubtotal - finalSubtotal;
                                            
                                            return (
                                                <List.Item className="modal-product-item" style={{ padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                    <List.Item.Meta
                                                        avatar={
                                                            <div style={{ position: 'relative' }}>
                                                                <Avatar 
                                                                    shape="square" 
                                                                    size={80} 
                                                                    src={item.product?.image || "https://placeholder.pics/svg/80x80"}
                                                                />
                                                                {priceInfo.hasDiscount && (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        top: '-5px',
                                                                        left: '-5px',
                                                                        background: '#ff4d4f',
                                                                        color: 'white',
                                                                        borderRadius: '50%',
                                                                        width: '30px',
                                                                        height: '30px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '12px',
                                                                        fontWeight: 'bold'
                                                                    }}>
                                                                        -{priceInfo.discountPercent}%
                                                                    </div>
                                                                )}
                                                            </div>
                                                        }
                                                        title={
                                                            <div>
                                                                <Text strong style={{ fontSize: '16px' }}>
                                                                    {item.product?.name || "Không có tên sản phẩm"}
                                                                </Text>
                                                                {priceInfo.appliedPromotion && (
                                                                    <div style={{ marginTop: '4px' }}>
                                                                        <Tag color="red" size="small">
                                                                            🏷️ {priceInfo.appliedPromotion.tenKhuyenMai}
                                                                        </Tag>
                                                                    </div>
                                                                )}
                                                                {item.variantId && (
                                                                    <div style={{ marginTop: '4px' }}>
                                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                                            Variant ID: {item.variantId}
                                                                        </Text>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        }
                                                        description={
                                                            <div className="product-specs">
                                                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <Text type="secondary">Số lượng:</Text>
                                                                        <Tag color="blue">{quantity}</Tag>
                                                                    </div>
                                                                    
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <Text type="secondary">Màu sắc:</Text>
                                                                        {renderColorInfo(item.color || (item.product?.color) || '-')}
                                                                    </div>
                                                                    
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <Text type="secondary">Kích thước:</Text>
                                                                        {renderSizeInfo(item.size || (item.product?.size) || '-')}
                                                                    </div>
                                                                    
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <Text type="secondary">Đơn giá:</Text>
                                                                        <div style={{ textAlign: 'right' }}>
                                                                            {priceInfo.hasDiscount ? (
                                                                                <>
                                                                                    <div>
                                                                                        <Text delete type="secondary" style={{ fontSize: '12px' }}>
                                                                                            {priceInfo.originalPrice.toLocaleString("vi-VN")}đ
                                                                                        </Text>
                                                                                    </div>
                                                                                    <div>
                                                                                        <Text strong style={{ color: '#ff4d4f' }}>
                                                                                            {priceInfo.finalPrice.toLocaleString("vi-VN")}đ
                                                                                        </Text>
                                                                                    </div>
                                                                                </>
                                                                            ) : (
                                                                                <Text strong>{priceInfo.originalPrice.toLocaleString("vi-VN")}đ</Text>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <Divider style={{ margin: '8px 0' }} />
                                                                    
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <Text strong>Thành tiền:</Text>
                                                                        <div style={{ textAlign: 'right' }}>
                                                                            {priceInfo.hasDiscount ? (
                                                                                <>
                                                                                    <div>
                                                                                        <Text delete type="secondary" style={{ fontSize: '12px' }}>
                                                                                            {originalSubtotal.toLocaleString("vi-VN")}đ
                                                                                        </Text>
                                                                                    </div>
                                                                                    <div>
                                                                                        <Text strong style={{ color: '#d70018', fontSize: '16px' }}>
                                                                                            {finalSubtotal.toLocaleString("vi-VN")}đ
                                                                                        </Text>
                                                                                    </div>
                                                                                    <div>
                                                                                        <Text style={{ color: '#52c41a', fontSize: '12px' }}>
                                                                                            Tiết kiệm: {savedAmount.toLocaleString("vi-VN")}đ
                                                                                        </Text>
                                                                                    </div>
                                                                                </>
                                                                            ) : (
                                                                                <Text strong style={{ color: '#d70018', fontSize: '16px' }}>
                                                                                    {finalSubtotal.toLocaleString("vi-VN")}đ
                                                                                </Text>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                                                        <Text type="secondary">Đánh giá sản phẩm:</Text>
                                                                        {item.rated ? (
                                                                            <div>
                                                                                <Rate disabled value={item.rating || 0} style={{ fontSize: '14px' }} />
                                                                                {item.comment && (
                                                                                    <div style={{ 
                                                                                        marginTop: '4px', 
                                                                                        padding: '4px 8px', 
                                                                                        background: '#f5f5f5', 
                                                                                        borderRadius: '4px',
                                                                                        fontSize: '12px'
                                                                                    }}>
                                                                                        "{item.comment}"
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <Text type="secondary" style={{ fontSize: '12px' }}>Chưa đánh giá</Text>
                                                                        )}
                                                                    </div>
                                                                </Space>
                                                            </div>
                                                        }
                                                    />
                                                </List.Item>
                                            );
                                        }}
                                    />
                                </Spin>

                                {/* ORDER TOTAL WITH HISTORICAL PROMOTIONS */}
                                <div style={{ 
                                    marginTop: '16px', 
                                    padding: '16px', 
                                    background: '#fafafa', 
                                    borderRadius: '8px',
                                    border: '1px solid #f0f0f0'
                                }}>
                                    {(() => {
                                        const currentOrderPromotions = promotionsAtOrderTime[selectedOrder._id] || [];
                                        let totalOriginal = 0;
                                        let totalWithProductPromotions = 0;
                                        
                                        selectedOrder.products.forEach(item => {
                                            const priceInfo = calculatePriceAtOrderTime(item, selectedOrder.createdAt, currentOrderPromotions);
                                            const quantity = item.quantity || 0;
                                            totalOriginal += priceInfo.originalPrice * quantity;
                                            totalWithProductPromotions += priceInfo.finalPrice * quantity;
                                        });
                                        
                                        const productPromotionSavings = totalOriginal - totalWithProductPromotions;
                                        
                                        return (
                                            <Row gutter={[16, 8]}>
                                                {productPromotionSavings > 0 && (
                                                    <>
                                                        <Col span={12}>
                                                            <Text>Tổng giá niêm yết:</Text>
                                                        </Col>
                                                        <Col span={12} style={{ textAlign: 'right' }}>
                                                            <Text delete type="secondary">{totalOriginal.toLocaleString("vi-VN")}đ</Text>
                                                        </Col>
                                                        
                                                        <Col span={12}>
                                                            <Text>Giảm giá sản phẩm:</Text>
                                                        </Col>
                                                        <Col span={12} style={{ textAlign: 'right' }}>
                                                            <Text style={{ color: '#52c41a' }}>-{productPromotionSavings.toLocaleString("vi-VN")}đ</Text>
                                                        </Col>
                                                    </>
                                                )}
                                                
                                                <Col span={12}>
                                                    <Text>Tổng tiền hàng:</Text>
                                                </Col>
                                                <Col span={12} style={{ textAlign: 'right' }}>
                                                    <Text strong>{selectedOrder.orderTotal?.toLocaleString("vi-VN")}đ</Text>
                                                </Col>
                                                
                                                {selectedOrder.discountAmount > 0 && (
                                                    <>
                                                        <Col span={12}>
                                                            <Text>Giảm giá voucher:</Text>
                                                        </Col>
                                                        <Col span={12} style={{ textAlign: 'right' }}>
                                                            <Text style={{ color: '#1890ff' }}>-{selectedOrder.discountAmount.toLocaleString("vi-VN")}đ</Text>
                                                        </Col>
                                                    </>
                                                )}
                                                
                                                <Col span={12}>
                                                    <Text>Phí vận chuyển:</Text>
                                                </Col>
                                                <Col span={12} style={{ textAlign: 'right' }}>
                                                    <Text style={{ color: selectedOrder.shippingFee > 0 ? '#faad14' : '#52c41a' }}>
                                                        {selectedOrder.shippingFee > 0 ? `+${selectedOrder.shippingFee.toLocaleString("vi-VN")}đ` : 'Miễn phí'}
                                                    </Text>
                                                </Col>
                                                
                                                <Col span={24}>
                                                    <Divider style={{ margin: '8px 0' }} />
                                                </Col>
                                                
                                                <Col span={12}>
                                                    <Text strong style={{ fontSize: '16px' }}>Tổng thanh toán:</Text>
                                                </Col>
                                                <Col span={12} style={{ textAlign: 'right' }}>
                                                    <Text strong style={{ color: '#52c41a', fontSize: '18px' }}>
                                                        {selectedOrder.finalAmount?.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                                                    </Text>
                                                </Col>
                                            </Row>
                                        );
                                    })()}
                                </div>
                            </Card>
                        </div>
                    )}
                </Modal>

                {/* ✅ MODAL CẬP NHẬT ĐƠN HÀNG */}
                <Modal
                    title="Cập nhật đơn hàng"
                    visible={openModalUpdate}
                    style={{ top: 100 }}
                    onOk={() => {
                        form2
                            .validateFields()
                            .then((values) => {
                                form2.resetFields();
                                handleUpdateOrder(values);
                            })
                            .catch((info) => {
                                console.log('Validate Failed:', info);
                            });
                    }}
                    onCancel={() => handleCancel("update")}
                    okText="Hoàn thành"
                    cancelText="Hủy"
                    width={600}
                >
                    <Form
                        form={form2}
                        name="eventCreate"
                        layout="vertical"
                        scrollToFirstError
                    >
                        <Form.Item
                            name="status"
                            label="Trạng thái"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn trạng thái!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select placeholder="Chọn trạng thái">
                                <Option value="final">Đã giao</Option>
                                <Option value="approved">Đang vận chuyển</Option>
                                <Option value="pending">Đợi xác nhận</Option>
                                <Option value="rejected">Đã hủy</Option>
                            </Select>
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label="Mô tả"
                            style={{ marginBottom: 10 }}
                        >
                            <TextArea rows={4} placeholder="Lưu ý" />
                        </Form.Item>
                    </Form>
                </Modal>
           
                <BackTop style={{ textAlign: 'right' }} />
            </Spin>
        </div>
    )
}

export default OrderList;