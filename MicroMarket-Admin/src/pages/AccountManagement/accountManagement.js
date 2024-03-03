import React, { useState, useEffect } from 'react';
import "./accountManagement.css";
import { Button, Spin, Row, Card, Popconfirm, Table, Input, Col, notification, BackTop, Tag, Breadcrumb, Space, Popover } from 'antd';
import { HomeOutlined, PlusOutlined, UserOutlined, RedoOutlined, StopOutlined, CheckCircleOutlined, CopyOutlined, EditOutlined, SecurityScanOutlined } from '@ant-design/icons';
import userApi from "../../apis/userApi";
import { useHistory } from 'react-router-dom';
import { PageHeader } from '@ant-design/pro-layout';

const AccountManagement = () => {

    const [user, setUser] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [selectedInput, setSelectedInput] = useState();

    const history = useHistory();

    const titleCase = (str) => {
        var splitStr = str?.toLowerCase().split(' ');
        for (var i = 0; i < splitStr.length; i++) {
            // You do not need to check if i is larger than splitStr length, as your for does that for you
            // Assign it back to the array
            splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
        }
        // Directly return the joined string
        return splitStr.join(' ');
    }

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'index',
            render: (value, item, index) => (
                (page - 1) * 10 + (index + 1)
            ),
        },
        {
            title: 'Tên',
            dataIndex: 'username',
            key: 'username',
            render: (text, record) => (
                <Space size="middle">
                    {
                        text == null || text == undefined ? "" :
                            <p style={{ margin: 0 }}>{titleCase(text)}</p>
                    }

                </Space>
            ),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            width: '12%',
            render: (text, record) => (
                <Space size="middle">
                    {

                        text === "isAdmin" ?
                            <Tag color="blue" key={text} style={{ width: 100, textAlign: "center" }} icon={<CopyOutlined />}>
                                Quản lý
                            </Tag> : text === "isStaff" ? <Tag color="green" key={text} style={{ width: 100, textAlign: "center" }} icon={<CheckCircleOutlined />}>
                                Nhân viên
                            </Tag> : <Tag color="magenta" key={text} style={{ width: 100, textAlign: "center" }} icon={<CheckCircleOutlined />}>
                                Khách hàng
                            </Tag>
                    }

                </Space>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (text, record) => (
                <Space size="middle">
                    {

                        text === "actived" ?
                            <Tag color="green" key={text} style={{ width: 80, textAlign: "center" }}>
                                Hoạt động
                            </Tag> : text == "newer" ? <Tag color="blue" key={text} style={{ width: 80, textAlign: "center" }}>
                                Newer
                            </Tag>

                                : <Tag color="default" key={text} style={{ width: 80, textAlign: "center" }}>
                                    Chặn
                                </Tag>
                    }

                </Space>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (text, record) => (
                <div>
                    <Row>
                        {record.status !== "actived" ? <Popconfirm
                            title="Bạn muốn mở chặn tài khoản này?"
                            onConfirm={() => handleUnBanAccount(record)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                size="small"
                                icon={<CheckCircleOutlined />}
                                style={{ width: 160, borderRadius: 15, height: 30 }}
                            >{"Mở chặn tài khoản"}
                            </Button>
                        </Popconfirm> : <Popconfirm
                            title="Bạn muốn chặn tài khoản này?"
                            onConfirm={() => handleBanAccount(record)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button
                                size="small"
                                icon={<StopOutlined />}
                                style={{ width: 160, borderRadius: 15, height: 30 }}
                            >{"Chặn tài khoản"}
                            </Button>
                        </Popconfirm>}
                    </Row>

                </div >
            ),
        },
    ];

    const handleListUser = async () => {
        try {
            const response = await userApi.listUserByAdmin({ page: 1, limit: 1000 });
            console.log(response);
            setUser(response.data.docs);
            setLoading(false);
        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleUnBanAccount = async (data) => {
        const params = {
            status: "actived"
        }
        try {
            await userApi.unBanAccount(params, data._id).then(response => {
                if (response.message === "Email already exists") {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            'Mở khóa thất bại',

                    });
                }
                else {
                    notification["success"]({
                        message: `Thông báo`,
                        description:
                            'Mở khóa thành công',

                    });
                    handleListUser();
                }
            }
            );

        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleBanAccount = async (data) => {
        console.log(data);
        const params = {
            status: "noactive"
        }
        try {
            await userApi.banAccount(params, data._id).then(response => {
                if (response === undefined) {
                    notification["error"]({
                        message: `Thông báo`,
                        description:
                            'Chặn thất bại',

                    });
                }
                else {
                    notification["success"]({
                        message: `Thông báo`,
                        description:
                            'Chặn thành công',

                    });
                    handleListUser();
                }
            }
            );

        } catch (error) {
            console.log('Failed to fetch event list:' + error);
        }
    }

    const handleCreateAccount = () => {
        history.push("/account-create")
    }

    const handleFilterEmail = async (email) => {
        try {
            const response = await userApi.searchUser(email);
            setUser(response.data.docs);
        } catch (error) {
            console.log('search to fetch user list:' + error);
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const response = await userApi.listUserByAdmin({ page: 1, limit: 1000 });
                console.log(response);
                setUser(response.data.docs);
                setLoading(false);
            } catch (error) {
                console.log('Failed to fetch user list:' + error);
            }
        })();
        window.scrollTo(0, 0);

    }, [])
    return (
        <div>
            <Spin spinning={loading}>
                <div style={{ marginTop: 20, marginLeft: 24 }}>
                    <Breadcrumb>
                        <Breadcrumb.Item href="">
                            <HomeOutlined />
                        </Breadcrumb.Item>
                        <Breadcrumb.Item href="">
                            <UserOutlined />
                            <span>Quản lý tài khoản</span>
                        </Breadcrumb.Item>
                    </Breadcrumb>
                </div>
                <div id="account">
                    <div id="account_container">
                        <PageHeader
                            subTitle=""
                            style={{ fontSize: 14, paddingTop: 20, paddingBottom: 20 }}
                        >
                            <Row>
                                <Col span="12">
                                    <Input
                                        placeholder="Tìm kiếm"
                                        allowClear
                                        style={{ width: 300 }}
                                        onChange={handleFilterEmail}
                                        value={selectedInput}
                                    />
                                </Col>
                                <Col span="12">
                                    <Row justify="end">
                                        <Button style={{ marginLeft: 10 }} icon={<PlusOutlined />} size="middle" onClick={() => handleCreateAccount()}>{"Tạo tài khoản"}</Button>
                                    </Row>
                                </Col>
                            </Row>

                        </PageHeader>
                    </div>
                </div>
                <div style={{ marginTop: 20, marginRight: 5 }}>
                    <div id="account">
                        <div id="account_container">
                            <Card title="Quản lý tài khoản" bordered={false} >
                                <Table columns={columns} dataSource={user} pagination={{ position: ['bottomCenter'] }}
                                />
                            </Card>
                        </div>
                    </div>
                </div>
                <BackTop style={{ textAlign: 'right' }} />
            </Spin>
        </div>
    )
}

export default AccountManagement;