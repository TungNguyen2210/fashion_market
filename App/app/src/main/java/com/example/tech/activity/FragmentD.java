package com.example.tech.activity;

import android.app.Dialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.bumptech.glide.Glide;
import com.example.apptrangsuc.R;
import com.example.tech.utils.UserManager;
import com.google.gson.Gson;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class FragmentD extends Fragment {

    private static final String TAG = "FragmentD";
    private static final String BASE_URL = "http://10.0.2.2:3100";
    private static final String KEY_EMAIL = "user_email";
    private static final String KEY_PHONE = "user_phone";
    private static final String KEY_AVATAR = "user_avatar";

    private TextView tvUsername, tvEmail, tvPhone;
    private Button btnEditProfile, btnLogout;
    private ImageView ivProfile;
    private SwipeRefreshLayout swipeRefreshLayout;
    private ProgressBar progressBar;
    private UserManager userManager;

    private RequestQueue requestQueue;
    private Gson gson;

    // Thông tin người dùng
    private String userEmail = "";
    private String userPhone = "";
    private String userAvatar = "";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.activity_fragment_d, container, false);
        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // Khởi tạo RequestQueue và Gson
        requestQueue = Volley.newRequestQueue(requireContext());
        gson = new Gson();

        // Khởi tạo UserManager
        userManager = UserManager.getInstance(requireContext());

        // Ánh xạ các view
        tvUsername = view.findViewById(R.id.tv_username);
        tvEmail = view.findViewById(R.id.tv_email);
        tvPhone = view.findViewById(R.id.tv_phone);
        btnEditProfile = view.findViewById(R.id.btn_edit_profile);
        btnLogout = view.findViewById(R.id.btn_logout);
        ivProfile = view.findViewById(R.id.iv_profile);
        progressBar = view.findViewById(R.id.progressBar);
        swipeRefreshLayout = view.findViewById(R.id.swipeRefreshLayout);

        // Thiết lập SwipeRefreshLayout
        if (swipeRefreshLayout != null) {
            swipeRefreshLayout.setOnRefreshListener(this::fetchUserProfile);
            swipeRefreshLayout.setColorSchemeResources(R.color.teal_700, R.color.purple_500);
        }

        // Thiết lập sự kiện click cho nút chỉnh sửa thông tin
        btnEditProfile.setOnClickListener(v -> showEditProfileDialog());

        // Thiết lập sự kiện click cho nút đăng xuất
        btnLogout.setOnClickListener(v -> confirmLogout());

        // Thiết lập sự kiện click cho avatar
        ivProfile.setOnClickListener(v ->
                showToast("Tính năng đổi ảnh đại diện sẽ được cập nhật trong phiên bản tiếp theo")
        );

        // Lấy dữ liệu người dùng từ API
        fetchUserProfile();
    }

    private void fetchUserProfile() {
        if (!swipeRefreshLayout.isRefreshing()) {
            showLoading(true);
        }

        // Lấy token từ UserManager
        String token = userManager.getToken();
        if (token == null || token.isEmpty()) {
            showLoading(false);
            swipeRefreshLayout.setRefreshing(false);
            showToast("Không tìm thấy token xác thực");
            return;
        }

        // Loại bỏ prefix "Bearer " nếu có
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        final String authToken = token;
        String url = BASE_URL + "/api/user/profile";
        Log.d(TAG, "Loading user profile from URL: " + url);

        JsonObjectRequest request = new JsonObjectRequest(
                Request.Method.GET,
                url,
                null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        showLoading(false);
                        swipeRefreshLayout.setRefreshing(false);

                        try {
                            Log.d(TAG, "Received response: " + response.toString());

                            // Xử lý dữ liệu từ response
                            JSONObject userObj = response.getJSONObject("user");

                            String username = userObj.getString("username");
                            userEmail = userObj.getString("email");
                            userPhone = userObj.getString("phone");
                            userAvatar = userObj.getString("image");

                            // Lưu thông tin vào SharedPreferences
                            saveUserInfo(username, userEmail, userPhone, userAvatar);

                            // Cập nhật UI
                            updateUserInfo();

                        } catch (JSONException e) {
                            Log.e(TAG, "Error parsing JSON: " + e.getMessage(), e);
                            showToast("Lỗi khi xử lý dữ liệu: " + e.getMessage());

                            // Nếu có lỗi, thử load dữ liệu từ local
                            loadUserInfoFromLocal();
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        showLoading(false);
                        swipeRefreshLayout.setRefreshing(false);

                        String errorMsg = "Không thể tải thông tin người dùng";

                        if (error.networkResponse != null) {
                            errorMsg += " (Mã lỗi: " + error.networkResponse.statusCode + ")";

                            if (error.networkResponse.data != null) {
                                try {
                                    String responseBody = new String(error.networkResponse.data, "utf-8");
                                    Log.e(TAG, "Error response body: " + responseBody);
                                } catch (Exception e) {
                                    Log.e(TAG, "Cannot parse error response", e);
                                }
                            }
                        }

                        Log.e(TAG, errorMsg, error);
                        showToast(errorMsg);

                        // Nếu API không hoạt động, thử lấy dữ liệu từ local
                        loadUserInfoFromLocal();
                    }
                }
        ) {
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

        request.setRetryPolicy(new DefaultRetryPolicy(
                30000,  // 30 giây timeout
                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        requestQueue.add(request);
    }

    private void saveUserInfo(String username, String email, String phone, String avatar) {
        // Lưu thông tin vào UserManager
        userManager.saveUserSession(userManager.getUserId(), userManager.getToken(), username);

        // Lưu thông tin vào SharedPreferences
        Context context = requireContext();
        context.getSharedPreferences("UserInfo", Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_EMAIL, email)
                .putString(KEY_PHONE, phone)
                .putString(KEY_AVATAR, avatar)
                .apply();

        Log.d(TAG, "Saved user info - Username: " + username + ", Email: " + email +
                ", Phone: " + phone + ", Avatar: " + avatar);
    }

    private void loadUserInfoFromLocal() {
        Context context = requireContext();
        SharedPreferences prefs = context.getSharedPreferences("UserInfo", Context.MODE_PRIVATE);

        userEmail = prefs.getString(KEY_EMAIL, "");
        userPhone = prefs.getString(KEY_PHONE, "");
        userAvatar = prefs.getString(KEY_AVATAR, "");

        Log.d(TAG, "Loaded user info from local - Email: " + userEmail +
                ", Phone: " + userPhone + ", Avatar: " + userAvatar);

        updateUserInfo();
    }

    private void updateUserInfo() {
        // Hiển thị username từ UserManager
        String username = userManager.getUsername();
        if (username != null && !username.isEmpty()) {
            tvUsername.setText(username);
        } else {
            tvUsername.setText("Người dùng");
        }

        // Hiển thị email
        if (userEmail != null && !userEmail.isEmpty()) {
            tvEmail.setText(userEmail);
        } else {
            tvEmail.setText("Chưa cập nhật email");
        }

        // Hiển thị số điện thoại
        if (userPhone != null && !userPhone.isEmpty()) {
            tvPhone.setText(userPhone);
        } else {
            tvPhone.setText("Chưa cập nhật số điện thoại");
        }

        // Hiển thị avatar
        if (userAvatar != null && !userAvatar.isEmpty() && getContext() != null) {
            Glide.with(requireContext())
                    .load(userAvatar)
                    .placeholder(R.drawable.ic_person)
                    .error(R.drawable.ic_person)
                    .circleCrop()
                    .into(ivProfile);
        }

        Log.d(TAG, "Updated UI with user info");
    }

    private void showEditProfileDialog() {
        final Dialog dialog = new Dialog(requireContext());
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_edit_profile);
        dialog.setCancelable(true);

        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        }

        final EditText edtUsername = dialog.findViewById(R.id.edt_username);
        final TextView tvEmailDialog = dialog.findViewById(R.id.tv_email_dialog);
        final EditText edtPhone = dialog.findViewById(R.id.edt_phone);
        Button btnCancel = dialog.findViewById(R.id.btn_cancel);
        Button btnOk = dialog.findViewById(R.id.btn_ok);

        edtUsername.setText(userManager.getUsername());
        tvEmailDialog.setText(userEmail.isEmpty() ? "Chưa cập nhật" : userEmail);
        edtPhone.setText(userPhone);

        btnCancel.setOnClickListener(v -> dialog.dismiss());

        btnOk.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String username = edtUsername.getText().toString().trim();
                String phone = edtPhone.getText().toString().trim();

                if (username.isEmpty()) {
                    showToast("Vui lòng nhập tên người dùng");
                    return;
                }

                showLoading(true);

                // Gọi hàm cập nhật thông tin người dùng
                updateUserProfile(username, phone, dialog);
            }
        });

        dialog.show();
    }

    private void updateUserProfile(String username, String phone, Dialog dialog) {
        // Lấy token từ UserManager
        String token = userManager.getToken();
        if (token == null || token.isEmpty()) {
            showLoading(false);
            showToast("Không tìm thấy token xác thực");
            return;
        }

        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        final String authToken = token;

        try {
            JSONObject params = new JSONObject();
            params.put("username", username);
            params.put("phone", phone);

            String url = BASE_URL + "/api/user/update-profile";

            JsonObjectRequest request = new JsonObjectRequest(
                    Request.Method.PUT,
                    url,
                    params,
                    new Response.Listener<JSONObject>() {
                        @Override
                        public void onResponse(JSONObject response) {
                            showLoading(false);
                            dialog.dismiss();

                            try {
                                // Xử lý phản hồi từ server
                                Log.d(TAG, "Update profile response: " + response.toString());

                                // Giả sử API trả về thông tin người dùng đã cập nhật
                                if (response.has("user")) {
                                    JSONObject userObj = response.getJSONObject("user");
                                    String updatedUsername = userObj.getString("username");
                                    String updatedPhone = userObj.getString("phone");

                                    // Cập nhật thông tin trong local
                                    userManager.saveUserSession(
                                            userManager.getUserId(),
                                            userManager.getToken(),
                                            updatedUsername
                                    );

                                    userPhone = updatedPhone;
                                    saveUserInfo(updatedUsername, userEmail, updatedPhone, userAvatar);
                                    updateUserInfo();

                                    showToast("Cập nhật thông tin thành công");
                                } else {
                                    // Fallback nếu API không trả về thông tin user
                                    userManager.saveUserSession(
                                            userManager.getUserId(),
                                            userManager.getToken(),
                                            username
                                    );

                                    userPhone = phone;
                                    saveUserInfo(username, userEmail, phone, userAvatar);
                                    updateUserInfo();

                                    showToast("Cập nhật thông tin thành công");
                                }
                            } catch (JSONException e) {
                                Log.e(TAG, "Error parsing update response: " + e.getMessage());

                                // Fallback nếu có lỗi parse
                                userManager.saveUserSession(
                                        userManager.getUserId(),
                                        userManager.getToken(),
                                        username
                                );

                                userPhone = phone;
                                saveUserInfo(username, userEmail, phone, userAvatar);
                                updateUserInfo();

                                showToast("Đã cập nhật thông tin");
                            }
                        }
                    },
                    new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            showLoading(false);
                            dialog.dismiss();

                            String errorMsg = "Không thể cập nhật thông tin";
                            if (error.networkResponse != null) {
                                errorMsg += " (Mã lỗi: " + error.networkResponse.statusCode + ")";

                                if (error.networkResponse.data != null) {
                                    try {
                                        String responseBody = new String(error.networkResponse.data, "utf-8");
                                        Log.e(TAG, "Error response body: " + responseBody);
                                    } catch (Exception e) {
                                        Log.e(TAG, "Cannot parse error response", e);
                                    }
                                }
                            }

                            Log.e(TAG, errorMsg, error);
                            showToast(errorMsg);

                            // Fallback: Vẫn cập nhật thông tin local để UX tốt hơn
                            userManager.saveUserSession(
                                    userManager.getUserId(),
                                    userManager.getToken(),
                                    username
                            );

                            userPhone = phone;
                            saveUserInfo(username, userEmail, phone, userAvatar);
                            updateUserInfo();
                        }
                    }
            ) {
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

            request.setRetryPolicy(new DefaultRetryPolicy(
                    30000,
                    DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                    DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

            requestQueue.add(request);

        } catch (JSONException e) {
            showLoading(false);
            showToast("Lỗi khi tạo yêu cầu: " + e.getMessage());
            Log.e(TAG, "JSON error: " + e.getMessage());
            dialog.dismiss();

            // Fallback
            userManager.saveUserSession(
                    userManager.getUserId(),
                    userManager.getToken(),
                    username
            );

            userPhone = phone;
            saveUserInfo(username, userEmail, phone, userAvatar);
            updateUserInfo();
        }
    }

    private void confirmLogout() {
        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(requireContext());
        builder.setTitle("Xác nhận đăng xuất");
        builder.setMessage("Bạn có chắc chắn muốn đăng xuất?");
        builder.setPositiveButton("Đăng xuất", (dialog, which) -> logout());
        builder.setNegativeButton("Hủy", null);
        builder.show();
    }

    private void logout() {
        showLoading(true);

        new android.os.Handler().postDelayed(() -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).logout();
            } else {
                userManager.logout();
                showToast("Đã đăng xuất thành công");
                requireActivity().finishAffinity();
            }

            showLoading(false);
        }, 1000);
    }

    private void showLoading(boolean isLoading) {
        if (progressBar != null) {
            progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        }
    }

    private void showToast(String message) {
        Toast.makeText(requireContext(), message, Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onResume() {
        super.onResume();
        // Chỉ cập nhật UI từ dữ liệu đã lưu
        updateUserInfo();
    }
}