import React from 'react';
import { Layout } from 'antd';

const { Footer} = Layout;

function _Footer(){

    return(
        <Footer style={{
            marginLeft: 230,
            textAlign: 'center'}}>
            Copyright@ 2024 Created by FiveStore
        </Footer>
    );
}

export default _Footer;