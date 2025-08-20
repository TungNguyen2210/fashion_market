package com.example.tech.activity;

import android.app.Dialog;
import android.content.Intent;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RatingBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.bumptech.glide.Glide;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.target.Target;
import com.example.apptrangsuc.R;
import com.example.tech.adapter.OrderAdapter;
import com.example.tech.adapter.OrderProductAdapter;
import com.example.tech.model.Order;
import com.example.tech.model.OrderItem;
import com.example.tech.utils.CurrencyFormatter;
import com.example.tech.utils.UserManager;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

public class FragmentB extends Fragment implements OrderAdapter.OnOrderItemClickListener, OrderProductAdapter.OnProductClickListener {

    private static final String TAG = "FragmentB";
    private static final String BASE_URL = "http://10.0.2.2:3100";

    private RecyclerView recyclerViewOrders;
    private SwipeRefreshLayout swipeRefreshLayout;
    private LinearLayout emptyOrdersLayout;
    private ProgressBar progressBar;
    private Button btnStartShopping;

    // Views cho phần chi tiết đơn hàng
    private CardView orderDetailCard;
    private TextView tvOrderId, tvOrderDate, tvOrderTotal, tvAddress;
    private TextView tvOrderStatus, tvPaymentMethod, tvDescription;
    private RecyclerView recyclerViewProducts;
    private TextView tvNotificationBanner;
    private ImageView btnCloseDetail;
    private ProgressBar detailProgressBar;

    private List<Order> orderList;
    private OrderAdapter orderAdapter;
    private OrderProductAdapter productAdapter;
    private RequestQueue requestQueue;
    private boolean isOrderDelivered = false;
    private String currentOrderId;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        return inflater.inflate(R.layout.activity_fragment_b, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // Log trạng thái đăng nhập để debug
        UserManager userManager = UserManager.getInstance(requireContext());
        Log.d(TAG, "isLoggedIn: " + userManager.isLoggedIn());

        // Kiểm tra và in thông tin token nếu đã đăng nhập
        if (userManager.isLoggedIn()) {
            // Debug chi tiết về token hiện tại
            userManager.debugCurrentToken();

            // Lấy token định dạng đúng để gửi API
            String authToken = userManager.getAuthorizationToken();
            Log.d(TAG, "Token sẽ sử dụng cho API (phần đầu): " +
                    (authToken != null && authToken.length() > 10 ?
                            authToken.substring(0, 10) + "..." : authToken));

            // Kiểm tra token còn hiệu lực không
            if (!userManager.isTokenValid()) {
                Log.e(TAG, "Token đã hết hạn hoặc không hợp lệ. Đăng xuất và chuyển đến màn hình đăng nhập");
                Toast.makeText(requireContext(), "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                navigateToLogin();
                return;
            }

            Log.d(TAG, "userId: " + userManager.getUserId());
            Log.d(TAG, "username: " + userManager.getUsername());
        } else {
            Log.d(TAG, "User chưa đăng nhập");
        }

        // Khởi tạo RequestQueue
        requestQueue = Volley.newRequestQueue(requireContext());

        // Ánh xạ các view cho danh sách đơn hàng
        recyclerViewOrders = view.findViewById(R.id.recyclerViewOrders);
        swipeRefreshLayout = view.findViewById(R.id.swipeRefreshOrders);
        emptyOrdersLayout = view.findViewById(R.id.emptyOrdersLayout);
        progressBar = view.findViewById(R.id.progressBar);
        btnStartShopping = view.findViewById(R.id.btnStartShopping);

        // Ánh xạ các view cho chi tiết đơn hàng
        orderDetailCard = view.findViewById(R.id.orderDetailCard);
        tvOrderId = view.findViewById(R.id.tvOrderId);
        tvOrderDate = view.findViewById(R.id.tvOrderDate);
        tvOrderTotal = view.findViewById(R.id.tvOrderTotal);
        tvAddress = view.findViewById(R.id.tvAddress);
        tvOrderStatus = view.findViewById(R.id.tvOrderStatus);
        tvPaymentMethod = view.findViewById(R.id.tvPaymentMethod);
        tvDescription = view.findViewById(R.id.tvDescription);
        recyclerViewProducts = view.findViewById(R.id.recyclerViewProducts);
        tvNotificationBanner = view.findViewById(R.id.tvNotificationBanner);
        btnCloseDetail = view.findViewById(R.id.btnCloseDetail);
        detailProgressBar = view.findViewById(R.id.detailProgressBar);

        // Thiết lập RecyclerView cho danh sách đơn hàng
        orderList = new ArrayList<>();
        orderAdapter = new OrderAdapter(requireContext(), orderList, this);
        recyclerViewOrders.setLayoutManager(new LinearLayoutManager(requireContext()));
        recyclerViewOrders.setAdapter(orderAdapter);

        // Thiết lập RecyclerView cho danh sách sản phẩm trong đơn hàng
        recyclerViewProducts.setLayoutManager(new LinearLayoutManager(requireContext()));

        // Thiết lập SwipeRefreshLayout
        swipeRefreshLayout.setOnRefreshListener(this::loadOrdersData);
        swipeRefreshLayout.setColorSchemeResources(R.color.teal_700);

        // Thiết lập nút "Mua sắm ngay"
        btnStartShopping.setOnClickListener(v -> {
            // Chuyển đến Fragment A (trang chủ)
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).navigateToFragment(0);
            }
        });

        // Thiết lập nút đóng chi tiết đơn hàng
        btnCloseDetail.setOnClickListener(v -> {
            hideOrderDetail();
        });

        // Ban đầu, ẩn phần chi tiết đơn hàng
        orderDetailCard.setVisibility(View.GONE);

