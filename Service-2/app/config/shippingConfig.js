module.exports = {
    ghn: {
        token: process.env.GHN_TOKEN,
        shopId: parseInt(process.env.GHN_SHOP_ID),
        fromDistrictId: parseInt(process.env.GHN_FROM_DISTRICT_ID),
        baseUrl: process.env.GHN_API_BASE_URL || 'https://dev-online-gateway.ghn.vn/shiip/public-api'
    },
    
    // Service types
    serviceTypes: {
        EXPRESS: 2,      // Hỏa tốc
        STANDARD: 1      // Tiêu chuẩn
    },
    
    // Payment types
    paymentTypes: {
        SHOP_PAY: 1,     // Shop trả phí
        CUSTOMER_PAY: 2  // Người nhận trả
    },
    
    // Default dimensions cho từng loại sản phẩm
    productDimensions: {
        default: {
            weight: 200,
            length: 30,
            width: 20,
            height: 5
        },
        
        categories: {
            'ao': {
                weight: 200,
                length: 30,
                width: 20,
                height: 5,
                keywords: ['áo', 'shirt', 'tshirt', 'polo', 'sweater', 'hoodie']
            },
            
            'quan': {
                weight: 350,
                length: 35,
                width: 25,
                height: 8,
                keywords: ['quần', 'pants', 'jean', 'short']
            },
            
            'giay': {
                weight: 600,
                length: 35,
                width: 25,
                height: 15,
                keywords: ['giày', 'dép', 'shoes', 'sneaker']
            },
            
            'mu': {
                weight: 150,
                length: 25,
                width: 25,
                height: 15,
                keywords: ['mũ', 'nón', 'hat', 'cap']
            },
            
            'vay': {
                weight: 300,
                length: 35,
                width: 25,
                height: 7,
                keywords: ['váy', 'đầm', 'dress', 'skirt']
            },
            
            'phukien': {
                weight: 100,
                length: 20,
                width: 15,
                height: 5,
                keywords: ['ví', 'thắt lưng', 'kính', 'khăn', 'tất', 'vớ']
            },
            
            'tui': {
                weight: 500,
                length: 40,
                width: 30,
                height: 15,
                keywords: ['túi', 'balo', 'backpack', 'bag']
            }
        }
    },
    
    // Detect category từ tên sản phẩm
    detectCategory: function(product) {
        const searchText = `${product.name} ${product.description || ''}`.toLowerCase();
        
        for (const [key, config] of Object.entries(this.productDimensions.categories)) {
            if (config.keywords.some(keyword => searchText.includes(keyword))) {
                return {
                    weight: config.weight,
                    length: config.length,
                    width: config.width,
                    height: config.height
                };
            }
        }
        
        return this.productDimensions.default;
    }
};