import axiosClient from "./axiosClient";

const promotionManagementApi = {
    async listPromotionManagement(params = {}) {
        const url = 'promotions';
        try {
            console.log('📤 List promotions API call:', { url, params });
            const response = await axiosClient.get(url, { params }); // ✅ CORRECT
            console.log('📥 List promotions response:', response);
            return response;
        } catch (error) {
            console.error('❌ List promotions error:', error);
            throw error;
        }
    },

    async createPromotionManagement(data) {
        const url = 'promotions';
        try {
            console.log('📤 Create promotion API call:', { url, data });
            const response = await axiosClient.post(url, data);
            console.log('📥 Create promotion response:', response);
            return response;
        } catch (error) {
            console.error('❌ Create promotion error:', error);
            throw error;
        }
    },

    async updatePromotionManagement(data, id) {
        const url = `promotions/${id}`;
        try {
            console.log('📤 Update promotion API call:', { url, id, data });
            const response = await axiosClient.put(url, data);
            console.log('📥 Update promotion response:', response);
            return response;
        } catch (error) {
            console.error('❌ Update promotion error:', error);
            throw error;
        }
    },

    // ✅ FIX: Search function - Support both keyword and filters
    async searchPromotionManagement(searchParams = {}) {
        const url = 'promotions/search';
        try {
            console.log('📤 Search promotions API call:', { url, searchParams });
            
            // ✅ FIX: Use params object instead of query string
            const response = await axiosClient.get(url, { params: searchParams });
            console.log('📥 Search promotions response:', response);
            return response;
        } catch (error) {
            console.error('❌ Search promotions error:', error);
            throw error;
        }
    },

    async deletePromotionManagement(id) {
        const url = `promotions/${id}`;
        try {
            console.log('📤 Delete promotion API call:', { url, id });
            const response = await axiosClient.delete(url);
            console.log('📥 Delete promotion response:', response);
            return response;
        } catch (error) {
            console.error('❌ Delete promotion error:', error);
            throw error;
        }
    },

    async getDetailPromotionManagement(id) {
        const url = `promotions/${id}`;
        try {
            console.log('📤 Get promotion detail API call:', { url, id });
            
            // Validation
            if (!id) {
                throw new Error('Promotion ID is required');
            }
            
            const response = await axiosClient.get(url);
            console.log('📥 Get promotion detail response:', response);
            
            // Validation response
            if (!response) {
                throw new Error('No response from server');
            }
            
            return response;
        } catch (error) {
            console.error('❌ Get promotion detail error:', {
                id,
                url,
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    },

    getDetailOrder(id) {
        const url = `/order/${id}`;
        return axiosClient.get(url);
    },
}

export default promotionManagementApi;