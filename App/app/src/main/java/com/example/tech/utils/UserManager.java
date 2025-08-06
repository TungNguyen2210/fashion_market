package com.example.tech.utils;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;
import android.util.Log;

import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.util.HashMap;
import java.util.Map;

public class UserManager {
    private static final String TAG = "UserManager";
    private static final String PREF_NAME = "UserSession";
    private static final String KEY_USER_ID = "userId";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_USERNAME = "username";

    private static UserManager instance;
    private final SharedPreferences preferences;
    private final Context context;

    private UserManager(Context context) {
        this.context = context.getApplicationContext();
        preferences = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public static synchronized UserManager getInstance(Context context) {
        if (instance == null) {
            instance = new UserManager(context.getApplicationContext());
        }
        return instance;
    }

    /**
     * Lưu phiên đăng nhập của người dùng
     */
    public void saveUserSession(String userId, String token, String username) {
        Log.d(TAG, "Saving user session: " + username);

        // Hiển thị phần đầu và cuối của token (để bảo mật)
        String logToken = "null";
        if (token != null) {
            if (token.length() > 20) {
                logToken = token.substring(0, 10) + "..." + token.substring(token.length() - 5);
            } else {
                logToken = token;
            }
        }
        Log.d(TAG, "Token: " + logToken);

        SharedPreferences.Editor editor = preferences.edit();
        editor.putString(KEY_USER_ID, userId);
        editor.putString(KEY_TOKEN, token);
        editor.putString(KEY_USERNAME, username);
        editor.apply();
    }

    /**
     * Kiểm tra xem người dùng đã đăng nhập chưa
     */
    public boolean isLoggedIn() {
        return preferences.getString(KEY_TOKEN, null) != null;
    }

    /**
     * Lấy ID người dùng
     */
    public String getUserId() {
        return preferences.getString(KEY_USER_ID, null);
    }

    /**
     * Lấy token người dùng (raw token như được lưu trong SharedPreferences)
     */
    public String getToken() {
        return preferences.getString(KEY_TOKEN, null);
    }

    /**
     * Lấy token đã được định dạng sẵn sàng cho Authorization header
     * Dựa trên phân tích từ web app hoạt động, không thêm prefix "Bearer "
     */
    public String getAuthorizationToken() {
        String token = getToken();
        if (token == null || token.isEmpty()) {
            return null;
        }

        // Quan trọng: Từ việc phân tích request thành công trên web,
        // chúng ta biết rằng token KHÔNG nên có prefix "Bearer "
        if (token.startsWith("Bearer ")) {
            // Nếu token đã có prefix "Bearer ", loại bỏ nó
            return token.substring(7);
        }

        return token;
    }

    /**
     * Cung cấp headers cần thiết cho API request, bao gồm Authorization
     */
    public Map<String, String> getAuthorizationHeaders() {
        Map<String, String> headers = new HashMap<>();
        String token = getAuthorizationToken();

        if (token != null && !token.isEmpty()) {
            // Không thêm "Bearer " prefix vì web app không sử dụng nó
            headers.put("Authorization", token);

            // Log phần đầu token để debug
            if (token.length() > 10) {
                Log.d(TAG, "Adding Authorization header with token: " +
                        token.substring(0, 10) + "...");
            } else {
                Log.d(TAG, "Adding Authorization header with token: " + token);
            }
        } else {
            Log.w(TAG, "No token available for Authorization header");
        }

        return headers;
    }

    /**
     * Lấy tên người dùng
     */
    public String getUsername() {
        return preferences.getString(KEY_USERNAME, null);
    }

    /**
     * Đăng xuất người dùng
     */
    public void logout() {
        Log.d(TAG, "Đăng xuất người dùng");
        SharedPreferences.Editor editor = preferences.edit();
        editor.clear();
        editor.apply();
    }

    /**
     * Kiểm tra tính hợp lệ của token
     */
    public boolean isTokenValid() {
        String token = getToken();
        return JWTUtils.isTokenValid(token);
    }

    /**
     * Kiểm tra và in thông tin chi tiết về token
     */
    public void logTokenInfo() {
        String token = getToken();
        JWTUtils.logTokenInfo(token);
    }

    /**
     * Lấy thời gian còn lại (tính bằng giây) trước khi token hết hạn
     * Trả về -1 nếu không thể xác định hoặc token đã hết hạn
     */
    public long getTokenRemainingTime() {
        String token = getToken();
        if (token == null || token.isEmpty()) {
            return -1;
        }

        try {
            // Loại bỏ "Bearer " nếu có
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return -1;
            }

            // Đảm bảo padding đúng cho Base64
            String paddedBase64 = parts[1];
            switch (parts[1].length() % 4) {
                case 0:
                    break;
                case 2:
                    paddedBase64 += "==";
                    break;
                case 3:
                    paddedBase64 += "=";
                    break;
                default:
                    throw new IllegalArgumentException("Base64 không hợp lệ");
            }

            byte[] decodedBytes = Base64.decode(paddedBase64, Base64.URL_SAFE);
            String payloadJson = new String(decodedBytes, "UTF-8");
            JSONObject payload = new JSONObject(payloadJson);

            if (payload.has("exp")) {
                long expTime = payload.getLong("exp");
                long currentTime = System.currentTimeMillis() / 1000;
                long timeLeft = expTime - currentTime;

                return timeLeft > 0 ? timeLeft : -1;
            }

            return -1;
        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi tính thời gian còn lại của token: " + e.getMessage());
            return -1;
        }
    }

