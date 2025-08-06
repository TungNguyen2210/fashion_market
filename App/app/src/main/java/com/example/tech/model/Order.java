package com.example.tech.model;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class Order {
    private String id;
    private String userId;
    private String username;
    private List<OrderItem> products;
    private int orderTotal;
    private String address;
    private String billing;
    private String status;
    private String description;
    private Date createdAt;
    private Date updatedAt;

    public Order() {
        products = new ArrayList<>();
    }

    public Order(String id, String userId, String username, List<OrderItem> products, int orderTotal, String address,
                 String billing, String status, String description, Date createdAt, Date updatedAt) {
        this.id = id;
        this.userId = userId;
        this.username = username;
        this.products = products;
        this.orderTotal = orderTotal;
        this.address = address;
        this.billing = billing;
        this.status = status;
        this.description = description;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters và Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public List<OrderItem> getProducts() {
        return products;
    }

    public void setProducts(List<OrderItem> products) {
        this.products = products;
    }

    public int getOrderTotal() {
        return orderTotal;
    }

    public void setOrderTotal(int orderTotal) {
        this.orderTotal = orderTotal;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getBilling() {
        return billing;
    }

    public void setBilling(String billing) {
        this.billing = billing;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public Date getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Date updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Phương thức tiện ích để hiển thị trạng thái đơn hàng bằng tiếng Việt
    public String getStatusInVietnamese() {
        if (status == null) return "Không xác định";

        switch (status.toLowerCase()) {
            case "pending":
                return "Chờ xác nhận";
            case "approved":
                return "Đã xác nhận";
            case "processing":
                return "Đang xử lý";
            case "shipped":
                return "Đang giao hàng";
            case "final":
            case "delivered":
                return "Đã giao hàng";
            case "rejected":
            case "cancelled":
                return "Đã hủy";
            default:
                return "Không xác định";
        }
    }

    // Phương thức tiện ích để hiển thị phương thức thanh toán bằng tiếng Việt
    public String getBillingInVietnamese() {
        if (billing == null) return "";

        switch (billing.toLowerCase()) {
            case "cod":
                return "Thanh toán khi nhận hàng";
            case "paypal":
                return "PayPal";
            case "bank":
                return "Chuyển khoản ngân hàng";
            case "momo":
                return "Ví MoMo";
            default:
                return billing;
        }
    }
}