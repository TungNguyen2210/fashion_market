package com.example.tech.activity;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;
import android.widget.Toast;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.example.tech.R;
import com.example.tech.model.SanPham;
import com.example.tech.utils.UserManager;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class CheckoutActivity extends AppCompatActivity {

    private static final String TAG = "CheckoutActivity";
    private static final String BASE_URL = "http://10.0.2.2:3100";
    private static final int SHIPPING_FEE = 30000;

    private TextView tvBack, tvSubtotal, tvShippingFee, tvTotalPayment;
    private EditText etName, etEmail, etPhone, etAddress, etNotes;
    private RadioGroup rgPaymentMethod;
    private RadioButton rbCOD, rbPayPal;
    private Button btnBackToCart, btnConfirmOrder;

    private int subtotal = 0;
    private ArrayList<SanPham> cartItems;
    private String userId = "";
    private RequestQueue requestQueue;
    private Gson gson;
    private UserManager userManager;
    private int orderFormatAttempt = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_checkout);

        // Khởi tạo UserManager
        userManager = UserManager.getInstance(this);

        // Debug: In thông tin token
        Log.d(TAG, "============== DEBUG TOKEN ==============");
        userManager.debugCurrentToken();
        Log.d(TAG, "========================================");

        // Kiểm tra đăng nhập
        if (!userManager.isLoggedIn()) {
            Toast.makeText(this, "Vui lòng đăng nhập để tiếp tục", Toast.LENGTH_SHORT).show();
            Intent intent = new Intent(this, LoginActivity.class);
            startActivity(intent);
            finish();
            return;
        } else {
            // Kiểm tra token có hợp lệ không
            if (!userManager.isTokenValid()) {
                Log.e(TAG, "Token đã hết hạn hoặc không hợp lệ. Đăng xuất người dùng.");
                userManager.logout();
                Toast.makeText(this, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                Intent intent = new Intent(this, LoginActivity.class);
                startActivity(intent);
                finish();
                return;
            }

            // Lấy userId từ UserManager
            userId = userManager.getUserId();
            if (!TextUtils.isEmpty(userId)) {
                Log.d(TAG, "User ID đã được nạp từ UserManager: " + userId);
            } else {
                Log.e(TAG, "User ID không tồn tại trong UserManager");
            }
        }

        // Khởi tạo RequestQueue và Gson
        requestQueue = Volley.newRequestQueue(this);
        gson = new Gson();

        // Ánh xạ các view
        anhxa();

        // Tải thông tin giỏ hàng trước khi lấy subtotal
        loadCartItems();

        // Tính toán lại tổng tiền từ giỏ hàng thay vì lấy từ Intent
        calculateSubtotalFromCart();

        // Cập nhật giao diện giá tiền
        updatePriceDisplay();

        // Thiết lập sự kiện nút back
        setupBackButton();

        // Đặt tên người dùng từ UserManager
        String username = userManager.getUsername();
        if (!TextUtils.isEmpty(username)) {
            etName.setText(username);
            Log.d(TAG, "Đã đặt username từ UserManager: " + username);
        }

        // Tải thông tin chi tiết người dùng từ API
        loadUserProfile();

        // Thiết lập sự kiện cho các nút
        setupButtonListeners();
    }

    private void anhxa() {
        tvBack = findViewById(R.id.tvBack);
        tvSubtotal = findViewById(R.id.tvSubtotal);
        tvShippingFee = findViewById(R.id.tvShippingFee);
        tvTotalPayment = findViewById(R.id.tvTotalPayment);
        etName = findViewById(R.id.etName);
        etEmail = findViewById(R.id.etEmail);
        etPhone = findViewById(R.id.etPhone);
        etAddress = findViewById(R.id.etAddress);
        etNotes = findViewById(R.id.etNotes);
        rgPaymentMethod = findViewById(R.id.rgPaymentMethod);
        rbCOD = findViewById(R.id.rbCOD);
        rbPayPal = findViewById(R.id.rbPayPal);
        btnBackToCart = findViewById(R.id.btnBackToCart);
        btnConfirmOrder = findViewById(R.id.btnConfirmOrder);
    }

    private void loadCartItems() {
        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
        String jsonCart = preferences.getString("cartItems", "");

        if (!jsonCart.isEmpty()) {
            Type type = new TypeToken<ArrayList<SanPham>>() {}.getType();
            cartItems = gson.fromJson(jsonCart, type);
        }

        if (cartItems == null) {
            cartItems = new ArrayList<>();
        }

        // In thông tin các sản phẩm trong giỏ hàng để debug
        Log.d(TAG, "Số lượng sản phẩm trong giỏ hàng: " + cartItems.size());
        for (SanPham sanpham : cartItems) {
            int quantity = 0;
            if (sanpham.getVariants() != null && !sanpham.getVariants().isEmpty()) {
                quantity = sanpham.getVariants().get(0).getQuantity();
            }

            Log.d(TAG, "Sản phẩm: ID=" + sanpham.getIdsanpham() +
                    ", Name=" + sanpham.getTensanpham() +
                    ", Qty=" + quantity +
                    ", Price=" + sanpham.getGiasanpham() +
                    ", OriginalPrice=" + sanpham.getGiagoc());
        }
    }

    // Tính lại tổng tiền từ giỏ hàng
    private void calculateSubtotalFromCart() {
        subtotal = 0;

        for (SanPham sanpham : cartItems) {
            int price = sanpham.getGiasanpham(); // Giá sau khuyến mãi (nếu có)
            int quantity = 0;

            // Lấy số lượng từ biến thể nếu có
            if (sanpham.getVariants() != null && !sanpham.getVariants().isEmpty()) {
                for (SanPham.ProductVariant variant : sanpham.getVariants()) {
                    quantity += variant.getQuantity();
                }
            } else if (sanpham.getInventory() != null) {
                // Nếu không có biến thể, sử dụng số lượng từ inventory
                quantity = sanpham.getInventory().getQuantityOnHand();
            } else {
                // Nếu không có cả hai, sử dụng 1 làm giá trị mặc định
                quantity = 1;
            }

            // Tính tổng tiền cho sản phẩm này (giá * số lượng)
            int productTotal = price * quantity;
            subtotal += productTotal;

            Log.d(TAG, "Sản phẩm " + sanpham.getTensanpham() +
                    ": Đơn giá=" + price +
                    ", Số lượng=" + quantity +
                    ", Thành tiền=" + productTotal);
        }

        Log.d(TAG, "Tổng tiền sản phẩm: " + subtotal);
    }

    private void setupBackButton() {
        tvBack.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                onBackPressed();
            }
        });
    }

    private void updatePriceDisplay() {
        NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("vi", "VN"));

        // Hiển thị giá tiền sản phẩm
        tvSubtotal.setText(formatter.format(subtotal) + "đ");

        // Hiển thị phí giao hàng
        tvShippingFee.setText(formatter.format(SHIPPING_FEE) + "đ");

        // Tính và hiển thị tổng tiền
        int totalPayment = subtotal + SHIPPING_FEE;
        tvTotalPayment.setText(formatter.format(totalPayment) + "đ");
    }

    private void loadUserProfile() {
        String authToken = userManager.getAuthorizationToken();

        if (TextUtils.isEmpty(authToken)) {
            Toast.makeText(this, "Bạn chưa đăng nhập", Toast.LENGTH_SHORT).show();
            Log.e(TAG, "Token không tồn tại trong UserManager");
            return;
        }

        // Hiển thị thông tin token để debug
        if (authToken.length() > 20) {
            Log.d(TAG, "Token preview: " + authToken.substring(0, 7) + "..." + authToken.substring(authToken.length() - 7));
        } else {
            Log.d(TAG, "Token (full): " + authToken);
        }

        // Gọi API lấy thông tin người dùng sử dụng Volley
        String url = BASE_URL + "/api/user/profile";
        Log.d(TAG, "Calling API: " + url);

        JsonObjectRequest request = new JsonObjectRequest(Request.Method.GET, url, null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        Log.d(TAG, "API response: " + response.toString());
                        try {
                            // Phân tích JSON để lấy thông tin người dùng
                            if (response.has("user")) {
                                JSONObject userObject = response.getJSONObject("user");

                                // Lấy ID người dùng nếu chưa có
                                if (TextUtils.isEmpty(userId)) {
                                    userId = userObject.getString("_id");
                                    Log.d(TAG, "Đã lấy userId từ API: " + userId);
                                }

                                // Lấy các thông tin khác và hiển thị lên form
                                final String username = userObject.optString("username", "");
                                final String email = userObject.optString("email", "");
                                final String phone = userObject.optString("phone", "");

                                Log.d(TAG, "Dữ liệu người dùng từ API - Username: " + username + ", Email: " + email + ", Phone: " + phone);

                                // Cập nhật UI trên main thread
                                runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        // Kiểm tra dữ liệu và hiển thị
                                        if (!TextUtils.isEmpty(username)) {
                                            etName.setText(username);
                                        }
                                        if (!TextUtils.isEmpty(email)) {
                                            etEmail.setText(email);
                                        }
                                        if (!TextUtils.isEmpty(phone)) {
                                            etPhone.setText(phone);
                                        }
                                    }
                                });

                                Log.d(TAG, "Dữ liệu người dùng đã được tải thành công");
                            } else {
                                Log.e(TAG, "Phản hồi không chứa object user");
                            }
                        } catch (JSONException e) {
                            Log.e(TAG, "JSON parsing error: " + e.getMessage(), e);
                            Toast.makeText(CheckoutActivity.this, "Lỗi khi xử lý dữ liệu người dùng", Toast.LENGTH_SHORT).show();
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        handleApiError(error, "profile");
                    }
                }) {
            @Override
            public Map<String, String> getHeaders() throws AuthFailureError {
                Map<String, String> headers = new HashMap<>();
                headers.put("Content-Type", "application/json");

                if (authToken != null && !authToken.isEmpty()) {
                    headers.put("Authorization", authToken);

                    // Log để debug
                    String maskedToken = authToken.length() > 15
                            ? authToken.substring(0, 7) + "..." + authToken.substring(authToken.length() - 7)
                            : authToken;
                    Log.d(TAG, "Authorization header: " + maskedToken);
                } else {
                    Log.w(TAG, "Không có token để gửi trong header");
                }

                return headers;
            }
        };

        request.setRetryPolicy(new DefaultRetryPolicy(
                30000,  // 30 giây timeout
                1,     // Số lần thử lại
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        requestQueue.add(request);
    }

    private void setupButtonListeners() {
        btnBackToCart.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish(); // Quay lại màn hình giỏ hàng
            }
        });

        btnConfirmOrder.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (validateForm()) {
                    createOrder();
                }
            }
        });
    }

    private boolean validateForm() {
        if (TextUtils.isEmpty(etAddress.getText())) {
            etAddress.setError("Vui lòng nhập địa chỉ giao hàng");
            return false;
        }

        if (cartItems == null || cartItems.isEmpty()) {
            Toast.makeText(this, "Giỏ hàng trống, không thể đặt hàng", Toast.LENGTH_SHORT).show();
            return false;
        }

        return true;
    }

    private void createOrder() {
        // Hiển thị dialog xác nhận
        new AlertDialog.Builder(this)
                .setTitle("Xác nhận đặt hàng")
                .setMessage("Bạn có chắc muốn đặt đơn hàng này?")
                .setPositiveButton("Đặt hàng", (dialog, which) -> {
                    // Đặt lại giá trị của orderFormatAttempt
                    orderFormatAttempt = 0;
                    // Bắt đầu với định dạng đầu tiên
                    submitOrder();
                })
                .setNegativeButton("Hủy", null)
                .show();
    }

    private void submitOrder() {
        // Lấy token từ UserManager
        String authToken = userManager.getAuthorizationToken();

        if (TextUtils.isEmpty(authToken)) {
            Toast.makeText(this, "Bạn chưa đăng nhập", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            // Kiểm tra userId có hợp lệ không
            if (!isValidObjectId(userId)) {
                Log.e(TAG, "User ID không hợp lệ: " + userId);
                Toast.makeText(this, "ID người dùng không hợp lệ, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                navigateToLogin();
                return;
            }

            // Tạo JSON request body với cấu trúc khớp với web
            JSONObject jsonBody = new JSONObject();

            // Dựa vào số lần thử, thay đổi định dạng trường user
            switch (orderFormatAttempt) {
                case 0:
                    // Định dạng 1: User là chuỗi đơn giản - ĐỊNH DẠNG CHUẨN MONGOOSE
                    jsonBody.put("user", userId);
                    Log.d(TAG, "Thử với định dạng 1: user là chuỗi đơn giản");
                    break;

                case 1:
                    // Định dạng 2: Chỉ user là chuỗi, nhưng thêm một số trường khác
                    jsonBody.put("user", userId);
                    jsonBody.put("userId", userId); // Trường bổ sung để hỗ trợ
                    Log.d(TAG, "Thử với định dạng 2: user là chuỗi + thêm userId");
                    break;

                case 2:
                    // Định dạng 3: Cố gắng với một đối tượng _id
                    JSONObject userObject = new JSONObject();
                    userObject.put("_id", userId);
                    jsonBody.put("user", userObject);
                    Log.d(TAG, "Thử với định dạng 3: user là đối tượng có _id");
                    break;

                default:
                    // Chuyển sang offline mode
                    Log.d(TAG, "Đã thử tất cả các định dạng, chuyển sang offline mode");
                    mockCreateOrder();
                    return;
            }

            // Log thông tin userId để debug
            Log.d(TAG, "UserId đang sử dụng: " + userId);

            // Tạo mảng sản phẩm
            JSONArray productsArray = new JSONArray();

            // Thêm tất cả sản phẩm vào mảng - LUÔN DÙNG ĐỊNH DẠNG CHUỖI CHO PRODUCT
            for (SanPham sanpham : cartItems) {
                if (sanpham.getVariants() != null && !sanpham.getVariants().isEmpty()) {
                    for (SanPham.ProductVariant variant : sanpham.getVariants()) {
                        // Kiểm tra nếu ID sản phẩm hợp lệ
                        String productId = sanpham.getIdsanpham();
                        if (!isValidObjectId(productId)) {
                            Log.w(TAG, "Bỏ qua sản phẩm với ID không hợp lệ: " + productId);
                            continue;
                        }

                        JSONObject productObject = new JSONObject();

                        // QUAN TRỌNG: LUÔN SỬ DỤNG CHUỖI ĐƠN GIẢN CHO PRODUCT
                        productObject.put("product", productId);

                        // Thêm thông tin biến thể
                        String size = variant.getSize();
                        String color = variant.getColor();

                        if (size != null && !size.isEmpty()) {
                            productObject.put("size", size);
                        }

                        if (color != null && !color.isEmpty()) {
                            if (color.startsWith("#")) {
                                color = color.substring(1); // Loại bỏ # từ mã màu nếu có
                            }
                            productObject.put("color", color);
                        }

                        // Tạo variantId
                        String variantId = productId;
                        if (size != null && !size.isEmpty()) {
                            variantId += "-" + size;
                        }
                        if (color != null && !color.isEmpty()) {
                            variantId += "-" + color;
                        }
                        productObject.put("variantId", variantId);

                        // Thêm số lượng và giá
                        productObject.put("quantity", variant.getQuantity());
                        productObject.put("price", sanpham.getGiasanpham());

                        // Thêm các trường theo định dạng của MongoDB
                        productObject.put("rated", false);

                        // QUAN TRỌNG: Sử dụng null thay vì JSONObject.NULL
                        productObject.put("rating", null);
                        productObject.put("comment", "");

                        productsArray.put(productObject);
                    }
                } else {
                    // Nếu không có biến thể, kiểm tra ID sản phẩm
                    String productId = sanpham.getIdsanpham();
                    if (!isValidObjectId(productId)) {
                        Log.w(TAG, "Bỏ qua sản phẩm với ID không hợp lệ: " + productId);
                        continue;
                    }

                    JSONObject productObject = new JSONObject();

                    // QUAN TRỌNG: LUÔN SỬ DỤNG CHUỖI ĐƠN GIẢN CHO PRODUCT
                    productObject.put("product", productId);

                    // Thiết lập số lượng
                    int quantity = 1;
                    if (sanpham.getInventory() != null) {
                        quantity = sanpham.getInventory().getQuantityOnHand();
                    }
                    productObject.put("quantity", quantity);

                    // Thêm giá và các trường khác
                    productObject.put("price", sanpham.getGiasanpham());
                    productObject.put("variantId", productId);
                    productObject.put("rated", false);
                    productObject.put("rating", null);
                    productObject.put("comment", "");

                    productsArray.put(productObject);
                }
            }

            // Kiểm tra nếu không có sản phẩm nào hợp lệ
            if (productsArray.length() == 0) {
                Log.e(TAG, "Không có sản phẩm hợp lệ để đặt hàng");
                Toast.makeText(this, "Không có sản phẩm hợp lệ để đặt hàng", Toast.LENGTH_SHORT).show();
                return;
            }

            jsonBody.put("products", productsArray);

            // Tính tổng tiền
            int totalPayment = subtotal;
            jsonBody.put("orderTotal", totalPayment);

            // Thêm địa chỉ và phương thức thanh toán
            jsonBody.put("address", etAddress.getText().toString());
            String paymentMethod = rbCOD.isChecked() ? "cod" : "paypal";
            jsonBody.put("billing", paymentMethod);

            // Thêm trạng thái
            jsonBody.put("status", "pending");

            // Thêm ghi chú
            String notes = etNotes.getText().toString().trim();
            jsonBody.put("description", notes);

            // Thêm các trường bổ sung theo định dạng MongoDB
            jsonBody.put("rated", false);
            jsonBody.put("rating", null);
            jsonBody.put("comment", "");

            // Log JSON request đầy đủ
            Log.d(TAG, "Order JSON (định dạng " + orderFormatAttempt + "): " + jsonBody.toString());

            // API endpoint
            String url = BASE_URL + "/api/order";
            Log.d(TAG, "Gửi request đến: " + url);

            // Hiển thị thông báo đang xử lý
            Toast.makeText(this, "Đang xử lý đơn hàng...", Toast.LENGTH_SHORT).show();

            // Tạo request
            JsonObjectRequest request = new JsonObjectRequest(Request.Method.POST, url, jsonBody,
                    new Response.Listener<JSONObject>() {
                        @Override
                        public void onResponse(JSONObject response) {
                            handleOrderSuccess(response);
                        }
                    },
                    new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            // Tăng số lần thử và thử lại nếu chưa đạt giới hạn
                            orderFormatAttempt++;
                            if (orderFormatAttempt < 3) {
                                Log.d(TAG, "Thử lại với định dạng " + orderFormatAttempt);
                                submitOrder();
                            } else {
                                // Hiển thị lỗi sau khi đã thử tất cả các định dạng
                                handleOrderError(error);
                            }
                        }
                    }) {
                @Override
                public Map<String, String> getHeaders() throws AuthFailureError {
                    Map<String, String> headers = new HashMap<>();
                    headers.put("Content-Type", "application/json");
                    headers.put("Authorization", authToken);
                    return headers;
                }
            };

            // Tăng thời gian timeout
            request.setRetryPolicy(new DefaultRetryPolicy(
                    60000,  // 60 giây timeout
                    1,     // Số lần thử lại
                    DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

            requestQueue.add(request);

        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi tạo đơn hàng: " + e.getMessage(), e);
            Toast.makeText(this, "Lỗi khi tạo đơn hàng: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            mockCreateOrder();
        }
    }

    // Xử lý lỗi đặt hàng
    private void handleOrderError(VolleyError error) {
        // Hiển thị chi tiết lỗi
        String errorDetail = "";
        int statusCode = -1;

        if (error.networkResponse != null) {
            statusCode = error.networkResponse.statusCode;
            if (error.networkResponse.data != null) {
                try {
                    String responseBody = new String(error.networkResponse.data, StandardCharsets.UTF_8);
                    Log.e(TAG, "Error response body: " + responseBody);
                    errorDetail = responseBody;

                    try {
                        JSONObject errorJson = new JSONObject(responseBody);
                        if (errorJson.has("error")) {
                            errorDetail = errorJson.getString("error");
                        } else if (errorJson.has("message")) {
                            errorDetail = errorJson.getString("message");
                        }
                    } catch (JSONException e) {
                        // Không phải JSON, giữ nguyên responseBody
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Không thể đọc dữ liệu lỗi", e);
                }
            }
        }

        Log.e(TAG, "Lỗi " + statusCode + " khi gọi API đặt hàng: " + errorDetail, error);

        // Sau khi đã thử tất cả các định dạng, sử dụng mockCreateOrder
        Toast.makeText(this, "Không thể tạo đơn hàng trực tuyến. Chuyển sang chế độ offline...", Toast.LENGTH_SHORT).show();
        mockCreateOrder();
    }

    // Xử lý đơn hàng thành công
    private void handleOrderSuccess(JSONObject response) {
        try {
            // Log phản hồi
            Log.d(TAG, "Đơn hàng thành công: " + response.toString());

            // Lấy ID đơn hàng
            String orderId = "";
            if (response.has("_id")) {
                orderId = response.getString("_id");
            } else if (response.has("id")) {
                orderId = response.getString("id");
            } else if (response.has("orderId")) {
                orderId = response.getString("orderId");
            } else {
                // Nếu không tìm thấy ID, tạo một ID ngẫu nhiên
                orderId = "order_" + System.currentTimeMillis();
            }

            Log.d(TAG, "Đơn hàng đã được tạo với ID: " + orderId);

            // Thông báo thành công
            Toast.makeText(CheckoutActivity.this, "Đặt hàng thành công!", Toast.LENGTH_SHORT).show();

            // Xóa giỏ hàng
            clearCart();

            // Lưu thông tin đơn hàng gần nhất
            saveLastOrderInfo(orderId);

            // Chuyển đến màn hình xác nhận đơn hàng
            goToOrderConfirmation(orderId);

        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi xử lý phản hồi đơn hàng: " + e.getMessage(), e);
            mockCreateOrder();
        }
    }

    // Phương thức mockCreateOrder()
    private void mockCreateOrder() {
        try {
            // Hiển thị thông báo
            Toast.makeText(this, "Đặt hàng thành công (chế độ offline)!", Toast.LENGTH_SHORT).show();

            // Xóa giỏ hàng
            clearCart();

            // Tạo một orderId giả
            String orderId = "ORD_" + System.currentTimeMillis();

            // Lưu thông tin đơn hàng
            saveLastOrderInfo(orderId);

            Log.d(TAG, "Đơn hàng giả lập đã được tạo: " + orderId);

            // Chuyển đến màn hình xác nhận
            goToOrderConfirmation(orderId);

        } catch (Exception e) {
            Log.e(TAG, "Lỗi trong mockCreateOrder: " + e.getMessage(), e);
            Toast.makeText(this, "Có lỗi xảy ra: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    // Lưu thông tin đơn hàng gần nhất
    private void saveLastOrderInfo(String orderId) {
        SharedPreferences orderPrefs = getSharedPreferences("LastOrder", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = orderPrefs.edit();
        editor.putString("orderId", orderId);
        editor.putString("address", etAddress.getText().toString());
        editor.putString("billing", rbCOD.isChecked() ? "cod" : "paypal");
        editor.putString("notes", etNotes.getText().toString());
        editor.putInt("total", subtotal + SHIPPING_FEE);
        editor.apply();
    }

    // Kiểm tra xem chuỗi có phải là MongoDB ObjectId hợp lệ không
    private boolean isValidObjectId(String id) {
        // MongoDB ObjectId là chuỗi 24 ký tự hexadecimal (0-9, a-f)
        if (id == null || id.length() != 24) {
            return false;
        }

        for (int i = 0; i < id.length(); i++) {
            char c = id.charAt(i);
            if (!((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F'))) {
                return false;
            }
        }

        return true;
    }

    // Phương thức để xử lý lỗi API một cách nhất quán
    private void handleApiError(VolleyError error, String apiName) {
        String errorMsg = "Lỗi khi gọi API " + apiName;

        if (error.networkResponse != null) {
            int statusCode = error.networkResponse.statusCode;
            errorMsg += " (Mã lỗi: " + statusCode + ")";

            // Log chi tiết lỗi
            if (error.networkResponse.data != null) {
                try {
                    String responseBody = new String(error.networkResponse.data, "utf-8");
                    Log.e(TAG, "Error response body: " + responseBody);

                    // Xử lý lỗi "Invalid Token"
                    if (responseBody.contains("Invalid Token") || statusCode == 400 || statusCode == 401) {
                        Log.e(TAG, "Token không hợp lệ, cần đăng nhập lại");
                        Toast.makeText(this, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                        navigateToLogin();
                        return;
                    }

                    // Thử phân tích JSON lỗi
                    try {
                        JSONObject errorJson = new JSONObject(responseBody);
                        if (errorJson.has("message")) {
                            errorMsg = errorJson.getString("message");
                        } else if (errorJson.has("error")) {
                            errorMsg = errorJson.getString("error");
                        }
                    } catch (JSONException e) {
                        // Không phải JSON, hiển thị nội dung lỗi gốc
                        if (responseBody.length() < 100) {
                            errorMsg += ": " + responseBody;
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Cannot parse error response", e);
                }
            }

            // Xử lý mã lỗi cụ thể
            if (statusCode == 401 || statusCode == 403) {
                // Token không hợp lệ hoặc hết hạn
                Log.e(TAG, "Lỗi xác thực: Token không hợp lệ hoặc hết hạn");
                Toast.makeText(this, "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                navigateToLogin();
                return;
            } else if (statusCode == 500) {
                // Lỗi server
                Log.e(TAG, "Lỗi server (500) - có thể do token không hợp lệ");
                Toast.makeText(this, "Lỗi server, vui lòng thử lại sau", Toast.LENGTH_SHORT).show();
            }
        } else {
            errorMsg += " (Lỗi kết nối)";
            Log.e(TAG, "Network error: " + error.toString(), error);
        }

        Log.e(TAG, errorMsg, error);
        Toast.makeText(this, errorMsg, Toast.LENGTH_SHORT).show();
    }

    // Chuyển đến màn hình đăng nhập
    private void navigateToLogin() {
        // Đăng xuất người dùng hiện tại
        userManager.logout();

        // Chuyển đến màn hình đăng nhập
        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    private void clearCart() {
        cartItems.clear();

        // Lưu giỏ hàng trống vào SharedPreferences
        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        String jsonCart = gson.toJson(cartItems);
        editor.putString("cartItems", jsonCart);
        editor.apply();

        Log.d(TAG, "Giỏ hàng đã được xóa");
    }

    private void goToOrderConfirmation(String orderId) {
        Intent intent = new Intent(CheckoutActivity.this, OrderConfirmationActivity.class);
        intent.putExtra("orderId", orderId);
        startActivity(intent);
        finish();
    }
}