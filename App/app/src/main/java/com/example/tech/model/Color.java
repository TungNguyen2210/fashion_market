package com.example.tech.model;

public class Color {
    private String id;
    private String name;
    private String description; // Dùng để lưu mã HEX
    private String image;

    public Color(String id, String name, String description, String image) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.image = image;
    }

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    // Phương thức để lấy mã màu HEX từ description
    public String getHexCode() {
        if (description != null && description.contains("#")) {
            // Trích xuất mã HEX từ description nếu có
            return description.replaceAll(".*?(#[0-9A-Fa-f]{6}).*", "$1").toLowerCase();
        }
        return "#000000"; // Mã màu mặc định
    }
}