package com.example.travel.activity;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.text.Html;
import android.text.TextUtils;
import android.util.Log;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.RatingBar;
import android.widget.TextView;
import android.widget.Toast;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions;
import com.bumptech.glide.request.RequestOptions;
import com.bumptech.glide.request.target.Target;
import com.example.tech.R;
import com.example.tech.SERVER;
import com.example.tech.activity.GioHang;
import com.example.tech.adapter.ReviewAdapter;
import com.example.tech.model.Product;
import com.example.tech.model.Review;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.FormBody;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class ChiTietSanPhamActivity extends AppCompatActivity {

    private static final String TAG = "ChiTietSanPham";

    private Toolbar toolbarchitiet;
    private ImageView imgchitiet;
    private TextView tvtensp, tvgiasp, tvmotasp;
    private Button btnmua;
    private ProgressBar loadingIndicator;
    private RatingBar ratingBar;
    private EditText edtDanhGia;
    private Button btnGuiDanhGia;
    private TextView tvKetQuaDanhGia;
    private TextView tvReviewsHeader;
    private float userRating = 0;

    private String id;
    private String img;
    private int price;
    private String name;
    private String mota;

    private List<Review> reviewList = new ArrayList<>();
    private ReviewAdapter reviewAdapter;
    private RecyclerView rvReviews;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chi_tiet_san_pham);

        Anhxa();
        setupToolbar();

        loadingIndicator.setVisibility(View.VISIBLE);

        // Thêm listener cho RatingBar
        ratingBar.setOnRatingBarChangeListener(new RatingBar.OnRatingBarChangeListener() {
            @Override
            public void onRatingChanged(RatingBar ratingBar, float rating, boolean fromUser) {
                userRating = rating;
            }
        });

        getProductDataFromIntent();
        displayProductInfo();
        setupBuyButton();
        setupReviewButton();
        setupReviewsRecyclerView();
        getDanhGiaSanPham(id);
    }

    private void setupToolbar() {
        setSupportActionBar(toolbarchitiet);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Chi Tiết Sản Phẩm");
        }
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            onBackPressed();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void getProductDataFromIntent() {
        Intent intent = getIntent();
        if (intent != null) {
            id = intent.getStringExtra("id");
            name = intent.getStringExtra("name");
            price = intent.getIntExtra("price", 0);
            img = intent.getStringExtra("img");
            mota = intent.getStringExtra("mota");

            Log.d(TAG, "ID: " + id);
            Log.d(TAG, "Name: " + name);
            Log.d(TAG, "Price: " + price);
            Log.d(TAG, "Image: " + img);
        } else {
            Log.e(TAG, "Intent is null");
        }
    }

    private void displayProductInfo() {
        // Hiển thị tên sản phẩm
        tvtensp.setText(name);

        // Định dạng và hiển thị giá tiền
        NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("vi", "VN"));
        tvgiasp.setText(formatter.format(price) + " VND");

        // Xử lý và hiển thị mô tả sản phẩm
        if (!TextUtils.isEmpty(mota)) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                tvmotasp.setText(Html.fromHtml(mota, Html.FROM_HTML_MODE_LEGACY));
            } else {
                tvmotasp.setText(Html.fromHtml(mota));
            }
        } else {
            tvmotasp.setText("Không có mô tả cho sản phẩm này.");
        }

        // Hiển thị hình ảnh sản phẩm
        loadProductImage();
    }

    private void loadProductImage() {
        if (TextUtils.isEmpty(img)) {
            imgchitiet.setImageResource(R.drawable.placeholder_image);
            loadingIndicator.setVisibility(View.GONE);
            return;
        }

        String imageUrl = img;
        if (!imageUrl.startsWith("http")) {
            imageUrl = SERVER.imagepath + imageUrl;
        }

        Log.d(TAG, "Loading image from: " + imageUrl);

        RequestOptions requestOptions = new RequestOptions()
                .placeholder(R.drawable.placeholder_image)
                .error(R.drawable.error_image)
                .centerCrop();

        Glide.with(this)
                .load(imageUrl)
                .apply(requestOptions)
                .transition(DrawableTransitionOptions.withCrossFade())
                .listener(new com.bumptech.glide.request.RequestListener<android.graphics.drawable.Drawable>() {
                    @Override
                    public boolean onLoadFailed(GlideException e, Object model, Target<Drawable> target, boolean isFirstResource) {
                        Log.e(TAG, "Image load failed: " + e.getMessage());
                        loadingIndicator.setVisibility(View.GONE);
                        return false;
                    }

                    @Override
                    public boolean onResourceReady(android.graphics.drawable.Drawable resource, Object model, Target<android.graphics.drawable.Drawable> target, DataSource dataSource, boolean isFirstResource) {
                        Log.d(TAG, "Image loaded successfully");
                        loadingIndicator.setVisibility(View.GONE);
                        return false;
                    }
                })
                .into(imgchitiet);
    }

    private void setupBuyButton() {
        btnmua.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                addToCart();
            }
        });
    }

    private void setupReviewButton() {
        btnGuiDanhGia.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
             //   sendDanhGiaToServer();
            }
        });
    }

    private void setupReviewsRecyclerView() {
        reviewAdapter = new ReviewAdapter(reviewList);
        rvReviews.setLayoutManager(new LinearLayoutManager(this));
        rvReviews.setAdapter(reviewAdapter);
    }

    private void addToCart() {
        try {
            // Kiểm tra xem đã có danh sách giỏ hàng chưa
            if (Product.cartItems == null) {
                Product.cartItems = new ArrayList<>();
            }

            // Lấy thông tin sản phẩm
            String nameProduct = tvtensp.getText().toString();
            String priceProduct = tvgiasp.getText().toString();

            // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
            boolean isExist = false;
            for (int i = 0; i < Product.cartItems.size(); i++) {
                if (Product.cartItems.get(i).getId().equals(id)) {
                    // Tăng số lượng nếu sản phẩm đã tồn tại
                    int currentQuantity = Product.cartItems.get(i).getQuantity();
                    Product.cartItems.get(i).setQuantity(currentQuantity + 1);
                    isExist = true;
                    break;
                }
            }

            // Nếu sản phẩm chưa có trong giỏ hàng, thêm mới
            if (!isExist) {
                Product newItem = new Product(id, nameProduct, priceProduct, img, 1);
                Product.cartItems.add(newItem);
            }

            Toast.makeText(this, "Đã thêm " + nameProduct + " vào giỏ hàng", Toast.LENGTH_SHORT).show();

            // Chuyển đến màn hình giỏ hàng
            Intent intent = new Intent(ChiTietSanPhamActivity.this, GioHang.class);
            startActivity(intent);

        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi thêm vào giỏ hàng: " + e.getMessage());
            Toast.makeText(this, "Không thể thêm sản phẩm vào giỏ hàng", Toast.LENGTH_SHORT).show();
        }
    }

    private void getDanhGiaSanPham(String idSanPham) {
        if (TextUtils.isEmpty(idSanPham)) {
            tvReviewsHeader.setText("Không có đánh giá nào");
            return;
        }

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
                Log.e(TAG, "Error getting reviews: " + e.getMessage());
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        Toast.makeText(ChiTietSanPhamActivity.this, "Không thể tải đánh giá", Toast.LENGTH_SHORT).show();
                        tvReviewsHeader.setText("Không thể tải đánh giá");
                    }
                });
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                final String responseData = response.body().string();

                try {
                    JSONObject jsonObject = new JSONObject(responseData);
                    Log.d(TAG, "Review response: " + responseData);

                    boolean success = jsonObject.getBoolean("success");
                    if (success) {
                        final JSONArray danhGiaArray = jsonObject.getJSONArray("data");

                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                try {
                                    reviewList.clear();

                                    for (int i = 0; i < danhGiaArray.length(); i++) {
                                        JSONObject danhGiaObject = danhGiaArray.getJSONObject(i);

                                        String noidung = danhGiaObject.getString("noidung");
                                        String diemdanhgia = danhGiaObject.getString("diemdanhgia");
                                        String username = danhGiaObject.getString("username");
                                        String thoigian = danhGiaObject.getString("thoigian");

                                        Review review = new Review(noidung, diemdanhgia, username, thoigian);
                                        reviewList.add(review);
                                    }

                                    if (reviewList.isEmpty()) {
                                        tvReviewsHeader.setText("Chưa có đánh giá nào");
                                    } else {
                                        tvReviewsHeader.setText("Đánh giá (" + reviewList.size() + ")");
                                    }

                                    reviewAdapter.notifyDataSetChanged();

                                } catch (JSONException e) {
                                    Log.e(TAG, "JSON parsing error: " + e.getMessage());
                                    tvReviewsHeader.setText("Lỗi xử lý dữ liệu đánh giá");
                                }
                            }
                        });
                    } else {
                        final String message = jsonObject.getString("message");
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                Toast.makeText(ChiTietSanPhamActivity.this, message, Toast.LENGTH_SHORT).show();
                                tvReviewsHeader.setText("Không có đánh giá nào");
                            }
                        });
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "JSON parse error: " + e.getMessage());
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(ChiTietSanPhamActivity.this, "Lỗi xử lý dữ liệu", Toast.LENGTH_SHORT).show();
                            tvReviewsHeader.setText("Không thể tải đánh giá");
                        }
                    });
                }
            }
        });
    }

    /*
    private void sendDanhGiaToServer() {
        edtDanhGia = findViewById(R.id.edtDanhGia);
        String danhGia = edtDanhGia.getText().toString().trim();
        String diemDanhGia = String.valueOf((int)ratingBar.getRating());

        // Kiểm tra xem dữ liệu đánh giá có hợp lệ hay không
        if (danhGia.isEmpty()) {
            tvKetQuaDanhGia.setText("Vui lòng nhập đánh giá");
            return;
        }

        // Kiểm tra xem người dùng đã chọn số sao chưa
        if (ratingBar.getRating() == 0) {
            tvKetQuaDanhGia.setText("Vui lòng chọn số sao đánh giá (1-5)");
            return;
        }

        SharedPreferences preferences = getSharedPreferences("username", Context.MODE_PRIVATE);

        String responseData = preferences.getString("username", "");

        // Tạo OkHttpClient
        OkHttpClient client = new OkHttpClient();

        // Tạo POST request body
        RequestBody requestBody = new FormBody.Builder()
                .add("idsanpham", id)
                .add("noidung", danhGia)
                .add("diemdanhgia", diemDanhGia)
                .add("username", responseData)
                .build();

        String url = SERVER.danhgiasanpham;

        // Tạo POST request
        Request request = new Request.Builder()
                .url(url)
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

                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        // Xóa nội dung đánh giá và reset RatingBar sau khi gửi thành công
                        edtDanhGia.setText("");
                        ratingBar.setRating(0);

                        Toast.makeText(ChiTietSanPhamActivity.this, "Đánh giá thành công", Toast.LENGTH_SHORT).show();
                        tvKetQuaDanhGia.setText("Đánh giá thành công");

                        // Tải lại dữ liệu đánh giá
                        reloadData();
                    }
                });
            }
        });
    }

    */
    private void reloadData() {
        reviewList.clear();
        reviewAdapter.notifyDataSetChanged();
        getDanhGiaSanPham(id);
    }

    private void Anhxa() {
        toolbarchitiet = findViewById(R.id.toolbarchitietsanpham);
        imgchitiet = findViewById(R.id.imgchitietsanpham);
        tvtensp = findViewById(R.id.tvtenchitietsanpham);
        tvgiasp = findViewById(R.id.tvgiachitietsanpham);
        tvmotasp = findViewById(R.id.tvmotachitietsanpham);
        btnmua = findViewById(R.id.btnmua);
        loadingIndicator = findViewById(R.id.loadingIndicator);

       /*
        // Ánh xạ các view đánh giá
        edtDanhGia = findViewById(R.id.edtDanhGia);
        btnGuiDanhGia = findViewById(R.id.btnGuiDanhGia);
        tvKetQuaDanhGia = findViewById(R.id.tvKetQuaDanhGia);
        ratingBar = findViewById(R.id.ratingBar);
        rvReviews = findViewById(R.id.rvReviews);
        tvReviewsHeader = findViewById(R.id.tvReviewsHeader);

        */
    }
}