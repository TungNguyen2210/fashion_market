package com.example.tech.model;

import java.io.Serializable;

public class SanPham implements Serializable {

    public String idsanpham;
    public String idchude;
    public String tensanpham;
    public int giasanpham;
    public int giagoc;
    public String hinhsanpham;
    public String motasanpham;

    public SanPham(){}

    public SanPham(String idsanpham, String idchude, String tensanpham, int giasanpham, String hinhsanpham, String motasanpham) {
        this.idsanpham = idsanpham;
        this.idchude = idchude;
        this.tensanpham = tensanpham;
        this.giasanpham = giasanpham;
        this.giagoc = giasanpham;
        this.hinhsanpham = hinhsanpham;
        this.motasanpham = motasanpham;
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

    // Phương thức tiện ích để kiểm tra sản phẩm có đang giảm giá không
    public boolean isOnSale() {
        return giagoc > giasanpham && giasanpham > 0;
    }

    // Phương thức tính phần trăm giảm giá
    public int getDiscountPercentage() {
        if (giagoc <= 0) return 0;
        return (int) (100 - ((float)giasanpham / giagoc * 100));
    }
}