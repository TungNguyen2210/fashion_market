package com.example.travel.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.travel.R;
import com.example.travel.model.Review;

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
        holder.tvReviewContent.setText(review.getContent());
        holder.tvReviewRating.setText("Rating: " + review.getRating());
        holder.tvReviewUsername.setText("Username: " + review.getUsername());
        holder.tvReviewTime.setText("Time: " + review.getTime());
    }

    @Override
    public int getItemCount() {
        return reviewList.size();
    }

    public static class ReviewViewHolder extends RecyclerView.ViewHolder {
        TextView tvReviewContent;
        TextView tvReviewRating;
        TextView tvReviewUsername;
        TextView tvReviewTime;

        public ReviewViewHolder(@NonNull View itemView) {
            super(itemView);
            tvReviewContent = itemView.findViewById(R.id.tvReviewContent);
            tvReviewRating = itemView.findViewById(R.id.tvReviewRating);
            tvReviewUsername = itemView.findViewById(R.id.tvReviewUsername);
            tvReviewTime = itemView.findViewById(R.id.tvReviewTime);
        }
    }
}

