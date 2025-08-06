package com.example.tech.adapter;

import android.content.Context;
import android.graphics.Paint;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.example.tech.R;
import com.example.tech.model.OrderItem;
import com.example.tech.utils.CurrencyFormatter;

import java.util.List;

public class OrderProductAdapter extends RecyclerView.Adapter<OrderProductAdapter.ViewHolder> {

    private Context context;
    private List<OrderItem> orderItems;

    public OrderProductAdapter(Context context, List<OrderItem> orderItems) {
        this.context = context;
        this.orderItems = orderItems;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_order_product, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        OrderItem item = orderItems.get(position);

        // Thiết lập tên sản phẩm
        holder.tvProductName.setText(item.getProductName() != null ?
                item.getProductName() : "Sản phẩm không xác định");

        // Thiết lập ID sản phẩm
        holder.tvProductId.setText("ID: " + item.getProductId());

        // Xử lý hiển thị giá
        if (item.isDiscounted()) {
            // Nếu có giảm giá, hiển thị cả giá gốc và giá giảm
            holder.tvOriginalPrice.setVisibility(View.VISIBLE);
            holder.tvOriginalPrice.setText(CurrencyFormatter.format(item.getOriginalPrice()));
            holder.tvOriginalPrice.setPaintFlags(holder.tvOriginalPrice.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);

            // Hiển thị badge giảm giá
            holder.tvDiscountBadge.setVisibility(View.VISIBLE);
            holder.tvDiscountBadge.setText("-" + item.getDiscountPercentage() + "%");
        } else {
            // Nếu không giảm giá, chỉ hiển thị giá bình thường
            holder.tvOriginalPrice.setVisibility(View.GONE);
            holder.tvDiscountBadge.setVisibility(View.GONE);
        }

        // Luôn hiển thị giá hiện tại
        holder.tvProductPrice.setText(CurrencyFormatter.format(item.getPrice()));

        // Thiết lập số lượng
        holder.tvProductQuantity.setText(String.valueOf(item.getQuantity()));

        // Tải hình ảnh sản phẩm (nếu có)
        if (item.getProductImage() != null && !item.getProductImage().isEmpty()) {
            Glide.with(context)
                    .load(item.getProductImage())
                    .placeholder(R.drawable.ic_shopping_bag)
                    .error(R.drawable.ic_shopping_bag)
                    .into(holder.ivProductImage);
        } else {
            holder.ivProductImage.setImageResource(R.drawable.ic_shopping_bag);
        }
    }

    @Override
    public int getItemCount() {
        return orderItems != null ? orderItems.size() : 0;
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        ImageView ivProductImage;
        TextView tvProductName, tvProductId, tvProductPrice, tvOriginalPrice, tvProductQuantity, tvDiscountBadge;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            ivProductImage = itemView.findViewById(R.id.ivProductImage);
            tvProductName = itemView.findViewById(R.id.tvProductName);
            tvProductId = itemView.findViewById(R.id.tvProductId);
            tvProductPrice = itemView.findViewById(R.id.tvProductPrice);
            tvOriginalPrice = itemView.findViewById(R.id.tvOriginalPrice);
            tvProductQuantity = itemView.findViewById(R.id.tvProductQuantity);
            tvDiscountBadge = itemView.findViewById(R.id.tvDiscountBadge);
        }
    }
}