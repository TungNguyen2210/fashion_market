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
    notification
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


    const handleOkUser = async (values) => {
        setLoading(true);
        try {

            const categoryList = {
                "name": values.name,
                "description": description,
                "slug": values.slug,
                "price": values.price,
                "category": values.category,
                "image": file,
                "promotion": values.promotion,
                "quantity": values.quantity,
                "color": values.colors,
                "slide": images,
                "supplier": values.supplier,
                "sizes": values.sizes

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
                // Lưu trữ URL hình ảnh trong trạng thái của thành phần
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

            const categoryList = {
                "name": values.name,
                "description": description,
                "price": values.price,
                "category": values.category,
                "image": file || values.image,
                "promotion": values.promotion,
                "quantity": values.quantity,
                "color": values.colors,
                "supplier": values.supplier,
                "sizes": values.sizes
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
            ;
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
                form2.setFieldsValue({
                    name: response.product.name,
                    price: response.product.price,
                    category: response?.product.category?._id,
                    quantity: response.product.quantity,
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
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
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


                ;
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
                                                <Button onClick={handleOpen} icon={<PlusOutlined />} style={{ marginLeft: 10 }} >Tạo sản phẩm</Button>
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
                            name="quantity"
                            label="Số lượng"
                            rules={[
                                {
                                    required: true,
                                    message: 'Vui lòng nhập số lượng!',
                                },
                            ]}
                            style={{ marginBottom: 10 }}
                        >
                            <Input placeholder="Số lượng" type="number" />
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
                            >
                                <Select.Option key="S" value="S">S</Select.Option>
                                <Select.Option key="M" value="M">M</Select.Option>
                                <Select.Option key="L" value="L">L</Select.Option>
                                <Select.Option key="XL" value="XL">XL</Select.Option>
                                <Select.Option key="XXL" value="XXL">XXL</Select.Option>
                              
                            </Select>
                        </Form.Item>

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
                                        // ['paragraphStyle', 'blockquote'],
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
                                        // ['math'] //You must add the 'katex' library at options to use the 'math' plugin.
                                        // ['imageGallery'], // You must add the "imageGalleryUrl".
                                        // ["fullScreen", "showBlocks", "codeView"],
                                        ["preview", "print"],
                                        ["removeFormat"]

                                        // ['save', 'template'],
                                        // '/', Line break
                                    ],
                                    fontSize: [
                                        8, 10, 14, 18, 24,
                                    ], // Or Array of button list, eg. [['font', 'align'], ['image']]
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
                            >
                                <Select.Option key="S" value="S">S</Select.Option>
                                <Select.Option key="M" value="M">M</Select.Option>
                                <Select.Option key="L" value="L">L</Select.Option>
                                <Select.Option key="XL" value="XL">XL</Select.Option>
                                <Select.Option key="XXL" value="XXL">XXL</Select.Option>
                              
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="image"
                            label="Ảnh sản phẩm"
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
                                        <Option value={item?._id} key={index} >
                                            {item?.name}
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
                                setContents={description}
                                setOptions={{
                                    buttonList: [
                                        ["undo", "redo"],
                                        ["font", "fontSize"],
                                        // ['paragraphStyle', 'blockquote'],
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
                                        // ['math'] //You must add the 'katex' library at options to use the 'math' plugin.
                                        // ['imageGallery'], // You must add the "imageGalleryUrl".
                                        // ["fullScreen", "showBlocks", "codeView"],
                                        ["preview", "print"],
                                        ["removeFormat"]

                                        // ['save', 'template'],
                                        // '/', Line break
                                    ],
                                    fontSize: [
                                        8, 10, 14, 18, 24,
                                    ], // Or Array of button list, eg. [['font', 'align'], ['image']]
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