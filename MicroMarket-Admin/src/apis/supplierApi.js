import axiosClient from './axiosClient';
const supplierApi = {
    // Tạo nhà cung cấp mới
    createSupplier(data) {
        const url = '/suppliers/create';
        return axiosClient.post(url, data);
    },
    // Lấy thông tin nhà cung cấp theo ID
    getSupplierById(id) {
        const url = '/suppliers/' + id;
        return axiosClient.get(url);
    },
    // Lấy danh sách tất cả nhà cung cấp
    getAllSuppliers(data) {
        const url = '/suppliers';
        if (!data.page || !data.limit) {
            data.limit = 10;
            data.page = 1;
        }
        return axiosClient.get(url, { params: data });
    },
    // Xóa nhà cung cấp theo ID
    deleteSupplier(id) {
        const url = '/suppliers/' + id;
        return axiosClient.delete(url);
    },
    // Tìm kiếm nhà cung cấp theo tên
    searchSupplierByName(name) {
        const params = {
            name: name.target.value
        };
        const url = '/suppliers/searchByName';
        return axiosClient.get(url, { params });
    },
};
export default supplierApi;