    /**
     * Kiểm tra và xử lý token trong các API request
     * @return true nếu token hợp lệ và có thể sử dụng, false nếu cần đăng nhập lại
     */
    public boolean validateTokenForApiRequest() {
        if (!isLoggedIn()) {
            Log.d(TAG, "Người dùng chưa đăng nhập");
            return false;
        }

        if (!isTokenValid()) {
            Log.d(TAG, "Token không hợp lệ hoặc đã hết hạn");
            logout();
            return false;
        }

        return true;
    }

    /**
     * Ghi log chi tiết về token hiện tại để debug
     * Hiển thị format, độ dài, và các thành phần của token
     */
    public void debugCurrentToken() {
        String token = getToken();
        if (token == null || token.isEmpty()) {
            Log.d(TAG, "Token hiện tại: NULL hoặc rỗng");
            return;
        }

        Log.d(TAG, "=========== DEBUG TOKEN INFO ===========");
        Log.d(TAG, "Token length: " + token.length());

        if (token.startsWith("Bearer ")) {
            Log.d(TAG, "Token format: CÓ prefix 'Bearer '");
            Log.d(TAG, "Token without Bearer: " + token.substring(7));
        } else {
            Log.d(TAG, "Token format: KHÔNG có prefix 'Bearer '");
        }

        // Phân tích thành phần JWT
        String[] parts = token.split("\\.");
        Log.d(TAG, "Token parts: " + parts.length);

        if (parts.length == 3) {
            Log.d(TAG, "Token có định dạng JWT hợp lệ (header.payload.signature)");

            try {
                // Decode và hiển thị header
                String header = decodeBase64UrlSafe(parts[0]);
                Log.d(TAG, "JWT Header: " + header);

                // Decode và hiển thị payload
                String payload = decodeBase64UrlSafe(parts[1]);
                Log.d(TAG, "JWT Payload: " + payload);

                // Hiển thị một phần signature
                Log.d(TAG, "JWT Signature (encoded): " + parts[2].substring(0, Math.min(10, parts[2].length())) + "...");
            } catch (Exception e) {
                Log.e(TAG, "Error decoding JWT parts", e);
            }
        }

        // Kiểm tra token khi thêm/loại bỏ Bearer
        Log.d(TAG, "getAuthorizationToken() returns: " + getAuthorizationToken());
        Log.d(TAG, "=========== END DEBUG INFO ===========");
    }

    /**
     * Utility method để decode Base64URL
     */
    private String decodeBase64UrlSafe(String input) throws UnsupportedEncodingException {
        String base64 = input;
        // Thêm padding nếu cần
        switch (base64.length() % 4) {
            case 0:
                break;
            case 2:
                base64 += "==";
                break;
            case 3:
                base64 += "=";
                break;
            default:
                throw new IllegalArgumentException("Base64 string length not valid");
        }

        byte[] decodedBytes = Base64.decode(base64, Base64.URL_SAFE);
        return new String(decodedBytes, "UTF-8");
    }
}