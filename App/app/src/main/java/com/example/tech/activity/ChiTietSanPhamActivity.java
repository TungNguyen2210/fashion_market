package com.example.tech.activity;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Paint;
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
import com.example.tech.adapter.ReviewAdapter;
import com.example.tech.model.Product;
import com.example.tech.model.Review;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

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

    // Thêm các biến mới
    private TextView tvOriginalPrice, tvPromotionPrice;
    private ChipGroup sizeChipGroup, colorChipGroup;
    private int originalPrice, promotionPrice;
    private List<String> availableSizes = new ArrayList<>();
    private List<String> availableColors = new ArrayList<>();
    private String selectedSize = "";
    private String selectedColor = "";
    private Map<String, String> colorMap = new HashMap<>();

    // Biến cho chức năng chọn số lượng
    private Button btnDecreaseQuantity, btnIncreaseQuantity;
    private TextView tvQuantity, tvStockStatus;
    private int selectedQuantity = 1;
    private int availableQuantity = 0;

    private String id;
    private String img;
    private int price;
    private String name;
    private String mota;

    // Biến cho phần đánh giá
    private RecyclerView rvReviews;
    private EditText edtDanhGia, edtDiemDanhGia;
    private Button btnGuiDanhGia;
    private TextView tvKetQuaDanhGia;
    private TextView tvReviewCount;
    private List<Review> reviewList = new ArrayList<>();
    private ReviewAdapter reviewAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chi_tiet_san_pham);

        Anhxa();
        setupToolbar();

        loadingIndicator.setVisibility(View.VISIBLE);

        initializeColors();

        // Thiết lập giá trị mặc định cho số lượng
        tvQuantity.setText("1");

        getProductDataFromIntent();
        fetchProductDetails();
        setupBuyButton();

        // Khởi tạo RecyclerView và adapter cho đánh giá
        setupReviewSection();

        // Thiết lập nút gửi đánh giá
        // setupReviewSubmitButton();

        // Lấy danh sách đánh giá
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

    // Khởi tạo dữ liệu màu trực tiếp
    private void initializeColors() {
        colorMap.put("Màu xanh", "#1c78fa");
        colorMap.put("Màu trắng", "#ffffff");
        colorMap.put("Màu đỏ", "#ff0000");
    }

    // Phương thức lấy chi tiết sản phẩm
    private void fetchProductDetails() {
        if (TextUtils.isEmpty(id)) {
            Toast.makeText(this, "Không có thông tin sản phẩm", Toast.LENGTH_SHORT).show();
            return;
        }

        OkHttpClient client = new OkHttpClient();
        // Sử dụng API từ dữ liệu mẫu bạn cung cấp
        String url = SERVER.serverip + "/api/product/" + id;

        Log.d(TAG, "Fetching product from: " + url);

        Request request = new Request.Builder()
                .url(url)
                .build();

        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, "Error fetching product details: " + e.getMessage());
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        loadingIndicator.setVisibility(View.GONE);
                        Toast.makeText(ChiTietSanPhamActivity.this, "Không thể tải thông tin sản phẩm", Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                final String responseData = response.body().string();
                Log.d(TAG, "Product details response: " + responseData);

                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            // Kiểm tra xem phản hồi có phải là JSON hợp lệ không
                            if (responseData.trim().startsWith("{") && responseData.trim().endsWith("}")) {
                                JSONObject jsonObject = new JSONObject(responseData);
                                if (jsonObject.has("product")) {
                                    final JSONObject productObj = jsonObject.getJSONObject("product");

                                    // Lấy danh sách kích thước
                                    final List<String> sizes = new ArrayList<>();
                                    if (productObj.has("sizes")) {
                                        JSONArray sizesArray = productObj.getJSONArray("sizes");
                                        for (int i = 0; i < sizesArray.length(); i++) {
                                            sizes.add(sizesArray.getString(i));
                                        }
                                    }

                                    // Lấy danh sách màu sắc
                                    final List<String> colors = new ArrayList<>();
                                    if (productObj.has("color")) {
                                        JSONArray colorsArray = productObj.getJSONArray("color");
                                        for (int i = 0; i < colorsArray.length(); i++) {
                                            colors.add(colorsArray.getString(i));
                                        }
                                    }

                                    // Lấy giá và giá khuyến mãi
                                    final int price = productObj.getInt("price");
                                    final int promo = productObj.has("promotion") ? productObj.getInt("promotion") : price;

                                    // Lưu giá gốc và giá khuyến mãi
                                    originalPrice = price;
                                    promotionPrice = promo;

                                    // Cập nhật thông tin sản phẩm
                                    displayProductInfo(productObj);

                                    // Cập nhật danh sách kích thước và màu sắc
                                    availableSizes = sizes;
                                    availableColors = colors;

                                    // Hiển thị kích thước và màu sắc
                                    setupSizeSelection();
                                    setupColorSelection();
                                } else {
                                    Toast.makeText(ChiTietSanPhamActivity.this, "Dữ liệu sản phẩm không hợp lệ", Toast.LENGTH_SHORT).show();
                                }
                            } else {
                                // Phản hồi không phải là JSON hợp lệ
                                Toast.makeText(ChiTietSanPhamActivity.this, "Phản hồi từ server không hợp lệ", Toast.LENGTH_SHORT).show();
                                Log.e(TAG, "Invalid JSON response: " + responseData);
                            }
                        } catch (JSONException e) {
                            Log.e(TAG, "JSON parsing error: " + e.getMessage());
                            Toast.makeText(ChiTietSanPhamActivity.this, "Lỗi xử lý dữ liệu sản phẩm", Toast.LENGTH_SHORT).show();
                        } finally {
                            loadingIndicator.setVisibility(View.GONE);
                        }
                    }
                });
            }
        });
    }

    // Phương thức cập nhật để hiển thị thông tin sản phẩm
    private void displayProductInfo(JSONObject productObj) {
        try {
            // Hiển thị tên sản phẩm
            String productName = productObj.getString("name");
            tvtensp.setText(productName);

            // Định dạng và hiển thị giá tiền
            NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("vi", "VN"));

            // Hiển thị giá gốc và giá khuyến mãi
            if (originalPrice > promotionPrice) {
                tvOriginalPrice.setVisibility(View.VISIBLE);
                tvOriginalPrice.setText(formatter.format(originalPrice) + " VND");
                tvOriginalPrice.setPaintFlags(tvOriginalPrice.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
                tvPromotionPrice.setText(formatter.format(promotionPrice) + " VND");
                tvgiasp.setVisibility(View.GONE);
            } else {
                tvOriginalPrice.setVisibility(View.GONE);
                tvPromotionPrice.setText(formatter.format(originalPrice) + " VND");
                tvgiasp.setVisibility(View.GONE);
            }

            // Xử lý và hiển thị mô tả sản phẩm
            String productDesc = productObj.getString("description");
            if (!TextUtils.isEmpty(productDesc)) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
                    tvmotasp.setText(Html.fromHtml(productDesc, Html.FROM_HTML_MODE_LEGACY));
                } else {
                    tvmotasp.setText(Html.fromHtml(productDesc));
                }
            } else {
                tvmotasp.setText("Không có mô tả cho sản phẩm này.");
            }

            // Hiển thị hình ảnh sản phẩm
            String imageUrl = productObj.getString("image");
            loadProductImageWithUrl(imageUrl);

            // Lấy số lượng sản phẩm có sẵn
            availableQuantity = productObj.getInt("quantity");

            // Thiết lập phần chọn số lượng
            setupQuantitySelection();

        } catch (JSONException e) {
            Log.e(TAG, "Error displaying product info: " + e.getMessage());
        }
    }

    // Phương thức cập nhật để tải hình ảnh
    private void loadProductImageWithUrl(String imageUrl) {
        if (TextUtils.isEmpty(imageUrl)) {
            imgchitiet.setImageResource(R.drawable.placeholder_image);
            loadingIndicator.setVisibility(View.GONE);
            return;
        }

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

    // Thiết lập chọn kích thước
    private void setupSizeSelection() {
        sizeChipGroup.removeAllViews();

        if (availableSizes.isEmpty()) {
            TextView noSizeText = new TextView(this);
            noSizeText.setText("Không có kích thước");
            noSizeText.setTextColor(Color.GRAY);
            sizeChipGroup.addView(noSizeText);
            return;
        }

        for (String size : availableSizes) {
            final String sizeValue = size;
            Chip chip = new Chip(this);
            chip.setText(sizeValue);
            chip.setCheckable(true);
            chip.setClickable(true);

            chip.setOnCheckedChangeListener((buttonView, isChecked) -> {
                if (isChecked) {
                    selectedSize = sizeValue;
                    Toast.makeText(ChiTietSanPhamActivity.this, "Đã chọn size: " + sizeValue, Toast.LENGTH_SHORT).show();
                }
            });

            sizeChipGroup.addView(chip);
        }
    }

    // Thiết lập chọn màu sắc
    private void setupColorSelection() {
        colorChipGroup.removeAllViews();

        if (availableColors.isEmpty()) {
            TextView noColorText = new TextView(this);
            noColorText.setText("Không có màu sắc");
            noColorText.setTextColor(Color.GRAY);
            colorChipGroup.addView(noColorText);
            return;
        }

        for (String colorHex : availableColors) {
            final String colorCode = colorHex;
            final String colorName = findColorName(colorCode);

            Chip chip = new Chip(this);
            chip.setText(colorName);
            chip.setCheckable(true);
            chip.setClickable(true);

            try {
                // Đặt màu nền cho chip
                chip.setChipBackgroundColor(ColorStateList.valueOf(Color.parseColor(colorCode)));
                // Đặt màu chữ tùy thuộc vào màu nền để đảm bảo độ tương phản
                int textColor = isColorDark(Color.parseColor(colorCode)) ? Color.WHITE : Color.BLACK;
                chip.setTextColor(textColor);
            } catch (Exception e) {
                Log.e(TAG, "Invalid color format: " + colorCode);
                chip.setChipBackgroundColor(ColorStateList.valueOf(Color.LTGRAY));
            }

            chip.setOnCheckedChangeListener((buttonView, isChecked) -> {
                if (isChecked) {
                    selectedColor = colorCode;
                    Toast.makeText(ChiTietSanPhamActivity.this, "Đã chọn màu: " + colorName, Toast.LENGTH_SHORT).show();
                }
            });

            colorChipGroup.addView(chip);
        }
    }

    // Tìm tên màu từ mã màu hex
    private String findColorName(String colorHex) {
        for (Map.Entry<String, String> entry : colorMap.entrySet()) {
            if (entry.getValue().equalsIgnoreCase(colorHex)) {
                return entry.getKey();
            }
        }
        return "Màu " + colorHex;
    }

    // Kiểm tra màu sắc tối hay sáng để chọn màu chữ phù hợp
    private boolean isColorDark(int color) {
        double darkness = 1 - (0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)) / 255;
        return darkness >= 0.5;
    }

    // Thiết lập chọn số lượng
    private void setupQuantitySelection() {
        // Cập nhật thông tin tồn kho
        tvStockStatus.setText("Còn " + availableQuantity + " sản phẩm");

        // Nếu không còn hàng, vô hiệu hóa nút mua
        if (availableQuantity <= 0) {
            btnmua.setEnabled(false);
            btnmua.setText("Hết hàng");
            tvStockStatus.setText("Hết hàng");
            tvStockStatus.setTextColor(Color.RED);
        }

        // Thiết lập các nút tăng/giảm số lượng
        btnDecreaseQuantity.setOnClickListener(v -> {
            if (selectedQuantity > 1) {
                selectedQuantity--;
                tvQuantity.setText(String.valueOf(selectedQuantity));
            }
        });

        btnIncreaseQuantity.setOnClickListener(v -> {
            if (selectedQuantity < availableQuantity) {
                selectedQuantity++;
                tvQuantity.setText(String.valueOf(selectedQuantity));
            } else {
                Toast.makeText(ChiTietSanPhamActivity.this,
                        "Số lượng không được vượt quá " + availableQuantity,
                        Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void setupBuyButton() {
        btnmua.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                addToCart();
            }
        });
    }

    // Cập nhật phương thức addToCart để thêm size, màu và số lượng
    private void addToCart() {
        try {
            // Kiểm tra xem đã chọn kích thước và màu sắc chưa
            if (!availableSizes.isEmpty() && TextUtils.isEmpty(selectedSize)) {
                Toast.makeText(this, "Vui lòng chọn kích thước", Toast.LENGTH_SHORT).show();
                return;
            }

            if (!availableColors.isEmpty() && TextUtils.isEmpty(selectedColor)) {
                Toast.makeText(this, "Vui lòng chọn màu sắc", Toast.LENGTH_SHORT).show();
                return;
            }

            // Kiểm tra số lượng còn đủ không
            if (selectedQuantity > availableQuantity) {
                Toast.makeText(this, "Số lượng không đủ. Chỉ còn " + availableQuantity + " sản phẩm",
                        Toast.LENGTH_SHORT).show();
                return;
            }

            // Kiểm tra xem đã có danh sách giỏ hàng chưa
            if (Product.cartItems == null) {
                Product.cartItems = new ArrayList<>();
            }

            // Lấy thông tin sản phẩm
            String nameProduct = tvtensp.getText().toString();
            String originalPriceStr = String.valueOf(originalPrice);
            String promotionPriceStr = String.valueOf(promotionPrice);

            // Tạo ID duy nhất cho sản phẩm với size và màu cụ thể
            String uniqueId = id + (selectedSize.isEmpty() ? "" : "-" + selectedSize)
                    + (selectedColor.isEmpty() ? "" : "-" + selectedColor);

            // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
            boolean isExist = false;
            for (int i = 0; i < Product.cartItems.size(); i++) {
                // Kiểm tra ID, size và màu
                if (Product.cartItems.get(i).getId().equals(uniqueId)) {
                    // Tăng số lượng nếu sản phẩm đã tồn tại
                    int currentQuantity = Product.cartItems.get(i).getQuantity();
                    int newQuantity = currentQuantity + selectedQuantity;

                    // Kiểm tra xem số lượng mới có vượt quá số lượng có sẵn không
                    if (newQuantity > availableQuantity) {
                        Toast.makeText(this, "Số lượng vượt quá số lượng có sẵn", Toast.LENGTH_SHORT).show();
                        return;
                    }

                    Product.cartItems.get(i).setQuantity(newQuantity);
                    isExist = true;
                    break;
                }
            }

            // Nếu sản phẩm chưa có trong giỏ hàng, thêm mới
            if (!isExist) {
                Product newItem;

                // Kiểm tra xem có giảm giá không
                if (promotionPrice > 0 && originalPrice > promotionPrice) {
                    // Có giảm giá - truyền cả giá gốc và giá khuyến mãi
                    newItem = new Product(uniqueId, nameProduct, originalPriceStr, promotionPriceStr,
                            img, selectedQuantity, selectedSize, selectedColor);
                } else {
                    // Không có giảm giá - chỉ truyền giá gốc
                    newItem = new Product(uniqueId, nameProduct, originalPriceStr, img,
                            selectedQuantity, selectedSize, selectedColor);
                }

                Product.cartItems.add(newItem);
            }

            Toast.makeText(this, "Đã thêm " + selectedQuantity + " " + nameProduct + " vào giỏ hàng",
                    Toast.LENGTH_SHORT).show();

            // Chuyển đến màn hình giỏ hàng
            Intent intent = new Intent(ChiTietSanPhamActivity.this, GioHang.class);
            startActivity(intent);

        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi thêm vào giỏ hàng: " + e.getMessage());
            Toast.makeText(this, "Không thể thêm sản phẩm vào giỏ hàng", Toast.LENGTH_SHORT).show();
        }
    }

    private void setupReviewSection() {
        // Khởi tạo RecyclerView và adapter
        reviewAdapter = new ReviewAdapter(reviewList);
        rvReviews.setLayoutManager(new LinearLayoutManager(this));
        rvReviews.setAdapter(reviewAdapter);
    }

    private void getDanhGiaSanPham(String idSanPham) {
        // Xóa dữ liệu đánh giá cũ
        reviewList.clear();

        // Tạo OkHttpClient
        OkHttpClient client = new OkHttpClient();

        // Tạo GET request
        String url = SERVER.danhsachdanhgia + "?idsanpham=" + idSanPham;
        Log.d(TAG, "Fetching reviews from: " + url);

        Request request = new Request.Builder()
                .url(url)
                .build();

        // Gửi request bất đồng bộ
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                // Xử lý khi gửi request thất bại
                Log.e(TAG, "Error occurred while getting the reviews: " + e.getMessage());
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
                Log.d(TAG, "Reviews response: " + responseData);

                try {
                    // Chuyển đổi chuỗi JSON thành đối tượng JSONObject
                    JSONObject jsonObject = new JSONObject(responseData);

                    // Kiểm tra xem API trả về có thành công hay không
                    boolean success = jsonObject.getBoolean("success");
                    if (success) {
                        // Lấy danh sách đánh giá từ JSON response
                        JSONArray danhGiaArray = jsonObject.getJSONArray("data");
                        for (int i = 0; i < danhGiaArray.length(); i++) {
                            JSONObject danhGiaObject = danhGiaArray.getJSONObject(i);
                            // Lấy thông tin đánh giá từ danhGiaObject
                            String noidung = danhGiaObject.getString("noidung");
                            String diemdanhgia = danhGiaObject.getString("diemdanhgia");
                            String username = danhGiaObject.getString("username");
                            String thoigian = danhGiaObject.getString("thoigian");

                            // Tạo đối tượng Review từ thông tin đánh giá
                            Review review = new Review(noidung, diemdanhgia, username, thoigian);

                            // Thêm đánh giá vào danh sách
                            reviewList.add(review);
                        }

                        // Cập nhật UI trên main thread
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                reviewAdapter.notifyDataSetChanged();
                                tvReviewCount.setText(reviewList.size() + " đánh giá");

                                if (reviewList.isEmpty()) {
                                    // Hiển thị thông báo nếu không có đánh giá
                                    tvReviewCount.setText("Chưa có đánh giá nào");
                                }
                            }
                        });
                    } else {
                        // API trả về không thành công
                        final String message = jsonObject.getString("message");
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                Toast.makeText(ChiTietSanPhamActivity.this, message, Toast.LENGTH_SHORT).show();
                                tvReviewCount.setText("Không thể tải đánh giá");
                            }
                        });
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            Toast.makeText(ChiTietSanPhamActivity.this, "Lỗi khi xử lý dữ liệu đánh giá", Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }
        });
    }

    private void Anhxa() {
        toolbarchitiet = findViewById(R.id.toolbarchitietsanpham);
        imgchitiet = findViewById(R.id.imgchitietsanpham);
        tvtensp = findViewById(R.id.tvtenchitietsanpham);
        tvgiasp = findViewById(R.id.tvgiachitietsanpham);
        tvmotasp = findViewById(R.id.tvmotachitietsanpham);
        btnmua = findViewById(R.id.btnmua);
        loadingIndicator = findViewById(R.id.loadingIndicator);

        tvOriginalPrice = findViewById(R.id.tvOriginalPrice);
        tvPromotionPrice = findViewById(R.id.tvPromotionPrice);

        // Ánh xạ cho size và màu
        sizeChipGroup = findViewById(R.id.sizeChipGroup);
        colorChipGroup = findViewById(R.id.colorChipGroup);

        btnDecreaseQuantity = findViewById(R.id.btnDecreaseQuantity);
        btnIncreaseQuantity = findViewById(R.id.btnIncreaseQuantity);
        tvQuantity = findViewById(R.id.tvQuantity);
        tvStockStatus = findViewById(R.id.tvStockStatus);

        // Ánh xạ các phần tử cho đánh giá
        rvReviews = findViewById(R.id.rvReviews);
        tvReviewCount = findViewById(R.id.tvReviewCount);
    }
}