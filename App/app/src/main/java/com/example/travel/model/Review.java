package com.example.travel.model;

public class Review {
    private String content;
    private String rating;
    private String username;
    private String time;

    public Review(String content, String rating, String username, String time) {
        this.content = content;
        this.rating = rating;
        this.username = username;
        this.time = time;
    }

    public String getContent() {
        return content;
    }

    public String getRating() {
        return rating;
    }

    public String getUsername() {
        return username;
    }

    public String getTime() {
        return time;
    }
}
