const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const _CONST = require('./app/config/constant')
const axios = require('axios');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

const multer = require('multer');

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || _CONST.PORT;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

/* ========== AUTHENTICATION ============ */

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const response = await axios.post('http://localhost:3200/api/auth/login', {
            email: email,
            password: password
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3200/api/auth/register', {
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            phone: req.body.phone,
            role: req.body.role,
            status: req.body.status
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// ✅ ✅ ✅ THÊM ROUTE GOOGLE LOGIN - BẮT ĐẦU TỪ ĐÂY ✅ ✅ ✅
app.post('/api/auth/google-login', async (req, res) => {
    try {
        console.log('🔐 [API GATEWAY] Forwarding Google login to Service-1...');
        console.log('📦 [API GATEWAY] Request body:', req.body);
        
        const response = await axios.post('http://localhost:3200/api/auth/google-login', {
            credential: req.body.credential
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('✅ [API GATEWAY] Google login successful');
        res.json(response.data);
    } catch (error) {
        console.error('❌ [API GATEWAY] Google login error:', error.message);
        
        // Forward error từ Service-1
        if (error.response) {
            console.error('❌ [API GATEWAY] Service-1 error:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                message: 'Gateway Error: Không thể kết nối đến authentication service'
            });
        }
    }
});

// ✅ ✅ ✅ THÊM ROUTE GET /api/auth/me ✅ ✅ ✅
app.get('/api/auth/me', async (req, res) => {
    try {
        console.log('👤 [API GATEWAY] Forwarding /auth/me to Service-1...');
        console.log('🔑 [API GATEWAY] Authorization header:', req.headers.authorization);
        
        const response = await axios.get('http://localhost:3200/api/auth/me', {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        
        console.log('✅ [API GATEWAY] /auth/me successful');
        res.json(response.data);
    } catch (error) {
        console.error('❌ [API GATEWAY] /auth/me error:', error.message);
        
        if (error.response) {
            console.error('❌ [API GATEWAY] Service-1 error:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                message: 'Gateway Error: Không thể kết nối đến authentication service'
            });
        }
    }
});

// ✅ ✅ ✅ THÊM ROUTE LOGOUT ✅ ✅ ✅
app.post('/api/auth/logout', async (req, res) => {
    try {
        console.log('🚪 [API GATEWAY] Forwarding logout to Service-1...');
        
        const response = await axios.post('http://localhost:3200/api/auth/logout', {}, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        
        console.log('✅ [API GATEWAY] Logout successful');
        res.json(response.data);
    } catch (error) {
        console.error('❌ [API GATEWAY] Logout error:', error.message);
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                message: 'Gateway Error: Không thể kết nối đến authentication service'
            });
        }
    }
});
// ✅ ✅ ✅ KẾT THÚC PHẦN THÊM MỚI ✅ ✅ ✅

/* ========== API MANAGEMENT USER ============ */

// Gọi API từ service 1 để tìm kiếm người dùng
app.post('/api/user/search', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3200/api/user/search', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Gọi API từ service 1 để tạo mới người dùng
app.post('/api/user', async (req, res) => {
    try {
        console.log('👤 [API GATEWAY] Creating new user...');
        console.log('📦 [API GATEWAY] Request body:', req.body);
        
        const response = await axios.post('http://localhost:3200/api/user', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        
        console.log('✅ [API GATEWAY] User created successfully');
        res.status(200).json(response.data);
    } catch (error) {
        console.error('❌ [API GATEWAY] Create user error:', error.message);
        
        // Forward error từ Service-1
        if (error.response) {
            console.error('❌ [API GATEWAY] Service-1 error response:', {
                status: error.response.status,
                data: error.response.data
            });
            
            // Trả về đúng status code và data từ service
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // Request được gửi nhưng không nhận được response
            console.error('❌ [API GATEWAY] No response from service');
            res.status(503).json({
                message: 'Gateway Error: Không thể kết nối đến user service'
            });
        } else {
            // Lỗi khác
            console.error('❌ [API GATEWAY] Gateway error:', error.message);
            res.status(500).json({
                message: 'Gateway Error: ' + error.message
            });
        }
    }
});

// Gọi API từ service 1 để xóa người dùng
app.delete('/api/user/:id', async (req, res) => {
    try {
        const response = await axios.delete(`http://localhost:3200/api/user/${req.params.id}`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Gọi API từ service 1 để cập nhật thông tin người dùng
app.put('/api/user/:id', async (req, res) => {
    try {
        const response = await axios.put(`http://localhost:3200/api/user/${req.params.id}`, req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Gọi API từ service 1 để tìm kiếm người dùng bằng email
app.get('/api/user/searchByEmail', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3200/api/user/searchByEmail', {
            params: {
                page: req.body.page || 1,
                limit: req.body.limit || 10,
                email: req.query.email
            },
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/api/user/change-password', async (req, res) => {
    try {
        console.log('🔐 [API GATEWAY] Forwarding change password to Service-1...');
        console.log('🔑 [API GATEWAY] Authorization:', req.headers.authorization);
        console.log('📦 [API GATEWAY] Request body:', {
            hasCurrentPassword: !!req.body.currentPassword,
            hasNewPassword: !!req.body.newPassword,
            hasConfirmPassword: !!req.body.confirmPassword
        });
        
        const response = await axios.put('http://localhost:3200/api/user/change-password', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        
        console.log('✅ [API GATEWAY] Change password successful');
        res.json(response.data);
    } catch (error) {
        console.error('❌ [API GATEWAY] Change password error:', error.message);
        
        if (error.response) {
            console.error('❌ [API GATEWAY] Service-1 error:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                message: 'Gateway Error: Không thể kết nối đến user service'
            });
        }
    }
});


app.put('/api/user/reset-password/:id', async (req, res) => {
    try {
        console.log('🔐 [API GATEWAY] Forwarding reset password to Service-1...');
        console.log('📝 [API GATEWAY] User ID:', req.params.id);
        console.log('🔑 [API GATEWAY] Authorization:', req.headers.authorization);
        console.log('📦 [API GATEWAY] Request body:', req.body);
        
        const response = await axios.put(`http://localhost:3200/api/user/reset-password/${req.params.id}`, req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        
        console.log('✅ [API GATEWAY] Reset password successful');
        res.json(response.data);
    } catch (error) {
        console.error('❌ [API GATEWAY] Reset password error:', error.message);
        
        if (error.response) {
            console.error('❌ [API GATEWAY] Service-1 error:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                message: 'Gateway Error: Không thể kết nối đến user service'
            });
        }
    }
});

// Gọi API từ service 1 để lấy thông tin profile của người dùng
app.get('/api/user/profile', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3200/api/user/profile', {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

/* ========== API NEWS ============ */

app.get("/api/news/searchByName", async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3200/api/news/searchByName', {
            params: {
                name: req.query.name,
                page: req.query.page || 1,
                limit: req.query.limit || 10
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Route để gọi các API từ service tin tức
app.post('/api/news/search', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3200/api/news/search', req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/news/:id', async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3200/api/news/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/news/', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3200/api/news', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/api/news/:id', async (req, res) => {
    try {
        const response = await axios.put(`http://localhost:3200/api/news/${req.params.id}`, req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete("/api/news/:id", async (req, res) => {
    try {
        const response = await axios.delete(`http://localhost:3200/api/news/${req.params.id}`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

/* ========== API PAYMENT ============ */

app.post("/api/payment/pay", async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3200/api/payment/pay', req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/payment/executePayment", async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3200/api/payment/executePayment', {
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

/* ========== API UPLOAD FILE ============ */

// Tạo storage engine để lưu trữ tệp tin
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./uploads"); // Thư mục để lưu trữ tệp tin
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname); // Đổi tên file để tránh bị trùng lặp
    },
});

// Tạo middleware upload để xử lý yêu cầu upload tệp tin
const upload = multer({ storage: storage });

// Route để gọi API từ service tải lên tệp tin
app.post('/api/uploadFile', upload.single('image'), async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3200/api/uploadFile', req, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

/* ========== API CATEGORY ============ */

app.post('/api/category/search', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3300/api/category/search', req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/category/:id', async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3300/api/category/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/category/', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3300/api/category', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/api/category/:id', async (req, res) => {
    try {
        const response = await axios.put(`http://localhost:3300/api/category/${req.params.id}`, req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete("/api/category/:id", async (req, res) => {
    try {
        const response = await axios.delete(`http://localhost:3300/api/category/${req.params.id}`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/category/searchByName", async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3300/api/category/searchByName', {
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post("/api/category/products/:id", async (req, res) => {
    try {
        const response = await axios.post(`http://localhost:3300/api/category/products/${req.params.id}`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

/* ========== API COLOR ============ */

app.post('/api/color/search', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3300/api/color/search', req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/color/:id", async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3300/api/color/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/color/', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3300/api/color', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/api/color/:id', async (req, res) => {
    try {
        const response = await axios.put(`http://localhost:3300/api/color/${req.params.id}`, req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete("/api/color/:id", async (req, res) => {
    try {
        const response = await axios.delete(`http://localhost:3300/api/color/${req.params.id}`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/color/searchByName", async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3300/api/color/searchByName', {
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

/* ========== API ORDER ============ */

app.post('/api/order/search', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3300/api/order/search', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/order/searchByName", async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3300/api/order/searchByName', {
            params: req.query,
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/order/user", async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3300/api/order/user', {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/order/:id", async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3300/api/order/${req.params.id}`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/order/', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3300/api/order', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/api/order/:id', async (req, res) => {
    try {
        const response = await axios.put(`http://localhost:3300/api/order/${req.params.id}`, req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete("/api/order/:id", async (req, res) => {
    try {
        const response = await axios.delete(`http://localhost:3300/api/order/${req.params.id}`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

//Thêm phần đánh giá sản phẩm

app.post("/api/order/:id/rating", async (req, res) => {
    try {
        const response = await axios.post(`http://localhost:3300/api/order/${req.params.id}/rating`, req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/reviews/:productId", async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3300/api/order/reviews/${req.params.productId}`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        console.log("Trong api gateway, lấy đánh giá sản phẩm ", req.params.productId);
        res.json(response.data);
    } catch (error) {
        console.error("Lỗi lấy đánh giá sản phẩm trong api gateway ", error);
        res.status(error.response?.status || 500).send(error.response?.data || "Gateway error");
    }
});

// Thêm phần đánh giá sản phẩm
app.post("/api/order/:orderId/rate-products", async (req, res) => {
    try {
        const response = await axios.post(
            `http://localhost:3300/api/order/${req.params.orderId}/rate-products`,
            req.body,
            {
                headers: {
                    Authorization: req.headers.authorization || "", // if needed
                },
            }
        );
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Rating error:", error.message);
        res.status(500).json({ message: "Gateway Error" });
    }
});

app.get("/api/order/shipping/:id", async (req, res) => {
  try {
    const response = await axios.get(`http://localhost:3300/api/order/shipping/${req.params.id}`, {
      headers: {
        Authorization: req.headers.authorization || ""
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết đơn hàng cho vận chuyển:", error.message);
    
    // Trả về lỗi chi tiết và status code từ service
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ message: "Gateway Error: Không thể kết nối đến service" });
    }
  }
});

/* ========== API PRODUCT ============ */

app.post('/api/product/search', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3300/api/product/search', req.body);
        res.json(response.data);
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/product/searchByName", async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3300/api/product/searchByName', {
            params: req.query
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post("/api/product/searchByPrice", async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3300/api/product/searchByPrice', req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/product/', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3300/api/product', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/product/', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3300/api/product', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/api/product/:id', async (req, res) => {
    try {
        const response = await axios.put(`http://localhost:3300/api/product/${req.params.id}`, req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete("/api/product/:id", async (req, res) => {
    try {
        const response = await axios.delete(`http://localhost:3300/api/product/${req.params.id}`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/product/:id', async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3300/api/product/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/product/:id/variants', async (req, res) => {
    try {
        console.log('🔍 [API GATEWAY] Fetching product variants for ID:', req.params.id);
        
        const response = await axios.get(`http://localhost:3300/api/product/${req.params.id}/variants`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        
        console.log('✅ [API GATEWAY] Product variants fetched successfully');
        res.json(response.data);
    } catch (error) {
        console.error('❌ [API GATEWAY] Error fetching product variants:', error.message);
        
        if (error.response) {
            console.error('❌ [API GATEWAY] Service-2 error:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                message: 'Gateway Error: Không thể kết nối đến product service'
            });
        }
    }
});

// 🔥 NEW: Route kiểm tra khả năng chỉnh sửa sản phẩm
app.get('/api/product/:id/editability', async (req, res) => {
    try {
        console.log('🔍 [API GATEWAY] Checking product editability for ID:', req.params.id);
        
        const response = await axios.get(`http://localhost:3300/api/product/${req.params.id}/editability`, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        
        console.log('✅ [API GATEWAY] Editability check successful');
        res.json(response.data);
    } catch (error) {
        console.error('❌ [API GATEWAY] Error checking editability:', error.message);
        
        if (error.response) {
            console.error('❌ [API GATEWAY] Service-2 error:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                message: 'Gateway Error: Không thể kết nối đến product service'
            });
        }
    }
});

app.post('/api/product/:id/reviews', async (req, res) => {
    try {
        const response = await axios.post(`http://localhost:3300/api/product/${req.params.id}/reviews`, req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/product/recommend/:id', async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3600/api/recommend/product/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

//Thêm hàm recommend sản phẩm dựa vào sản phẩm đã mua của khách hàng
app.get('/api/product/recommend/user/:userId', async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3600/api/recommend/user/${req.params.userId}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Route gọi API update embedding trong Service-4
app.post('/api/recommend/update/:id', async (req, res) => {
    try {
        // Gọi sang Service-4 (port 3600)
        const response = await axios.post(
            `http://localhost:3600/api/recommend/update/${req.params.id}`,
            req.body, // Truyền body nếu có (ở đây có thể không cần)
            {
                headers: {
                    Authorization: req.headers.authorization
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error forwarding update embedding request:', error.message);
        res.status(500).send('Internal Server Error');
    }
});



/* ========== API PROMOTION ============ */

// Route để xử lý yêu cầu tìm kiếm promotions
app.get('/api/promotions/search', async (req, res) => {
    try {
        const searchTerm = req.query.name;
        const response = await axios.get(`http://localhost:3400/api/promotions/search?name=${searchTerm}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Route để xử lý các yêu cầu liên quan đến promotions
app.get('/api/promotions', async (req, res) => {
    try {
        // Gọi API từ service Promotion
        const response = await axios.get('http://localhost:3400/api/promotions');
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/promotions/:id', async (req, res) => {
    try {
        // Gọi API từ service Promotion với ID được cung cấp
        const response = await axios.get(`http://localhost:3400/api/promotions/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/promotions', async (req, res) => {
    try {
        // Gọi API từ service Promotion để tạo mới promotion
        const response = await axios.post('http://localhost:3400/api/promotions', req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/api/promotions/:id', async (req, res) => {
    try {
        // Gọi API từ service Promotion để cập nhật promotion với ID được cung cấp
        const response = await axios.put(`http://localhost:3400/api/promotions/${req.params.id}`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/api/promotions/:id', async (req, res) => {
    try {
        // Gọi API từ service Promotion để xóa promotion với ID được cung cấp
        const response = await axios.delete(`http://localhost:3400/api/promotions/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

/* ========== API SUPPLIER ============ */

// Route để xử lý các yêu cầu liên quan đến suppliers
app.get('/api/suppliers', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3400/api/suppliers');
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/api/suppliers/:id', async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3400/api/suppliers/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/api/suppliers/create', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3400/api/suppliers/create', req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.put('/api/suppliers/:id', async (req, res) => {
    try {
        const response = await axios.put(`http://localhost:3400/api/suppliers/${req.params.id}`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.delete('/api/suppliers/:id', async (req, res) => {
    try {
        const response = await axios.delete(`http://localhost:3400/api/suppliers/${req.params.id}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Route để xử lý yêu cầu tìm kiếm suppliers theo tên
app.get('/api/suppliers/searchByName', async (req, res) => {
    try {
        const searchTerm = req.query.name;
        const response = await axios.get(`http://localhost:3400/api/suppliers/searchByName?name=${searchTerm}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


// Route để xử lý yêu cầu thống kê
app.get('/api/statistical/count', async (req, res) => {
    try {
        const response = await axios.get('http://localhost:3400/api/statistical/count');
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get("/api/order/shipping/:id", async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:3300/api/order/shipping/${req.params.id}`, {
            headers: {
                Authorization: req.headers.authorization || ""
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error("Lỗi khi lấy chi tiết đơn hàng cho vận chuyển:", error.message);

        // Trả về lỗi chi tiết và status code từ service
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: "Gateway Error: Không thể kết nối đến service" });
        }
    }
});



// Thêm route PUT cho update profile
app.put('/api/user/profile', async (req, res) => {
    try {
        console.log('📝 [API GATEWAY] Forwarding update profile to Service-1...');
        console.log('🔑 [API GATEWAY] Authorization:', req.headers.authorization);
        console.log('📦 [API GATEWAY] Request body:', req.body);
        
        const response = await axios.put('http://localhost:3200/api/user/profile', req.body, {
            headers: {
                Authorization: req.headers.authorization
            }
        });
        
        console.log('✅ [API GATEWAY] Update profile successful');
        res.json(response.data);
    } catch (error) {
        console.error('❌ [API GATEWAY] Update profile error:', error.message);
        
        if (error.response) {
            console.error('❌ [API GATEWAY] Service-1 error:', error.response.data);
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({
                success: false,
                message: 'Gateway Error: Không thể kết nối đến user service'
            });
        }
    }
});

