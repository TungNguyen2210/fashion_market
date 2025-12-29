import {
    DeleteOutlined,
    EditOutlined,
    FormOutlined,
    HomeOutlined,
    PlusOutlined,
    UploadOutlined,
    DownloadOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import {
    BackTop,
    Breadcrumb,
    Button,
    Col,
    Drawer,
    Form,
    Input,
    Popconfirm,
    Row,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Upload,
    message,
    notification,
    Divider,
    Card,
    Alert,
    Tooltip
} from 'antd';
import React, { useEffect, useState } from 'react';
import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';
import axiosClient from '../../apis/axiosClient';
import newsApi from "../../apis/newsApi";
import productApi from "../../apis/productsApi";
import supplierApi from '../../apis/supplierApi';
import * as XLSX from 'xlsx';
import uploadFileApi from '../../apis/uploadFileApi';

import "./productList.css";
const { Option } = Select;

const ProductList = () => {
    const [product, setProduct] = useState([]);
    const [category, setCategoryList] = useState([]);
    const [openModalCreate, setOpenModalCreate] = useState(false);
    const [openModalUpdate, setOpenModalUpdate] = useState(false);
    const [image, setImage] = useState();
    const [newsList, setNewsList] = useState([]);

    const [loading, setLoading] = useState(true);
    const [form] = Form.useForm();
    const [form2] = Form.useForm();
    const [currentPage, setCurrentPage] = useState(1);
    const [description, setDescription] = useState();
    const [total, setTotalList] = useState(false);
    const [id, setId] = useState();
    const [visible, setVisible] = useState(false);
    const [images, setImages] = useState([]);
    const [supplier, setSupplier] = useState([]);

    const [variants, setVariants] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);

    // 🔥 NEW: State để lưu thông tin khả năng chỉnh sửa
    const [editability, setEditability] = useState({
        canEditName: true,
        canEditPrice: true,
        canEditImage: true,
        canEditDescription: true,
        canEditCategory: true,
        canEditSupplier: true,
        canAddColors: false,
        canRemoveColors: true,
        canModifyExistingColors: true,
        canAddSizes: false,
        canRemoveSizes: true,
        canModifyExistingSizes: true,
        canEditVariantQuantity: true,
        canDelete: true,
        hasSold: false,
        hasActivePromotion: false,
        activePromotions: [],
        originalData: {
            colors: [],
            sizes: [],
            price: 0
        },
        restrictions: {}
    });

    const generateVariantId = (productId, size, color) => {
        return `${productId}-${size}-${color.replace('#', '')}`;
    };

    const handleColorChange = (colors) => {
        setSelectedColors(colors);
        updateVariants(colors, selectedSizes);
    };

    const handleSizeChange = (sizes) => {
        setSelectedSizes(sizes);
        updateVariants(selectedColors, sizes);
    };

    const updateVariants = (colors, sizes) => {
        if (!colors.length || !sizes.length) {
            setVariants([]);
            return;
        }

        let newVariants = [];
        colors.forEach(color => {
            sizes.forEach(size => {
                const existingVariant = variants.find(v => v.color === color && v.size === size);

                newVariants.push({
                    color: color,
                    size: size,
                    quantity: existingVariant ? existingVariant.quantity : 0
                });
            });
        });

        setVariants(newVariants);
    };

    const handleVariantQuantityChange = (color, size, quantity) => {
        const newVariants = variants.map(variant => {
            if (variant.color === color && variant.size === size) {
                return { ...variant, quantity: parseInt(quantity, 10) || 0 };
            }
            return variant;
        });

        setVariants(newVariants);

        const totalQuantity = newVariants.reduce((sum, variant) => sum + parseInt(variant.quantity, 10), 0);
    };

    const handleOkUser = async (values) => {
        setLoading(true);
        try {
            const tempProductId = Date.now().toString();

            const productVariants = variants.map(variant => ({
                variantId: generateVariantId(tempProductId, variant.size, variant.color),
                color: variant.color,
                size: variant.size,
                quantity: parseInt(variant.quantity, 10)
            }));

            const categoryList = {
                "name": values.name,
                "description": description,
                "slug": values.slug,
                "price": values.price,
                "category": values.category,
                "image": file,
                "promotion": values.promotion,
                "color": values.colors,
                "slide": images,
                "supplier": values.supplier,
                "sizes": values.sizes,
                "variants": productVariants
            };

            return axiosClient.post("/product", categoryList).then(response => {
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description: 'Tạo sản phẩm thất bại',
                    });
                } else {
                    notification["success"]({
                        message: `Thông báo`,
                        description: 'Tạo sản phẩm thành công',
                    });
                    setImages([]);
                    setVariants([]);
                    setSelectedColors([]);
                    setSelectedSizes([]);
                    setOpenModalCreate(false);
                    handleProductList();

                    const newProductId = response?._id || response?.data?._id;
                    generateEmbeddingForProduct(newProductId);
                }
            });

            setLoading(false);
        } catch (error) {
            throw error;
        }
    };

    const handleImageUpload = async (info) => {
        const image = info.file;

        try {
            const fakeEvent = {
                target: {
                    files: [image]
                }
            };
            
            const response = await uploadFileApi.uploadFile(fakeEvent);
            if (response) {
                const imageUrl = response;
                console.log(imageUrl);

                setImages(prevImages => [...prevImages, imageUrl]);

                console.log(images);
                message.success(`${info.file.name} đã được tải lên thành công!`);
            }
        } catch (error) {
            console.log(error);
            message.error('Upload file thất bại');
        }
    }

    const [file, setUploadFile] = useState();
    
    const handleChangeImage = async (e) => {
        if (!e.target.files || e.target.files.length === 0) {
            console.log('No file selected');
            return;
        }
        
        const file = e.target.files[0];
        if (!file) return;
        
        setLoading(true);
        try {
            const response = await uploadFileApi.uploadFile(e);
            if (response) {
                setUploadFile(response);
                message.success('Upload file thành công!');
            }
        } catch (error) {
            console.error('Upload error:', error);
            message.error('Upload file thất bại');
        } finally {
            setLoading(false);
        }
    }

    // 🔥 NEW: Hàm kiểm tra khả năng chỉnh sửa sản phẩm
    const checkProductEditability = async (productId) => {
        try {
            console.log('🔍 Checking editability for product:', productId);
            const response = await axiosClient.get(`/product/${productId}/editability`);
            
            if (response.success && response.data) {
                console.log('✅ Editability data:', response.data);
                setEditability({
                    canEditName: response.data.editability.canEditName,
                    canEditPrice: response.data.editability.canEditPrice,
                    canEditImage: response.data.editability.canEditImage,
                    canEditDescription: response.data.editability.canEditDescription,
                    canEditCategory: response.data.editability.canEditCategory,
                    canEditSupplier: response.data.editability.canEditSupplier,
                    canAddColors: response.data.editability.canAddColors,
                    canRemoveColors: response.data.editability.canRemoveColors,
                    canModifyExistingColors: response.data.editability.canModifyExistingColors,
                    canAddSizes: response.data.editability.canAddSizes,
                    canRemoveSizes: response.data.editability.canRemoveSizes,
                    canModifyExistingSizes: response.data.editability.canModifyExistingSizes,
                    canEditVariantQuantity: response.data.editability.canEditVariantQuantity,
                    canDelete: response.data.editability.canDelete,
                    hasSold: response.data.hasSold,
                    hasActivePromotion: response.data.hasActivePromotion,
                    activePromotions: response.data.activePromotions || [],
                    originalData: response.data.originalData || { colors: [], sizes: [], price: 0 },
                    restrictions: response.data.restrictions || {}
                });
                return response.data;
            }
        } catch (error) {
            console.error('❌ Error checking editability:', error);
            // Nếu lỗi, cho phép chỉnh sửa tất cả (fallback)
            setEditability({
                canEditName: true,
                canEditPrice: true,
                canEditImage: true,
                canEditDescription: true,
                canEditCategory: true,
                canEditSupplier: true,
                canAddColors: false,
                canRemoveColors: true,
                canModifyExistingColors: true,
                canAddSizes: false,
                canRemoveSizes: true,
                canModifyExistingSizes: true,
                canEditVariantQuantity: true,
                canDelete: true,
                hasSold: false,
                hasActivePromotion: false,
                activePromotions: [],
                originalData: { colors: [], sizes: [], price: 0 },
                restrictions: {}
            });
        }
    };

    const handleUpdateProduct = async (values) => {
        setLoading(true);
        try {
            // 🔥 Kiểm tra nếu không được phép sửa giá
            if (!editability.canEditPrice) {
                const originalPrice = editability.originalData.price;
                if (values.price !== originalPrice) {
                    notification.error({
                        message: 'Không thể chỉnh sửa',
                        description: editability.restrictions.price || 'Không thể thay đổi giá sản phẩm',
                        duration: 5
                    });
                    setLoading(false);
                    return;
                }
            }

            // 🔥 Kiểm tra colors - chỉ cho phép THÊM màu mới, không được XÓA/SỬA màu cũ
            if (editability.hasSold) {
                const originalColors = editability.originalData.colors || [];
                const newColors = values.colors || [];
                
                // Kiểm tra có màu cũ nào bị xóa không
                const removedColors = originalColors.filter(c => !newColors.includes(c));
                if (removedColors.length > 0) {
                    notification.error({
                        message: 'Không thể xóa màu',
                        description: `Không thể xóa các màu cũ khi sản phẩm đã được bán. Màu bị xóa: ${removedColors.join(', ')}`,
                        duration: 5
                    });
                    setLoading(false);
                    return;
                }
            }

            // 🔥 Kiểm tra sizes - chỉ cho phép THÊM size mới, không được XÓA/SỬA size cũ
            if (editability.hasSold) {
                const originalSizes = editability.originalData.sizes || [];
                const newSizes = values.sizes || [];
                
                // Kiểm tra có size cũ nào bị xóa không
                const removedSizes = originalSizes.filter(s => !newSizes.includes(s));
                if (removedSizes.length > 0) {
                    notification.error({
                        message: 'Không thể xóa size',
                        description: `Không thể xóa các size cũ khi sản phẩm đã được bán. Size bị xóa: ${removedSizes.join(', ')}`,
                        duration: 5
                    });
                    setLoading(false);
                    return;
                }
            }

            const productVariants = variants.map(variant => ({
                variantId: generateVariantId(id, variant.size, variant.color),
                color: variant.color,
                size: variant.size,
                quantity: parseInt(variant.quantity, 10)
            }));

            const categoryList = {
                "name": values.name,
                "description": description,
                "price": values.price,
                "category": values.category,
                "image": file || values.image,
                "promotion": values.promotion,
                "color": values.colors,
                "supplier": values.supplier,
                "sizes": values.sizes,
                "variants": productVariants
            };

            return axiosClient.put("/product/" + id, categoryList).then(response => {
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description: 'Chỉnh sửa sản phẩm thất bại',
                    });
                    setLoading(false);
                } else {
                    notification["success"]({
                        message: `Thông báo`,
                        description: 'Chỉnh sửa sản phẩm thành công',
                    });
                    setOpenModalUpdate(false);
                    handleProductList();
                    setLoading(false);

                    generateEmbeddingForProduct(id);
                }
            });
        } catch (error) {
            throw error;
        }
    };

    const handleCancel = (type) => {
        if (type === "create") {
            setOpenModalCreate(false);
        } else {
            setOpenModalUpdate(false);
            // 🔥 Reset editability khi đóng modal
            setEditability({
                canEditName: true,
                canEditPrice: true,
                canEditImage: true,
                canEditDescription: true,
                canEditCategory: true,
                canEditSupplier: true,
                canAddColors: false,
                canRemoveColors: true,
                canModifyExistingColors: true,
                canAddSizes: false,
                canRemoveSizes: true,
                canModifyExistingSizes: true,
                canEditVariantQuantity: true,
                canDelete: true,
                hasSold: false,
                hasActivePromotion: false,
                activePromotions: [],
                originalData: { colors: [], sizes: [], price: 0 },
                restrictions: {}
            });
        }
        console.log('Clicked cancel button');
    };

    const handleProductList = async () => {
        try {
            await productApi.getListProducts({ page: 1, limit: 10000 }).then((res) => {
                console.log(res);
                setProduct(res.data.docs);
                setLoading(false);
            });
        } catch (error) {
            console.log('Failed to fetch product list:' + error);
        };
    };

    const handleDeleteCategory = async (id) => {
        setLoading(true);
        try {
            const response = await productApi.deleteProduct(id);

            if (response?.success) {
                notification.success({
                    message: 'Thành công',
                    description: response.message
                });
                setCurrentPage(1);
                handleProductList();
            }

        } catch (error) {
            console.log('Delete product error:', error);

            if (error.response?.status === 400) {
                notification.warning({
                    message: 'Không thể xóa',
                    description: error.response.data.message,
                    duration: 6
                });
            } else if (error.response?.status === 404) {
                notification.error({
                    message: 'Không tìm thấy',
                    description: 'Sản phẩm không tồn tại'
                });
            } else {
                notification.error({
                    message: 'Lỗi',
                    description: error.response?.data?.message || 'Không thể xóa sản phẩm'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleProductEdit = (id) => {
        setOpenModalUpdate(true);
        (async () => {
            try {
                // 🔥 Kiểm tra khả năng chỉnh sửa trước
                await checkProductEditability(id);

                const response = await productApi.getDetailProduct(id);
                console.log(response);
                setId(id);

                setSelectedColors(response.product.color || []);
                setSelectedSizes(response.product.sizes || []);

                if (response.product.variants && response.product.variants.length > 0) {
                    setVariants(response.product.variants.map(v => ({
                        color: v.color,
                        size: v.size,
                        quantity: v.quantity
                    })));
                } else {
                    updateVariants(response.product.color || [], response.product.sizes || []);
                }

                form2.setFieldsValue({
                    name: response.product.name,
                    price: response.product.price,
                    category: response?.product.category?._id,
                    promotion: response.product.promotion,
                    colors: response.product.color,
                    supplier: response?.product.supplier,
                    sizes: response?.product.sizes
                });

                console.log(form2);
                setDescription(response.product.description);
                setLoading(false);
            } catch (error) {
                throw error;
            }
        })();
    }

    const generateEmbeddingForProduct = async (productId) => {
        if (!productId) return;
        try {
            const response = await productApi.updateEmbedding(productId);
            console.log("Embedding generated for product:", productId, response);
        } catch (err) {
            console.error("Failed to generate embedding:", err);
        }
    };

    const handleFilter = async (name) => {
        try {
            const res = await productApi.searchProduct(name);
            setTotalList(res.totalDocs)
            setProduct(res.data.docs);
        } catch (error) {
            console.log('search to fetch category list:' + error);
        }
    }

    const handleChange = (content) => {
        console.log(content);
        setDescription(content);
    }

    const columns = [
        {
            title: 'ID',
            key: 'index',
            render: (text, record, index) => index + 1,
        },
        {
            title: 'Ảnh',
            dataIndex: 'image',
            key: 'image',
            render: (image) => <img src={image} style={{ height: 80 }} />,
            width: '10%'
        },
        {
            title: 'Tên',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <a>{text}</a>,
        },
        {
            title: 'Giá gốc',
            key: 'price',
            dataIndex: 'price',
            render: (slugs) => (
                <span>
                    <div>{slugs?.toLocaleString('vi', { style: 'currency', currency: 'VND' })}</div>
                </span>
            ),
        },
        {
            title: 'Danh mục',
            dataIndex: 'category',
            key: 'category',
            render: (res) => (
                <span>
                    {res?.name}
                </span>
            ),
        },
        {
            title: 'Màu sắc',
            dataIndex: 'color',
            key: 'color',
            render: (res) => (
                <span>
                    {res?.length}
                </span>
            ),
        },
        {
            title: 'Thương hiệu',
            dataIndex: 'supplier',
            key: 'supplier',
            render: (res) => (
                <span>
                    {res?.name}
                </span>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (text, record) => (
                <div>
                    <Row>
                        <div className='groupButton'>
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                style={{ width: 150, borderRadius: 15, height: 30, marginTop: 5 }}
                                onClick={() => handleProductEdit(record._id)}
                            >{"Chỉnh sửa"}
                            </Button>
                            <div
                                style={{ marginTop: 5 }}>
                                <Popconfirm
                                    title="Bạn có chắc chắn xóa sản phẩm này?"
                                    onConfirm={() => handleDeleteCategory(record._id)}
                                    okText="Yes"
                                    cancelText="No"
                                >
                                    <Button
                                        size="small"
                                        icon={<DeleteOutlined />}
                                        style={{ width: 150, borderRadius: 15, height: 30 }}
                                    >{"Xóa"}
                                    </Button>
                                </Popconfirm>
                            </div>
                        </div>
                    </Row>
                </div >
            ),
        },
    ];

    const handleOpen = () => {
        setVisible(true);
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            await handleOkUser(values);
            form.resetFields();
            setVisible(false);
            setUploadFile(null);
        } catch (err) {
            if (err && err.errorFields) {
                notification.error({
                    message: 'Lỗi nhập liệu',
                    description: 'Vui lòng kiểm tra lại các trường bắt buộc!',
                });
                console.warn("Validation errors:", err.errorFields);
            } else {
                console.error("Unexpected error:", err);
                notification.error({
                    message: 'Lỗi hệ thống',
                    description: 'Đã xảy ra lỗi, vui lòng thử lại sau!',
                });
            }
        }
    };

    useEffect(() => {
        (async () => {
            try {
                await productApi.getListProducts({ page: 1, limit: 10000 }).then((res) => {
                    console.log(res);
                    setTotalList(res.totalDocs)
                    setProduct(res.data.docs);
                    setLoading(false);
                });

                await newsApi.getListColor({ page: 1, limit: 10 }).then((res) => {
                    console.log(res);
                    setTotalList(res.totalDocs)
                    setNewsList(res.data.docs);
                    setLoading(false);
                });

                await productApi.getListCategory({ page: 1, limit: 10000 }).then((res) => {
                    console.log(res);
                    setCategoryList(res.data.docs);
                    setLoading(false);
                });

                await supplierApi.getAllSuppliers({ page: 1, limit: 10000 }).then((res) => {
                    setSupplier(res.data.docs);
                });
            } catch (error) {
                console.log('Failed to fetch event list:' + error);
            }
        })();
    }, [])

    const exportToExcel = () => {
        const exportData = product.map(item => ({
            "Tên": item.name,
            "Giá": item.price,
            "Mô tả": item.description,
            "Danh mục": item.category,
            "Thương hiệu": item.brand,
            "Ngày tạo": item.created_at,
            "Ngày cập nhật": item.updated_at,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sản phẩm');

        XLSX.writeFile(wb, 'danh_sach_san_pham.xlsx');
    };

    const renderVariantsTable = () => {
        if (!selectedColors.length || !selectedSizes.length) {
            return (
                <Card title="Biến thể sản phẩm" style={{ marginTop: 16 }}>
                    <p>Vui lòng chọn màu sắc và kích thước để tạo biến thể sản phẩm</p>
                </Card>
            );
        }

        return (
            <Card title="Biến thể sản phẩm" style={{ marginTop: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Màu sắc</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Kích thước</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Số lượng</th>
                        </tr>
                    </thead>
                    <tbody>
                        {variants.map((variant, index) => (
                            <tr key={index}>
                                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                    <div style={{
                                        backgroundColor: variant.color,
                                        width: '20px',
                                        height: '20px',
                                        margin: '0 auto',
                                        border: '1px solid #ddd'
                                    }} />
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                    {variant.size}
                                </td>
                                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                                    <Input
                                        type="number"
                                        value={variant.quantity}
                                        onChange={(e) => handleVariantQuantityChange(
                                            variant.color,
                                            variant.size,
                                            e.target.value
                                        )}
                                        min={0}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        );
    };

    const handleOpenCreate = () => {
        setVisible(true);
        setSelectedColors([]);
        setSelectedSizes([]);
        setVariants([]);
        form.resetFields();
        setUploadFile(null);
    };

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
                                <FormOutlined />
                                <span>Danh sách sản phẩm</span>
                            </Breadcrumb.Item>
                        </Breadcrumb>
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <div id="my__event_container__list">
                            <PageHeader
                                subTitle=""
                                style={{ fontSize: 14 }}
                            >
                                <Row>
                                    <Col span="18">
                                        <Input
                                            placeholder="Tìm kiếm"
                                            allowClear
                                            onChange={handleFilter}
                                            style={{ width: 300 }}
                                        />
                                    </Col>
                                    <Col span="6">
                                        <Row justify="end">
                                            <Space>
                                                <Button onClick={handleOpenCreate} icon={<PlusOutlined />} style={{ marginLeft: 10 }} >Tạo sản phẩm</Button>
                                                <Button onClick={exportToExcel} icon={<DownloadOutlined />} style={{ marginLeft: 10 }}>Xuất Excel</Button>
                                            </Space>
                                        </Row>
                                    </Col>
                                </Row>

                            </PageHeader>
                        </div>
                    </div>

                    <div style={{ marginTop: 30 }}>
                        <Table columns={columns} dataSource={product} pagination={{ position: ['bottomCenter'] }} />
                    </div>
                </div>

                <Drawer
                    title="Tạo sản phẩm mới"
                    visible={visible}
                    onClose={() => {
                        setVisible(false);
                        setUploadFile(null);
                    }}
                    width={1000}
                    footer={
                        <div
                            style={{
                                textAlign: 'right',
                            }}
                        >
                            <Button onClick={() => {
                                setVisible(false);
                                setUploadFile(null);
                            }} style={{ marginRight: 8 }}>
                                Hủy
                            </Button>
                            <Button onClick={handleSubmit} type="primary">
                                Hoàn thành
                            </Button>
                        </div>
                    }
                >
                    <Form
                        form={form}
                        name="eventCreate"
                        layout="vertical"
                        initialValues={{
                            residence: ['zhejiang', 'hangzhou', 'xihu'],
                            prefix: '86',
                        }}
                        scrollToFirstError
                    >
                        <Form.Item
                            name="name"
                            label="Tên"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập tên!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Tên" />
                        </Form.Item>

                        <Form.Item
                            name="price"
                            label="Giá gốc"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập giá gốc!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Giá gốc" type="number" />
                        </Form.Item>

                        <Form.Item
                            name="colors"
                            label="Màu sắc"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn ít nhất một màu!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn màu"
                                onChange={handleColorChange}
                            >
                                {newsList.map((color) => (
                                    <Select.Option key={color.description} value={color?.description}>
                                        {color.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="sizes"
                            label="Size"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn ít nhất một size!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn size"
                                onChange={handleSizeChange}
                            >
                                <Select.Option key="S" value="S">S</Select.Option>
                                <Select.Option key="M" value="M">M</Select.Option>
                                <Select.Option key="L" value="L">L</Select.Option>
                                <Select.Option key="XL" value="XL">XL</Select.Option>
                                <Select.Option key="XXL" value="XXL">XXL</Select.Option>
                            </Select>
                        </Form.Item>
                        {renderVariantsTable()}

                        <Divider />

                        <Form.Item
                            name="image"
                            label="Ảnh"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập chọn ảnh!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <input 
                                type="file" 
                                onChange={handleChangeImage}
                                id="avatar" 
                                name="file"
                                accept="image/png, image/jpeg" 
                            />
                            {file && (
                                <div style={{ marginTop: 10 }}>
                                    <img src={file} alt="Preview" style={{ maxWidth: 200, maxHeight: 200 }} />
                                </div>
                            )}
                        </Form.Item>

                        <Form.Item
                            name="category"
                            label="Danh mục"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn danh mục!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select style={{ width: '100%' }} tokenSeparators={[',']} placeholder="Danh mục" showSearch filterOption={(input, option) =>
                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }>
                                {category.map((item, index) => {
                                    return (
                                        <Option value={item._id} key={index} >
                                            {item.name}
                                        </Option>
                                    )
                                })}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="supplier"
                            label="thương hiệu"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn thương hiệu!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select style={{ width: '100%' }} tokenSeparators={[',']} placeholder="thương hiệu" showSearch filterOption={(input, option) =>
                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }>
                                {supplier.map((item, index) => {
                                    return (
                                        <Option value={item?._id} key={index} >
                                            {item?.name}
                                        </Option>
                                    )
                                })}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Mô tả"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập mô tả!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <SunEditor
                                lang="en"
                                placeholder="Content"
                                onChange={handleChange}
                                setOptions={{
                                    buttonList: [
                                        ["undo", "redo"],
                                        ["font", "fontSize"],
                                        [
                                            "bold",
                                            "underline",
                                            "italic",
                                            "strike",
                                            "subscript",
                                            "superscript"
                                        ],
                                        ["fontColor", "hiliteColor"],
                                        ["align", "list", "lineHeight"],
                                        ["outdent", "indent"],
                                        ["table", "horizontalRule", "link", "image", "video"],
                                        ["preview", "print"],
                                        ["removeFormat"]
                                    ],
                                    fontSize: [
                                        8, 10, 14, 18, 24,
                                    ],
                                    defaultTag: "div",
                                    minHeight: "500px",
                                    showPathLabel: false,
                                    attributesWhitelist: {
                                        all: "style",
                                        table: "cellpadding|width|cellspacing|height|style",
                                        tr: "valign|style",
                                        td: "styleinsert|height|style",
                                        img: "title|alt|src|style"
                                    }
                                }}
                            />
                        </Form.Item>

                    </Form>
                </Drawer>

                <Drawer
                    title="Chỉnh sửa sản phẩm"
                    visible={openModalUpdate}
                    onClose={() => {
                        handleCancel("update");
                        setUploadFile(null);
                    }}
                    width={1000}
                    footer={
                        <div
                            style={{
                                textAlign: 'right',
                            }}
                        >
                            <Button onClick={() => {
                                form2
                                    .validateFields()
                                    .then((values) => {
                                        form2.resetFields();
                                        handleUpdateProduct(values);
                                    })
                                    .catch((info) => {
                                        console.log('Validate Failed:', info);
                                    });
                            }} type="primary" style={{ marginRight: 8 }}>
                                Hoàn thành
                            </Button>
                            <Button onClick={() => {
                                handleCancel("update");
                                setUploadFile(null);
                            }}>
                                Hủy
                            </Button>
                        </div>
                    }
                >
                    {/* 🔥 NEW: Hiển thị cảnh báo nếu sản phẩm có giới hạn chỉnh sửa */}
                    {editability.hasSold && (
                        <Alert
                            message="Giới hạn chỉnh sửa - Sản phẩm đã được bán"
                            description={
                                <div>
                                    <p><strong>⚠️ Sản phẩm này đã được bán ({editability.hasSold ? 'có đơn hàng' : 'chưa có đơn'}).</strong></p>
                                    <p><strong>✅ Được phép chỉnh sửa:</strong></p>
                                    <ul>
                                        <li>✓ Tên sản phẩm</li>
                                        <li>✓ Ảnh sản phẩm</li>
                                        <li>✓ Mô tả</li>
                                        <li>✓ Danh mục</li>
                                        <li>✓ Thương hiệu</li>
                                        <li>✓ <strong>Số lượng tồn kho</strong> của từng biến thể (màu + size)</li>
                                        <li>✓ <strong>Thêm màu mới</strong> (không xóa/sửa màu cũ)</li>
                                        <li>✓ <strong>Thêm size mới</strong> (không xóa/sửa size cũ)</li>
                                    </ul>
                                    <p><strong>❌ Không được phép:</strong></p>
                                    <ul>
                                        <li>✗ Thay đổi giá tiền</li>
                                        <li>✗ Xóa hoặc sửa màu cũ</li>
                                        <li>✗ Xóa hoặc sửa size cũ</li>
                                    </ul>
                                    
                                    {editability.hasActivePromotion && (
                                        <div style={{ marginTop: 16, padding: 12, background: '#fff7e6', borderRadius: 4 }}>
                                            <p><strong>🎁 Sản phẩm cũng đang trong các đợt khuyến mãi:</strong></p>
                                            <ul>
                                                {editability.activePromotions.map((promo, index) => (
                                                    <li key={index}>
                                                        <strong>{promo.name}</strong> ({promo.code}) - Giảm {promo.discount}%
                                                        <br />
                                                        <small>
                                                            Từ {new Date(promo.startDate).toLocaleDateString('vi-VN')} đến {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                                                        </small>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            }
                            type="warning"
                            showIcon
                            icon={<WarningOutlined />}
                            style={{ marginBottom: 20 }}
                        />
                    )}

                    {!editability.hasSold && editability.hasActivePromotion && (
                        <Alert
                            message="Sản phẩm đang trong đợt khuyến mãi"
                            description={
                                <div>
                                    <p>🎁 Sản phẩm đang trong các đợt khuyến mãi:</p>
                                    <ul>
                                        {editability.activePromotions.map((promo, index) => (
                                            <li key={index}>
                                                <strong>{promo.name}</strong> ({promo.code}) - Giảm {promo.discount}%
                                                <br />
                                                <small>
                                                    Từ {new Date(promo.startDate).toLocaleDateString('vi-VN')} đến {new Date(promo.endDate).toLocaleDateString('vi-VN')}
                                                </small>
                                            </li>
                                        ))}
                                    </ul>
                                    <p style={{ marginTop: 8 }}>Bạn có thể chỉnh sửa các thông tin khác nhưng cần cẩn thận.</p>
                                </div>
                            }
                            type="info"
                            showIcon
                            style={{ marginBottom: 20 }}
                        />
                    )}

                    <Form
                        form={form2}
                        name="eventUpdate"
                        layout="vertical"
                        initialValues={{
                            residence: ['zhejiang', 'hangzhou', 'xihu'],
                            prefix: '86',
                        }}
                        scrollToFirstError
                    >
                        <Form.Item
                            name="name"
                            label="Tên"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập tên!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Tên" />
                        </Form.Item>

                        {/* 🔥 NEW: Disable price field nếu không được phép sửa */}
                        <Form.Item
                            name="price"
                            label={
                                <span>
                                    Giá gốc {!editability.canEditPrice && (
                                        <Tooltip title={editability.restrictions.price}>
                                            <Tag color="red" icon={<WarningOutlined />} style={{ marginLeft: 8 }}>
                                                Không thể sửa
                                            </Tag>
                                        </Tooltip>
                                    )}
                                </span>
                            }
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập giá gốc!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input 
                                placeholder="Giá gốc" 
                                type="number"
                                disabled={!editability.canEditPrice}
                                style={!editability.canEditPrice ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                            />
                        </Form.Item>

                        {/* 🔥 NEW: Colors field với logic mới */}
                        <Form.Item
                            name="colors"
                            label={
                                <span>
                                    Màu sắc {editability.hasSold && (
                                        <Tooltip title={editability.restrictions.colors}>
                                            <Tag color="orange" icon={<WarningOutlined />} style={{ marginLeft: 8 }}>
                                                Chỉ được thêm mới
                                            </Tag>
                                        </Tooltip>
                                    )}
                                </span>
                            }
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn ít nhất một màu!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                            help={editability.hasSold ? "Bạn có thể thêm màu mới nhưng không được xóa màu cũ" : undefined}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn màu"
                                onChange={handleColorChange}
                            >
                                {newsList.map((color) => (
                                    <Select.Option key={color.description} value={color?.description}>
                                        {color.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="sizes"
                            label="Size"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn ít nhất một size!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Chọn size"
                                onChange={handleSizeChange}
                            >
                                <Select.Option key="S" value="S">S</Select.Option>
                                <Select.Option key="M" value="M">M</Select.Option>
                                <Select.Option key="L" value="L">L</Select.Option>
                                <Select.Option key="XL" value="XL">XL</Select.Option>
                                <Select.Option key="XXL" value="XXL">XXL</Select.Option>
                            </Select>
                        </Form.Item>

                        {renderVariantsTable()}

                        <Divider />

                        <Form.Item
                            name="image"
                            label="Ảnh"
                            style={{ marginBottom: 10 }}
                        >
                            <input 
                                type="file" 
                                onChange={handleChangeImage}
                                id="avatar" 
                                name="file"
                                accept="image/png, image/jpeg" 
                            />
                            {(file || form2.getFieldValue('image')) && (
                                <div style={{ marginTop: 10 }}>
                                    <img 
                                        src={file || form2.getFieldValue('image')} 
                                        alt="Preview" 
                                        style={{ maxWidth: 200, maxHeight: 200 }} 
                                    />
                                </div>
                            )}
                        </Form.Item>

                        <Form.Item
                            name="category"
                            label="Danh mục"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn danh mục!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select style={{ width: '100%' }} tokenSeparators={[',']} placeholder="Danh mục" showSearch filterOption={(input, option) =>
                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }>
                                {category.map((item, index) => {
                                    return (
                                        <Option value={item._id} key={index} >
                                            {item.name}
                                        </Option>
                                    )
                                })}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="supplier"
                            label="Thương hiệu"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng chọn thương hiệu!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Select style={{ width: '100%' }} tokenSeparators={[',']} placeholder="Thương hiệu" showSearch filterOption={(input, option) =>
                                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }>
                                {supplier.map((item, index) => {
                                    return (
                                        <Option value={item?._id} key={index} >
                                            {item?.name}
                                        </Option>
                                    )
                                })}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Mô tả"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập mô tả!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <SunEditor
                                lang="en"
                                placeholder="Content"
                                setContents={description}
                                onChange={handleChange}
                                setOptions={{
                                    buttonList: [
                                        ["undo", "redo"],
                                        ["font", "fontSize"],
                                        [
                                            "bold",
                                            "underline",
                                            "italic",
                                            "strike",
                                            "subscript",
                                            "superscript"
                                        ],
                                        ["fontColor", "hiliteColor"],
                                        ["align", "list", "lineHeight"],
                                        ["outdent", "indent"],
                                        ["table", "horizontalRule", "link", "image", "video"],
                                        ["preview", "print"],
                                        ["removeFormat"]
                                    ],
                                    fontSize: [
                                        8, 10, 14, 18, 24,
                                    ],
                                    defaultTag: "div",
                                    minHeight: "500px",
                                    showPathLabel: false,
                                    attributesWhitelist: {
                                        all: "style",
                                        table: "cellpadding|width|cellspacing|height|style",
                                        tr: "valign|style",
                                        td: "styleinsert|height|style",
                                        img: "title|alt|src|style"
                                    }
                                }}
                            />
                        </Form.Item>

                    </Form>
                </Drawer>

                <BackTop style={{ textAlign: 'right' }} />
            </Spin>
        </div >
    )
}

export default ProductList;