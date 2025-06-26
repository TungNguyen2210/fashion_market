import React, { useEffect, useState } from "react";
import axiosClient from "../../apis/axiosClient";
import "./notification.css";
import { Button, notification, Row, Col, Form, Input, Select, Spin, Layout, List, Menu, Modal, Avatar, Image, Breadcrumb } from 'antd';
import { FormOutlined, HomeOutlined, MailOutlined, NotificationOutlined } from '@ant-design/icons';
import eventApi from "../../apis/eventApi";
import SunEditor from 'suneditor-react';
import 'suneditor/dist/css/suneditor.min.css';

const { confirm } = Modal;
const { Option } = Select;
const { SubMenu } = Menu;
const { Sider, Content } = Layout;

const Notification = () => {

    const [form] = Form.useForm();
    const [dataEmail, setDataEmail] = useState([]);
    const [dataEmailSend, setDataEmailSend] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleUser, setVisibleUser] = useState(false);
    const [emailEvent, setEmailEvent] = useState([]);
    const [visibleEmail, setVisibleEmail] = useState(false);
    const [contentEmail, setContentEmail] = useState();
    const [viewContent, setViewContent] = useState(1);
    const [nameEvent, setNameEvent] = useState([]);

    const showModalUser = () => {
        setVisibleUser(true);
    };

    const handleCancelUser = e => {
        setVisibleUser(false);
    };

    const handleOkUser = async (values) => {
        console.log(values.name_event)
        setLoading(true);
        try {
            if (localStorage.getItem("role") == "creator") {
                await axiosClient.get("/event/" + values.name_event + "/take_part_in_event/email").then(res => {
                    console.log(res.email)
                    const emails = {
                        "email": {
                            "send_from": values.send_from,
                            "title": values.title,
                            "content": values.content,
                            "emails_address": res.email
                        }
                    }
                    return axiosClient.post("/user/send_email", emails).then(response => {
                        if (response === undefined) {
                            notification["error"]({
                                message: `Notification`,
                                description:
                                    'Send Email failed',
                            });
                        }
                        else {
                            notification["success"]({
                                message: `Notification`,
                                description:
                                    'Successfully send email',
                            });
                            setVisibleUser(false);
                        }
                        setLoading(false);
                        listEmail();
                        return eventApi.getDataEmail().then(res => {
                            setDataEmail(res)
                        })

                    })
                })

            }
            else {
                const emails = {
                    "email": {
                        "send_from": values.send_from,
                        "title": values.title,
                        "content": values.content,
                        "emails_address": values.emails_address
                    }
                }
                await axiosClient.post("/user/send_email", emails).then(response => {
                    if (response === undefined) {
                        notification["error"]({
                            message: `Notification`,
                            description:
                                'Send Email failed',
                        });
                    }
                    else {
                        notification["success"]({
                            message: `Notification`,
                            description:
                                'Successfully send email',
                        });
                        setVisibleUser(false);
                    }
                    return eventApi.getDataEmail().then(res => {
                        setDataEmail(res)
                    })
                })
                setLoading(false);
                listEmail();
            }

        } catch (error) {
            throw error;
        }
    };

    const listEmail = () => {
        (async () => {
            try {
                await eventApi.getDataMyEmail().then(res => {
                    setDataEmailSend(res)
                })

                await eventApi.getAllEmailUser().then((email) => {
                    setEmailEvent(email);
                    return eventApi.getDataEmail().then(res => {
                        setDataEmail(res)
                    })
                });
                setLoading(false);
                ;
            } catch (error) {
                console.log('Failed to fetch event list:' + error);
            }
        })();
    }

    const handleEmailDetail = async (uid) => {
        setLoading(true);
        setVisibleEmail(true);
        try {
            await axiosClient.get("/email/" + uid).then(response => {
                if (response === undefined) {
                    notification["error"]({
                        message: `Notification`,
                        description:
                            'Send Email failed',
                    });
                }
                setContentEmail(response)
            })
            setLoading(false);
        } catch (error) {
            throw error;
        }
    }

    const handleCancel = () => {
        setVisibleEmail(false);
    }

    const handleChange = (content) => {
        console.log(content); //Get Content Inside Editor
        //setDescription(content);
    }

    const handleViewContent = (key) => {
        setViewContent(key);
    }

    useEffect(() => {
        window.scroll(0, 0);
        (async () => {
            try {
                await eventApi.getDataMyEmail().then(res => {
                    setDataEmailSend(res)
                })

                await eventApi.getAllEmailUser().then((email) => {
                    setEmailEvent(email);
                    return eventApi.getDataEmail().then(res => {
                        setDataEmail(res)
                    })
                });

                const response = await eventApi.getListMyEvents(1, 20000);
                setNameEvent(response.data);
                setLoading(false);

                ;
            } catch (error) {
                console.log('Failed to fetch event list:' + error);
            }
        })();
    }, [])

    return (

        <Layout >
            <Spin spinning={loading}>
                <div style={{ marginTop: 20, marginLeft: 24 }}>
                    <Breadcrumb>
                        <Breadcrumb.Item href="">
                            <HomeOutlined />
                        </Breadcrumb.Item>
                        <Breadcrumb.Item href="">
                            <NotificationOutlined />
                            <span>Notification</span>
                        </Breadcrumb.Item>
                    </Breadcrumb>
                </div>

                <div id="container__notification">
                    <Layout>
                        <Sider width={200} className="site-layout-background">
                            <Menu
                                mode="inline"
                                defaultSelectedKeys={['1']}
                                defaultOpenKeys={['sub1']}
                                style={{ height: '100%', borderRight: 0 }}
                            >
                                <Button size="default" className="button-hover" onClick={() => showModalUser()} style={{ marginTop: 20, width: "80%", marginBottom: 5, marginLeft: 20, marginRight: 20, borderRadius: 6 }}>
                                    Compose
                                </Button>
                                <Menu.Item style={{ marginTop: 20 }} className="item-mail" icon={<MailOutlined />}
                                    key="1" onClick={() => handleViewContent(1)}>Inbox</Menu.Item>
                                <Menu.Item className="item-mail" icon={<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-75 feather feather-send"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>}
                                    key="2" onClick={() => handleViewContent(2)}>Send</Menu.Item>
                            </Menu>
                        </Sider>
                        <Layout style={{ paddingLeft: 2, background: "#FFFFFF" }}>
                            <Content
                                className="site-layout-background-content"
                                style={{
                                    padding: 24,
                                    margin: 0,
                                    width: '100%',
                                    minHeight: 500,
                                }}
                            >
                                {viewContent == 1 ?
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={dataEmail}
                                        pagination={{
                                            onChange: page => {
                                                console.log(page);
                                            },
                                            pageSize: 6,
                                        }}
                                        renderItem={item => (
                                            <List.Item >
                                                <List.Item.Meta
                                                    title={<p style={{ padding: 0, margin: 0, cursor: "pointer" }} onClick={() => handleEmailDetail(item.uid)}>{item.title}</p>}
                                                    description={<p dangerouslySetInnerHTML={{ __html: item.content }} style={{ padding: 0, margin: 0 }} className="notification-content"></p>}
                                                />
                                            </List.Item>
                                        )}
                                    /> : <List
                                        itemLayout="horizontal"
                                        dataSource={dataEmailSend}
                                        pagination={{
                                            onChange: page => {
                                                console.log(page);
                                            },
                                            pageSize: 6,
                                        }}
                                        renderItem={item => (
                                            <List.Item >
                                                <List.Item.Meta
                                                    title={<p style={{ padding: 0, margin: 0, cursor: "pointer" }} onClick={() => handleEmailDetail(item.uid)}>{item.title}</p>}
                                                    description={<p dangerouslySetInnerHTML={{ __html: item.content }} style={{ padding: 0, margin: 0 }} className="notification-content"></p>}
                                                />
                                            </List.Item>
                                        )}
                                    />}
                            </Content>
                        </Layout>
                        <Modal
                            title="Compose Mail"
                            visible={visibleUser}
                            onOk={() => {
                                form
                                    .validateFields()
                                    .then((values) => {
                                        form.resetFields();
                                        handleOkUser(values);
                                    })
                                    .catch((info) => {
                                        console.log('Validate Failed:', info);
                                    });
                            }}
                            onCancel={handleCancelUser}
                            okText="Send"
                            cancelText="Cancel"
                            width={600}
                            style={{ top: 20 }}
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
                                    name="send_from"
                                    label="Sender's name"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Please input your sender name!',
                                        },
                                    ]}
                                    style={{ marginBottom: 10 }}
                                >
                                    <Input placeholder="Sender's name" />
                                </Form.Item>

                                {localStorage.getItem("role") == "creator" ?
                                    <Form.Item
                                        name="name_event"
                                        label="To Event "
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Please input your event!',
                                            },
                                        ]}
                                        style={{ marginBottom: 10 }}
                                    >
                                        <Select style={{ width: '100%' }} tokenSeparators={[',']} placeholder="Event" showSearch filterOption={(input, option) =>
                                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                        }>
                                            {nameEvent.map((item, index) => {
                                                return (
                                                    <Option value={item.uid} key={index} >
                                                        {item.event_name}
                                                    </Option>
                                                )
                                            })}
                                        </Select>
                                    </Form.Item>
                                    :
                                    <Form.Item
                                        name="emails_address"
                                        label="To"
                                        rules={[
                                            {
                                                required: true,
                                                message: 'Please input your emails address!',
                                            },
                                        ]}
                                        style={{ marginBottom: 10 }}
                                    >
                                        <Select mode="multiple" style={{ width: '100%' }} tokenSeparators={[',']} placeholder="Email" showSearch filterOption={(input, option) =>
                                            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                                        }>
                                            {emailEvent.map((item, index) => {
                                                return (
                                                    <Option value={item} key={index} >
                                                        {item}
                                                    </Option>
                                                )
                                            })}
                                        </Select>
                                    </Form.Item>


                                }

                                <Form.Item
                                    name="title"
                                    label="Subject"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Please input your subject!',
                                        },
                                    ]}
                                    style={{ marginBottom: 10 }}
                                >
                                    <Input placeholder="Subject" />
                                </Form.Item>

                                <Form.Item
                                    name="content"
                                    label="Content"
                                    rules={[
                                        {
                                            required: true,
                                            message: 'Please input your content!',
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
                                            minHeight: "150px",
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
                        </Modal>
                        <Modal
                            title="Mail Details"
                            visible={visibleEmail}
                            width={600}
                            style={{ top: 30 }}
                            onCancel={() => handleCancel()}
                            footer={null}
                        >
                            <h3 style={{ padding: 0, margin: 0, marginBottom: 15 }} ><strong>{contentEmail?.title}</strong></h3>
                            <Row>
                                <Col span="2">
                                    <Avatar
                                        src={<Image src="https://zos.alipayobjects.com/rmsportal/ODTLcjxAfvqbxHnVXCYX.png" />}
                                    />
                                </Col>
                                <Col span="22">
                                    <Row>
                                        <h4 style={{ padding: 0, margin: 0, marginLeft: 10 }} ><strong>Send From: {contentEmail?.send_by}</strong></h4>
                                    </Row>
                                    <Row>
                                        {contentEmail?.list_email.map((item, id) => {
                                            return (
                                                <p style={{ padding: 0, margin: 0, marginTop: 4, fontSize: 14, marginLeft: 10 }} >To: {item}</p>
                                            )
                                        })}
                                    </Row>
                                </Col>
                            </Row>
                            <p dangerouslySetInnerHTML={{ __html: contentEmail?.content }} style={{ padding: 0, margin: 0, marginTop: 20 }}></p>
                        </Modal>
                    </Layout>

                </div>
            </Spin>
        </Layout>
    )
}

export default Notification;