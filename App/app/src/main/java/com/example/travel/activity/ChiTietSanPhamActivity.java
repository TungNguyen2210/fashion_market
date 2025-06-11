package com.example.travel.activity;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import com.bumptech.glide.Glide;
import com.example.travel.R;
import com.example.travel.SERVER;
import com.example.travel.adapter.ReviewAdapter;
import com.example.travel.model.Review;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
public class ChiTietSanPhamActivity extends AppCompatActivity {

    Toolbar toolbarchitiet;
    ImageView imgchitiet;
    TextView tvtensp,tvgiasp,tvmotasp;
    Button btnmua;
    Spinner spinner;

    EditText edtDanhGia;
    EditText edtDiemDanhGia;
    Button btnGuiDanhGia;
    TextView tvKetQuaDanhGia;
    private String id; // Khai báo biến id

    private String img; // Khai báo biến id

    private List<Review> reviewList = new ArrayList<>();

    private ReviewAdapter reviewAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chi_tiet_san_pham);
        Anhxa();

        //nhận dữ liệu của sản phẩm
        Intent intent = getIntent();
        id = intent.getStringExtra("id");
        String name = intent.getStringExtra("name");
        String price = String.valueOf(getIntent().getIntExtra("price", 0));
        img = intent.getStringExtra("img");
        String mota = intent.getStringExtra("mota");

        Log.d("GioHang", "Price: " + img);
        tvtensp.setText(name);
        tvgiasp.setText(price);
        tvmotasp.setText(mota);
        Glide.with(this).load(SERVER.imagepath+img).into(imgchitiet);

        btnmua = findViewById(R.id.btnmua);
        btnmua.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Add the product to the shopping cart
                addToCart();
            }
        });

        btnGuiDanhGia = findViewById(R.id.btnGuiDanhGia);
        btnGuiDanhGia.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Gửi đánh giá lên server
                sendDanhGiaToServer();
            }
        });

        reviewAdapter = new ReviewAdapter(reviewList);
        RecyclerView recyclerView = findViewById(R.id.rvReviews);
        recyclerView.setLayoutManager(new LinearLayoutManager(this)); // Set the layout manager
        recyclerView.setAdapter(reviewAdapter);

        getDanhGiaSanPham(id);

    }

    private void getDanhGiaSanPham(String idSanPham) {
        // Tạo OkHttpClient
        OkHttpClient client = new OkHttpClient();

        // Tạo GET request
        String url = SERVER.danhsachdanhgia + "?idsanpham=" + idSanPham;
        Request request = new Request.Builder()
                .url(url)
                .build();

        // Gửi request bất đồng bộ
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                // Xử lý khi gửi request thất bại
                Log.e("ChiTietSanPhamActivity", "Error occurred while getting the reviews.", e);
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        // Hiển thị thông báo lỗi
                        Toast.makeText(ChiTietSanPhamActivity.this, "Lỗi khi lấy danh sách đánh giá", Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                // Xử lý khi gửi request thành công
                String responseData = response.body().string();

                try {
                    // Chuyển đổi chuỗi JSON thành đối tượng JSONObject
                    JSONObject jsonObject = new JSONObject(responseData);

                    Log.d("ChiTietSanPhamActivity", "Response data: " + responseData); // Added log statement

                    // Kiểm tra xem API trả về có thành công hay không
                    boolean success = jsonObject.getBoolean("success");
                    if (success) {
                        // Lấy danh sách đánh giá từ JSON response
                        JSONArray danhGiaArray = jsonObject.getJSONArray("data");
                        for (int i = 0; i < danhGiaArray.length(); i++) {
                            JSONObject danhGiaObject = danhGiaArray.getJSONObject(i);
                            // Lấy thông tin đánh giá từ danhGiaObject và thực hiện xử lý
                            String noidung = danhGiaObject.getString("noidung");
                            String diemdanhgia = danhGiaObject.getString("diemdanhgia");
                            String username = danhGiaObject.getString("username");
                            String thoigian = danhGiaObject.getString("thoigian");

                            // Tạo đối tượng Review từ thông tin đánh giá
                            Review review = new Review( noidung, diemdanhgia, username, thoigian);

                            // Thêm đánh giá vào danh sách
                            reviewList.add(review);
                        }

                        // Cập nhật dữ liệu vào adapter
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                reviewAdapter.notifyDataSetChanged();
                            }
                        });
                    } else {
                        // API trả về không thành công
                        final String message = jsonObject.getString("message");
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                Toast.makeText(ChiTietSanPhamActivity.this, message, Toast.LENGTH_SHORT).show();
                            }
                        });
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(ChiTietSanPhamActivity.this, "Lỗi khi xử lý JSON", Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }
        });
    }

    private void reloadData() {
        // Xóa danh sách đánh giá hiện tại
        reviewList.clear();

        // Gọi phương thức getDanhGiaSanPham() để tải lại dữ liệu đánh giá mới
        getDanhGiaSanPham(id);
    }
    private void sendDanhGiaToServer() {
        edtDanhGia = findViewById(R.id.edtDanhGia);
        edtDiemDanhGia = findViewById(R.id.edtDiemDanhGia);

        String danhGia = edtDanhGia.getText().toString().trim();
        String diemDanhGia = edtDiemDanhGia.getText().toString().trim();

        // Kiểm tra xem dữ liệu đánh giá có hợp lệ hay không
        if (danhGia.isEmpty()) {
            tvKetQuaDanhGia.setText("Vui lòng nhập đánh giá");
            return;
        }
        SharedPreferences preferences = getSharedPreferences("username", Context.MODE_PRIVATE);

        String responseData = preferences.getString("username", "");

        // Tạo OkHttpClient
        OkHttpClient client = new OkHttpClient();

        // Tạo POST request body
        RequestBody requestBody = new FormBody.Builder()
                .add("idsanpham", id) // Thay YOUR_PRODUCT_ID bằng ID sản phẩm thực tế
                .add("noidung", danhGia)
                .add("diemdanhgia", diemDanhGia)
                .add("username", responseData)
                .build();

        String url = SERVER.danhgiasanpham;

        // Tạo POST request
        Request request = new Request.Builder()
                .url(url) // Thay YOUR_API_URL bằng URL của API xử lý đánh giá
                .post(requestBody)
                .build();

        // Gửi request bất đồng bộ
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                // Xử lý khi gửi request thất bại
                Log.e("ChiTietSanPhamActivity", "Error occurred while sending the review.", e);
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        tvKetQuaDanhGia.setText("Lỗi khi gửi đánh giá");
                    }
                });
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                // Xử lý khi gửi request thành công
                String responseData = response.body().string();
                reloadData();
               // Toast.makeText(ChiTietSanPhamActivity.this, "Đánh giá thành công", Toast.LENGTH_SHORT).show();
                if(responseData == "Đánh giá đã được lưu thành công.")
                {
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(ChiTietSanPhamActivity.this, "Đánh giá thành công", Toast.LENGTH_SHORT).show();
                            tvKetQuaDanhGia.setText("đánh giá thành công");
                        }
                    });
                }
            }
        });
    }

    private void addToCart() {
        // Get the selected product details
        String name = tvtensp.getText().toString();
        String price = tvgiasp.getText().toString();
        // Add more details if needed

        // Create an intent to pass the data to the GioHang activity
        Intent intent = new Intent(ChiTietSanPhamActivity.this, GioHang.class);
        intent.putExtra("name", name);
        intent.putExtra("price", price);
        intent.putExtra("img", img);
        intent.putExtra("id", id);
        // Add more extras if needed

        Toast.makeText(this, "Thêm sản phẩm thành công", Toast.LENGTH_SHORT).show();

        // Start the GioHang activity
        startActivity(intent);
    }



    private void Anhxa() {
        toolbarchitiet=findViewById(R.id.toolbarchitietsanpham);
        imgchitiet=findViewById(R.id.imgchitietsanpham);
        tvtensp=findViewById(R.id.tvtenchitietsanpham);
        tvgiasp=findViewById(R.id.tvgiachitietsanpham);
        tvmotasp=findViewById(R.id.tvmotachitietsanpham);
        btnmua=findViewById(R.id.btnmua);
    }
}