        // Kiểm tra đăng nhập và tải dữ liệu
        if (userManager.isLoggedIn() && userManager.isTokenValid()) {
            loadOrdersData();
        } else {
            showEmptyState();
            Toast.makeText(requireContext(), "Vui lòng đăng nhập để xem đơn hàng", Toast.LENGTH_SHORT).show();
        }
    }

    private void loadOrdersData() {
        UserManager userManager = UserManager.getInstance(requireContext());
        if (!userManager.isLoggedIn()) {
            swipeRefreshLayout.setRefreshing(false);
            showEmptyState();
            Toast.makeText(requireContext(), "Vui lòng đăng nhập để xem đơn hàng", Toast.LENGTH_SHORT).show();
            return;
        }

        // Kiểm tra token hợp lệ
        if (!userManager.isTokenValid()) {
            Log.e(TAG, "Token không hợp lệ hoặc đã hết hạn");
            Toast.makeText(requireContext(), "Phiên đăng nhập không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
            navigateToLogin();
            return;
        }

        if (!swipeRefreshLayout.isRefreshing()) {
            progressBar.setVisibility(View.VISIBLE);
        }
        emptyOrdersLayout.setVisibility(View.GONE);
        recyclerViewOrders.setVisibility(View.GONE);

        // Ẩn chi tiết đơn hàng nếu đang hiển thị
        hideOrderDetail();

        // URL API
        String url = BASE_URL + "/api/order/user";
        Log.d(TAG, "Loading orders from URL: " + url);

        // Lấy token đúng định dạng từ UserManager
        final String authToken = userManager.getAuthorizationToken();

        // Debug token
        userManager.debugCurrentToken();

        StringRequest stringRequest = new StringRequest(
                Request.Method.GET,
                url,
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        progressBar.setVisibility(View.GONE);
                        swipeRefreshLayout.setRefreshing(false);

                        // In ra một phần response để debug
                        String previewResponse = response.length() > 100
                                ? response.substring(0, 100) + "..."
                                : response;
                        Log.d(TAG, "Nhận được phản hồi: " + previewResponse);

                        try {
                            // Parse response
                            JSONArray ordersArray;

                            // Kiểm tra cấu trúc response
                            if (response.startsWith("[")) {
                                // Response là một mảng trực tiếp
                                ordersArray = new JSONArray(response);
                            } else {
                                // Response là một đối tượng chứa mảng
                                JSONObject jsonResponse = new JSONObject(response);

                                // Kiểm tra xem response có field "data" hay không
                                if (jsonResponse.has("data")) {
                                    ordersArray = jsonResponse.getJSONArray("data");
                                } else {
                                    // Thử các trường khác nếu không có "data"
                                    if (jsonResponse.has("orders")) {
                                        ordersArray = jsonResponse.getJSONArray("orders");
                                    } else {
                                        // Không tìm thấy mảng dữ liệu
                                        Log.e(TAG, "Response không chứa dữ liệu đơn hàng: " + response);
                                        Toast.makeText(requireContext(), "Định dạng dữ liệu không hợp lệ", Toast.LENGTH_SHORT).show();
                                        showEmptyState();
                                        return;
                                    }
                                }
                            }

                            // Parse dữ liệu đơn hàng và sắp xếp theo thời gian mới nhất
                            List<Order> orders = parseOrdersFromJson(ordersArray);

                            // Cập nhật UI
                            orderList.clear();
                            orderList.addAll(orders);
                            orderAdapter.notifyDataSetChanged();

                            if (orderList.isEmpty()) {
                                showEmptyState();
                            } else {
                                showOrdersList();
                            }

                            // Log số lượng đơn hàng đã tải
                            Log.d(TAG, "Đã tải " + orders.size() + " đơn hàng");

                        } catch (JSONException e) {
                            Log.e(TAG, "Lỗi phân tích JSON: " + e.getMessage(), e);
                            Log.e(TAG, "Response nhận được: " + response);
                            Toast.makeText(requireContext(), "Lỗi khi xử lý dữ liệu đơn hàng", Toast.LENGTH_SHORT).show();
                            showEmptyState();
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        progressBar.setVisibility(View.GONE);
                        swipeRefreshLayout.setRefreshing(false);

                        // Hiển thị thông tin lỗi chi tiết để debug
                        String errorMsg = "Không thể tải dữ liệu đơn hàng";

                        if (error.networkResponse != null) {
                            int statusCode = error.networkResponse.statusCode;
                            errorMsg += " (Mã lỗi: " + statusCode + ")";

                            // In ra body của response lỗi
                            try {
                                String responseBody = new String(error.networkResponse.data, "UTF-8");
                                Log.e(TAG, "Error response body: " + responseBody);
                                Log.e(TAG, "Token đã sử dụng: " + authToken);

                                // Xử lý lỗi "Invalid Token"
                                if (responseBody.contains("Invalid Token") || statusCode == 400 || statusCode == 401) {
                                    Log.e(TAG, "Token không hợp lệ, cần đăng nhập lại");
                                    Toast.makeText(requireContext(), "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                                    navigateToLogin();
                                    return;
                                }
                            } catch (UnsupportedEncodingException e) {
                                Log.e(TAG, "Không thể đọc response body", e);
                            }

                            // Xử lý mã lỗi cụ thể
                            if (statusCode == 401 || statusCode == 403) {
                                // Token không hợp lệ hoặc hết hạn
                                Log.e(TAG, "Lỗi xác thực: Token không hợp lệ hoặc hết hạn");
                                Toast.makeText(requireContext(), "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                                navigateToLogin();
                                return;
                            } else if (statusCode == 500) {
                                // Lỗi server - thử refresh token
                                Log.e(TAG, "Lỗi server (500) - có thể do token không hợp lệ");
                                Toast.makeText(requireContext(), "Lỗi server, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                                navigateToLogin();
                                return;
                            }
                        } else {
                            // Lỗi không có network response (timeout, no connection...)
                            Log.e(TAG, "Không có network response: " + error.toString());
                            errorMsg = "Lỗi kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
                        }

                        Log.e(TAG, errorMsg, error);
                        Toast.makeText(requireContext(), errorMsg, Toast.LENGTH_SHORT).show();
                        showEmptyState();
                    }
                }) {
            @Override
            public Map<String, String> getHeaders() throws AuthFailureError {
                Map<String, String> headers = new HashMap<>();
                headers.put("Content-Type", "application/json");

                // QUAN TRỌNG: Gửi token không có prefix "Bearer "
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

        // Tăng timeout và thêm retry policy
        stringRequest.setRetryPolicy(new DefaultRetryPolicy(
                30000, // 30 giây timeout
                1,     // Số lần thử lại
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        requestQueue.add(stringRequest);
    }

    private List<Order> parseOrdersFromJson(JSONArray ordersArray) throws JSONException {
        List<Order> orders = new ArrayList<>();
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));

        // Lấy thông tin người dùng hiện tại để so sánh và gán username
        UserManager userManager = UserManager.getInstance(requireContext());
        String currentUserId = userManager.getUserId();
        String currentUsername = userManager.getUsername();

        Log.d(TAG, "Người dùng hiện tại - userId: " + currentUserId + ", username: " + currentUsername);

        for (int i = 0; i < ordersArray.length(); i++) {
            JSONObject orderObj = ordersArray.getJSONObject(i);

            Order order = new Order();

            // ID đơn hàng - khóa chính
            if (orderObj.has("_id")) {
                order.setId(orderObj.getString("_id"));
            } else if (orderObj.has("id")) {
                order.setId(orderObj.getString("id"));
            } else {
                // Nếu không có ID, tạo ID tạm thời
                order.setId("order_" + i);
            }

            // ID người dùng và username
            String userId = null;
            String username = null;

            if (orderObj.has("user")) {
                Log.d(TAG, "Order #" + i + " có trường user: " + orderObj.get("user").toString());

                if (orderObj.get("user") instanceof String) {
                    userId = orderObj.getString("user");
                    Log.d(TAG, "User là String: " + userId);
                } else if (orderObj.get("user") instanceof JSONObject) {
                    JSONObject userObj = orderObj.getJSONObject("user");
                    Log.d(TAG, "User là JSONObject: " + userObj.toString());

                    if (userObj.has("_id")) {
                        userId = userObj.getString("_id");
                        Log.d(TAG, "User ID: " + userId);
                    }

                    if (userObj.has("username")) {
                        username = userObj.getString("username");
                        Log.d(TAG, "Username từ API: " + username);
                    } else {
                        Log.d(TAG, "Không tìm thấy trường username trong user object");
                    }
                }
            } else {
                Log.d(TAG, "Đơn hàng không có trường user");
            }

            // Thiết lập userId và username cho đơn hàng
            order.setUserId(userId);

            // Nếu API không trả về username và userId trùng khớp với người dùng hiện tại, sử dụng username hiện tại
            if ((username == null || username.isEmpty()) &&
                    currentUserId != null && currentUserId.equals(userId) &&
                    currentUsername != null && !currentUsername.isEmpty()) {

                username = currentUsername;
                Log.d(TAG, "Sử dụng username từ UserManager: " + username);
            }

            order.setUsername(username);

            // Tổng tiền đơn hàng
            if (orderObj.has("orderTotal")) {
                order.setOrderTotal(orderObj.getInt("orderTotal"));
            } else if (orderObj.has("total")) {
                order.setOrderTotal(orderObj.getInt("total"));
            }

            // Địa chỉ
            if (orderObj.has("address")) {
                order.setAddress(orderObj.getString("address"));
            }

            // Phương thức thanh toán
            if (orderObj.has("billing")) {
                order.setBilling(orderObj.getString("billing"));
            } else if (orderObj.has("paymentMethod")) {
                order.setBilling(orderObj.getString("paymentMethod"));
            }

            // Trạng thái
            if (orderObj.has("status")) {
                order.setStatus(orderObj.getString("status"));
            }

            // Mô tả
            if (orderObj.has("description")) {
                order.setDescription(orderObj.getString("description"));
            } else if (orderObj.has("note")) {
                order.setDescription(orderObj.getString("note"));
            }

            // Parse ngày tạo và cập nhật
            try {
                if (orderObj.has("createdAt")) {
                    String createdAtStr = orderObj.getString("createdAt");
                    try {
                        order.setCreatedAt(dateFormat.parse(createdAtStr));
                    } catch (ParseException e) {
                        // Thử format khác nếu format chính không thành công
                        SimpleDateFormat altFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
                        order.setCreatedAt(altFormat.parse(createdAtStr));
                    }
                } else {
                    order.setCreatedAt(new Date());
                }

                if (orderObj.has("updatedAt")) {
                    String updatedAtStr = orderObj.getString("updatedAt");
                    try {
                        order.setUpdatedAt(dateFormat.parse(updatedAtStr));
                    } catch (ParseException e) {
                        SimpleDateFormat altFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US);
                        order.setUpdatedAt(altFormat.parse(updatedAtStr));
                    }
                } else {
                    order.setUpdatedAt(order.getCreatedAt());
                }
            } catch (ParseException e) {
                Log.e(TAG, "Error parsing date", e);
                order.setCreatedAt(new Date());
                order.setUpdatedAt(new Date());
            }

            // Parse sản phẩm trong đơn hàng
            List<OrderItem> products = new ArrayList<>();

            // Kiểm tra trường products
            if (orderObj.has("products")) {
                Object productsObj = orderObj.get("products");

                if (productsObj instanceof JSONArray) {
                    JSONArray productsArray = (JSONArray) productsObj;

                    for (int j = 0; j < productsArray.length(); j++) {
                        JSONObject productObj = productsArray.getJSONObject(j);
                        OrderItem item = parseOrderItem(productObj);
                        products.add(item);

                        // Log thông tin chi tiết về sản phẩm để debug
                        Log.d(TAG, "Parsed product: " + item.getProductName() +
                                ", Qty: " + item.getQuantity() +
                                ", Price: " + item.getPrice() +
                                ", Total: " + (item.getQuantity() * item.getPrice()));
                    }
                }
            }

            order.setProducts(products);
            orders.add(order);
        }

        // Sắp xếp danh sách đơn hàng theo thời gian tạo (mới nhất lên đầu)
        Collections.sort(orders, new Comparator<Order>() {
            @Override
            public int compare(Order o1, Order o2) {
                // Sắp xếp giảm dần (mới nhất lên đầu)
                return o2.getCreatedAt().compareTo(o1.getCreatedAt());
            }
        });

        Log.d(TAG, "Đã sắp xếp danh sách đơn hàng theo thời gian mới nhất đến cũ nhất");
        return orders;
    }

    private OrderItem parseOrderItem(JSONObject productObj) throws JSONException {
        OrderItem item = new OrderItem();

        // ID của item đơn hàng
        if (productObj.has("_id")) {
            item.setId(productObj.getString("_id"));
        } else if (productObj.has("id")) {
            item.setId(productObj.getString("id"));
        }

        // QUAN TRỌNG: Số lượng và giá phải được lấy từ đơn hàng
        // Số lượng
        if (productObj.has("quantity")) {
            item.setQuantity(productObj.getInt("quantity"));
        } else {
            item.setQuantity(1); // Mặc định là 1
        }

        // Giá đơn vị (không phải tổng giá)
        if (productObj.has("price")) {
            item.setPrice(productObj.getInt("price"));
        }

        Log.d(TAG, "Sản phẩm có số lượng: " + item.getQuantity() + ", giá đơn vị: " + item.getPrice());

        // Thông tin đánh giá
        if (productObj.has("rated")) {
            item.setRated(productObj.getBoolean("rated"));
        }

        if (productObj.has("rating") && !productObj.isNull("rating")) {
            item.setRating(productObj.getInt("rating"));
        }

        if (productObj.has("comment")) {
            item.setComment(productObj.getString("comment"));
        }

        // Thông tin size và color
        if (productObj.has("size")) {
            item.setSize(productObj.getString("size"));
        }

        if (productObj.has("color")) {
            item.setColor(productObj.getString("color"));
        }

        if (productObj.has("variantId")) {
            item.setVariantId(productObj.getString("variantId"));
        }

        // Thông tin sản phẩm
        if (productObj.has("product")) {
            Object productValue = productObj.get("product");

            if (productValue instanceof JSONObject && !productObj.isNull("product")) {
                JSONObject productDetails = (JSONObject) productValue;

                // ID sản phẩm
                if (productDetails.has("_id")) {
                    item.setProductId(productDetails.getString("_id"));
                } else if (productDetails.has("id")) {
                    item.setProductId(productDetails.getString("id"));
                }

                // Tên sản phẩm
                if (productDetails.has("name")) {
                    item.setProductName(productDetails.getString("name"));
                }

                // Hình ảnh sản phẩm
                if (productDetails.has("image")) {
                    item.setProductImage(productDetails.getString("image"));
                } else if (productDetails.has("thumbnail")) {
                    item.setProductImage(productDetails.getString("thumbnail"));
                }

                // Log thông tin hình ảnh
                Log.d(TAG, "Product image URL: " + item.getProductImage());

            } else if (productValue instanceof String) {
                // Nếu product chỉ là ID string hoặc tên
                String productString = productValue.toString();

                // Kiểm tra nếu là MongoDB ObjectId
                if (productString.matches("^[0-9a-fA-F]{24}$")) {
                    item.setProductId(productString);
                    item.setProductName("Sản phẩm #" + productString.substring(0, 6));
                } else {
                    // Nếu là tên sản phẩm
                    item.setProductName(productString);

                    // Lấy ID từ variantId nếu có
                    if (item.getVariantId() != null && !item.getVariantId().isEmpty()) {
                        String[] parts = item.getVariantId().split("-");
                        if (parts.length > 0) {
                            item.setProductId(parts[0]);
                        }
                    }
                }
            } else {
                // Product là null hoặc định dạng không hỗ trợ
                item.setProductId("unknown");
                item.setProductName("Sản phẩm không xác định");
            }
        } else if (productObj.has("productId")) {
            // Trường hợp API trả về productId trực tiếp
            item.setProductId(productObj.getString("productId"));

            // Tên sản phẩm nếu có
            if (productObj.has("productName")) {
                item.setProductName(productObj.getString("productName"));
            } else {
                item.setProductName("Sản phẩm #" + item.getProductId());
            }

            // Hình ảnh nếu có
            if (productObj.has("productImage")) {
                item.setProductImage(productObj.getString("productImage"));
            }
        }

        // Tạo displayName với thông tin đơn giản hơn
        if (item.getProductName() != null && !item.getProductName().isEmpty()) {
            StringBuilder displayName = new StringBuilder(item.getProductName());

            if (item.getSize() != null && !item.getSize().isEmpty()) {
                displayName.append(" - Size: ").append(item.getSize());
            }

            if (item.getColor() != null && !item.getColor().isEmpty()) {
                displayName.append(" - Màu: ").append(getColorName(item.getColor()));
            }

            item.setDisplayName(displayName.toString());
        } else {
            item.setDisplayName("Sản phẩm không xác định");
        }

        return item;
    }

    // Phương thức mới để tải chi tiết đơn hàng
    private void loadOrderDetail(String orderId) {
        UserManager userManager = UserManager.getInstance(requireContext());
        if (!userManager.isLoggedIn() || !userManager.isTokenValid()) {
            Toast.makeText(requireContext(), "Vui lòng đăng nhập để xem chi tiết đơn hàng", Toast.LENGTH_SHORT).show();
            navigateToLogin();
            return;
        }

        currentOrderId = orderId;
        detailProgressBar.setVisibility(View.VISIBLE);

        String url = BASE_URL + "/api/order/" + orderId;
        final String authToken = userManager.getAuthorizationToken();

        StringRequest request = new StringRequest(
                Request.Method.GET,
                url,
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        detailProgressBar.setVisibility(View.GONE);
                        Log.d(TAG, "Chi tiết đơn hàng: " +
                                (response.length() > 100 ? response.substring(0, 100) + "..." : response));

                        try {
                            JSONObject responseObj = new JSONObject(response);

                            // Tìm đơn hàng tương ứng trong danh sách
                            Order order = null;
                            for (Order o : orderList) {
                                if (o.getId().equals(orderId)) {
                                    order = o;
                                    break;
                                }
                            }

                            // Nếu không tìm thấy trong danh sách, parse từ response
                            if (order == null) {
                                JSONObject orderData;
                                if (responseObj.has("data")) {
                                    orderData = responseObj.getJSONObject("data");
                                } else {
                                    orderData = responseObj;
                                }

                                // Parse order từ JSON
                                order = parseSingleOrderFromJson(orderData);
                            }

                            if (order != null) {
                                updateOrderDetailUI(order);

                                // Tải thông tin chi tiết sản phẩm trong đơn hàng
                                if (order.getProducts() != null) {
                                    for (OrderItem item : order.getProducts()) {
                                        if (item.getProductId() != null &&
                                                (item.getProductImage() == null || item.getProductImage().isEmpty())) {
                                            loadProductDetails(item);
                                        }
                                    }
                                }
                            } else {
                                Toast.makeText(requireContext(), "Không tìm thấy thông tin đơn hàng", Toast.LENGTH_SHORT).show();
                                hideOrderDetail();
                            }
                        } catch (JSONException e) {
                            Log.e(TAG, "Lỗi xử lý JSON chi tiết đơn hàng: " + e.getMessage());
                            Toast.makeText(requireContext(), "Lỗi khi xử lý dữ liệu đơn hàng: " + e.getMessage(),
                                    Toast.LENGTH_SHORT).show();
                            hideOrderDetail();
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        detailProgressBar.setVisibility(View.GONE);
                        handleApiError(error);
                        hideOrderDetail();
                    }
                }) {
            @Override
            public Map<String, String> getHeaders() throws AuthFailureError {
                Map<String, String> headers = new HashMap<>();
                headers.put("Content-Type", "application/json");
                if (authToken != null && !authToken.isEmpty()) {
                    headers.put("Authorization", authToken);
                }
                return headers;
            }
        };

        request.setRetryPolicy(new DefaultRetryPolicy(
                30000, // 30 seconds timeout
                1,     // no retries
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        requestQueue.add(request);
    }

    // Parse đơn hàng chi tiết từ JSON
    private Order parseSingleOrderFromJson(JSONObject jsonObject) throws JSONException {
        Order order = new Order();

        order.setId(jsonObject.optString("_id", jsonObject.optString("id", "")));

        // Xử lý thông tin người dùng
        if (jsonObject.has("user") && !jsonObject.isNull("user")) {
            Object userObj = jsonObject.get("user");
            if (userObj instanceof JSONObject) {
                JSONObject user = (JSONObject) userObj;
                order.setUserId(user.optString("_id", ""));
                order.setUsername(user.optString("username", ""));
            } else if (userObj instanceof String) {
                order.setUserId(userObj.toString());
            }
        }

        order.setOrderTotal(jsonObject.optInt("orderTotal", jsonObject.optInt("total", 0)));
        order.setAddress(jsonObject.optString("address", ""));
        order.setBilling(jsonObject.optString("billing", jsonObject.optString("paymentMethod", "")));

        String status = jsonObject.optString("status", "");
        order.setStatus(status);

        isOrderDelivered = "final".equalsIgnoreCase(status) || "delivered".equalsIgnoreCase(status);

        order.setDescription(jsonObject.optString("description", jsonObject.optString("note", "")));

        // Xử lý ngày tháng
        try {
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
            dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));

            if (jsonObject.has("createdAt") && !jsonObject.isNull("createdAt")) {
                order.setCreatedAt(dateFormat.parse(jsonObject.getString("createdAt")));
            }
            if (jsonObject.has("updatedAt") && !jsonObject.isNull("updatedAt")) {
                order.setUpdatedAt(dateFormat.parse(jsonObject.getString("updatedAt")));
            }
        } catch (Exception e) {
            Log.e(TAG, "Lỗi parse ngày tháng: " + e.getMessage());
        }

        // Xử lý danh sách sản phẩm
        List<OrderItem> products = new ArrayList<>();

        if (jsonObject.has("products") && !jsonObject.isNull("products")) {
            try {
                JSONArray productsArray = jsonObject.getJSONArray("products");

                for (int i = 0; i < productsArray.length(); i++) {
                    try {
                        JSONObject productObj = productsArray.getJSONObject(i);
                        OrderItem item = parseOrderItem(productObj);
                        products.add(item);
                    } catch (JSONException e) {
                        Log.e(TAG, "Lỗi xử lý sản phẩm thứ " + i + ": " + e.getMessage());
                    }
                }
            } catch (JSONException e) {
                Log.e(TAG, "Lỗi xử lý mảng sản phẩm: " + e.getMessage());
            }
        }

        order.setProducts(products);
        return order;
    }

    // Tải thông tin chi tiết sản phẩm
    private void loadProductDetails(final OrderItem item) {
        if (item.getProductId() == null || item.getProductId().isEmpty()) {
            return;
        }

        String url = BASE_URL + "/api/product/" + item.getProductId();

        JsonObjectRequest request = new JsonObjectRequest(
                Request.Method.GET,
                url,
                null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject responseObject) {
                        try {
                            JSONObject productData;

                            // Kiểm tra cấu trúc response
                            if (responseObject.has("data")) {
                                productData = responseObject.getJSONObject("data");
                            } else {
                                productData = responseObject;
                            }

                            // Sử dụng phương thức cập nhật từ adapter mới
                            if (productAdapter != null) {
                                productAdapter.updateProductsFromApiData(item.getProductId(), productData);
                            }

                        } catch (JSONException e) {
                            Log.e(TAG, "Lỗi parse JSON khi tải thông tin sản phẩm: " + e.getMessage());
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        Log.e(TAG, "Lỗi khi tải thông tin sản phẩm: " + error.toString());
                    }
                });

        request.setRetryPolicy(new DefaultRetryPolicy(15000, 1, DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));
        requestQueue.add(request);
    }

    // Cập nhật giao diện chi tiết đơn hàng
    private void updateOrderDetailUI(Order order) {
        if (order == null) {
            Toast.makeText(requireContext(), "Không thể tải thông tin đơn hàng", Toast.LENGTH_SHORT).show();
            hideOrderDetail();
            return;
        }

        // Xác định trạng thái đã giao hàng để quyết định xem có cho phép đánh giá không
        String status = order.getStatus();
        isOrderDelivered = "final".equalsIgnoreCase(status) ||
                "delivered".equalsIgnoreCase(status) ||
                "Đã giao hàng".equalsIgnoreCase(order.getStatusInVietnamese());

        Log.d(TAG, "Order status: " + status + ", isOrderDelivered: " + isOrderDelivered);

        // Order ID
        tvOrderId.setText("Mã đơn hàng: " + order.getId());

        // Ngày đặt hàng
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault());
        if (order.getCreatedAt() != null) {
            tvOrderDate.setText("Ngày đặt: " + dateFormat.format(order.getCreatedAt()));
        } else {
            tvOrderDate.setText("Không có thông tin ngày đặt");
        }

        // Tổng tiền
        tvOrderTotal.setText("Tổng tiền: " + CurrencyFormatter.format(order.getOrderTotal()));

        // Địa chỉ
        tvAddress.setText("Địa chỉ: " + (order.getAddress() != null ? order.getAddress() : ""));

        // Trạng thái
        tvOrderStatus.setText("Trạng thái: " + order.getStatusInVietnamese());
        setStatusColor(tvOrderStatus, order.getStatus());

        // Phương thức thanh toán
        tvPaymentMethod.setText("Thanh toán: " + order.getBillingInVietnamese());

        // Mô tả
        if (order.getDescription() != null && !order.getDescription().isEmpty()) {
            tvDescription.setText("Ghi chú: " + order.getDescription());
            tvDescription.setVisibility(View.VISIBLE);
        } else {
            tvDescription.setVisibility(View.GONE);
        }

        // Thông báo về đánh giá
        if (isOrderDelivered) {
            tvNotificationBanner.setText("Đơn hàng đã giao thành công. Bạn có thể đánh giá sản phẩm!");
            tvNotificationBanner.setBackgroundColor(getResources().getColor(R.color.light_green));
            tvNotificationBanner.setTextColor(getResources().getColor(R.color.dark_green));
            tvNotificationBanner.setVisibility(View.VISIBLE);
        } else {
            tvNotificationBanner.setText("Bạn chỉ có thể đánh giá đơn hàng khi trạng thái là 'Đã giao hàng'");
            tvNotificationBanner.setBackgroundColor(getResources().getColor(R.color.light_yellow));
            tvNotificationBanner.setTextColor(getResources().getColor(R.color.dark_yellow));
            tvNotificationBanner.setVisibility(View.VISIBLE);
        }

        // Danh sách sản phẩm với adapter mới
        if (order.getProducts() != null && !order.getProducts().isEmpty()) {
            productAdapter = new OrderProductAdapter(requireContext(), order.getProducts(), this, isOrderDelivered);
            recyclerViewProducts.setAdapter(productAdapter);
            recyclerViewProducts.setVisibility(View.VISIBLE);
        } else {
            recyclerViewProducts.setVisibility(View.GONE);
            Toast.makeText(requireContext(), "Đơn hàng không có sản phẩm", Toast.LENGTH_SHORT).show();
        }

        // Hiển thị khung chi tiết
        orderDetailCard.setVisibility(View.VISIBLE);
    }

    private void setStatusColor(TextView textView, String status) {
        int color;

        if (status == null) {
            color = getResources().getColor(R.color.gray);
        } else {
            switch (status.toLowerCase()) {
                case "pending":
                    color = getResources().getColor(R.color.orange);
                    break;
                case "approved":
                case "processing":
                case "shipped":
                    color = getResources().getColor(R.color.blue);
                    break;
                case "final":
                case "delivered":
                    color = getResources().getColor(R.color.teal_700);
                    break;
                case "rejected":
                case "cancelled":
                    color = getResources().getColor(R.color.red);
                    break;
                default:
                    color = getResources().getColor(R.color.gray);
                    break;
            }
        }

        textView.setTextColor(color);
    }

    // Xử lý lỗi API
    private void handleApiError(VolleyError error) {
        // Hiển thị thông tin lỗi chi tiết để debug
        String errorMsg = "Không thể tải dữ liệu đơn hàng";

        if (error.networkResponse != null) {
            int statusCode = error.networkResponse.statusCode;
            errorMsg += " (Mã lỗi: " + statusCode + ")";

            // In ra body của response lỗi
            try {
                String responseBody = new String(error.networkResponse.data, "UTF-8");
                Log.e(TAG, "Error response body: " + responseBody);

                // Xử lý lỗi "Invalid Token"
                if (responseBody.contains("Invalid Token") || statusCode == 400 || statusCode == 401) {
                    Log.e(TAG, "Token không hợp lệ, cần đăng nhập lại");
                    Toast.makeText(requireContext(), "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                    navigateToLogin();
                    return;
                }
            } catch (UnsupportedEncodingException e) {
                Log.e(TAG, "Không thể đọc response body", e);
            }

            // Xử lý mã lỗi cụ thể
            if (statusCode == 401 || statusCode == 403) {
                // Token không hợp lệ hoặc hết hạn
                Log.e(TAG, "Lỗi xác thực: Token không hợp lệ hoặc hết hạn");
                Toast.makeText(requireContext(), "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                navigateToLogin();
                return;
            } else if (statusCode == 500) {
                // Lỗi server
                errorMsg = "Lỗi server. Vui lòng thử lại sau.";
            }
        } else {
            // Lỗi không có network response (timeout, no connection...)
            Log.e(TAG, "Không có network response: " + error.toString());
            errorMsg = "Lỗi kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
        }

        Log.e(TAG, errorMsg, error);
        Toast.makeText(requireContext(), errorMsg, Toast.LENGTH_SHORT).show();
    }

    private String getColorName(String colorCode) {
        if (colorCode == null || colorCode.isEmpty()) {
            return "Không xác định";
        }

        switch (colorCode.toLowerCase()) {
            case "#ffffff":
            case "ffffff":
                return "Trắng";
            case "#000000":
            case "000000":
                return "Đen";
            case "#1c78fa":
            case "1c78fa":
                return "Xanh dương";
            case "#5b79a3":
            case "5b79a3":
                return "Xanh navy";
            case "#ff0000":
            case "ff0000":
                return "Đỏ";
            case "#ffa500":
            case "ffa500":
                return "Cam";
            default:
                return colorCode;
        }
    }

    private void showEmptyState() {
        emptyOrdersLayout.setVisibility(View.VISIBLE);
        recyclerViewOrders.setVisibility(View.GONE);
        hideOrderDetail();
    }

    private void showOrdersList() {
        emptyOrdersLayout.setVisibility(View.GONE);
        recyclerViewOrders.setVisibility(View.VISIBLE);
    }

    private void hideOrderDetail() {
        orderDetailCard.setVisibility(View.GONE);
        currentOrderId = null;
    }

    private void navigateToLogin() {
        // Đăng xuất người dùng hiện tại
        UserManager userManager = UserManager.getInstance(requireContext());
        userManager.logout();

        // Chuyển đến màn hình đăng nhập
        Intent intent = new Intent(requireContext(), LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
    }

    @Override
    public void onOrderItemClick(Order order) {
        // Tải và hiển thị chi tiết đơn hàng ngay trong fragment
        loadOrderDetail(order.getId());

        Log.d(TAG, "Đã click vào đơn hàng ID: " + order.getId());
    }

    @Override
    public void onProductClick(OrderItem product) {
        // Xử lý khi click vào sản phẩm (có thể mở trang chi tiết sản phẩm)
        Toast.makeText(requireContext(), "Đã chọn sản phẩm: " + product.getProductName(), Toast.LENGTH_SHORT).show();

        Log.d(TAG, "Đã click vào sản phẩm: " + product.getProductName());
    }

    @Override
    public void onRateProductClick(OrderItem product) {
        Log.d(TAG, "onRateProductClick - product: " + product.getProductName() +
                ", rated: " + product.isRated() +
                ", isOrderDelivered: " + isOrderDelivered);

        if (isOrderDelivered) {
            showRatingDialog(product);
        } else {
            Toast.makeText(requireContext(), "Chỉ có thể đánh giá sản phẩm khi đơn hàng đã giao thành công", Toast.LENGTH_SHORT).show();
        }
    }

    private void showRatingDialog(OrderItem product) {
        Dialog dialog = new Dialog(requireContext());
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_rate_product);
        dialog.setCancelable(true);

        // Thiết lập kích thước dialog
        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }

        // Ánh xạ views
        ImageView ivProduct = dialog.findViewById(R.id.ivProductImage);
        TextView tvProductName = dialog.findViewById(R.id.tvProductName);
        TextView tvProductId = dialog.findViewById(R.id.tvProductId);
        RatingBar ratingBar = dialog.findViewById(R.id.ratingBar);
        EditText etComment = dialog.findViewById(R.id.etComment);
        Button btnCancel = dialog.findViewById(R.id.btnCancel);
        Button btnSubmit = dialog.findViewById(R.id.btnSubmit);

        // Hiển thị thông tin sản phẩm
        tvProductName.setText(product.getDisplayName());
        tvProductId.setText("ID: " + product.getProductId());

        if (product.getProductImage() != null && !product.getProductImage().isEmpty()) {
            Log.d(TAG, "Loading product image in dialog: " + product.getProductImage());

            // Fix lỗi: Tạo biến final/effectively final mới
            final String imageUrlFinal = processImageUrl(product.getProductImage());

            Glide.with(requireContext())
                    .load(imageUrlFinal)
                    .placeholder(R.drawable.placeholder_image)
                    .error(R.drawable.error_image)
                    .listener(new RequestListener<Drawable>() {
                        @Override
                        public boolean onLoadFailed(@Nullable GlideException e, Object model,
                                                    Target<Drawable> target, boolean isFirstResource) {
                            Log.e(TAG, "Lỗi tải hình ảnh trong dialog: " + imageUrlFinal, e);
                            return false;
                        }

                        @Override
                        public boolean onResourceReady(Drawable resource, Object model,
                                                       Target<Drawable> target, DataSource dataSource,
                                                       boolean isFirstResource) {
                            Log.d(TAG, "Đã tải hình ảnh thành công trong dialog: " + imageUrlFinal);
                            return false;
                        }
                    })
                    .into(ivProduct);
        } else {
            ivProduct.setImageResource(R.drawable.placeholder_image);
        }

        // Nếu sản phẩm đã được đánh giá, hiển thị thông tin đánh giá cũ
        if (product.isRated() && product.getRating() != null && product.getRating() > 0) {
            ratingBar.setRating(product.getRating());
            etComment.setText(product.getComment());
        }

        // Xử lý sự kiện
        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnSubmit.setOnClickListener(v -> {
            int rating = Math.round(ratingBar.getRating());
            String comment = etComment.getText().toString().trim();

            if (rating == 0) {
                Toast.makeText(requireContext(), "Vui lòng chọn số sao đánh giá", Toast.LENGTH_SHORT).show();
                return;
            }

            // Hiển thị loading và disable nút
            btnSubmit.setEnabled(false);
            btnSubmit.setText("Đang gửi...");

            submitProductRating(product, rating, comment, dialog);
        });

        dialog.show();
    }

    private String processImageUrl(String originalUrl) {
        if (originalUrl == null || originalUrl.isEmpty()) {
            return "";
        }

        if (!originalUrl.startsWith("http") && !originalUrl.startsWith("/")) {
            return "http://10.0.2.2:3100/" + originalUrl;
        } else if (originalUrl.startsWith("/")) {
            return "http://10.0.2.2:3100" + originalUrl;
        }

        return originalUrl;
    }

    private void submitProductRating(OrderItem product, int rating, String comment, Dialog dialog) {
        UserManager userManager = UserManager.getInstance(requireContext());
        if (!userManager.isLoggedIn() || !userManager.isTokenValid()) {
            Toast.makeText(requireContext(), "Vui lòng đăng nhập để đánh giá sản phẩm", Toast.LENGTH_SHORT).show();
            dialog.dismiss();
            navigateToLogin();
            return;
        }

        if (currentOrderId == null || currentOrderId.isEmpty()) {
            Toast.makeText(requireContext(), "Không thể xác định đơn hàng", Toast.LENGTH_SHORT).show();
            dialog.dismiss();
            return;
        }

        String url = BASE_URL + "/api/order/" + currentOrderId + "/rate";
        final String authToken = userManager.getAuthorizationToken();

        Log.d(TAG, "Gửi đánh giá cho sản phẩm: " + product.getProductName());
        Log.d(TAG, "API URL: " + url);
        Log.d(TAG, "Product ID: " + product.getProductId());
        Log.d(TAG, "Rating: " + rating);
        Log.d(TAG, "Comment: " + comment);

        try {
            JSONObject ratingData = new JSONObject();
            ratingData.put("productId", product.getProductId());
            ratingData.put("rating", rating);
            ratingData.put("comment", comment);

            final String requestBody = ratingData.toString();

            StringRequest request = new StringRequest(
                    Request.Method.POST,
                    url,
                    new Response.Listener<String>() {
                        @Override
                        public void onResponse(String response) {
                            Log.d(TAG, "Đánh giá thành công - response: " + response);
                            dialog.dismiss();

                            // Cập nhật trạng thái đánh giá cho sản phẩm
                            product.setRated(true);
                            product.setRating(rating);
                            product.setComment(comment);

                            // Cập nhật UI
                            if (productAdapter != null) {
                                productAdapter.notifyDataSetChanged();
                            }

                            Toast.makeText(requireContext(),
                                    "Đánh giá sản phẩm thành công!",
                                    Toast.LENGTH_SHORT).show();

                            // Tải lại danh sách đơn hàng để cập nhật trạng thái đánh giá
                            loadOrdersData();
                        }
                    },
                    new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            dialog.dismiss();

                            // Xử lý lỗi
                            String errorMsg = "Không thể gửi đánh giá";
                            if (error.networkResponse != null) {
                                int statusCode = error.networkResponse.statusCode;
                                errorMsg += " (Mã lỗi: " + statusCode + ")";

                                try {
                                    String responseBody = new String(error.networkResponse.data, "UTF-8");
                                    Log.e(TAG, "Error response body: " + responseBody);
                                } catch (UnsupportedEncodingException e) {
                                    Log.e(TAG, "Không thể đọc response body", e);
                                }

                                if (statusCode == 401 || statusCode == 403) {
                                    navigateToLogin();
                                    return;
                                }
                            } else {
                                Log.e(TAG, "Network error: " + error.toString());
                            }

                            Toast.makeText(requireContext(), errorMsg, Toast.LENGTH_SHORT).show();
                        }
                    }) {
                @Override
                public byte[] getBody() throws AuthFailureError {
                    try {
                        return requestBody.getBytes("utf-8");
                    } catch (UnsupportedEncodingException e) {
                        Log.e(TAG, "Error encoding request body: " + e.getMessage());
                        return null;
                    }
                }

                @Override
                public Map<String, String> getHeaders() throws AuthFailureError {
                    Map<String, String> headers = new HashMap<>();
                    headers.put("Content-Type", "application/json");
                    if (authToken != null && !authToken.isEmpty()) {
                        headers.put("Authorization", authToken);
                        Log.d(TAG, "Authorization header set: " + authToken.substring(0, Math.min(10, authToken.length())) + "...");
                    } else {
                        Log.e(TAG, "No authorization token available!");
                    }
                    return headers;
                }

                @Override
                public String getBodyContentType() {
                    return "application/json; charset=utf-8";
                }
            };

            request.setRetryPolicy(new DefaultRetryPolicy(
                    15000,
                    1,
                    DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

            requestQueue.add(request);

        } catch (JSONException e) {
            dialog.dismiss();
            Log.e(TAG, "Lỗi tạo JSON để gửi đánh giá: " + e.getMessage());
            Toast.makeText(requireContext(), "Lỗi khi gửi đánh giá", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        UserManager userManager = UserManager.getInstance(requireContext());
        if (userManager.isLoggedIn()) {
            // Kiểm tra token có hợp lệ không trước khi tải dữ liệu
            if (userManager.isTokenValid()) {
                loadOrdersData();
            } else {
                Log.e(TAG, "Token không hợp lệ khi resume");
                Toast.makeText(requireContext(), "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
                navigateToLogin();
            }
        } else {
            showEmptyState();
        }
    }
}