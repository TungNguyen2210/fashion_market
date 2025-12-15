import axiosClient from './axiosClient';

const newsApi = {
    /*Danh sách api News */
    
    createNews(data) {
        const url = '/news';
        return axiosClient.post(url, data);
    },

    getDetailNews(id) {
        const url = '/news/' + id;
        return axiosClient.get(url);
    },

    getListNews(data) {
        if (!data.page || !data.limit) {
            data.limit = 10;
            data.page = 1;
        }
        const url = '/news/search';
        return axiosClient.post(url, data);
    },

    deleteNews(id) {
        const url = '/news/' + id;
        return axiosClient.delete(url);
    },

    updateNews(id, data) {
        const url = '/news/' + id;
        return axiosClient.put(url, data);
    },

    searchNews(name) {
        const url = '/news/searchByName?name=' + name;
        return axiosClient.get(url);
    },

    /*Danh sách api Color */

    createColor(data) {
        const url = '/color';
        return axiosClient.post(url, data);
    },

    getDetailColor(id) {
        const url = '/color/' + id;
        return axiosClient.get(url);
    },

    getListColor(data) {
        if (!data.page || !data.limit) {
            data.limit = 10;
            data.page = 1;
        }
        const url = '/color/search';
        return axiosClient.post(url, data);
    },

    deleteColor(id) {
        const url = '/color/' + id;
        return axiosClient.delete(url);
    },

    updateColor(id, data) {
        const url = '/color/' + id;
        return axiosClient.put(url, data);
    },

    searchColor(name) {
        const url = '/color/searchByName?name=' + name;
        return axiosClient.get(url);
    },
}

export default newsApi;