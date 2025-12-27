import axiosClient from "./axiosClient";

const userApi = {
    login(email, password) {
        const url = '/auth/login';
        return axiosClient
            .post(url, {
                email,
                password,
            })
            .then(response => {
                console.log(response);
                if (response.status == true && response.user.role == "isAdmin") {
                    localStorage.setItem("token", response.token);
                    localStorage.setItem("user", JSON.stringify(response.user));
                }
                return response;
            });
    },
    logout(data) {
        const url = '/user/logout';
        return axiosClient.get(url);
    },
    listUserByAdmin(data) {
        const url = '/user/search';
        if (!data.page || !data.limit) {
            data.limit = 10;
            data.page = 1;
        }
        return axiosClient.post(url, data);
    },
    banAccount(data, id) {
        const url = '/user/' + id;
        return axiosClient.put(url, data);
    },
    unBanAccount(data, id) {
        const url = '/user/' + id;
        return axiosClient.put(url, data);
    },
    getProfile() {
        const url = '/user/profile';
        return axiosClient.get(url);
    },
    searchUser(email) {
        console.log(email);
        const params = {
            email: email.target.value
        }
        const url = '/user/searchByEmail';
        return axiosClient.get(url, { params });
    },

    updateUser: (userId, userData) => {
        const url = `/user/${userId}`;
        
        console.log('✏️ Updating user:', userId);
        console.log('📦 User data:', userData);
        
        return axiosClient.put(url, userData)
            .then(response => {
                console.log('✅ Update user successful:', response);
                return response;
            })
            .catch(error => {
                console.error('❌ Update user error:', error);
                
                if (error.response) {
                    console.error('Backend error response:', error.response.data);
                    throw error.response.data;
                } else if (error.request) {
                    console.error('No response from backend:', error.request);
                    throw new Error('Không kết nối được với server');
                } else {
                    console.error('Error:', error.message);
                    throw error;
                }
            });
    },

    resetPassword: (userId, data) => {
        const url = `/user/reset-password/${userId}`;
        return axiosClient.put(url, data);
    }
}

export default userApi;