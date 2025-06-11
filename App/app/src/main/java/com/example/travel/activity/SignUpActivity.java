package com.example.travel.activity;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import com.android.volley.AuthFailureError;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.travel.R;
import com.example.travel.SERVER;

import java.util.HashMap;
import java.util.Map;

public class SignUpActivity extends AppCompatActivity {
    private EditText edtS_Fullname, edtS_Email, edtS_Pass, edtS_EnterThePass, edtS_Address, edtS_Phone;
    private Button btnS_Register, btnS_Login, btnS_Exit;
    private String URL = SERVER.signUp;
    private String fullname, email, pass, enterpass, address, phone;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sign_up);
        // ánh xạ
        Anhxa();
        addEvent();
        // xu ly dang ky

        // chuyen trang dang nhap
        btnS_Login.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(SignUpActivity.this, LoginActivity.class);
                startActivity(intent);
            }
        });
    }

// xu ly dang ky
    public void submit(View view) {
        fullname = edtS_Fullname.getText().toString().trim();
        email = edtS_Email.getText().toString().trim();
        pass = edtS_Pass.getText().toString().trim();
        enterpass = edtS_EnterThePass.getText().toString().trim();
        phone = edtS_Phone.getText().toString().trim();

        if (!pass.equals(enterpass)) {
            Toast.makeText(this, "Password Incorrect", Toast.LENGTH_LONG).show();
        }

        if (!fullname.equals("") && !email.equals("") && !pass.equals("")
                && !phone.equals("")) {
            StringRequest stringRequest = new StringRequest(Request.Method.POST, URL, new Response.Listener<String>() {
                @Override
                public void onResponse(String response) {
                    if (response != null) {
                        Toast.makeText(SignUpActivity.this, "Sign Up Success", Toast.LENGTH_LONG).show();
                        Intent intent = new Intent(SignUpActivity.this, LoginActivity.class);
                        startActivity(intent);
                        finish();

                    } else if (response.equals("failure")) {
                        Toast.makeText(SignUpActivity.this, "Registration Failed", Toast.LENGTH_LONG).show();

                    }
                }
            }, new Response.ErrorListener() {
                @Override
                public void onErrorResponse(VolleyError error) {
                    Toast.makeText(getApplicationContext(), error.toString().trim(), Toast.LENGTH_LONG).show();
                }
            }) {
                @Nullable
                @Override
                protected Map<String, String> getParams() throws AuthFailureError {
                    Map<String, String> data = new HashMap<>();
                    data.put("username", fullname);
                    data.put("email", email);
                    data.put("password", pass);
                    data.put("phone", phone);
                    return data;
                }
            };
            RequestQueue requestQueue = Volley.newRequestQueue(getApplicationContext());
            requestQueue.add(stringRequest);
        }
    }

    public void login(View view) {
        Intent intent = new Intent(getApplicationContext(), LoginActivity.class);
        startActivity(intent);
        finish();
    }

    private void addEvent() {
        btnS_Exit.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                xulythoat_signup();
            }
        });
    }

    // xu ly nut thoat
    public void xulythoat_signup() {
        AlertDialog.Builder exit = new AlertDialog.Builder(SignUpActivity.this);
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
        edtS_Email = findViewById(R.id.edtS_Email);
        edtS_Pass = findViewById(R.id.edtS_Pass);
        edtS_EnterThePass = findViewById(R.id.edtS_EnterThePass);
        edtS_Fullname = findViewById(R.id.edtS_FullName);
        edtS_Phone = findViewById(R.id.edtS_Phone);
        btnS_Login = findViewById(R.id.btnS_Dangnhap);
        btnS_Exit = findViewById(R.id.btnS_Thoat);
        fullname = email = pass = enterpass = address = phone = "";

    }


}