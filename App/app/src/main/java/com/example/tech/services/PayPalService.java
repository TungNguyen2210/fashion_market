package com.example.tech.services;

import android.content.Context;
import android.util.Log;

import com.android.volley.AuthFailureError;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class PayPalService {
    private static final String TAG = "PayPalService";
    private static final String BASE_URL = "http://10.0.2.2:3100";
    private static final String PAYPAL_API_URL = "https://api-m.sandbox.paypal.com";

    private Context context;
    private RequestQueue requestQueue;
    private String accessToken;

    // PayPal Credentials - Thay bằng credentials của bạn
    private static final String CLIENT_ID = "AXNzDmucUwWdfpukjRz0QeNWCkdE6JAmr6QnfmwOYHt7W1b5sjjxYYMhbd39ARvWOxtylF2PC-JA_2I-";
    private static final String CLIENT_SECRET = "EEcO6aDfXzegxshe5zq_d5_fzB2XcvtaZojALQHT56d1QakVh_52EGyfqdvmfxoU7u3LfxXBECBQe-7a"; // Lấy từ PayPal Developer Dashboard

    public PayPalService(Context context) {
        this.context = context;
        this.requestQueue = Volley.newRequestQueue(context);
    }

    // Lấy Access Token từ PayPal
    public void getAccessToken(final AccessTokenCallback callback) {
        String url = PAYPAL_API_URL + "/v1/oauth2/token";

        Map<String, String> params = new HashMap<>();
        params.put("grant_type", "client_credentials");

        JsonObjectRequest request = new JsonObjectRequest(Request.Method.POST, url, null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        try {
                            accessToken = response.getString("access_token");
                            Log.d(TAG, "Access token obtained successfully");
                            callback.onSuccess(accessToken);
                        } catch (JSONException e) {
                            Log.e(TAG, "Error parsing access token", e);
                            callback.onError("Error parsing access token");
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        Log.e(TAG, "Error getting access token", error);
                        callback.onError("Error getting access token");
                    }
                }) {
            @Override
            public Map<String, String> getHeaders() throws AuthFailureError {
                Map<String, String> headers = new HashMap<>();
                String credentials = CLIENT_ID + ":" + CLIENT_SECRET;
                String auth = "Basic " + android.util.Base64.encodeToString(
                        credentials.getBytes(), android.util.Base64.NO_WRAP);
                headers.put("Authorization", auth);
                headers.put("Content-Type", "application/x-www-form-urlencoded");
                return headers;
            }

            @Override
            public byte[] getBody() {
                return "grant_type=client_credentials".getBytes();
            }
        };

        requestQueue.add(request);
    }

    // Tạo PayPal Order
    public void createPayPalOrder(double amountUSD, final OrderCallback callback) {
        getAccessToken(new AccessTokenCallback() {
            @Override
            public void onSuccess(String token) {
                String url = PAYPAL_API_URL + "/v2/checkout/orders";

                JSONObject orderData = new JSONObject();
                try {
                    orderData.put("intent", "CAPTURE");

                    JSONArray purchaseUnits = new JSONArray();
                    JSONObject purchaseUnit = new JSONObject();
                    JSONObject amount = new JSONObject();
                    amount.put("currency_code", "USD");
                    amount.put("value", String.format("%.2f", amountUSD));
                    purchaseUnit.put("amount", amount);
                    purchaseUnits.put(purchaseUnit);

                    orderData.put("purchase_units", purchaseUnits);

                    // Application context để return về app
                    JSONObject applicationContext = new JSONObject();
                    applicationContext.put("return_url", "com.example.appbanhang://paypalsdk");
                    applicationContext.put("cancel_url", "com.example.appbanhang://paypalsdk");
                    orderData.put("application_context", applicationContext);

                } catch (JSONException e) {
                    Log.e(TAG, "Error creating order data", e);
                    callback.onError("Error creating order data");
                    return;
                }

                JsonObjectRequest request = new JsonObjectRequest(Request.Method.POST, url, orderData,
                        new Response.Listener<JSONObject>() {
                            @Override
                            public void onResponse(JSONObject response) {
                                try {
                                    String orderId = response.getString("id");

                                    // Lấy approval link
                                    JSONArray links = response.getJSONArray("links");
                                    String approvalUrl = null;
                                    for (int i = 0; i < links.length(); i++) {
                                        JSONObject link = links.getJSONObject(i);
                                        if ("approve".equals(link.getString("rel"))) {
                                            approvalUrl = link.getString("href");
                                            break;
                                        }
                                    }

                                    if (approvalUrl != null) {
                                        callback.onSuccess(orderId, approvalUrl);
                                    } else {
                                        callback.onError("No approval URL found");
                                    }

                                } catch (JSONException e) {
                                    Log.e(TAG, "Error parsing order response", e);
                                    callback.onError("Error parsing order response");
                                }
                            }
                        },
                        new Response.ErrorListener() {
                            @Override
                            public void onErrorResponse(VolleyError error) {
                                Log.e(TAG, "Error creating order", error);
                                callback.onError("Error creating order");
                            }
                        }) {
                    @Override
                    public Map<String, String> getHeaders() throws AuthFailureError {
                        Map<String, String> headers = new HashMap<>();
                        headers.put("Authorization", "Bearer " + token);
                        headers.put("Content-Type", "application/json");
                        return headers;
                    }
                };

                requestQueue.add(request);
            }

            @Override
            public void onError(String error) {
                callback.onError(error);
            }
        });
    }

    // Capture PayPal Order sau khi user approve
    public void capturePayPalOrder(String orderId, final CaptureCallback callback) {
        getAccessToken(new AccessTokenCallback() {
            @Override
            public void onSuccess(String token) {
                String url = PAYPAL_API_URL + "/v2/checkout/orders/" + orderId + "/capture";

                JsonObjectRequest request = new JsonObjectRequest(Request.Method.POST, url, null,
                        new Response.Listener<JSONObject>() {
                            @Override
                            public void onResponse(JSONObject response) {
                                try {
                                    String status = response.getString("status");
                                    if ("COMPLETED".equals(status)) {
                                        // Lấy capture ID
                                        JSONArray purchaseUnits = response.getJSONArray("purchase_units");
                                        JSONObject payments = purchaseUnits.getJSONObject(0).getJSONObject("payments");
                                        JSONArray captures = payments.getJSONArray("captures");
                                        String captureId = captures.getJSONObject(0).getString("id");

                                        callback.onSuccess(captureId);
                                    } else {
                                        callback.onError("Payment not completed: " + status);
                                    }
                                } catch (JSONException e) {
                                    Log.e(TAG, "Error parsing capture response", e);
                                    callback.onError("Error parsing capture response");
                                }
                            }
                        },
                        new Response.ErrorListener() {
                            @Override
                            public void onErrorResponse(VolleyError error) {
                                Log.e(TAG, "Error capturing order", error);
                                callback.onError("Error capturing order");
                            }
                        }) {
                    @Override
                    public Map<String, String> getHeaders() throws AuthFailureError {
                        Map<String, String> headers = new HashMap<>();
                        headers.put("Authorization", "Bearer " + token);
                        headers.put("Content-Type", "application/json");
                        return headers;
                    }
                };

                requestQueue.add(request);
            }

            @Override
            public void onError(String error) {
                callback.onError(error);
            }
        });
    }

    // Interfaces
    public interface AccessTokenCallback {
        void onSuccess(String token);
        void onError(String error);
    }

    public interface OrderCallback {
        void onSuccess(String orderId, String approvalUrl);
        void onError(String error);
    }

    public interface CaptureCallback {
        void onSuccess(String captureId);
        void onError(String error);
    }
}