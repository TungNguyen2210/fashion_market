package com.example.tech.model;

public class OrderItem {
    private String id;
    private String productId;
    private int quantity;
    private int price;
    private int originalPrice;
    private String productName;
    private String productImage;

    public OrderItem() {
    }

    public OrderItem(String id, String productId, int quantity, int price) {
        this.id = id;
        this.productId = productId;
        this.quantity = quantity;
        this.price = price;
        this.originalPrice = price;
    }

    // Constructor mới có giá gốc
    public OrderItem(String id, String productId, int quantity, int originalPrice, int price) {
        this.id = id;
        this.productId = productId;
        this.quantity = quantity;
        this.originalPrice = originalPrice;
        this.price = price;
    }

    // Getters và Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public int getPrice() {
        return price;
    }

    public void setPrice(int price) {
        this.price = price;
    }

    public int getOriginalPrice() {
        return originalPrice;
    }

    public void setOriginalPrice(int originalPrice) {
        this.originalPrice = originalPrice;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public String getProductImage() {
        return productImage;
    }

    public void setProductImage(String productImage) {
        this.productImage = productImage;
    }

    // Tính tổng tiền cho sản phẩm này
    public int getTotalPrice() {
        return price * quantity;
    }

    // Kiểm tra sản phẩm có đang giảm giá không
    public boolean isDiscounted() {
        return originalPrice > price && price > 0;
    }

    // Tính phần trăm giảm giá
    public int getDiscountPercentage() {
        if (originalPrice <= 0) return 0;
        return (int) (100 - ((float)price / originalPrice * 100));
    }
}