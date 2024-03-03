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
                if (response) {
                    localStorage.setItem("client", response.token);
                }
                return response;
            });
    },
    logout(data) {
        const url = '/user/logout';
        return axiosClient.get(url);
    },
    pingRole() {
        const url = '/user/ping_role';
        return axiosClient.get(url);
    },
    getProfile(){
        const url = '/user/profile';
        return axiosClient.get(url);
    },
    updateProfile(editedUserData){
        const url = '/user';
        return axiosClient.put(url, editedUserData);
    }
}

export default userApi;