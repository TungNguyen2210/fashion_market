import axiosClient from './axiosClient';

const productApi = {
    /*Danh sách sản phẩm */
    getListProducts(data) {
        if (!data.page || !data.limit) {
            data.limit = 10;
            data.page = 1;
        }
        const url = '/product/search';
        return axiosClient.post(url, data);
    },
    getDetailProduct(id) {
        const url = '/product/' + id;
        return axiosClient.get(url);
    },
    getProductCategory(id){
        const url = '/category/products/' + id;
        return axiosClient.post(url);
    },
    getNews(){
        const url = '/news/search';
        return axiosClient.post(url);
    },
    getNewDetail(id){
        const url = '/news/' + id;
        return axiosClient.get(url);
    },
    getRecommendProduct(id) {
        const url = '/product/recommend/' + id;
        return axiosClient.get(url);
    },
    getOrderByUser(){
        const url = '/order/user';
        return axiosClient.get(url);
    },
    getCategory(data) {
        if (!data.page || !data.limit) {
            data.limit = 10;
            data.page = 1;
        }
        const url = '/category/search';
        return axiosClient.post(url, data);
    },
    getProductsByCategory(data, id){
        if (!data.page || !data.limit) {
            data.limit = 10;
            data.page = 1;
        }
        const url = '/category/products/' + id;
        return axiosClient.post(url, data);
    }

}

export default productApi;