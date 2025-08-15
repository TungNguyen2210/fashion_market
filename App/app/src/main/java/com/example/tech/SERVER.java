package com.example.tech;

public class SERVER {
    // Server IP
    public static String serverip = "http://10.0.2.2:3100";

    // API Gateway
    public static String gatewayip = "http://10.0.2.2:3300";

    // Endpoint paths
    public static String chudepath = serverip + "/api/category/search";
    public static String laysanphampath = serverip + "/api/product/search";
    public static String imagepath = serverip + "/api/hinhanh/";
    public static String slidepath = serverip + "/api/slide/";
    public static String forgotpassword = serverip + "/booking/process_forgot_password.php";

    // API Reviews
    public static String directReviewApi = serverip + "/api/reviews/";  // API trực tiếp
    public static String gatewayReviewApi = gatewayip + "/api/order/reviews/";  // API qua gateway

    // Các API khác
    public static String login = serverip + "/api/auth/login";
    public static String signUp = serverip + "/api/auth/register";
    public static String sanpham = serverip + "/api/product";
}