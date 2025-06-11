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
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.tech.R;
import com.example.tech.SERVER;

import java.util.HashMap;
import java.util.Map;

public class LoginActivity extends AppCompatActivity {


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
                    StringRequest stringRequest = new StringRequest(Request.Method.POST, URL, new Response.Listener<String>() {
                        @Override
                        public void onResponse(String response) {
                            if (!response.isEmpty()) {
                                SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
                                SharedPreferences.Editor editor = preferences.edit();
                                editor.clear(); // Xóa toàn bộ nội dung của SharedPreferences "Cart"
                                editor.apply(); // Lưu thay đổi
                                Log.d("data", response);

                                SharedPreferences preferences2 = getSharedPreferences("username", Context.MODE_PRIVATE);
                                SharedPreferences.Editor editor2 = preferences2.edit();
                                editor2.putString("username", response.replaceAll("\"", ""));
                                editor2.apply();

                                Toast.makeText(LoginActivity.this, "Logged in successfully", Toast.LENGTH_SHORT).show();
                                Intent intent = new Intent(LoginActivity.this, MainActivity.class);
                                startActivity(intent);
                                finish();
                            } else if (response.equals("failure")) {
                                Toast.makeText(LoginActivity.this, "Wrong email or password", Toast.LENGTH_LONG).show();
                            }
                        }
                    }, new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            Toast.makeText(LoginActivity.this, error.toString().trim(), Toast.LENGTH_LONG).show();
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
                    };
                    RequestQueue requestQueue = Volley.newRequestQueue(getApplicationContext());
                    requestQueue.add(stringRequest);
                } else {
                    Toast.makeText(LoginActivity.this, "Must enter the full field", Toast.LENGTH_LONG).show();
                }
            }
        });
    }


    private void xulythoat() {
        AlertDialog.Builder exit = new AlertDialog.Builder(LoginActivity.this);
        exit.setTitle("Exit");
        exit.setIcon(android.R.drawable.ic_dialog_info);
        exit.setMessage("Do you want to exit the app?");
        exit.setPositiveButton("Yes", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                finish();
            }
        });
        exit.setNegativeButton("No", new DialogInterface.OnClickListener() {
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
}