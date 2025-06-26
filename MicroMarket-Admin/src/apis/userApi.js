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
}

export default userApi;