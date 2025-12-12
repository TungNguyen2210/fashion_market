import axios from 'axios';
import queryString from 'query-string';
import { createBrowserHistory } from "history";

export const history = createBrowserHistory();

const axiosClient = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3100/api',
    headers: {
        'content-type': 'application/json'
    },
    paramsSerializer: params => queryString.stringify(params),
});


const PUBLIC_ENDPOINTS = [
    '/product',              // Danh sách sản phẩm
    '/product/',             // Chi tiết sản phẩm
    '/product/searchByName', // Tìm kiếm sản phẩm
    '/category',             // Danh mục
    '/news',                 // Tin tức
    '/contact',              // Liên hệ
    '/auth/login',           // Đăng nhập
    '/auth/register',        // Đăng ký
    '/auth/google-login',    // Google login
    '/auth/logout',          // Logout
];

// ✅ DANH SÁCH ENDPOINTS PRIVATE (bắt buộc đăng nhập)
const PRIVATE_ENDPOINTS = [
    '/auth/me',              // Lấy thông tin user
    '/user',                 // Cập nhật profile
    '/order',                // Đơn hàng
    '/cart-history',         // Lịch sử giỏ hàng
    '/checkout',             // Thanh toán
];

const isPublicEndpoint = (url) => {
    if (!url) return false;
    return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};


const isPrivateEndpoint = (url) => {
    if (!url) return false;
    return PRIVATE_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

axiosClient.interceptors.request.use(
    async (config) => {
        let token = localStorage.getItem('client') || localStorage.getItem('token');
        
        if (token && token.trim() !== '' && token !== 'undefined' && token !== 'null') {
            if (token.length > 500) {
                config.headers.Authorization = token;
                console.log('🔑 [GOOGLE TOKEN] Added to request');
            } else {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    config.headers.Authorization = `Bearer ${token}`;
                    console.log('🔑 [JWT TOKEN] Added to request');
                } else {
                    console.warn('⚠️ [TOKEN] Invalid format, clearing...');
                    localStorage.removeItem('client');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                }
            }
        } else {
            console.log('ℹ️ [TOKEN] No token - public request');
        }
        
        console.log('📤 [REQUEST]', {
            method: config.method?.toUpperCase(),
            url: config.url,
            hasToken: !!config.headers.Authorization,
            isPublic: isPublicEndpoint(config.url),
            isPrivate: isPrivateEndpoint(config.url)
        });
        
        return config;
    },
    (error) => {
        console.error('❌ [REQUEST ERROR]', error);
        return Promise.reject(error);
    }
);

axiosClient.interceptors.response.use(
    (response) => {
        console.log('✅ [RESPONSE]', {
            url: response.config.url,
            status: response.status
        });
        
        if (response && response.data) {
            return response.data;
        }
        return response;
    },
    (error) => {
        console.error('❌ [RESPONSE ERROR]', {
            url: error.config?.url,
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
        });

        if (error.config?.url?.includes('/auth/logout') && error.response?.status === 404) {
            console.warn('⚠️ [LOGOUT] Endpoint not found - handling locally');
            return Promise.resolve({ success: true, message: 'Logged out locally' });
        }

        if (error.response?.status === 401) {
            const requestUrl = error.config?.url;

            if (isPublicEndpoint(requestUrl)) {
                console.log('ℹ️ [AUTH] 401 on public endpoint - allowing continued browsing');
                return Promise.reject(error);
            }

            if (isPrivateEndpoint(requestUrl)) {
                console.warn('⚠️ [AUTH] Unauthorized on private endpoint - Clearing storage');
                localStorage.removeItem('client');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                const currentPath = window.location.pathname;
                const isAuthPage = currentPath.includes('/login') || currentPath.includes('/register');
                
                if (!isAuthPage) {
                    console.log('🔄 [AUTH] Redirecting to login...');
                    
                    // ✅ LƯU PATH ĐỂ REDIRECT SAU KHI LOGIN
                    if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
                        localStorage.setItem('redirectAfterLogin', currentPath);
                    }
                    
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 100);
                }
            }
        }
        
        return Promise.reject(error);
    }
);

export default axiosClient;