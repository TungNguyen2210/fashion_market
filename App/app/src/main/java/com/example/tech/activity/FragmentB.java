package com.example.tech.activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.tech.R;
import com.example.tech.adapter.OrderAdapter;
import com.example.tech.model.Order;
import com.example.tech.model.OrderItem;
import com.example.tech.utils.JWTUtils;
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

public class FragmentB extends Fragment implements OrderAdapter.OnOrderItemClickListener {

    private static final String TAG = "FragmentB";
    private static final String BASE_URL = "http://10.0.2.2:3100";

    private RecyclerView recyclerViewOrders;
    private SwipeRefreshLayout swipeRefreshLayout;
    private LinearLayout emptyOrdersLayout;
    private ProgressBar progressBar;
    private Button btnStartShopping;

    private List<Order> orderList;
    private OrderAdapter orderAdapter;
    private RequestQueue requestQueue;

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

        // Ánh xạ các view
        recyclerViewOrders = view.findViewById(R.id.recyclerViewOrders);
        swipeRefreshLayout = view.findViewById(R.id.swipeRefreshOrders);
        emptyOrdersLayout = view.findViewById(R.id.emptyOrdersLayout);
        progressBar = view.findViewById(R.id.progressBar);
        btnStartShopping = view.findViewById(R.id.btnStartShopping);

        // Thiết lập RecyclerView
        orderList = new ArrayList<>();
        orderAdapter = new OrderAdapter(requireContext(), orderList, this);
        recyclerViewOrders.setLayoutManager(new LinearLayoutManager(requireContext()));
        recyclerViewOrders.setAdapter(orderAdapter);

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

        // URL API
        String url = BASE_URL + "/api/order/user";
        Log.d(TAG, "Loading orders from URL: " + url);

        // Lấy token đúng định dạng từ UserManager
        final String authToken = userManager.getAuthorizationToken(); // Sử dụng phương thức mới từ UserManager

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
            } else if (productValue instanceof String) {
                // Nếu product chỉ là ID string
                item.setProductId(productValue.toString());
                item.setProductName("Sản phẩm #" + productValue.toString());
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

        // Số lượng
        if (productObj.has("quantity")) {
            item.setQuantity(productObj.getInt("quantity"));
        }

        // Giá
        if (productObj.has("price")) {
            item.setPrice(productObj.getInt("price"));
        }

        return item;
    }

    private void showEmptyState() {
        emptyOrdersLayout.setVisibility(View.VISIBLE);
        recyclerViewOrders.setVisibility(View.GONE);
    }

    private void showOrdersList() {
        emptyOrdersLayout.setVisibility(View.GONE);
        recyclerViewOrders.setVisibility(View.VISIBLE);
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
        // Không làm gì cả vì giờ đã hiển thị đầy đủ thông tin trong list
        Log.d(TAG, "Clicked on order: " + order.getId());
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