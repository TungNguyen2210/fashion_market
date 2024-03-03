import axiosClient from './axiosClient';

const orderApi = {
    /*Danh sách api category */

    createOrder(data) {
        const url = '/order/search';
        return axiosClient.post(url, data);
    },
    getDetailOrder(id) {
        const url = '/order/' + id;
        return axiosClient.get(url);
    },
    getListOrder(data) {
        if(!data.page || !data.limit){
            data.limit = 10;
            data.page = 1;
        }
        const url = '/order/search';
        return axiosClient.post(url, data);
    },
    deleteOrder(id) {
        const url = "/order/" + id;
        return axiosClient.delete(url);
    },
    searchOrder(name) {
        const params = {
            name: name.target.value
        }
        const url = '/order/searchByName';
        return axiosClient.get(url, { params });
    },

    
}

export default orderApi;