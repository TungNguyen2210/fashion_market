package com.example.tech.activity;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
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
import com.example.apptrangsuc.R;
import com.example.tech.SERVER;
import com.example.tech.adapter.ReviewAdapter;
import com.example.tech.model.Product;
import com.example.tech.model.Review;
import com.example.tech.model.SanPham;
import com.example.tech.utils.UserManager;
import com.google.android.material.chip.Chip;
import com.google.android.material.chip.ChipGroup;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.lang.reflect.Type;
import java.text.NumberFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.FormBody;
import okhttp3.Headers;
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
    private RatingBar ratingBarAverage;
    private TextView tvRatingAverage, tvTotalRatingCount, tvNoReviews;
    private List<Review> reviewList = new ArrayList<>();
    private ReviewAdapter reviewAdapter;

    // Biến cho danh sách biến thể sản phẩm
    private List<SanPham.ProductVariant> productVariants = new ArrayList<>();

    // Thêm UserManager
    private UserManager userManager;
    private Button btnLoginToReview;
    private View reviewAuthSection;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chi_tiet_san_pham);

        // Khởi tạo UserManager
        userManager = UserManager.getInstance(this);

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

        // Hiển thị trạng thái ban đầu của phần đánh giá
        showEmptyReviewState();

    }

    @Override
    protected void onResume() {
        super.onResume();


        updateAuthenticationState();

        if (userManager.isLoggedIn() && !TextUtils.isEmpty(id)) {
            getDanhGiaSanPham(id);
        }
    }

    /**
     * Cập nhật hiển thị dựa trên trạng thái đăng nhập
     */
    private void updateAuthenticationState() {
        if (reviewAuthSection != null) {
            if (userManager.isLoggedIn()) {
                // Đã đăng nhập - ẩn phần yêu cầu đăng nhập
                reviewAuthSection.setVisibility(View.GONE);

                // In thông tin token để debug
                userManager.debugCurrentToken();
            } else {
                // Chưa đăng nhập - hiển thị phần yêu cầu đăng nhập
                reviewAuthSection.setVisibility(View.VISIBLE);
            }
        }
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

        } else {
            Log.e(TAG, "Intent is null");
        }
    }

    // Khởi tạo dữ liệu màu trực tiếp
    private void initializeColors() {
        colorMap.put("Màu xanh", "#1c78fa");
        colorMap.put("Màu trắng", "#ffffff");
        colorMap.put("Màu đỏ", "#ff0000");
        colorMap.put("Màu đen", "#000000");
        colorMap.put("Màu vàng", "#ffeb3b");
        colorMap.put("Màu xanh lá", "#4caf50");
    }

    // Phương thức lấy chi tiết sản phẩm
    private void fetchProductDetails() {
        if (TextUtils.isEmpty(id)) {
            Toast.makeText(this, "Không có thông tin sản phẩm", Toast.LENGTH_SHORT).show();
            return;
        }

        OkHttpClient client = new OkHttpClient();
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

                                    // Lấy danh sách biến thể sản phẩm
                                    if (productObj.has("variants")) {
                                        JSONArray variantsArray = productObj.getJSONArray("variants");
                                        for (int i = 0; i < variantsArray.length(); i++) {
                                            JSONObject variantObj = variantsArray.getJSONObject(i);
                                            String variantId = variantObj.getString("_id");
                                            String variantColor = variantObj.getString("color");
                                            String variantSize = variantObj.getString("size");
                                            int variantQuantity = variantObj.getInt("quantity");

                                            SanPham.ProductVariant variant = new SanPham.ProductVariant(
                                                    variantId, variantColor, variantSize, variantQuantity);
                                            productVariants.add(variant);
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

                                    // Lấy đánh giá sản phẩm
                                    getDanhGiaSanPham(id);
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

            // Lấy tổng số lượng sản phẩm có sẵn (trước khi chọn biến thể)
            int totalQuantity = 0;
            if (productObj.has("inventory") && !productObj.isNull("inventory")) {
                JSONObject inventoryObj = productObj.getJSONObject("inventory");
                totalQuantity = inventoryObj.getInt("quantityOnHand");
            } else if (!productVariants.isEmpty()) {
                for (SanPham.ProductVariant variant : productVariants) {
                    totalQuantity += variant.getQuantity();
                }
            }

            availableQuantity = totalQuantity;
            updateStockStatus(availableQuantity);

        } catch (JSONException e) {
            Log.e(TAG, "Error displaying product info: " + e.getMessage());
        }
    }

    // Cập nhật hiển thị trạng thái kho hàng
    private void updateStockStatus(int quantity) {
        if (quantity > 0) {
            tvStockStatus.setText("Còn " + quantity + " sản phẩm");
            tvStockStatus.setTextColor(Color.parseColor("#4CAF50"));  // Màu xanh lá
            btnmua.setEnabled(true);
            btnmua.setText("Thêm vào giỏ hàng");
        } else {
            tvStockStatus.setText("Hết hàng");
            tvStockStatus.setTextColor(Color.RED);
            btnmua.setEnabled(false);
            btnmua.setText("Hết hàng");
        }

        // Thiết lập lại số lượng đã chọn
        selectedQuantity = 1;
        tvQuantity.setText("1");

        // Thiết lập lại các nút tăng/giảm số lượng
        setupQuantitySelection();
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
                    updateAvailableQuantityBasedOnSelection();
                } else if (selectedSize.equals(sizeValue)) {
                    selectedSize = "";
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
                    updateAvailableQuantityBasedOnSelection();
                } else if (selectedColor.equals(colorCode)) {
                    selectedColor = "";
                }
            });

            colorChipGroup.addView(chip);
        }
    }

    // Phương thức mới: Cập nhật số lượng có sẵn dựa trên size và màu đã chọn
    private void updateAvailableQuantityBasedOnSelection() {
        // Nếu chưa chọn cả size và color, thì không cập nhật
        if (TextUtils.isEmpty(selectedSize) || TextUtils.isEmpty(selectedColor)) {
            return;
        }

        // Tìm biến thể phù hợp với size và color đã chọn
        for (SanPham.ProductVariant variant : productVariants) {
            if (variant.getSize().equals(selectedSize) && variant.getColor().equals(selectedColor)) {
                // Cập nhật số lượng có sẵn
                availableQuantity = variant.getQuantity();
                updateStockStatus(availableQuantity);
                return;
            }
        }

        // Nếu không tìm thấy biến thể phù hợp, đặt số lượng = 0
        availableQuantity = 0;
        updateStockStatus(availableQuantity);
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
            if (availableQuantity <= 0) {
                Toast.makeText(this, "Sản phẩm đã hết hàng", Toast.LENGTH_SHORT).show();
                return;
            }

            if (selectedQuantity > availableQuantity) {
                Toast.makeText(this, "Số lượng không đủ. Chỉ còn " + availableQuantity + " sản phẩm",
                        Toast.LENGTH_SHORT).show();
                return;
            }

            // Lấy giỏ hàng hiện tại từ SharedPreferences
            ArrayList<SanPham> cartItems = loadCartItems();

            // Lấy thông tin sản phẩm
            String nameProduct = tvtensp.getText().toString();
            int originalPriceValue = originalPrice;
            int promotionPriceValue = promotionPrice;

            // Tạo ID duy nhất cho sản phẩm với size và màu cụ thể
            String uniqueId = id + (selectedSize.isEmpty() ? "" : "-" + selectedSize)
                    + (selectedColor.isEmpty() ? "" : "-" + selectedColor);

            // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
            boolean isExist = false;
            for (int i = 0; i < cartItems.size(); i++) {
                SanPham item = cartItems.get(i);

                // Kiểm tra ID sản phẩm
                if (item.getIdsanpham() != null && item.getIdsanpham().equals(id)) {
                    // Tìm biến thể phù hợp nếu có
                    if (item.getVariants() != null && !item.getVariants().isEmpty()) {
                        for (SanPham.ProductVariant variant : item.getVariants()) {
                            // Kiểm tra size và color
                            boolean sizeMatches = (selectedSize.isEmpty() && TextUtils.isEmpty(variant.getSize())) ||
                                    (!selectedSize.isEmpty() && selectedSize.equals(variant.getSize()));
                            boolean colorMatches = (selectedColor.isEmpty() && TextUtils.isEmpty(variant.getColor())) ||
                                    (!selectedColor.isEmpty() && selectedColor.equals(variant.getColor()));

                            if (sizeMatches && colorMatches) {
                                // Tăng số lượng nếu biến thể đã tồn tại
                                int currentQuantity = variant.getQuantity();
                                int newQuantity = currentQuantity + selectedQuantity;

                                // Kiểm tra xem số lượng mới có vượt quá số lượng có sẵn không
                                if (newQuantity > availableQuantity) {
                                    Toast.makeText(this, "Số lượng vượt quá số lượng có sẵn", Toast.LENGTH_SHORT).show();
                                    return;
                                }

                                variant.setQuantity(newQuantity);
                                isExist = true;
                                break;
                            }
                        }

                        // Nếu không tìm thấy biến thể phù hợp, tạo biến thể mới
                        if (!isExist) {
                            SanPham.ProductVariant newVariant = new SanPham.ProductVariant(
                                    uniqueId, selectedColor, selectedSize, selectedQuantity);
                            item.getVariants().add(newVariant);
                            isExist = true;
                        }
                    }

                    if (isExist) break;
                }
            }

            // Nếu sản phẩm chưa có trong giỏ hàng, thêm mới
            if (!isExist) {
                // Tạo một sản phẩm mới
                SanPham newItem = new SanPham(id, "", nameProduct, originalPriceValue, promotionPriceValue, img, "");

                // Thêm biến thể với size và color đã chọn
                ArrayList<String> sizes = new ArrayList<>();
                if (!TextUtils.isEmpty(selectedSize)) {
                    sizes.add(selectedSize);
                    newItem.setSizes(sizes);
                }

                ArrayList<String> colors = new ArrayList<>();
                if (!TextUtils.isEmpty(selectedColor)) {
                    colors.add(selectedColor);
                    newItem.setColors(colors);
                }

                // Tạo biến thể với số lượng đã chọn
                SanPham.ProductVariant variant = new SanPham.ProductVariant(
                        uniqueId, selectedColor, selectedSize, selectedQuantity);
                ArrayList<SanPham.ProductVariant> variants = new ArrayList<>();
                variants.add(variant);
                newItem.setVariants(variants);

                cartItems.add(newItem);
            }

            // Lưu giỏ hàng vào SharedPreferences
            saveCartItems(cartItems);

            // Hiển thị thông báo thêm thành công
            Toast.makeText(this, "Đã thêm " + selectedQuantity + " " + nameProduct + " vào giỏ hàng",
                    Toast.LENGTH_SHORT).show();

            // Hỏi người dùng xem có muốn chuyển sang giỏ hàng không
            showCartConfirmationDialog();

        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi thêm vào giỏ hàng: " + e.getMessage());
            Toast.makeText(this, "Không thể thêm sản phẩm vào giỏ hàng", Toast.LENGTH_SHORT).show();
        }
    }

    // Phương thức hiển thị hộp thoại xác nhận sau khi thêm sản phẩm
    private void showCartConfirmationDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Thêm vào giỏ hàng thành công");
        builder.setMessage("Bạn có muốn chuyển đến giỏ hàng ngay bây giờ?");

        builder.setPositiveButton("Đi đến giỏ hàng", (dialog, which) -> {
            Intent intent = new Intent(ChiTietSanPhamActivity.this, GioHang.class);
            startActivity(intent);
        });

        builder.setNegativeButton("Tiếp tục mua sắm", (dialog, which) -> {
            dialog.dismiss();
        });

        AlertDialog dialog = builder.create();
        dialog.show();
    }

    // Phương thức đọc giỏ hàng từ SharedPreferences
    private ArrayList<SanPham> loadCartItems() {
        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
        String jsonCart = preferences.getString("cartItems", "");

        if (!jsonCart.isEmpty()) {
            Gson gson = new Gson();
            Type type = new TypeToken<ArrayList<SanPham>>() {}.getType();
            return gson.fromJson(jsonCart, type);
        }

        return new ArrayList<>();
    }

    // Phương thức lưu giỏ hàng vào SharedPreferences
    private void saveCartItems(ArrayList<SanPham> cartItems) {
        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        Gson gson = new Gson();
        String jsonCart = gson.toJson(cartItems);
        editor.putString("cartItems", jsonCart);
        editor.apply();
    }

    private void setupReviewSection() {
        // Khởi tạo RecyclerView và adapter
        reviewAdapter = new ReviewAdapter(reviewList);
        rvReviews.setLayoutManager(new LinearLayoutManager(this));
        rvReviews.setAdapter(reviewAdapter);
    }

    /**
     * Hàm chính để lấy đánh giá sản phẩm
     */
    private void getDanhGiaSanPham(String idSanPham) {
        // Xóa dữ liệu đánh giá cũ
        reviewList.clear();

        // Kiểm tra đăng nhập sử dụng UserManager
        if (!userManager.isLoggedIn()) {
            Log.d(TAG, "User is not logged in, showing login message");
            runOnUiThread(() -> {
                // Hiển thị gợi ý đăng nhập
                if (reviewAuthSection != null) {
                    reviewAuthSection.setVisibility(View.VISIBLE);
                }
                showEmptyReviewState();
            });
            return;
        }

        // Validate token trước khi sử dụng
        if (!userManager.validateTokenForApiRequest()) {
            Log.d(TAG, "Token không hợp lệ, yêu cầu đăng nhập lại");
            runOnUiThread(() -> {
                Toast.makeText(this, "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
                        Toast.LENGTH_LONG).show();
                if (reviewAuthSection != null) {
                    reviewAuthSection.setVisibility(View.VISIBLE);
                }
                showEmptyReviewState();
            });
            return;
        }

        // Lấy token từ UserManager
        String token = userManager.getAuthorizationToken();

        // Log thông tin token
        Log.d(TAG, "Using token for API request: " + (token != null ? "Available" : "NULL"));

        // Tạo OkHttpClient với timeout
        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build();

        // Thử API trực tiếp trước, sau đó là API Gateway nếu cần
        tryApiWithToken(client, idSanPham, token, true);
    }

    /**
     * Thử gọi API với token
     * @param client OkHttpClient để gửi request
     * @param idSanPham ID sản phẩm
     * @param token Token xác thực
     * @param isDirectApi true nếu gọi API trực tiếp, false nếu qua API Gateway
     */
    private void tryApiWithToken(OkHttpClient client, String idSanPham, String token, boolean isDirectApi) {
        // Xác định URL API dựa trên loại API
        String url;
        if (isDirectApi) {
            // URL API trực tiếp
            url = SERVER.directReviewApi + idSanPham;
        } else {
            // URL API qua Gateway
            url = SERVER.gatewayReviewApi + idSanPham;
        }

        Log.d(TAG, "Trying " + (isDirectApi ? "direct API" : "API Gateway") + ": " + url);

        // Tạo request với token xác thực - dựa trên UserManager, KHÔNG dùng "Bearer " prefix
        Request.Builder requestBuilder = new Request.Builder()
                .url(url);

        // Thêm Authorization header nếu có token
        if (token != null && !token.isEmpty()) {
            requestBuilder.addHeader("Authorization", token);
            Log.d(TAG, "Added Authorization header");
        } else {
            Log.w(TAG, "No token available for request");
        }

        Request request = requestBuilder.build();

        // In ra headers để debug
        Headers headers = request.headers();
        Log.d(TAG, "Request headers:");
        for (int i = 0; i < headers.size(); i++) {
            Log.d(TAG, headers.name(i) + ": " + headers.value(i));
        }

        // Gửi request
        client.newCall(request).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(TAG, (isDirectApi ? "Direct API" : "API Gateway") + " call failed: " + e.getMessage());

                if (isDirectApi) {
                    // Nếu API trực tiếp thất bại, thử API Gateway
                    tryApiWithToken(client, idSanPham, token, false);
                } else {
                    // Nếu cả hai đều thất bại, hiển thị thông báo lỗi
                    runOnUiThread(() -> {
                        Toast.makeText(ChiTietSanPhamActivity.this,
                                "Không thể kết nối đến máy chủ", Toast.LENGTH_SHORT).show();
                        showEmptyReviewState();
                    });
                }
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                int statusCode = response.code();
                String responseData = response.body().string();

                Log.d(TAG, (isDirectApi ? "Direct API" : "API Gateway") + " response code: " + statusCode);
                Log.d(TAG, (isDirectApi ? "Direct API" : "API Gateway") + " response: " + responseData);

                if (statusCode == 200) {
                    // Xử lý dữ liệu thành công
                    parseReviewsResponse(responseData);
                } else if (statusCode == 401 || statusCode == 403) {
                    Log.e(TAG, "Authentication failed with status: " + statusCode);

                    // Xóa token không hợp lệ
                    userManager.logout();

                    if (isDirectApi) {
                        // Nếu API trực tiếp không thành công với token hiện tại, thử API Gateway
                        tryApiWithToken(client, idSanPham, token, false);
                    } else {
                        // Cả hai API đều trả về lỗi xác thực, thông báo cho người dùng
                        runOnUiThread(() -> {
                            Toast.makeText(ChiTietSanPhamActivity.this,
                                    "Phiên làm việc đã hết hạn, vui lòng đăng nhập lại",
                                    Toast.LENGTH_LONG).show();
                            updateAuthenticationState();
                            showEmptyReviewState();
                        });
                    }
                } else {
                    // Các lỗi khác
                    Log.e(TAG, "Server error (" + statusCode + "): " + responseData);

                    if (isDirectApi) {
                        // Nếu API trực tiếp thất bại, thử API Gateway
                        tryApiWithToken(client, idSanPham, token, false);
                    } else {
                        // Nếu cả hai đều thất bại, hiển thị thông báo lỗi
                        runOnUiThread(() -> {
                            Toast.makeText(ChiTietSanPhamActivity.this,
                                    "Không thể tải đánh giá sản phẩm", Toast.LENGTH_SHORT).show();
                            showEmptyReviewState();
                        });
                    }
                }
            }
        });
    }

    /**
     * Phân tích dữ liệu đánh giá từ response JSON
     */
    private void parseReviewsResponse(String responseData) {
        try {
            JSONObject jsonObject = new JSONObject(responseData);

            if (jsonObject.has("data")) {
                JSONArray reviewsArray = jsonObject.getJSONArray("data");
                float totalRating = 0;

                // Nếu không có đánh giá nào
                if (reviewsArray.length() == 0) {
                    runOnUiThread(() -> showEmptyReviewState());
                    return;
                }

                // Duyệt qua tất cả các đánh giá
                reviewList.clear();  // Xóa dữ liệu cũ trước khi thêm mới

                for (int i = 0; i < reviewsArray.length(); i++) {
                    JSONObject reviewObj = reviewsArray.getJSONObject(i);

                    int rating = reviewObj.has("rating") ? reviewObj.getInt("rating") : 0;
                    String comment = reviewObj.has("comment") ? reviewObj.getString("comment") : "";
                    String customer = reviewObj.has("customer") ? reviewObj.getString("customer") : "Khách hàng ẩn danh";
                    String createdAt = reviewObj.has("createdAt") ? reviewObj.getString("createdAt") : "";

                    totalRating += rating;

                    // Định dạng lại thời gian
                    String formattedDate = formatDateTime(createdAt);

                    // Tạo đối tượng Review mới
                    Review review = new Review(comment, String.valueOf(rating), customer, formattedDate);
                    reviewList.add(review);

                    Log.d(TAG, "Added review: " + customer + " - " + rating + " stars - " + formattedDate);
                }

                final float averageRating = reviewsArray.length() > 0 ? totalRating / reviewsArray.length() : 0;
                final int reviewCount = reviewsArray.length();

                runOnUiThread(() -> {
                    // Ẩn thông báo đăng nhập nếu đang hiển thị
                    if (reviewAuthSection != null) {
                        reviewAuthSection.setVisibility(View.GONE);
                    }

                    // Cập nhật UI
                    updateReviewUI(averageRating, reviewCount);
                });
            } else {
                // Không có dữ liệu đánh giá
                Log.d(TAG, "No review data found in response");
                runOnUiThread(() -> showEmptyReviewState());
            }
        } catch (JSONException e) {
            Log.e(TAG, "JSON parsing error: " + e.getMessage());
            runOnUiThread(() -> showEmptyReviewState());
        }
    }

    // Cập nhật giao diện với dữ liệu đánh giá
    private void updateReviewUI(float averageRating, int reviewCount) {
        // Cập nhật thông tin đánh giá trung bình
        tvRatingAverage.setText(String.format("%.1f", averageRating));
        ratingBarAverage.setRating(averageRating);
        tvTotalRatingCount.setText(reviewCount + " đánh giá");

        // Cập nhật danh sách đánh giá
        reviewAdapter.notifyDataSetChanged();

        // Hiển thị/ẩn TextView "Không có đánh giá"
        if (reviewList.isEmpty()) {
            if (tvNoReviews != null) {
                tvNoReviews.setVisibility(View.VISIBLE);
            }
            rvReviews.setVisibility(View.GONE);
        } else {
            if (tvNoReviews != null) {
                tvNoReviews.setVisibility(View.GONE);
            }
            rvReviews.setVisibility(View.VISIBLE);
        }
    }

    // Hiển thị trạng thái không có đánh giá
    private void showEmptyReviewState() {
        tvRatingAverage.setText("0.0");
        ratingBarAverage.setRating(0);
        tvTotalRatingCount.setText("Chưa có đánh giá nào");

        if (tvNoReviews != null) {
            tvNoReviews.setVisibility(View.VISIBLE);
        }

        rvReviews.setVisibility(View.GONE);
    }

    // Phương thức định dạng thời gian
    private String formatDateTime(String dateTimeString) {
        try {
            // Kiểm tra định dạng ISO 8601
            SimpleDateFormat inputFormat;
            if (dateTimeString.contains("T")) {
                // Định dạng ISO 8601 với 'T' và có thể có mili giây
                if (dateTimeString.contains(".")) {
                    inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault());
                } else {
                    inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault());
                }
            } else {
                // Định dạng đơn giản không có 'T'
                inputFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault());
            }

            // Định dạng đầu ra theo format mong muốn: HH:mm:ss d/M/yyyy
            SimpleDateFormat outputFormat = new SimpleDateFormat("HH:mm:ss d/M/yyyy", Locale.getDefault());

            Date date = inputFormat.parse(dateTimeString);
            return outputFormat.format(date);
        } catch (ParseException e) {
            Log.e(TAG, "Error parsing date: " + e.getMessage() + " for string: " + dateTimeString);
            // Nếu không thể parse, trả về nguyên chuỗi
            return dateTimeString;
        }
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

        // Ánh xạ cho phần chọn số lượng
        btnDecreaseQuantity = findViewById(R.id.btnDecreaseQuantity);
        btnIncreaseQuantity = findViewById(R.id.btnIncreaseQuantity);
        tvQuantity = findViewById(R.id.tvQuantity);
        tvStockStatus = findViewById(R.id.tvStockStatus);

        // Ánh xạ các phần tử cho đánh giá
        rvReviews = findViewById(R.id.rvReviews);
        ratingBarAverage = findViewById(R.id.ratingBarAverage);
        tvRatingAverage = findViewById(R.id.tvRatingAverage);
        tvTotalRatingCount = findViewById(R.id.tvTotalRatingCount);
        tvNoReviews = findViewById(R.id.tvNoReviews);

    }
}