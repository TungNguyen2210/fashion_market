package com.example.tech.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class SanPham implements Serializable {

    public String idsanpham;
    public String idchude;
    public String tensanpham;
    public int giasanpham;
    public int giagoc;
    public String hinhsanpham;
    public String motasanpham;
    public List<String> colors; // Danh sách màu sắc
    public List<String> sizes; // Danh sách kích thước
    public List<ProductVariant> variants; // Danh sách biến thể sản phẩm
    public Inventory inventory; // Thông tin tồn kho tổng

    public SanPham(){
        this.colors = new ArrayList<>();
        this.sizes = new ArrayList<>();
        this.variants = new ArrayList<>();
    }

    public SanPham(String idsanpham, String idchude, String tensanpham, int giasanpham, String hinhsanpham, String motasanpham) {
        this.idsanpham = idsanpham;
        this.idchude = idchude;
        this.tensanpham = tensanpham;
        this.giasanpham = giasanpham;
        this.giagoc = giasanpham;
        this.hinhsanpham = hinhsanpham;
        this.motasanpham = motasanpham;
        this.colors = new ArrayList<>();
        this.sizes = new ArrayList<>();
        this.variants = new ArrayList<>();
    }

    // Constructor mới với giá gốc và giá giảm
    public SanPham(String idsanpham, String idchude, String tensanpham, int giagoc, int giasanpham, String hinhsanpham, String motasanpham) {
        this.idsanpham = idsanpham;
        this.idchude = idchude;
        this.tensanpham = tensanpham;
        this.giagoc = giagoc;
        this.giasanpham = giasanpham;
        this.hinhsanpham = hinhsanpham;
        this.motasanpham = motasanpham;
        this.colors = new ArrayList<>();
        this.sizes = new ArrayList<>();
        this.variants = new ArrayList<>();
    }

    public String getIdsanpham() {
        return idsanpham;
    }

    public void setIdsanpham(String idsanpham) {
        this.idsanpham = idsanpham;
    }

    public String getIdchude() {
        return idchude;
    }

    public void setIdchude(String idchude) {
        this.idchude = idchude;
    }

    public String getTensanpham() {
        return tensanpham;
    }

    public void setTensanpham(String tensanpham) {
        this.tensanpham = tensanpham;
    }

    public int getGiasanpham() {
        return giasanpham;
    }

    public void setGiasanpham(int giasanpham) {
        this.giasanpham = giasanpham;
    }

    public int getGiagoc() {
        return giagoc;
    }

    public void setGiagoc(int giagoc) {
        this.giagoc = giagoc;
    }

    public String getHinhsanpham() {
        return hinhsanpham;
    }

    public void setHinhsanpham(String hinhsanpham) {
        this.hinhsanpham = hinhsanpham;
    }

    public String getMotasanpham() {
        return motasanpham;
    }

    public void setMotasanpham(String motasanpham) {
        this.motasanpham = motasanpham;
    }

    public List<String> getColors() {
        return colors;
    }

    public void setColors(List<String> colors) {
        this.colors = colors;
    }

    public List<String> getSizes() {
        return sizes;
    }

    public void setSizes(List<String> sizes) {
        this.sizes = sizes;
    }

    public List<ProductVariant> getVariants() {
        return variants;
    }

    public void setVariants(List<ProductVariant> variants) {
        this.variants = variants;
    }

    public Inventory getInventory() {
        return inventory;
    }

    public void setInventory(Inventory inventory) {
        this.inventory = inventory;
    }

    // Phương thức tiện ích để kiểm tra sản phẩm có đang giảm giá không
    public boolean isOnSale() {
        return giagoc > giasanpham && giasanpham > 0;
    }

    // Phương thức tính phần trăm giảm giá
    public int getDiscountPercentage() {
        if (giagoc <= 0) return 0;
        return (int) (100 - ((float)giasanpham / giagoc * 100));
    }

    // Kiểm tra tổng số lượng tồn kho của tất cả các biến thể
    public int getTotalStock() {
        if (variants != null && !variants.isEmpty()) {
            int totalStock = 0;
            for (ProductVariant variant : variants) {
                totalStock += variant.getQuantity();
            }
            return totalStock;
        }

        if (inventory != null) {
            return inventory.quantityOnHand; // Truy cập trực tiếp vào thuộc tính public
        }

        return 0;
    }

    // Kiểm tra xem sản phẩm có còn hàng không
    public boolean isInStock() {
        return getTotalStock() > 0;
    }

    // Lớp ProductVariant để lưu thông tin biến thể sản phẩm
    public static class ProductVariant implements Serializable {
        public String variantId;
        public String color;
        public String size;
        public int quantity;

        public ProductVariant() {
        }

        public ProductVariant(String variantId, String color, String size, int quantity) {
            this.variantId = variantId;
            this.color = color;
            this.size = size;
            this.quantity = quantity;
        }

        public String getVariantId() {
            return variantId;
        }

        public void setVariantId(String variantId) {
            this.variantId = variantId;
        }

        public String getColor() {
            return color;
        }

        public void setColor(String color) {
            this.color = color;
        }

        public String getSize() {
            return size;
        }

        public void setSize(String size) {
            this.size = size;
        }

        public int getQuantity() {
            return quantity;
        }

        public void setQuantity(int quantity) {
            this.quantity = quantity;
        }
    }

    // Lớp Inventory để lưu thông tin tồn kho
    public static class Inventory implements Serializable {
        public int quantityOnHand; // Đổi từ private sang public
        public String _id; // Đổi từ private sang public

        public Inventory() {
        }

        public Inventory(int quantityOnHand, String _id) {
            this.quantityOnHand = quantityOnHand;
            this._id = _id;
        }

        public int getQuantityOnHand() {
            return quantityOnHand;
        }

        public void setQuantityOnHand(int quantityOnHand) {
            this.quantityOnHand = quantityOnHand;
        }

        public String get_id() {
            return _id;
        }

        public void set_id(String _id) {
            this._id = _id;
        }
    }
}