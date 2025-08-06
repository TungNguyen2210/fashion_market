package com.example.tech.model;

import java.util.ArrayList;
import java.util.List;

public class Product {
    private String id;
    private String name;
    private String price;           // Giữ nguyên, sẽ sử dụng cho giá gốc
    private String promotionPrice;  // Giữ nguyên, sẽ sử dụng cho giá khuyến mãi
    private String imageUrl;
    private int quantity;
    private List<String> sizes;
    private List<String> colors;
    private String selectedSize;
    private String selectedColor;

    // Tạo một danh sách static để lưu trữ giỏ hàng
    public static ArrayList<Product> cartItems = new ArrayList<>();

    // Constructor đầy đủ
    public Product(String id, String name, String price, String promotionPrice, String imageUrl, int quantity,
                   List<String> sizes, List<String> colors) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.promotionPrice = promotionPrice;
        this.imageUrl = imageUrl;
        this.quantity = quantity;
        this.sizes = sizes;
        this.colors = colors;
    }

    // Constructor cho giỏ hàng có cả giá gốc và giá khuyến mãi
    public Product(String id, String name, String price, String promotionPrice, String imageUrl, int quantity,
                   String selectedSize, String selectedColor) {
        this.id = id;
        this.name = name;
        this.price = price;  // Giá gốc
        this.promotionPrice = promotionPrice;  // Giá khuyến mãi
        this.imageUrl = imageUrl;
        this.quantity = quantity;
        this.selectedSize = selectedSize;
        this.selectedColor = selectedColor;
    }

    // Constructor cho giỏ hàng không có giá khuyến mãi
    public Product(String id, String name, String price, String imageUrl, int quantity,
                   String selectedSize, String selectedColor) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.promotionPrice = null; // Không có khuyến mãi
        this.imageUrl = imageUrl;
        this.quantity = quantity;
        this.selectedSize = selectedSize;
        this.selectedColor = selectedColor;
    }

    // Constructor đơn giản
    public Product(String id, String name, String price, String imageUrl, int quantity) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.promotionPrice = null; // Không có khuyến mãi
        this.imageUrl = imageUrl;
        this.quantity = quantity;
    }

    // Constructor đơn giản hơn
    public Product(String name, String price, String imageUrl) {
        this.name = name;
        this.price = price;
        this.promotionPrice = null; // Không có khuyến mãi
        this.imageUrl = imageUrl;
        this.quantity = 1;
    }

    // Getters và setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPrice() {
        return price;
    }

    public void setPrice(String price) {
        this.price = price;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    // Getter và setter cho các trường mới
    public String getPromotionPrice() {
        return promotionPrice;
    }

    public void setPromotionPrice(String promotionPrice) {
        this.promotionPrice = promotionPrice;
    }

    public List<String> getSizes() {
        return sizes;
    }

    public void setSizes(List<String> sizes) {
        this.sizes = sizes;
    }

    public List<String> getColors() {
        return colors;
    }

    public void setColors(List<String> colors) {
        this.colors = colors;
    }

    public String getSelectedSize() {
        return selectedSize;
    }

    public void setSelectedSize(String selectedSize) {
        this.selectedSize = selectedSize;
    }

    public String getSelectedColor() {
        return selectedColor;
    }

    public void setSelectedColor(String selectedColor) {
        this.selectedColor = selectedColor;
    }

    // Phương thức hỗ trợ - kiểm tra xem sản phẩm có giảm giá hay không
    public boolean hasDiscount() {
        if (promotionPrice == null || price == null) return false;

        try {
            String numericPrice = price.replaceAll("[\\D]", "");
            String numericPromo = promotionPrice.replaceAll("[\\D]", "");

            if (numericPrice.isEmpty() || numericPromo.isEmpty()) return false;

            int originalPrice = Integer.parseInt(numericPrice);
            int promoPrice = Integer.parseInt(numericPromo);

            return promoPrice < originalPrice;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    // Phương thức để lấy giá hiển thị (giá khuyến mãi nếu có, giá gốc nếu không)
    public String getDisplayPrice() {
        if (hasDiscount()) {
            return promotionPrice;
        }
        return price;
    }
}