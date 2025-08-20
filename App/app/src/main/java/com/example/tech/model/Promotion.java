package com.example.tech.model;

import java.util.Date;

public class Promotion {
    private String _id;
    private String maKhuyenMai;
    private int phanTramKhuyenMai;
    private String thoiGianBD;
    private String thoiGianKT;
    private int __v;

    // Constructors
    public Promotion() {}

    public Promotion(String _id, String maKhuyenMai, int phanTramKhuyenMai,
                     String thoiGianBD, String thoiGianKT, int __v) {
        this._id = _id;
        this.maKhuyenMai = maKhuyenMai;
        this.phanTramKhuyenMai = phanTramKhuyenMai;
        this.thoiGianBD = thoiGianBD;
        this.thoiGianKT = thoiGianKT;
        this.__v = __v;
    }

    // Getters and Setters
    public String get_id() {
        return _id;
    }

    public void set_id(String _id) {
        this._id = _id;
    }

    public String getMaKhuyenMai() {
        return maKhuyenMai;
    }

    public void setMaKhuyenMai(String maKhuyenMai) {
        this.maKhuyenMai = maKhuyenMai;
    }

    public int getPhanTramKhuyenMai() {
        return phanTramKhuyenMai;
    }

    public void setPhanTramKhuyenMai(int phanTramKhuyenMai) {
        this.phanTramKhuyenMai = phanTramKhuyenMai;
    }

    public String getThoiGianBD() {
        return thoiGianBD;
    }

    public void setThoiGianBD(String thoiGianBD) {
        this.thoiGianBD = thoiGianBD;
    }

    public String getThoiGianKT() {
        return thoiGianKT;
    }

    public void setThoiGianKT(String thoiGianKT) {
        this.thoiGianKT = thoiGianKT;
    }

    public int get__v() {
        return __v;
    }

    public void set__v(int __v) {
        this.__v = __v;
    }

    /**
     * Check if promotion is currently valid
     */
    public boolean isValid() {
        try {
            long currentTime = System.currentTimeMillis();
            long startTime = parseDate(thoiGianBD);
            long endTime = parseDate(thoiGianKT);

            return currentTime >= startTime && currentTime <= endTime;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Parse ISO date string to timestamp
     */
    private long parseDate(String dateString) {
        try {
            // Remove 'Z' and convert to timestamp
            String cleanDate = dateString.replace("Z", "");
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS");
            sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            return sdf.parse(cleanDate).getTime();
        } catch (Exception e) {
            return 0;
        }
    }

    @Override
    public String toString() {
        return "Promotion{" +
                "_id='" + _id + '\'' +
                ", maKhuyenMai='" + maKhuyenMai + '\'' +
                ", phanTramKhuyenMai=" + phanTramKhuyenMai +
                ", thoiGianBD='" + thoiGianBD + '\'' +
                ", thoiGianKT='" + thoiGianKT + '\'' +
                ", __v=" + __v +
                '}';
    }
}