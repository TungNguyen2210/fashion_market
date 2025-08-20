package com.example.tech.activity;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.apptrangsuc.R;
import com.example.tech.SERVER;
import com.example.tech.utils.JWTUtils;
import com.example.tech.utils.UserManager;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Map;

public class LoginActivity extends AppCompatActivity {

    private static final String TAG = "LoginActivity";
    Button btnL_Dangnhap, btnL_Dangky, btnL_Thoat;

    private EditText edtL_Email, edtL_Pass;
    private String email, password;
    private String URL = SERVER.login;
    private TextView forgotPasswordTextView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);
        Anhxa();

        btnL_Thoat.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                xulythoat();
            }
        });

        btnL_Dangky.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(LoginActivity.this, SignUpActivity.class);
                startActivity(intent);
            }
        });

        forgotPasswordTextView = findViewById(R.id.tvQuenmatkhau);
        forgotPasswordTextView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Chuyển đến trang ForgotPasswordActivity
                Intent intent = new Intent(LoginActivity.this, ForgotPasswordActivity.class);
                startActivity(intent);
            }
        });

        btnL_Dangnhap.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                email = edtL_Email.getText().toString().trim();
                password = edtL_Pass.getText().toString().trim();
                if (!email.equals("") && !password.equals("")) {
                    // Hiển thị thông báo đang xử lý nếu cần
                    // showProgressDialog();

                    StringRequest stringRequest = new StringRequest(Request.Method.POST, URL, new Response.Listener<String>() {
                        @Override
                        public void onResponse(String response) {
                            // Log toàn bộ phản hồi để debug
                            Log.d(TAG, "Raw server response: " + response);

                            try {
                                // Thử phân tích response như một JSON object
                                JSONObject jsonResponse = new JSONObject(response);

                                // Kiểm tra xem phản hồi có chứa token không
                                if (jsonResponse.has("token")) {
                                    // Lấy JWT token từ phản hồi
                                    String token = jsonResponse.getString("token");

                                    // Kiểm tra và in thông tin token để debug
                                    JWTUtils.logTokenInfo(token);

                                    // Kiểm tra token hợp lệ
                                    if (JWTUtils.isTokenValid(token)) {
                                        // Lấy thông tin người dùng nếu có
                                        String username = "";
                                        String userId = "";

                                        if (jsonResponse.has("user")) {
                                            JSONObject userObject = jsonResponse.getJSONObject("user");
                                            username = userObject.optString("name", email);
                                            userId = userObject.optString("_id", email);

                                            // Log thông tin user để debug
                                            Log.d(TAG, "User info from server - id: " + userId + ", name: " + username);
                                        } else {
                                            // Nếu không có trường "user" trong phản hồi, thử lấy từ token
                                            JSONObject userInfo = JWTUtils.getUserInfoFromToken(token);
                                            if (userInfo != null) {
                                                userId = userInfo.optString("_id", email);
                                                username = userInfo.optString("username", email);
                                                Log.d(TAG, "User info from token - id: " + userId + ", name: " + username);
                                            } else {
                                                // Nếu không có thông tin từ token, sử dụng email
                                                username = email;
                                                userId = email;
                                                Log.d(TAG, "No user info available, using email as default");
                                            }
                                        }

                                        // Xóa giỏ hàng cũ
                                        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
                                        SharedPreferences.Editor editor = preferences.edit();
                                        editor.clear();
                                        editor.apply();

                                        // Lưu username vào SharedPreferences
                                        SharedPreferences preferences2 = getSharedPreferences("username", Context.MODE_PRIVATE);
                                        SharedPreferences.Editor editor2 = preferences2.edit();
                                        editor2.putString("username", username);
                                        editor2.apply();

                                        // Lưu thông tin đăng nhập với JWT token thật
                                        UserManager userManager = UserManager.getInstance(LoginActivity.this);
                                        userManager.saveUserSession(userId, token, username);

                                        // Log thông tin để kiểm tra
                                        Log.d(TAG, "JWT Token saved (partial): " +
                                                token.substring(0, Math.min(15, token.length())) + "...");
                                        Log.d(TAG, "isLoggedIn: " + userManager.isLoggedIn());
                                        Log.d(TAG, "userId: " + userManager.getUserId());
                                        Log.d(TAG, "username: " + userManager.getUsername());
                                        Log.d(TAG, "Token validity: " + userManager.isTokenValid());

                                        // Hiển thị thời gian còn lại của token
                                        long remainingTime = userManager.getTokenRemainingTime();
                                        if (remainingTime > 0) {
                                            Log.d(TAG, "Token còn hiệu lực trong: " +
                                                    (remainingTime / 3600) + " giờ " +
                                                    ((remainingTime % 3600) / 60) + " phút");
                                        }

                                        Toast.makeText(LoginActivity.this, "Đăng nhập thành công", Toast.LENGTH_SHORT).show();
                                        Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                                        startActivity(intent);
                                        finish();
                                    } else {
                                        // Token không hợp lệ
                                        Log.e(TAG, "Server trả về token không hợp lệ hoặc đã hết hạn");
                                        Toast.makeText(LoginActivity.this, "Lỗi xác thực, vui lòng thử lại", Toast.LENGTH_SHORT).show();
                                    }
                                } else if (jsonResponse.has("error")) {
                                    // Xử lý thông báo lỗi từ server
                                    String errorMessage = jsonResponse.getString("error");
                                    Toast.makeText(LoginActivity.this, "Lỗi: " + errorMessage, Toast.LENGTH_LONG).show();
                                } else {
                                    // Nếu không có token và không có thông báo lỗi rõ ràng
                                    handleNonStandardResponse(response);
                                }
                            } catch (JSONException e) {
                                // Không thể phân tích JSON, có thể là phản hồi dạng text
                                Log.d(TAG, "Response is not valid JSON. Trying alternative parsing.");
                                handleNonStandardResponse(response);
                            }
                        }

                        // Hàm xử lý khi phản hồi không phải JSON tiêu chuẩn
                        private void handleNonStandardResponse(String response) {
                            // Xóa dấu ngoặc kép nếu có
                            String cleanResponse = response.replaceAll("\"", "");

                            if (!cleanResponse.isEmpty() && !cleanResponse.equals("failure")) {
                                // Xóa giỏ hàng cũ
                                SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
                                SharedPreferences.Editor editor = preferences.edit();
                                editor.clear();
                                editor.apply();

                                // Giả sử phản hồi chứa tên người dùng
                                String username = cleanResponse;

                                // Lưu username vào SharedPreferences
                                SharedPreferences preferences2 = getSharedPreferences("username", Context.MODE_PRIVATE);
                                SharedPreferences.Editor editor2 = preferences2.edit();
                                editor2.putString("username", username);
                                editor2.apply();

                                // Tạo một token JWT tạm thời cho API cũ không hỗ trợ JWT
                                String tempToken = createTempJwtToken(email, username);
                                Log.w(TAG, "Server không trả về token JWT. Sử dụng token tạm thời.");

                                // Lưu phiên với token tạm
                                UserManager userManager = UserManager.getInstance(LoginActivity.this);
                                userManager.saveUserSession(email, tempToken, username);

                                // Kiểm tra và log thông tin token tạm
                                JWTUtils.logTokenInfo(tempToken);

                                Toast.makeText(LoginActivity.this, "Đăng nhập thành công", Toast.LENGTH_SHORT).show();
                                Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                                startActivity(intent);
                                finish();
                            } else if (cleanResponse.equals("failure")) {
                                Toast.makeText(LoginActivity.this, "Email hoặc mật khẩu không đúng", Toast.LENGTH_LONG).show();
                            } else {
                                Toast.makeText(LoginActivity.this, "Lỗi không xác định từ server", Toast.LENGTH_LONG).show();
                            }
                        }
                    }, new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            // Xử lý lỗi kết nối hoặc lỗi server
                            String errorMessage = "Lỗi kết nối đến server";

                            if (error.networkResponse != null) {
                                int statusCode = error.networkResponse.statusCode;
                                errorMessage += " (Mã lỗi: " + statusCode + ")";

                                try {
                                    String responseBody = new String(error.networkResponse.data, "UTF-8");
                                    Log.e(TAG, "Error response: " + responseBody);

                                    // Thử phân tích thông báo lỗi JSON
                                    try {
                                        JSONObject errorJson = new JSONObject(responseBody);
                                        if (errorJson.has("message")) {
                                            errorMessage = errorJson.getString("message");
                                        } else if (errorJson.has("error")) {
                                            errorMessage = errorJson.getString("error");
                                        }
                                    } catch (JSONException e) {
                                        // Nếu không phải JSON, hiển thị nguyên văn lỗi
                                        if (responseBody.length() < 100) {
                                            errorMessage = responseBody;
                                        }
                                    }
                                } catch (UnsupportedEncodingException e) {
                                    Log.e(TAG, "Cannot decode error response", e);
                                }
                            } else {
                                errorMessage = "Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.";
                                Log.e(TAG, "No network response: " + error.toString());
                            }

                            Toast.makeText(LoginActivity.this, errorMessage, Toast.LENGTH_LONG).show();
                        }
                    }) {
                        @Nullable
                        @Override
                        protected Map<String, String> getParams() throws AuthFailureError {
                            Map<String, String> data = new HashMap<>();
                            data.put("email", email);
                            data.put("password", password);
                            return data;
                        }

                        @Override
                        public Map<String, String> getHeaders() throws AuthFailureError {
                            Map<String, String> headers = new HashMap<>();
                            headers.put("Content-Type", "application/x-www-form-urlencoded");
                            return headers;
                        }
                    };

                    // Tăng timeout để tránh lỗi khi mạng chậm
                    stringRequest.setRetryPolicy(new DefaultRetryPolicy(
                            30000, // 30 giây timeout
                            DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                            DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

                    // Thêm request vào queue
                    RequestQueue requestQueue = Volley.newRequestQueue(getApplicationContext());
                    requestQueue.add(stringRequest);
                } else {
                    Toast.makeText(LoginActivity.this, "Vui lòng nhập đầy đủ email và mật khẩu", Toast.LENGTH_LONG).show();
                }
            }
        });

        // Kiểm tra nếu người dùng đã đăng nhập, chuyển thẳng đến MainActivity
        UserManager userManager = UserManager.getInstance(this);
        if (userManager.isLoggedIn()) {
            // Kiểm tra token có hợp lệ không
            if (userManager.isTokenValid()) {
                // Log thông tin để kiểm tra
                Log.d(TAG, "User đã đăng nhập với token hợp lệ");
                Log.d(TAG, "userId: " + userManager.getUserId());
                Log.d(TAG, "username: " + userManager.getUsername());

                // Hiển thị thời gian còn lại của token
                long remainingTime = userManager.getTokenRemainingTime();
                if (remainingTime > 0) {
                    Log.d(TAG, "Token còn hiệu lực trong: " +
                            (remainingTime / 3600) + " giờ " +
                            ((remainingTime % 3600) / 60) + " phút");
                }

                Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                startActivity(intent);
                finish();
            } else {
                // Token không hợp lệ, đăng xuất người dùng
                Log.e(TAG, "Token đã hết hạn hoặc không hợp lệ. Đăng xuất người dùng.");
                userManager.logout();
                Toast.makeText(this, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", Toast.LENGTH_SHORT).show();
            }
        }
    }

    /**
     * Tạo token JWT tạm thời cho các API cũ không hỗ trợ JWT
     * Lưu ý: Đây không phải là cách an toàn để tạo JWT trong môi trường production
     * Chỉ sử dụng cho mục đích tương thích với API cũ
     */
    private String createTempJwtToken(String email, String username) {
        try {
            // Tạo header
            JSONObject header = new JSONObject();
            header.put("alg", "HS256");
            header.put("typ", "JWT");
            String headerBase64 = android.util.Base64.encodeToString(
                    header.toString().getBytes("UTF-8"),
                    android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP
            );

            // Tạo payload
            JSONObject payload = new JSONObject();
            JSONObject user = new JSONObject();
            user.put("_id", email.hashCode());
            user.put("email", email);
            user.put("username", username);
            user.put("role", "isClient");
            payload.put("user", user);

            // Thêm thời gian hết hạn (24 giờ)
            long issuedAt = System.currentTimeMillis() / 1000;
            payload.put("iat", issuedAt);
            payload.put("exp", issuedAt + 86400); // Hết hạn sau 24h

            String payloadBase64 = android.util.Base64.encodeToString(
                    payload.toString().getBytes("UTF-8"),
                    android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP
            );

            // Tạo signature giả (không an toàn)
            // Trong thực tế, phần này sẽ được ký bằng secret key
            String signature = android.util.Base64.encodeToString(
                    ("tempSignature" + System.currentTimeMillis()).getBytes("UTF-8"),
                    android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP
            );

            // Tạo JWT token
            return headerBase64 + "." + payloadBase64 + "." + signature;

        } catch (Exception e) {
            Log.e(TAG, "Error creating temp JWT token", e);
            return "Bearer_" + email.hashCode() + "_" + System.currentTimeMillis();
        }
    }

    private void xulythoat() {
        AlertDialog.Builder exit = new AlertDialog.Builder(LoginActivity.this);
        exit.setTitle("Thoát");
        exit.setIcon(android.R.drawable.ic_dialog_info);
        exit.setMessage("Bạn có muốn thoát ứng dụng không?");
        exit.setPositiveButton("Có", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                finish();
            }
        });
        exit.setNegativeButton("Không", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                dialogInterface.dismiss();
            }
        });
        exit.setCancelable(false);
        exit.create().show();
    }

    private void Anhxa() {
        email = password = "";
        edtL_Email = findViewById(R.id.edtL_Email);
        edtL_Pass = findViewById(R.id.edtL_Pass);
        btnL_Dangnhap = findViewById(R.id.btnL_Dangnhap);
        btnL_Thoat = findViewById(R.id.btnL_Thoat);
        btnL_Dangky = findViewById(R.id.btnL_Dangky);
    }

    /**
     * Kiểm tra xem chuỗi có đúng định dạng JWT không
     */
    private boolean isValidJwtToken(String token) {
        // JWT có 3 phần, phân cách bởi dấu chấm
        String[] parts = token.split("\\.");
        return parts.length == 3;
    }

    /**
     * Giải mã phần payload của JWT token
     */
    private String decodeJwtPayload(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;

            String payloadBase64 = parts[1];
            // Thêm padding nếu cần
            while (payloadBase64.length() % 4 != 0) {
                payloadBase64 += "=";
            }

            byte[] decodedBytes = android.util.Base64.decode(
                    payloadBase64,
                    android.util.Base64.URL_SAFE
            );

            String decodedPayload = new String(decodedBytes, "UTF-8");
            Log.d(TAG, "JWT payload: " + decodedPayload);
            return decodedPayload;
        } catch (Exception e) {
            Log.e(TAG, "Error decoding JWT payload", e);
            return null;
        }
    }
}