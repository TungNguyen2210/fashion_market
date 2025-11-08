const ghnService = require('../services/ghnService');
const mongoose = require('mongoose');

// ✅ Import model đã tồn tại - KHÔNG tạo mới
let Product;
try {
  Product = mongoose.model('Product'); // Lấy model đã có
} catch (error) {
  console.warn('⚠️ Product model not found, will handle gracefully');
}

class ShippingController {

  // ✨ Enhanced shipping fee calculation with category support
  async calculateFee(req, res) {
    try {
      const { 
        districtId, 
        wardCode, 
        weight,           
        orderValue = 0,
        productName,      
        categoryId,       
        categoryName,     
        items = []        
      } = req.body;

      if (!districtId || !wardCode) {
        return res.status(400).json({
          success: false,
          message: 'districtId and wardCode are required',
          examples: {
            option1: {
              districtId: 1442,
              wardCode: "21211",
              categoryId: "660ce289db9b7f0141415599",
              productName: "Áo thun basic",
              orderValue: 100000
            },
            option2: {
              districtId: 1442,
              wardCode: "21211",
              categoryName: "áo thun",
              productName: "Áo thun basic",
              orderValue: 100000
            },
            option3: {
              districtId: 1442,
              wardCode: "21211",
              items: [
                { 
                  name: "Áo thun", 
                  quantity: 2, 
                  categoryId: "660ce289db9b7f0141415599",
                  categoryName: "áo thun"
                }
              ],
              orderValue: 300000
            },
            option4: {
              districtId: 1442,
              wardCode: "21211",
              weight: 500,
              orderValue: 100000
            }
          },
          weightMapping: ghnService.getCategoryWeightMapping(),
          note: 'Use /provinces, /districts/:provinceId, /wards/:districtId to get valid IDs'
        });
      }

      let processedItems = [...items];
      
      if (!processedItems.length && (productName || categoryId || categoryName)) {
        processedItems = [{
          name: productName || 'Sản phẩm',
          quantity: 1,
          categoryId: categoryId,
          categoryName: categoryName
        }];
      }

      const customerAddress = {
        districtId: parseInt(districtId),
        wardCode: wardCode.toString()
      };

      const result = await ghnService.calculateShippingFee(
        customerAddress,
        weight ? parseInt(weight) : null,
        parseInt(orderValue),
        processedItems
      );

      result.request = {
        from: '97 Man Thiện, Hiệp Phú, Thủ Đức, TP.HCM',
        to: customerAddress,
        providedWeight: weight,
        items: processedItems,
        orderValue: `${orderValue.toLocaleString()}đ`
      };

      res.json(result);

    } catch (error) {
      console.error('❌ Shipping Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate shipping fee',
        error: error.message
      });
    }
  }

  // ✨ Enhanced order shipping với Product validation
  async calculateOrderShipping(req, res) {
    try {
      const { 
        orderId, 
        districtId, 
        wardCode, 
        products = [],
        items = []
      } = req.body;
      
      if (!districtId || !wardCode) {
        return res.status(400).json({
          success: false,
          message: 'districtId, wardCode are required',
          example: {
            orderId: "ORDER123",
            districtId: 1442,
            wardCode: "21211",
            products: [
              { 
                name: "Áo thun", 
                price: 100000, 
                quantity: 2,
                categoryId: "660ce289db9b7f0141415599",
                categoryName: "áo thun"
              }
            ],
            items: [
              {
                productId: "6652d724315c33242eee6b1b",
                variantId: "6652d724315c33242eee6b1b-L-1c78fa",
                quantity: 2
              }
            ]
          }
        });
      }

      let processedItems = [];
      let orderValue = 0;

      // ✅ XỬ LÝ ITEMS TỪ DATABASE
      if (items && items.length > 0 && Product) {
        console.log('📦 Processing items from database:', items.length);
        
        for (const item of items) {
          try {
            const productId = item.productId;
            
            // ✅ Validate productId
            if (!productId || 
                productId === 'undefined' || 
                productId === 'null' || 
                productId === undefined || 
                productId === null) {
              console.warn('⚠️ Skipping invalid productId:', productId);
              continue;
            }

            if (!mongoose.Types.ObjectId.isValid(productId)) {
              console.warn('⚠️ Skipping invalid ObjectId format:', productId);
              continue;
            }

            // ✅ Query product
            const product = await Product.findById(productId).populate('category');
            
            if (!product) {
              console.warn('⚠️ Product not found:', productId);
              continue;
            }

            // Tìm variant
            let selectedVariant = null;
            if (item.variantId && product.variants) {
              selectedVariant = product.variants.find(v => v.variantId === item.variantId);
            }

            const quantity = parseInt(item.quantity) || 1;
            const itemValue = product.price * quantity;

            processedItems.push({
              name: product.name,
              quantity: quantity,
              price: product.price,
              categoryId: product.category?._id?.toString(),
              categoryName: product.category?.name,
              variant: selectedVariant
            });

            orderValue += itemValue;
            console.log('✅ Added product:', product.name, `(${quantity}x ${product.price}đ)`);

          } catch (error) {
            console.error('❌ Error processing item:', item.productId, error.message);
            // Tiếp tục với items khác
          }
        }
      }

      // ✅ XỬ LÝ STATIC PRODUCTS
      if (processedItems.length === 0 && products && products.length > 0) {
        console.log('📦 Processing static products:', products.length);
        
        processedItems = products.map(product => ({
          name: product.name || 'Sản phẩm',
          quantity: product.quantity || 1,
          price: product.price || 0,
          categoryId: product.categoryId,
          categoryName: product.categoryName
        }));

        orderValue = products.reduce((total, product) => {
          return total + (product.price || 0) * (product.quantity || 1);
        }, 0);
      }

      // ✅ Validate có items không
      if (processedItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid products or items found',
          debug: {
            hasProductModel: !!Product,
            receivedItems: items.length,
            receivedProducts: products.length,
            processedItems: processedItems.length
          }
        });
      }

      console.log('📦 Final processed items:', processedItems.length);
      console.log('💰 Total order value:', orderValue.toLocaleString() + 'đ');

      const customerAddress = {
        districtId: parseInt(districtId),
        wardCode: wardCode.toString()
      };

      const result = await ghnService.calculateShippingFee(
        customerAddress,
        null,
        orderValue,
        processedItems
      );

      result.orderInfo = {
        orderId,
        totalValue: orderValue,
        totalValueFormatted: orderValue.toLocaleString() + 'đ',
        itemCount: processedItems.length,
        totalQuantity: processedItems.reduce((sum, p) => sum + (p.quantity || 1), 0),
        products: processedItems.map(p => ({
          name: p.name,
          price: p.price,
          quantity: p.quantity,
          subtotal: (p.price || 0) * (p.quantity || 1),
          categoryId: p.categoryId,
          categoryName: p.categoryName,
          variant: p.variant
        }))
      };

      res.json(result);

    } catch (error) {
      console.error('❌ Order Shipping Controller Error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate order shipping',
        error: error.message
      });
    }
  }

  // 🌍 Get provinces
  async getProvinces(req, res) {
    try {
      const result = await ghnService.getProvinces();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get provinces',
        error: error.message
      });
    }
  }

  // 🏘️ Get districts by province
  async getDistricts(req, res) {
    try {
      const { provinceId } = req.params;
      
      if (!provinceId) {
        return res.status(400).json({
          success: false,
          message: 'Province ID is required'
        });
      }

      const result = await ghnService.getDistricts(parseInt(provinceId));
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get districts',
        error: error.message
      });
    }
  }

  // 🏠 Get wards by district
  async getWards(req, res) {
    try {
      const { districtId } = req.params;
      
      if (!districtId) {
        return res.status(400).json({
          success: false,
          message: 'District ID is required'
        });
      }

      const result = await ghnService.getWards(parseInt(districtId));
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get wards',
        error: error.message
      });
    }
  }

  async testConnection(req, res) {
    try {
      console.log('🧪 Testing GHN connection...');
      
      const testResult = await ghnService.getProvinces();
      
      res.json({
        success: testResult.success,
        message: testResult.success ? 
          '✅ GHN API connected successfully!' : 
          '❌ GHN API connection failed',
        shopInfo: {
          address: '97 Man Thiện, Hiệp Phú, Thủ Đức, TP.HCM',
          shopId: process.env.GHN_SHOP_ID,
          districtId: process.env.GHN_SHOP_DISTRICT_ID,
          wardCode: process.env.GHN_SHOP_WARD_CODE
        },
        api: {
          baseUrl: process.env.GHN_API_BASE_URL,
          hasToken: !!process.env.GHN_API_TOKEN
        },
        models: {
          hasProductModel: !!Product
        },
        weightMapping: ghnService.getCategoryWeightMapping(),
        provincesCount: testResult.data ? testResult.data.length : 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'GHN connection test failed',
        error: error.message
      });
    }
  }

  // 📋 Get weight mapping info
  async getWeightInfo(req, res) {
    try {
      const weightMapping = ghnService.getCategoryWeightMapping();
      
      res.json({
        success: true,
        message: 'Category-based weight mapping for products',
        categoryMapping: {
          '643cd88879b4192efedda4e6': { name: 'Đầm', weight: '350g' },
          '660ce289db9b7f0141415599': { name: 'Áo thun', weight: '200g' },
          '66501ef7e55fcbb926195a19': { name: 'Quần jean', weight: '500g' },
          '66501f4ce55fcbb926195a1e': { name: 'Quần short', weight: '200g' },
          '683db340391903538806b5e8': { name: 'Áo PTIT', weight: '250g' }
        },
        fallbackPatterns: weightMapping.default_weights,
        priority: [
          '1. Exact Category ID match (most accurate)',
          '2. Category name pattern matching', 
          '3. Product name pattern matching',
          '4. Default fallback weight'
        ],
        rules: [
          'Weight tối thiểu: 100g',
          'Weight tối đa: 30kg',
          'Có thể override bằng weight parameter',
          'Thêm category mới bằng cách update getCategoryWeightMapping()'
        ],
        examples: [
          { 
            categoryId: '660ce289db9b7f0141415599', 
            categoryName: 'áo thun',
            productName: 'Áo thun basic', 
            detectedWeight: '200g (exact category ID)' 
          },
          { 
            categoryName: 'quần', 
            productName: 'Quần mới', 
            detectedWeight: '350g (category pattern)' 
          },
          { 
            productName: 'Sản phẩm không xác định', 
            detectedWeight: '300g (default)' 
          }
        ]
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateCategoryWeight(req, res) {
    try {
      const { categoryId, weight, categoryName } = req.body;
      
      if (!categoryId || !weight) {
        return res.status(400).json({
          success: false,
          message: 'categoryId and weight are required',
          example: {
            categoryId: "660ce289db9b7f0141415599",
            weight: 250,
            categoryName: "Áo thun"
          }
        });
      }

      res.json({
        success: false,
        message: 'Dynamic weight update not implemented yet',
        note: 'Please update getCategoryWeightMapping() method in ghnService.js',
        currentMapping: ghnService.getCategoryWeightMapping(),
        requestedUpdate: {
          categoryId,
          weight,
          categoryName
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new ShippingController();