package com.example.travel.activity;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import com.example.tech.R;
import com.example.tech.adapter.CartAdapter;
import com.example.tech.model.Product;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Locale;

public class GioHang extends AppCompatActivity {

    private static final String TAG = "GioHang";
    private ListView lvcart;
    private TextView tvTotalMoney, tvEmptyCart;
    private Button btnContinueShopping, btnClearCart;
    private Toolbar toolbar;

    private ArrayList<Product> cartItems;
    private CartAdapter cartAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_gio_hang);

        // Ánh xạ các view
        anhxa();

        // Thiết lập toolbar
        setupToolbar();

        // Tải danh sách giỏ hàng từ SharedPreferences
        loadCartItems();

        // Xử lý sản phẩm mới từ intent nếu có
        handleNewProductFromIntent();

        // Cập nhật ListView giỏ hàng
        updateCartListView();

        // Lưu danh sách giỏ hàng vào SharedPreferences
        saveCartItems();

        // Tính và hiển thị tổng tiền
        updateTotalPrice();

        // Thiết lập sự kiện cho các nút
        setupButtonListeners();
    }

    private void setupToolbar() {
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setTitle("Giỏ Hàng");

            toolbar.setNavigationOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    onBackPressed();
                }
            });
        }
    }

    private void setupButtonListeners() {
        // Thiết lập sự kiện cho nút tiếp tục mua sắm
        btnContinueShopping.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish(); // Quay lại màn hình trước đó
            }
        });

        // Thiết lập sự kiện cho nút xóa giỏ hàng
        btnClearCart.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                clearCart();
            }
        });
    }

    private void handleNewProductFromIntent() {
        Intent intent = getIntent();
        if (intent == null) return;

        String id = intent.getStringExtra("id");
        String name = intent.getStringExtra("name");
        String price = intent.getStringExtra("price");
        String imageUrl = intent.getStringExtra("img");

        // Kiểm tra có thông tin sản phẩm mới hay không
        if (name != null && price != null) {
            Log.d(TAG, "Nhận sản phẩm mới: " + name + " - " + price);

            // Tạo đối tượng Product mới
            Product selectedProduct = new Product(id, name, price, imageUrl, 1);

            // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
            boolean productExists = false;
            for (Product cartItem : cartItems) {
                if (cartItem.getId() != null && cartItem.getId().equals(id)) {
                    // Tăng số lượng nếu sản phẩm đã tồn tại
                    int quantity = cartItem.getQuantity();
                    cartItem.setQuantity(quantity + 1);
                    productExists = true;
                    Log.d(TAG, "Sản phẩm đã tồn tại, tăng số lượng lên " + (quantity + 1));
                    break;
                }
            }

            // Nếu sản phẩm chưa có trong giỏ hàng, thêm mới
            if (!productExists) {
                cartItems.add(selectedProduct);
                Log.d(TAG, "Thêm sản phẩm mới vào giỏ hàng");
            }
        }
    }

    private int calculateTotalPrice() {
        int totalPrice = 0;
        for (Product product : cartItems) {
            String price = product.getPrice();
            int quantity = product.getQuantity();
            if (price != null) {
                try {
                    // Loại bỏ các ký tự không phải số
                    String numericPrice = price.replaceAll("[^\\d]", "");
                    if (!numericPrice.isEmpty()) {
                        int priceValue = Integer.parseInt(numericPrice);
                        totalPrice += priceValue * quantity;
                    }
                } catch (NumberFormatException e) {
                    Log.e(TAG, "Lỗi chuyển đổi giá: " + price, e);
                }
            }
        }
        return totalPrice;
    }

    private void anhxa() {
        lvcart = findViewById(R.id.lvcart);
        tvTotalMoney = findViewById(R.id.tvtotalmoney);
        tvEmptyCart = findViewById(R.id.tvEmptyCart);
        btnContinueShopping = findViewById(R.id.btnContinueShopping);
        btnClearCart = findViewById(R.id.btnClearCart);
        toolbar = findViewById(R.id.toolbar); // Chắc chắn ID này tồn tại trong layout của bạn
    }

    private void loadCartItems() {
        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
        String jsonCart = preferences.getString("cartItems", "");

        if (!jsonCart.isEmpty()) {
            Gson gson = new Gson();
            Type type = new TypeToken<ArrayList<Product>>() {}.getType();
            cartItems = gson.fromJson(jsonCart, type);
        }

        if (cartItems == null) {
            cartItems = new ArrayList<>();
        }

        // Đồng bộ với biến static cartItems nếu có
        if (Product.cartItems != null && !Product.cartItems.isEmpty()) {
            // Nếu có sản phẩm trong cartItems static, thêm hoặc cập nhật chúng vào cartItems local
            for (Product staticProduct : Product.cartItems) {
                boolean found = false;
                for (int i = 0; i < cartItems.size(); i++) {
                    Product localProduct = cartItems.get(i);
                    if (staticProduct.getId() != null && staticProduct.getId().equals(localProduct.getId())) {
                        // Cập nhật sản phẩm đã tồn tại
                        cartItems.set(i, staticProduct);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // Thêm sản phẩm mới
                    cartItems.add(staticProduct);
                }
            }

            // Xóa danh sách static để tránh trùng lặp
            Product.cartItems.clear();
        }
    }

    private void updateCartListView() {
        if (cartItems.isEmpty()) {
            lvcart.setVisibility(View.GONE);
            tvEmptyCart.setVisibility(View.VISIBLE);
        } else {
            lvcart.setVisibility(View.VISIBLE);
            tvEmptyCart.setVisibility(View.GONE);

            cartAdapter = new CartAdapter(this, cartItems);
            lvcart.setAdapter(cartAdapter);
        }
    }

    private void saveCartItems() {
        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        Gson gson = new Gson();
        String jsonCart = gson.toJson(cartItems);
        editor.putString("cartItems", jsonCart);
        editor.apply();
    }

    public void updateTotalPrice() {
        int totalPrice = calculateTotalPrice();
        NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("vi", "VN"));
        tvTotalMoney.setText(formatter.format(totalPrice) + "đ");
    }

    public void updateProductQuantity(int position, int newQuantity) {
        if (position >= 0 && position < cartItems.size()) {
            if (newQuantity <= 0) {
                // Xóa sản phẩm nếu số lượng <= 0
                cartItems.remove(position);
                Toast.makeText(this, "Đã xóa sản phẩm khỏi giỏ hàng", Toast.LENGTH_SHORT).show();
            } else {
                // Cập nhật số lượng sản phẩm
                cartItems.get(position).setQuantity(newQuantity);
            }

            // Cập nhật ListView và lưu thay đổi
            cartAdapter.notifyDataSetChanged();
            saveCartItems();
            updateTotalPrice();

            // Kiểm tra nếu giỏ hàng trống
            if (cartItems.isEmpty()) {
                updateCartListView();
            }
        }
    }

    public void removeProduct(int position) {
        if (position >= 0 && position < cartItems.size()) {
            cartItems.remove(position);
            cartAdapter.notifyDataSetChanged();
            saveCartItems();
            updateTotalPrice();

            // Kiểm tra nếu giỏ hàng trống
            if (cartItems.isEmpty()) {
                updateCartListView();
            }

            Toast.makeText(this, "Đã xóa sản phẩm khỏi giỏ hàng", Toast.LENGTH_SHORT).show();
        }
    }

    private void clearCart() {
        cartItems.clear();
        saveCartItems();
        updateCartListView();
        updateTotalPrice();
        Toast.makeText(this, "Đã xóa tất cả sản phẩm khỏi giỏ hàng", Toast.LENGTH_SHORT).show();
    }
}