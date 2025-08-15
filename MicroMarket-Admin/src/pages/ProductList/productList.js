import {
    DeleteOutlined,
    EditOutlined,
    FormOutlined,
    HomeOutlined,
    PlusOutlined,
    UploadOutlined,
    DownloadOutlined
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
    Card
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
    
    // Thêm state mới để quản lý các biến thể sản phẩm
    const [variants, setVariants] = useState([]);
    const [selectedColors, setSelectedColors] = useState([]);
    const [selectedSizes, setSelectedSizes] = useState([]);

    // Hàm tạo variantId từ productId, size và color
    const generateVariantId = (productId, size, color) => {
        return `${productId}-${size}-${color.replace('#', '')}`;
    };

    // Xử lý khi chọn màu sắc mới
    const handleColorChange = (colors) => {
        setSelectedColors(colors);
        updateVariants(colors, selectedSizes);
    };

    // Xử lý khi chọn kích thước mới
    const handleSizeChange = (sizes) => {
        setSelectedSizes(sizes);
        updateVariants(selectedColors, sizes);
    };

    // Cập nhật danh sách biến thể dựa trên màu sắc và kích thước đã chọn
    const updateVariants = (colors, sizes) => {
        if (!colors.length || !sizes.length) {
            setVariants([]);
            return;
        }

        // Tạo danh sách biến thể từ tổ hợp màu sắc và kích thước
        let newVariants = [];
        colors.forEach(color => {
            sizes.forEach(size => {
                // Tìm biến thể đã tồn tại để giữ lại số lượng
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

    // Xử lý thay đổi số lượng cho một biến thể cụ thể
    const handleVariantQuantityChange = (color, size, quantity) => {
        const newVariants = variants.map(variant => {
            if (variant.color === color && variant.size === size) {
                return { ...variant, quantity: parseInt(quantity, 10) || 0 };
            }
            return variant;
        });
        
        setVariants(newVariants);
        
        // Tính toán tổng số lượng sản phẩm
        const totalQuantity = newVariants.reduce((sum, variant) => sum + parseInt(variant.quantity, 10), 0);
        
        // Không cần set field quantity nữa vì đã bỏ trường này
    };

    const handleOkUser = async (values) => {
        setLoading(true);
        try {
            // Tạo một ID tạm thời để sử dụng cho variantId
            const tempProductId = Date.now().toString();
            
            // Tạo danh sách biến thể với variantId được tạo từ id tạm thời, size và color
            const productVariants = variants.map(variant => ({
                variantId: generateVariantId(tempProductId, variant.size, variant.color),
                color: variant.color,
                size: variant.size,
                quantity: parseInt(variant.quantity, 10) 
            }));
            
            // Tính tổng số lượng từ các biến thể
            const totalQuantity = productVariants.reduce((sum, variant) => sum + parseInt(variant.quantity, 10), 0);

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
                }
            });

            setLoading(false);
        } catch (error) {
            throw error;
        }
    };

    const handleImageUpload = async (info) => {
        const image = info.file;
        const formData = new FormData();
        formData.append('image', image);

        try {
            const response = await uploadFileApi.uploadFile(image).then(response => {
                const imageUrl = response;
                console.log(imageUrl);
           
                setImages(prevImages => [...prevImages, imageUrl]);

                console.log(images);
                message.success(`${info.file.name} đã được tải lên thành công!`);
            });
        } catch (error) {
            console.log(error);
        }
    }

    const [file, setUploadFile] = useState();
    const handleChangeImage = async (e) => {
        setLoading(true);
        const response = await uploadFileApi.uploadFile(e);
        if (response) {
            setUploadFile(response);
        }
        setLoading(false);
    }

    const handleUpdateProduct = async (values) => {
        setLoading(true);
        try {
            // Tạo danh sách biến thể với variantId
            const productVariants = variants.map(variant => ({
                variantId: generateVariantId(id, variant.size, variant.color),
                color: variant.color,
                size: variant.size,
                quantity: parseInt(variant.quantity, 10)
            }));
            
            // Tính tổng số lượng từ các biến thể
            const totalQuantity = productVariants.reduce((sum, variant) => sum + parseInt(variant.quantity, 10), 0);

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
            setOpenModalUpdate(false)
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
            await productApi.deleteProduct(id).then(response => {
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            'Xóa sản phẩm thất bại',

                    });
                    setLoading(false);
                }
                else {
                    notification["success"]({
                        message: `Thông báo`,
                        description:
                            'Xóa sản phẩm thành công',

                    });
                    setCurrentPage(1);
                    handleProductList();
                    setLoading(false);
                }
            }
            );

        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleProductEdit = (id) => {
        setOpenModalUpdate(true);
        (async () => {
            try {
                const response = await productApi.getDetailProduct(id);
                console.log(response);
                setId(id);
                
                // Lưu màu sắc và kích thước từ sản phẩm
                setSelectedColors(response.product.color || []);
                setSelectedSizes(response.product.sizes || []);
                
                // Lưu các biến thể từ sản phẩm
                if (response.product.variants && response.product.variants.length > 0) {
                    setVariants(response.product.variants.map(v => ({
                        color: v.color,
                        size: v.size,
                        quantity: v.quantity
                    })));
                } else {
                    // Nếu chưa có biến thể, tạo biến thể từ màu sắc và kích thước
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
            title: 'Giá giảm',
            key: 'promotion',
            dataIndex: 'promotion',
            render: (promotion) => (
                <span>
                    <Tag color="geekblue" key={promotion}>
                        {promotion?.toLocaleString('vi', { style: 'currency', currency: 'VND' })}
                    </Tag>
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

    const handleSubmit = () => {
        form.validateFields().then((values) => {
            form.resetFields();
            handleOkUser(values);
            setVisible(false);
        });
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

    // Render bảng biến thể sản phẩm chỉ khi đã chọn màu sắc và kích thước
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

    // Reset lại state khi mở modal tạo mới sản phẩm
    const handleOpenCreate = () => {
        setVisible(true);
        setSelectedColors([]);
        setSelectedSizes([]);
        setVariants([]);
        form.resetFields();
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
                    onClose={() => setVisible(false)}
                    width={1000}
                    footer={
                        <div
                            style={{
                                textAlign: 'right',
                            }}
                        >
                            <Button onClick={() => setVisible(false)} style={{ marginRight: 8 }}>
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
                            name="promotion"
                            label="Giá giảm"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập giá giảm!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Giá giảm" type="number" />
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

                        {/* Bảng biến thể sản phẩm chỉ hiện khi đã chọn màu sắc và kích thước */}
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
                            <input type="file" onChange={handleChangeImage}
                                id="avatar" name="file"
                                accept="image/png, image/jpeg" />
                        </Form.Item>

                        <Form.Item
                            name="images"
                            label="Hình ảnh slide"
                            style={{ marginBottom: 10 }}
                        >
                            <Upload
                                name="images"
                                listType="picture-card"
                                showUploadList={true}
                                beforeUpload={() => false}
                                onChange={handleImageUpload}
                                multiple
                            >
                                <Button icon={<UploadOutlined />}>Tải lên</Button>
                            </Upload>
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
                    onClose={() => handleCancel("update")}
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
                            <Button onClick={() => handleCancel("update")}>
                                Hủy
                            </Button>
                        </div>
                    }
                >
                    <Form
                        form={form2}
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
                            <Input placeholder="Giá gốc" />
                        </Form.Item>

                        <Form.Item
                            name="promotion"
                            label="Giá giảm"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập giá giảm!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Giá giảm" />
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

                        {/* Bảng biến thể sản phẩm */}
                        {renderVariantsTable()}
                        
                        <Divider />
                        
                        <Form.Item
                            name="image"
                            label="Ảnh"
                            style={{ marginBottom: 10 }}
                        >
                            <input type="file" onChange={handleChangeImage}
                                id="avatar" name="file"
                                accept="image/png, image/jpeg" />
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