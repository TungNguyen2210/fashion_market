package com.example.tech.model;

import com.google.gson.annotations.SerializedName;

public class News {
    @SerializedName("_id")  // Thay vì "id"
    private String id;

    @SerializedName("name")  // Thay vì "title"
    private String title;

    @SerializedName("description")  // Thay vì "content"
    private String content;

    @SerializedName("image")
    private String image;

    @SerializedName("createdAt")
    private String createdAt;

    @SerializedName("updatedAt")
    private String updatedAt;

    // Trường mới để phù hợp với JSON
    @SerializedName("__v")
    private int version;

    // Getters and Setters giữ nguyên
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    // Thêm phương thức helper để lấy summary từ content
    public String getSummary() {
        if (content == null) return null;

        // Loại bỏ thẻ HTML
        String plainText = content.replaceAll("<[^>]*>", "");

        // Giới hạn độ dài
        if (plainText.length() > 100) {
            return plainText.substring(0, 100) + "...";
        }

        return plainText;
    }

    // Thêm toString() để debug
    @Override
    public String toString() {
        return "News{" +
                "id='" + id + '\'' +
                ", title='" + title + '\'' +
                ", image='" + image + '\'' +
                ", createdAt='" + createdAt + '\'' +
                '}';
    }
}