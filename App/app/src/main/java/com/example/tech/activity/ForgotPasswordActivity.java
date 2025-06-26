package com.example.tech.activity;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.example.tech.R;
import com.example.tech.SERVER;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class ForgotPasswordActivity extends AppCompatActivity {
    private EditText emailEditText;
    private Button sendButton;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_forgot_password);

        emailEditText = findViewById(R.id.emailEditText);
        sendButton = findViewById(R.id.sendButton);

        sendButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String email = emailEditText.getText().toString().trim();

                if (!email.isEmpty()) {
                    sendForgotPasswordRequest(email);
                } else {
                    Toast.makeText(ForgotPasswordActivity.this, "Vui lòng nhập địa chỉ email.", Toast.LENGTH_SHORT).show();
                }
            }
        });
    }

    private void sendForgotPasswordRequest(String email) {
        Log.d("email", email);
        String url = SERVER.forgotpassword;
        MediaType JSON = MediaType.get("application/json; charset=utf-8");

        JSONObject jsonBody = new JSONObject();
        try {
            jsonBody.put("email", email);
        } catch (JSONException e) {
            e.printStackTrace();
        }

        OkHttpClient client = new OkHttpClient();
        RequestBody requestBody = RequestBody.create(JSON, jsonBody.toString());
        Request request = new Request.Builder()
                .url(url)
                .post(requestBody)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(ForgotPasswordActivity.this, "Gửi yêu cầu không thành công. Vui lòng thử lại sau.", Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                final String responseData = response.body().string();
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        if (response.isSuccessful()) {
                           Log.d("forgotpassword",responseData);
                            Toast.makeText(ForgotPasswordActivity.this, "Mật khẩu tạm thời đã được gửi đến email của bạn.", Toast.LENGTH_SHORT).show();
                        } else {
                            Toast.makeText(ForgotPasswordActivity.this, "Gửi yêu cầu không thành công. Vui lòng thử lại sau.", Toast.LENGTH_SHORT).show();
                        }
                    }
                });
            }
        });
    }
}
