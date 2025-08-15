package com.example.tech.model;

import java.io.Serializable;

public class OrderItem implements Serializable {
    private String id;
    private String productId;
    private String productName;
    private String productImage;
    private int quantity;
    private int price;
    private boolean rated;
    private Integer rating;
    private String comment;
    private String size;
    private String color;
    private String variantId;
    private String displayName;
    private boolean needLoadDetails; // Thêm trường mới này

    public OrderItem() {
        // Constructor mặc định
    }

    // Getter và Setter cho các thuộc tính

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

    public boolean isRated() {
        return rated;
    }

    public void setRated(boolean rated) {
        this.rated = rated;
    }

    public Integer getRating() {
        return rating;
    }

    public void setRating(Integer rating) {
        this.rating = rating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getSize() {
        return size;
    }

    public void setSize(String size) {
        this.size = size;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getVariantId() {
        return variantId;
    }

    public void setVariantId(String variantId) {
        this.variantId = variantId;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public boolean isNeedLoadDetails() {
        return needLoadDetails;
    }

    public void setNeedLoadDetails(boolean needLoadDetails) {
        this.needLoadDetails = needLoadDetails;
    }

    // Phương thức tiện ích để tính tổng giá
    public int getTotalPrice() {
        return price * quantity;
    }
}