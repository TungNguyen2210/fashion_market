import axiosClient from "./axiosClient";

const promotionManagementApi = {
    async listPromotionManagement() {
        const url = 'promotions';
        // eslint-disable-next-line no-useless-catch
        try {
            const response = await axiosClient.get(url);
            return response;
        } catch (error) {
            throw error;
        }
    },
    async createPromotionManagement(data) {
        const url = 'promotions';
        // eslint-disable-next-line no-useless-catch
        try {
            const response = await axiosClient.post(url, data);
            return response;
        } catch (error) {
            throw error;
        }
    },
    async updatePromotionManagement(data, id) {
        const url = 'promotions/' + id;
        // eslint-disable-next-line no-useless-catch
        try {
            const response = await axiosClient.put(url, data);
            return response;
        } catch (error) {
            throw error;
        }
    },
    async searchPromotionManagement(name) {
        const url = 'promotions/search?name=' + name.target.value;
        // eslint-disable-next-line no-useless-catch
        try {
            const response = await axiosClient.get(url);
            return response.data.docs;
        } catch (error) {
            throw error;
        }
    },
    async deletePromotionManagement(id) {
        const url = 'promotions/' + id;
        // eslint-disable-next-line no-useless-catch
        try {
            const response = await axiosClient.delete(url);
            return response;
        } catch (error) {
            throw error;
        }
    },
    async getDetailPromotionManagement(id) {
        const url = 'promotions/' + id;
        // eslint-disable-next-line no-useless-catch
        try {
            const response = await axiosClient.get(url);
            return response;
        } catch (error) {
            throw error;
        }
    },

    getDetailOrder(id) {
        const url = '/order/' + id;
        return axiosClient.get(url);
    },
}

export default promotionManagementApi;
