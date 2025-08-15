package com.example.tech.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.RatingBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.tech.R;
import com.example.tech.model.Review;

import java.util.List;

public class ReviewAdapter extends RecyclerView.Adapter<ReviewAdapter.ReviewViewHolder> {

    private List<Review> reviewList;

    public ReviewAdapter(List<Review> reviewList) {
        this.reviewList = reviewList;
    }

    @NonNull
    @Override
    public ReviewViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.review_item, parent, false);
        return new ReviewViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ReviewViewHolder holder, int position) {
        Review review = reviewList.get(position);

        holder.tvUsername.setText(review.getUsername());
        holder.tvComment.setText(review.getComment());
        holder.tvDateTime.setText(review.getDateTime());

        try {
            float rating = Float.parseFloat(review.getRating());
            holder.ratingBar.setRating(rating);
        } catch (NumberFormatException e) {
            holder.ratingBar.setRating(0);
        }
    }

    @Override
    public int getItemCount() {
        return reviewList.size();
    }

    public static class ReviewViewHolder extends RecyclerView.ViewHolder {
        TextView tvUsername, tvComment, tvDateTime;
        RatingBar ratingBar;

        public ReviewViewHolder(@NonNull View itemView) {
            super(itemView);
            tvUsername = itemView.findViewById(R.id.tvReviewUsername);
            tvComment = itemView.findViewById(R.id.tvReviewComment);
            tvDateTime = itemView.findViewById(R.id.tvReviewDateTime);
            ratingBar = itemView.findViewById(R.id.reviewRatingBar);
        }
    }
}