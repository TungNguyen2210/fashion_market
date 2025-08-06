package com.example.tech.adapter;

import android.content.Context;
import android.text.Html;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.example.tech.R;
import com.example.tech.model.News;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class NewsAdapter extends RecyclerView.Adapter<NewsAdapter.NewsViewHolder> {

    private static final String TAG = "NewsAdapter";
    private Context context;
    private List<News> newsList;
    private OnNewsItemClickListener listener;

    public interface OnNewsItemClickListener {
        void onNewsItemClick(News news);
    }

    public NewsAdapter(Context context, List<News> newsList, OnNewsItemClickListener listener) {
        this.context = context;
        this.newsList = newsList;
        this.listener = listener;
    }

    @NonNull
    @Override
    public NewsViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_news, parent, false);
        return new NewsViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull NewsViewHolder holder, int position) {
        News news = newsList.get(position);

        // Debug log
        Log.d(TAG, "Binding news at position " + position + ": " + news.toString());

        // Hiển thị tiêu đề
        if (news.getTitle() != null) {
            holder.tvTitle.setText(news.getTitle());
            holder.tvTitle.setVisibility(View.VISIBLE);
        } else {
            holder.tvTitle.setVisibility(View.GONE);
        }

        // Hiển thị tóm tắt
        String summary = news.getSummary();
        if (summary != null && !summary.isEmpty()) {
            holder.tvSummary.setText(summary);
            holder.tvSummary.setVisibility(View.VISIBLE);
        } else {
            holder.tvSummary.setVisibility(View.GONE);
        }

        // Định dạng lại ngày tạo
        if (news.getCreatedAt() != null && !news.getCreatedAt().isEmpty()) {
            try {
                SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                SimpleDateFormat outputFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault());
                Date date = inputFormat.parse(news.getCreatedAt());
                holder.tvDate.setText(outputFormat.format(date));
                holder.tvDate.setVisibility(View.VISIBLE);
            } catch (ParseException e) {
                holder.tvDate.setText(news.getCreatedAt());
                Log.e(TAG, "Error parsing date: " + e.getMessage());
            }
        } else {
            holder.tvDate.setVisibility(View.GONE);
        }

        // Tải hình ảnh
        if (news.getImage() != null && !news.getImage().isEmpty()) {
            String imageUrl = news.getImage();

            // Sửa URL hình ảnh
            if (imageUrl.contains("localhost")) {
                imageUrl = imageUrl.replace("localhost", "10.0.2.2");
            }

            // Sửa ký tự '\' trong URL
            imageUrl = imageUrl.replace("\\\\", "/");
            imageUrl = imageUrl.replace("\\", "/");

            Log.d(TAG, "Loading image from URL: " + imageUrl);

            Glide.with(context)
                    .load(imageUrl)
                    .placeholder(R.drawable.placeholder_image)
                    .error(R.drawable.error_image)
                    .into(holder.imgNews);
            holder.imgNews.setVisibility(View.VISIBLE);
        } else {
            holder.imgNews.setVisibility(View.GONE);
        }

        // Xử lý sự kiện click
        holder.cardView.setOnClickListener(v -> {
            if (listener != null) {
                Log.d(TAG, "News clicked: " + news.getId());
                listener.onNewsItemClick(news);
            }
        });
    }

    @Override
    public int getItemCount() {
        return newsList.size();
    }

    public static class NewsViewHolder extends RecyclerView.ViewHolder {
        CardView cardView;
        ImageView imgNews;
        TextView tvTitle, tvSummary, tvDate;

        public NewsViewHolder(@NonNull View itemView) {
            super(itemView);
            cardView = itemView.findViewById(R.id.cardView);
            imgNews = itemView.findViewById(R.id.imgNews);
            tvTitle = itemView.findViewById(R.id.tvTitle);
            tvSummary = itemView.findViewById(R.id.tvSummary);
            tvDate = itemView.findViewById(R.id.tvDate);
        }
    }
}