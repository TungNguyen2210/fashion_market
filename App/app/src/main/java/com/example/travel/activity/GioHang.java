package com.example.travel.activity;
import androidx.appcompat.app.AppCompatActivity;

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
import com.example.tech.activity.CheckoutActivity;
import com.example.tech.adapter.CartAdapter;
import com.example.tech.model.SanPham;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Locale;

public class GioHang extends AppCompatActivity {

    private static final String TAG = "GioHang";
    private ListView lvcart;
    private TextView tvTotalMoney, tvEmptyCart, tvback, tvPriceCalculation;
    private TextView tvSubtotalValue, tvDiscountValue;
    private View layoutDiscount;
    private Button btnMua, btnContinueShopping, btnClearCart;

    private ArrayList<SanPham> cartItems;
    private CartAdapter cartAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_gio_hang);

        // Ánh xạ các view
        anhxa();

        // Thiết lập sự kiện nút back
        setupBackButton();

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

        // Cập nhật thông tin tính toán chi tiết
        updatePriceCalculation();

        // Thiết lập sự kiện cho các nút
        setupButtonListeners();
    }

    private void setupBackButton() {
        tvback.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                onBackPressed();
            }
        });
    }

    private void setupButtonListeners() {
        // Thiết lập sự kiện cho nút Mua
        btnMua.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (cartItems != null && !cartItems.isEmpty()) {
                    // Chuyển sang màn hình thanh toán
                    Intent intent = new Intent(GioHang.this, CheckoutActivity.class);
                    // Truyền tổng tiền sang màn hình thanh toán
                    intent.putExtra("subtotal", calculateFinalPrice());
                    startActivity(intent);
                } else {
                    Toast.makeText(GioHang.this, "Giỏ hàng trống, không thể đặt hàng", Toast.LENGTH_SHORT).show();
                }
            }
        });

        btnContinueShopping.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish(); // Quay lại màn hình trước đó
            }
        });

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
        int price = intent.getIntExtra("price", 0); // Giá gốc
        int promotionPrice = intent.getIntExtra("promotionPrice", price); // Giá khuyến mãi
        String imageUrl = intent.getStringExtra("img");
        String selectedSize = intent.getStringExtra("size");
        String selectedColor = intent.getStringExtra("color");
        int quantity = intent.getIntExtra("quantity", 1); // Mặc định là 1 nếu không có

        // Kiểm tra có thông tin sản phẩm mới hay không
        if (name != null && id != null) {
            Log.d(TAG, "Nhận sản phẩm mới: " + name + " - " + price + " - Số lượng: " + quantity);

            // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
            boolean productExists = false;
            for (SanPham cartItem : cartItems) {
                // So sánh ID và các thuộc tính đã chọn (size, color) để xác định sản phẩm giống nhau
                boolean sameSize = (selectedSize == null && cartItem.getSizes() == null) ||
                        (selectedSize != null && cartItem.getSizes() != null && cartItem.getSizes().contains(selectedSize));
                boolean sameColor = (selectedColor == null && cartItem.getColors() == null) ||
                        (selectedColor != null && cartItem.getColors() != null && cartItem.getColors().contains(selectedColor));

                if (cartItem.getIdsanpham() != null && cartItem.getIdsanpham().equals(id) && sameSize && sameColor) {
                    // Cập nhật số lượng nếu sản phẩm đã tồn tại
                    SanPham.ProductVariant variant = findVariant(cartItem, selectedColor, selectedSize);
                    if (variant != null) {
                        variant.setQuantity(variant.getQuantity() + quantity);
                        productExists = true;
                        Log.d(TAG, "Sản phẩm đã tồn tại, tăng số lượng lên " + (variant.getQuantity()));
                        break;
                    }
                }
            }

            // Nếu sản phẩm chưa có trong giỏ hàng, thêm mới với số lượng đã chọn
            if (!productExists) {
                SanPham selectedProduct = new SanPham(id, "", name, price, promotionPrice, imageUrl, "");

                if (selectedSize != null) {
                    ArrayList<String> sizes = new ArrayList<>();
                    sizes.add(selectedSize);
                    selectedProduct.setSizes(sizes);
                }

                if (selectedColor != null) {
                    ArrayList<String> colors = new ArrayList<>();
                    colors.add(selectedColor);
                    selectedProduct.setColors(colors);
                }

                SanPham.ProductVariant variant = new SanPham.ProductVariant(id + "-variant", selectedColor, selectedSize, quantity);
                ArrayList<SanPham.ProductVariant> variants = new ArrayList<>();
                variants.add(variant);
                selectedProduct.setVariants(variants);

                cartItems.add(selectedProduct);
                Log.d(TAG, "Thêm sản phẩm mới vào giỏ hàng với số lượng: " + quantity);
            }

            // Xóa dữ liệu khỏi intent để tránh thêm lại khi xoay màn hình
            intent.removeExtra("id");
            intent.removeExtra("name");
            intent.removeExtra("price");
            intent.removeExtra("promotionPrice");
            intent.removeExtra("img");
            intent.removeExtra("size");
            intent.removeExtra("color");
            intent.removeExtra("quantity");
        }
    }

    // Tìm biến thể phù hợp với màu sắc và kích thước
    private SanPham.ProductVariant findVariant(SanPham product, String color, String size) {
        if (product.getVariants() == null) {
            return null;
        }

        for (SanPham.ProductVariant variant : product.getVariants()) {
            boolean colorMatch = (color == null && variant.getColor() == null) ||
                    (color != null && color.equals(variant.getColor()));
            boolean sizeMatch = (size == null && variant.getSize() == null) ||
                    (size != null && size.equals(variant.getSize()));

            if (colorMatch && sizeMatch) {
                return variant;
            }
        }

        return null;
    }

    // Tính giá gốc tổng cộng
    private int calculateOriginalPrice() {
        int totalPrice = 0;
        for (SanPham product : cartItems) {
            if (product.getVariants() != null) {
                for (SanPham.ProductVariant variant : product.getVariants()) {
                    totalPrice += product.getGiagoc() * variant.getQuantity();
                }
            } else {
                // Nếu không có biến thể, sử dụng số lượng tồn kho
                if (product.getInventory() != null) {
                    totalPrice += product.getGiagoc() * product.getInventory().getQuantityOnHand();
                }
            }
        }
        return totalPrice;
    }

    // Tính giá cuối cùng (sau khuyến mãi)
    private int calculateFinalPrice() {
        int totalPrice = 0;
        for (SanPham product : cartItems) {
            if (product.getVariants() != null) {
                for (SanPham.ProductVariant variant : product.getVariants()) {
                    totalPrice += product.getGiasanpham() * variant.getQuantity();
                }
            } else {
                // Nếu không có biến thể, sử dụng số lượng tồn kho
                if (product.getInventory() != null) {
                    totalPrice += product.getGiasanpham() * product.getInventory().getQuantityOnHand();
                }
            }
        }
        return totalPrice;
    }

    // Tính tổng tiền được giảm giá
    private int calculateTotalDiscount() {
        return calculateOriginalPrice() - calculateFinalPrice();
    }

    private void anhxa() {
        lvcart = findViewById(R.id.lvcart);
        tvTotalMoney = findViewById(R.id.tvtotalmoney);
        tvEmptyCart = findViewById(R.id.tvEmptyCart);
        tvPriceCalculation = findViewById(R.id.tvPriceCalculation);
        btnMua = findViewById(R.id.btnPayPal);
        btnContinueShopping = findViewById(R.id.btnContinueShopping);
        btnClearCart = findViewById(R.id.btnClearCart);
        tvback = findViewById(R.id.tvback);

        // Ánh xạ các view mới nếu có trong layout
        tvSubtotalValue = findViewById(R.id.tvSubtotalValue);
        tvDiscountValue = findViewById(R.id.tvDiscountValue);
        layoutDiscount = findViewById(R.id.layoutDiscount);
    }

    private void loadCartItems() {
        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
        String jsonCart = preferences.getString("cartItems", "");

        if (!jsonCart.isEmpty()) {
            Gson gson = new Gson();
            Type type = new TypeToken<ArrayList<SanPham>>() {}.getType();
            cartItems = gson.fromJson(jsonCart, type);
        }

        if (cartItems == null) {
            cartItems = new ArrayList<>();
        }
    }

    private void updateCartListView() {
        if (cartItems.isEmpty()) {
            lvcart.setVisibility(View.GONE);
            tvEmptyCart.setVisibility(View.VISIBLE);
            tvPriceCalculation.setVisibility(View.GONE);
            if (layoutDiscount != null) layoutDiscount.setVisibility(View.GONE);
            if (tvSubtotalValue != null) tvSubtotalValue.setVisibility(View.GONE);
            btnMua.setEnabled(false);
            btnMua.setAlpha(0.5f);
        } else {
            lvcart.setVisibility(View.VISIBLE);
            tvEmptyCart.setVisibility(View.GONE);
            tvPriceCalculation.setVisibility(View.VISIBLE);
            if (tvSubtotalValue != null) tvSubtotalValue.setVisibility(View.VISIBLE);

            // Hiển thị layout giảm giá nếu có khuyến mãi
            int totalDiscount = calculateTotalDiscount();
            if (layoutDiscount != null) {
                layoutDiscount.setVisibility(totalDiscount > 0 ? View.VISIBLE : View.GONE);
            }

            btnMua.setEnabled(true);
            btnMua.setAlpha(1.0f);

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
        int originalPrice = calculateOriginalPrice();
        int finalPrice = calculateFinalPrice();
        int totalDiscount = calculateTotalDiscount();

        NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("vi", "VN"));

        // Cập nhật giá cuối cùng
        String formattedFinalPrice = formatter.format(finalPrice) + "đ";
        tvTotalMoney.setText(formattedFinalPrice);
        tvTotalMoney.setTextColor(getResources().getColor(android.R.color.holo_red_light));

        // Cập nhật giá gốc và tiền giảm giá nếu có view tương ứng
        if (tvSubtotalValue != null) {
            tvSubtotalValue.setText(formatter.format(originalPrice) + "đ");
        }

        if (tvDiscountValue != null && totalDiscount > 0) {
            tvDiscountValue.setText("- " + formatter.format(totalDiscount) + "đ");
            if (layoutDiscount != null) {
                layoutDiscount.setVisibility(View.VISIBLE);
            }
        } else if (layoutDiscount != null) {
            layoutDiscount.setVisibility(View.GONE);
        }

        // Cập nhật thông tin tính toán chi tiết
        updatePriceCalculation();
    }

    // Phương thức để hiển thị chi tiết tính toán
    private void updatePriceCalculation() {
        if (cartItems.isEmpty() || tvPriceCalculation == null) {
            if (tvPriceCalculation != null) {
                tvPriceCalculation.setText("");
            }
            return;
        }

        StringBuilder calculationDetails = new StringBuilder();
        NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("vi", "VN"));

        for (SanPham product : cartItems) {
            try {
                for (SanPham.ProductVariant variant : product.getVariants()) {
                    int priceValue = product.getGiasanpham();
                    int quantity = variant.getQuantity();
                    int itemTotal = priceValue * quantity;

                    calculationDetails.append(product.getTensanpham());

                    // Thêm size và màu sắc nếu có
                    if (variant.getSize() != null || variant.getColor() != null) {
                        calculationDetails.append(" (");
                        if (variant.getSize() != null) {
                            calculationDetails.append("Size: ").append(variant.getSize());
                            if (variant.getColor() != null) {
                                calculationDetails.append(", ");
                            }
                        }
                        if (variant.getColor() != null) {
                            calculationDetails.append("Màu: ").append(variant.getColor());
                        }
                        calculationDetails.append(")");
                    }

                    calculationDetails.append(" x ").append(quantity);

                    // Hiển thị giá sau giảm và giá gốc nếu có giảm giá
                    if (product.isOnSale()) {
                        int originalValue = product.getGiagoc();

                        calculationDetails.append(" x ").append(formatter.format(priceValue)).append("đ")
                                .append(" (Giá gốc: ").append(formatter.format(originalValue)).append("đ)")
                                .append(" = ").append(formatter.format(itemTotal)).append("đ")
                                .append("\n");
                    } else {
                        calculationDetails.append(" x ").append(formatter.format(priceValue)).append("đ")
                                .append(" = ").append(formatter.format(itemTotal)).append("đ")
                                .append("\n");
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Lỗi khi tạo chi tiết tính toán cho " + product.getTensanpham(), e);
            }
        }

        // Thêm tổng tiền tạm tính và giảm giá nếu có
        int totalDiscount = calculateTotalDiscount();
        if (totalDiscount > 0) {
            calculationDetails.append("\nTạm tính: ")
                    .append(formatter.format(calculateOriginalPrice())).append("đ")
                    .append("\nGiảm giá: ")
                    .append(formatter.format(totalDiscount)).append("đ");
        }

        // Thêm dòng tổng tiền cuối cùng
        calculationDetails.append("\nThành tiền: ").append(formatter.format(calculateFinalPrice())).append("đ");

        tvPriceCalculation.setText(calculationDetails.toString());
    }

    public void updateProductQuantity(int position, int newQuantity) {
        if (position >= 0 && position < cartItems.size()) {
            SanPham product = cartItems.get(position);
            if (newQuantity <= 0) {
                // Xóa sản phẩm nếu số lượng <= 0
                cartItems.remove(position);
                Toast.makeText(this, "Đã xóa sản phẩm khỏi giỏ hàng", Toast.LENGTH_SHORT).show();
            } else {
                // Cập nhật số lượng sản phẩm
                if (product.getVariants() != null && !product.getVariants().isEmpty()) {
                    product.getVariants().get(0).setQuantity(newQuantity);
                }
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