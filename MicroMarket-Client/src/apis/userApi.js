import axiosClient from "./axiosClient";

const userApi = {
    // =====================================================
    // ĐĂNG NHẬP BẰNG EMAIL & PASSWORD
    // =====================================================
    login(email, password) {
        const url = '/auth/login';
        
        console.log('📧 Calling login API...');
        
        return axiosClient
            .post(url, {
                email,
                password,
            })
            .then(response => {
                console.log('📧 Login API raw response:', response);
                
                // ✅ Kiểm tra response hợp lệ
                if (!response) {
                    console.error('❌ Response is undefined!');
                    throw new Error('Backend không trả về dữ liệu');
                }
                
                // ✅ Backend trả về response.success
                if (response.success === true && response.user && response.token) {
                    console.log('✅ Login successful!');
                    
                    // ✅ Tự động lưu token nếu role là isClient
                    if (response.user.role === "isClient") {
                        localStorage.setItem("client", response.token);
                        console.log('💾 Token auto-saved for isClient role');
                    }
                }
                
                return response;
            })
            .catch(error => {
                console.error('❌ Login API error:', error);
                
                // ✅ Xử lý lỗi chi tiết
                if (error.response) {
                    // Backend trả về lỗi (4xx, 5xx)
                    console.error('Backend error response:', error.response.data);
                    throw new Error(error.response.data.message || 'Lỗi từ server');
                } else if (error.request) {
                    // Không nhận được response từ backend
                    console.error('No response from backend:', error.request);
                    throw new Error('Không kết nối được với server');
                } else {
                    // Lỗi khác
                    console.error('Error:', error.message);
                    throw error;
                }
            });
    },

    // =====================================================
    // ĐĂNG NHẬP BẰNG GOOGLE
    // =====================================================
    googleLogin(credential) {
        const url = '/auth/google-login';
        
        console.log('🔐 Calling Google login API...');
        console.log('📦 Credential length:', credential?.length);
        
        return axiosClient
            .post(url, { credential })
            .then(response => {
                console.log('✅ Google Login API raw response:', response);
                
                // ✅ KIỂM TRA RESPONSE HỢP LỆ
                if (!response) {
                    console.error('❌ Response is undefined!');
                    throw new Error('Backend không trả về dữ liệu');
                }
                
                if (response.success !== true) {
                    console.error('❌ Response.success is not true!');
                    console.error('Response:', response);
                    throw new Error(response.message || 'Đăng nhập thất bại');
                }
                
                if (!response.user) {
                    console.error('❌ Response.user is undefined!');
                    throw new Error('Response không có thông tin user');
                }
                
                if (!response.token) {
                    console.error('❌ Response.token is undefined!');
                    throw new Error('Response không có token');
                }
                
                // ✅ LƯU TOKEN TỰ ĐỘNG NẾU ROLE LÀ isClient
                if (response.user.role === "isClient") {
                    localStorage.setItem("client", response.token);
                    console.log('💾 Google token auto-saved for isClient role');
                }
                
                console.log('✅ Google login successful!');
                console.log('👤 User:', response.user.email);
                console.log('🔑 Token length:', response.token.length);
                
                return response;
            })
            .catch(error => {
                console.error('❌ Google Login API error:', error);
                
                // ✅ XỬ LÝ LỖI CHI TIẾT
                if (error.response) {
                    // Backend trả về lỗi
                    console.error('Backend error response:', error.response.data);
                    throw new Error(error.response.data.message || 'Lỗi từ server');
                } else if (error.request) {
                    // Không nhận được response từ backend
                    console.error('No response from backend:', error.request);
                    throw new Error('Không kết nối được với server');
                } else {
                    // Lỗi khác
                    console.error('Error:', error.message);
                    throw error;
                }
            });
    },

    // =====================================================
    // ĐĂNG KÝ
    // =====================================================
    register(email, password, username, phone) {
        const url = '/auth/register';
        
        console.log('📝 Calling register API...');
        
        return axiosClient
            .post(url, {
                email,
                password,
                username,
                phone,
            })
            .then(response => {
                console.log('📝 Register API raw response:', response);
                
                if (!response) {
                    console.error('❌ Response is undefined!');
                    throw new Error('Backend không trả về dữ liệu');
                }
                
                // ✅ Tự động lưu token nếu đăng ký thành công
                if (response.success === true && response.user && response.token) {
                    if (response.user.role === "isClient") {
                        localStorage.setItem("client", response.token);
                        console.log('💾 Token auto-saved after registration');
                    }
                }
                
                return response;
            })
            .catch(error => {
                console.error('❌ Register API error:', error);
                
                if (error.response) {
                    console.error('Backend error response:', error.response.data);
                    throw new Error(error.response.data.message || 'Lỗi từ server');
                } else if (error.request) {
                    console.error('No response from backend:', error.request);
                    throw new Error('Không kết nối được với server');
                } else {
                    console.error('Error:', error.message);
                    throw error;
                }
            });
    },

    // =====================================================
    // LOGOUT
    // =====================================================
    logout() {
        const url = '/auth/logout';
        
        console.log('🚪 Logging out...');
        
        return axiosClient.get(url).then(response => {
            // Xóa token khỏi localStorage
            localStorage.removeItem('client');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            console.log('✅ Logged out successfully');
            
            return response;
        });
    },

    // =====================================================
    // GET PROFILE (GET ME)
    // =====================================================
    getProfile() {
        const url = '/auth/me';
        
        console.log('👤 Getting user profile...');
        
        return axiosClient.get(url);
    },

    // =====================================================
    // VERIFY TOKEN
    // =====================================================
    verifyToken() {
        const url = '/auth/verify';
        
        console.log('🔍 Verifying token...');
        
        return axiosClient.get(url);
    },

    // =====================================================
    // PING ROLE
    // =====================================================
    pingRole() {
        const url = '/user/ping_role';
        
        console.log('🔔 Pinging role...');
        
        return axiosClient.get(url);
    },

    // =====================================================
    // UPDATE PROFILE
    // =====================================================
    updateProfile(editedUserData) {
         const url = '/user/profile';
        
        console.log('✏️ Updating profile...');
        
        return axiosClient.put(url, editedUserData);
    },

    changePassword: (id, data) => {
        const url = `/user/change-password`;
        return axiosClient.put(url, data);
    }
}

export default userApi;