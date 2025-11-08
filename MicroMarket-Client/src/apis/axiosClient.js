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

axiosClient.interceptors.request.use(
    async (config) => {
        // ✅ THAY ĐỔI: Kiểm tra cả 2 key 'client' và 'token'
        let token = localStorage.getItem('client') || localStorage.getItem('token');
        
        // ✅ CHỈ thêm Authorization header nếu có token hợp lệ
        if (token && token.trim() !== '' && token !== 'undefined' && token !== 'null') {
            // ✅ Xử lý Google token (rất dài) và JWT token (3 phần)
            if (token.length > 500) {
                // Google OAuth token - gửi trực tiếp
                config.headers.Authorization = token;
                console.log('🔑 [GOOGLE TOKEN] Added to request');
            } else {
                // JWT token - kiểm tra format
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
            console.log('ℹ️ [TOKEN] No token found - public request');
        }
        
        console.log('📤 [REQUEST]', {
            method: config.method?.toUpperCase(),
            url: config.url,
            hasToken: !!config.headers.Authorization,
            tokenType: token && token.length > 500 ? 'Google' : 'JWT'
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
        
        // Handle 401 Unauthorized
        if (error.response?.status === 401) {
            console.warn('⚠️ [AUTH] Unauthorized - Clearing storage');
            localStorage.removeItem('client');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login nếu không phải đang ở trang login
            if (!window.location.pathname.includes('/login')) {
                console.log('🔄 [AUTH] Redirecting to login...');
                window.location.href = '/login';
            }
        }
        
        return Promise.reject(error);
    }
);

export default axiosClient;