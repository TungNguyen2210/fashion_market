import axiosClient from "./axiosClient";

const promotionManagementApi = {
    async listPromotionManagement(params = {}) {
        const url = 'promotions';
        console.log('🚨 LIST API CALLED!');
        console.log('🚨 LIST params:', params);
        try {
            const response = await axiosClient.get(url, { params });
            console.log('🚨 LIST response:', response);
            return response;
        } catch (error) {
            console.error('❌ LIST error:', error);
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
        console.log('🚨 SEARCH API CALLED!');
        console.log('🚨 SEARCH params:', searchParams);
        try {
            const response = await axiosClient.get(url, { params: searchParams });
            console.log('🚨 SEARCH response:', response);
            return response;
        } catch (error) {
            console.error('❌ SEARCH error:', error);
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