package com.example.tech.utils;

import android.util.Base64;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class JWTUtils {
    private static final String TAG = "JWTUtils";

    /**
     * Phân tích và hiển thị thông tin từ JWT token
     */
    public static void logTokenInfo(String token) {
        if (token == null || token.isEmpty()) {
            Log.e(TAG, "Token rỗng hoặc null");
            return;
        }

        try {
            // Loại bỏ "Bearer " nếu có
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            // Tách các phần của JWT
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                Log.e(TAG, "Token không đúng định dạng JWT, cần có 3 phần được ngăn cách bởi dấu chấm");
                return;
            }

            // Giải mã Header
            String headerJson = decodeBase64(parts[0]);
            JSONObject header = new JSONObject(headerJson);
            Log.d(TAG, "=== HEADER ===");
            Log.d(TAG, "Algorithm: " + header.optString("alg"));
            Log.d(TAG, "Type: " + header.optString("typ"));

            // Giải mã Payload
            String payloadJson = decodeBase64(parts[1]);
            JSONObject payload = new JSONObject(payloadJson);
            Log.d(TAG, "=== PAYLOAD ===");
            Log.d(TAG, "Payload: " + payloadJson);

            // Kiểm tra thời gian trong payload
            if (payload.has("exp")) {
                long expTime = payload.getLong("exp");
                long currentTime = System.currentTimeMillis() / 1000;
                long timeLeft = expTime - currentTime;

                String expTimeFormatted = formatTime(expTime * 1000);
                String currentTimeFormatted = formatTime(currentTime * 1000);

                Log.d(TAG, "Thời gian hiện tại: " + currentTimeFormatted);
                Log.d(TAG, "Thời gian hết hạn: " + expTimeFormatted);

                if (timeLeft > 0) {
                    Log.d(TAG, "Token còn hiệu lực trong: " + formatDuration(timeLeft));
                } else {
                    Log.e(TAG, "Token đã hết hạn từ: " + formatDuration(-timeLeft) + " trước");
                }
            }

            // Kiểm tra thông tin user nếu có
            if (payload.has("user")) {
                JSONObject user = payload.getJSONObject("user");
                Log.d(TAG, "=== THÔNG TIN USER ===");
                Log.d(TAG, "User ID: " + user.optString("_id", "không có"));
                Log.d(TAG, "Email: " + user.optString("email", "không có"));
                Log.d(TAG, "Username: " + user.optString("username", "không có"));
                Log.d(TAG, "Role: " + user.optString("role", "không có"));
            }

            Log.d(TAG, "=== SIGNATURE ===");
            Log.d(TAG, "Signature (encoded): " + parts[2].substring(0, Math.min(parts[2].length(), 10)) + "...");

        } catch (JSONException e) {
            Log.e(TAG, "Lỗi khi phân tích JSON trong token: " + e.getMessage());
        } catch (UnsupportedEncodingException e) {
            Log.e(TAG, "Lỗi khi giải mã Base64: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Lỗi không xác định khi kiểm tra token: " + e.getMessage());
        }
    }

    /**
     * Kiểm tra token có còn hiệu lực không
     */
    public static boolean isTokenValid(String token) {
        if (token == null || token.isEmpty()) {
            return false;
        }

        try {
            // Loại bỏ "Bearer " nếu có
            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            // Tách các phần của JWT
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return false;
            }

            // Giải mã Payload
            String payloadJson = decodeBase64(parts[1]);
            JSONObject payload = new JSONObject(payloadJson);

            // Kiểm tra thời gian hết hạn
            if (payload.has("exp")) {
                long expTime = payload.getLong("exp");
                long currentTime = System.currentTimeMillis() / 1000;
                return currentTime < expTime;
            }

            return true;
        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi kiểm tra token: " + e.getMessage());
            return false;
        }
    }

    /**
     * Giải mã chuỗi Base64URL thành String
     */
    private static String decodeBase64(String base64) throws UnsupportedEncodingException {
        String paddedBase64 = base64;
        switch (base64.length() % 4) {
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
        return new String(decodedBytes, "UTF-8");
    }

    /**
     * Format timestamp thành chuỗi ngày giờ đọc được
     */
    private static String formatTime(long timestamp) {
        SimpleDateFormat sdf = new SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault());
        return sdf.format(new Date(timestamp));
    }

    /**
     * Format thời gian (giây) thành giờ:phút:giây
     */
    private static String formatDuration(long seconds) {
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;

        if (hours > 0) {
            return String.format(Locale.getDefault(), "%d giờ %d phút %d giây", hours, minutes, secs);
        } else if (minutes > 0) {
            return String.format(Locale.getDefault(), "%d phút %d giây", minutes, secs);
        } else {
            return String.format(Locale.getDefault(), "%d giây", secs);
        }
    }

    /**
     * Lấy thông tin người dùng từ token
     */
    public static JSONObject getUserInfoFromToken(String token) {
        try {
            // Loại bỏ "Bearer " nếu có
            if (token == null || token.isEmpty()) {
                return null;
            }

            if (token.startsWith("Bearer ")) {
                token = token.substring(7);
            }

            // Tách các phần của JWT
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return null;
            }

            // Giải mã Payload
            String payloadJson = decodeBase64(parts[1]);
            JSONObject payload = new JSONObject(payloadJson);

            if (payload.has("user")) {
                return payload.getJSONObject("user");
            }

            return null;
        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi lấy thông tin người dùng từ token: " + e.getMessage());
            return null;
        }
    }
}