import React, { useState, useEffect } from 'react';
import "./changePassword.css";
import userApi from "../../apis/userApi";
import { useHistory } from "react-router-dom";
import { Form, Input, Button, Divider, Alert,notification } from 'antd';
import backgroundLogin from "../../assets/image/background-login.png";
import { useParams } from "react-router-dom";
import axiosClient from '../../apis/axiosClient';

const ChangePassWord = () => {

    const [changePassWord, setChangePassword] = useState();
    const [isLogin, setLogin] = useState(false);

    let history = useHistory();
    let { id } = useParams();

    const onFinish = async (values) => {
        const resetPassWord = {
            "change_password": {
                token: id,
                password: values.password 
          }
        }
        axiosClient.post("/user/change_password", resetPassWord)
            .then(function (response) {
                if (response === undefined) {
                    setLogin(true);
                }
                else {
                    notification["success"]({
                        message: `Notification`,
                        description:
                            'Successfully Change PassWord',

                    });
                    history.push("/login");
                }
            })
            .catch(error => {
                console.log("password error" + error)
            });
    }
    useEffect(() => {

    }, [])

    return (
        <div className="imageBackground">
            <div id="formContainer" >
                <div id="form-Login">
                    <div className="formContentLeft"
                    >
                        <img className="formImg" src={backgroundLogin} alt='spaceship' />
                    </div>
                    <Form
                        style={{ width: 340, marginBottom: 8 }}
                        name="normal_login"
                        className="loginform"
                        initialValues={{
                            remember: true,
                        }}
                        onFinish={onFinish}
                    >
                        <Form.Item style={{ marginBottom: 3, marginTop: 65 }}>
                            <Divider style={{ marginBottom: 5, fontSize: 19 }} orientation="center">WELCOME TO 3A2S!</Divider>
                        </Form.Item>
                        <Form.Item style={{ marginBottom: 16, textAlign: "center" }}>
                            <p className="text"> Change Password</p>
                        </Form.Item>
                        <>
                            {isLogin === true ?
                                <Form.Item style={{ marginBottom: 16 }}>
                                    <Alert
                                        message="Error changing password"
                                        type="error"
                                        showIcon
                                    />

                                </Form.Item>
                                : ""}
                        </>
                        <Form.Item
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your password!',
                                },
                            ]}
                            hasFeedback
                        >
                            <Input.Password placeholder="Password" />
                        </Form.Item>

                        <Form.Item
                            name="confirm"
                            dependencies={['password']}
                            hasFeedback
                            rules={[
                                {
                                    required: true,
                                    message: 'Please confirm your password!',
                                },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('password') === value) {
                                            return Promise.resolve();
                                        }

                                        return Promise.reject(new Error('The two passwords that you entered do not match!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password placeholder="Confirm Password" />
                        </Form.Item>

                        <Form.Item style={{ width: '100%', marginTop: 20 }}>
                            <Button className="button" type="primary" htmlType="submit"  >
                                SUBMIT
                        </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </div>
    );
};

export default ChangePassWord;



