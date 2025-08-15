package com.example.tech.model;

import java.io.Serializable;

public class Review implements Serializable {
    private String comment;
    private String rating;
    private String username;
    private String dateTime;

    public Review(String comment, String rating, String username, String dateTime) {
        this.comment = comment;
        this.rating = rating;
        this.username = username;
        this.dateTime = dateTime;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getRating() {
        return rating;
    }

    public void setRating(String rating) {
        this.rating = rating;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getDateTime() {
        return dateTime;
    }

    public void setDateTime(String dateTime) {
        this.dateTime = dateTime;
    }
}