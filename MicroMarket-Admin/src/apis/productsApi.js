import axiosClient from './axiosClient';

const productApi = {
    /*Danh sách api category */
    createCategory(data) {
        const url = '/category/search';
        return axiosClient.post(url, data);
    },

    getDetailCategory(id) {
        const url = '/category/' + id;
        return axiosClient.get(url);
    },

    getListCategory(data) {
        const url = '/category/search';
        if (!data.page || !data.limit) {
            data.limit = 10;
            data.page = 1;
        }
        return axiosClient.post(url, data);
    },

    deleteCategory(id) {
        const url = "/category/" + id;
        return axiosClient.delete(url);
    },

    searchCategory(name) {
        const params = {
            name: name.target.value
        }
        const url = '/category/searchByName';
        return axiosClient.get(url, { params });
    },

    /*Danh sách api product */
    createProduct(data) {
        const url = '/product/search';
        return axiosClient.post(url, data);
    },

    getDetailProduct(id) {
        const url = '/product/' + id;
        return axiosClient.get(url);
    },

    getListProducts(data) {
        const url = '/product/search';
        if (!data.page || !data.limit) {
            data.limit = 10;
            data.page = 1;
        }
        return axiosClient.post(url, data);
    },

    // Thêm method getAllProducts mới cho promotion management
    getAllProducts() {
        const url = '/product/search';
        return axiosClient.get(url);
    },

    deleteProduct(id) {
        const url = "/product/" + id;
        return axiosClient.delete(url);
    },

    // 🔥 NEW: Kiểm tra khả năng chỉnh sửa sản phẩm
    checkProductEditability(id) {
        const url = `/product/${id}/editability`;
        return axiosClient.get(url);
    },

    // Gọi API sinh embedding cho 1 sản phẩm
    updateEmbedding(productId) {
        const url = `/recommend/update/${productId}`;
        return axiosClient.post(url);
    },

    uploadImage() {
        const url = "/upload/uploadfile";
        return axiosClient.post(url);
    },

    searchProduct(name) {
        const params = {
            name: name.target.value
        }
        const url = '/product/searchByName';
        return axiosClient.get(url, { params });
    },
}

export default productApi;