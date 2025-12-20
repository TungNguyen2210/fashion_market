import axiosClient from "./axiosClient";

const colorApi = {
    // Lấy tất cả màu
    getAllColors: (params) => {
        const url = '/color/search';
        return axiosClient.post(url, params);
    },

    // Tìm màu theo tên
    searchByName: (name) => {
        const url = '/color/searchByName';
        return axiosClient.get(url, { params: { name } });
    },

    // Lấy màu theo ID
    getColorById: (id) => {
        const url = `/color/${id}`;
        return axiosClient.get(url);
    },

    // Tìm màu theo mã hex
    getColorByHex: (hex) => {
        const url = '/color/search';
        return axiosClient.post(url, {
            page: 1,
            limit: 100
        });
    }
};

export default colorApi;