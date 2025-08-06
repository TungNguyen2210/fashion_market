package com.example.tech.adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.tech.R;
import com.example.tech.model.ChuDe;
import com.google.android.material.card.MaterialCardView;

import java.util.ArrayList;

public class ChuDeAdapter extends RecyclerView.Adapter<ChuDeAdapter.KHUNGNHIN_CHUDE> {
    ArrayList<ChuDe> data;
    Context context;
    private int selectedPosition = -1; // -1 nghĩa là không có mục nào được chọn

    private OnCategoryClickListener listener;

    // Interface để xử lý sự kiện click
    public interface OnCategoryClickListener {
        void onCategoryClick(ChuDe chuDe, int position);
    }

    public void setOnCategoryClickListener(OnCategoryClickListener listener) {
        this.listener = listener;
    }

    public ChuDeAdapter(ArrayList<ChuDe> data, Context context) {
        this.data = data;
        this.context = context;
    }

    @NonNull
    @Override
    public KHUNGNHIN_CHUDE onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_chude, parent, false);
        return new KHUNGNHIN_CHUDE(view);
    }

    @Override
    public void onBindViewHolder(@NonNull KHUNGNHIN_CHUDE holder, int position) {
        ChuDe cd = data.get(position);
        holder.tvTenChude.setText(cd.getTenchude());

        // Thiết lập trạng thái UI dựa vào vị trí được chọn
        if (selectedPosition == position) {
            try {
                holder.cardView.setCardBackgroundColor(context.getResources().getColor(R.color.category_selected));
                holder.tvTenChude.setTextColor(context.getResources().getColor(R.color.white));
            } catch (Exception e) {
                holder.cardView.setCardBackgroundColor(0xFF0066CC);
                holder.tvTenChude.setTextColor(0xFFFFFFFF);
            }
            holder.cardView.setCardElevation(8f);
        } else {
            try {
                holder.cardView.setCardBackgroundColor(context.getResources().getColor(R.color.white));
                holder.tvTenChude.setTextColor(context.getResources().getColor(R.color.text_primary));
            } catch (Exception e) {
                holder.cardView.setCardBackgroundColor(0xFFFFFFFF);
                holder.tvTenChude.setTextColor(0xFF333333);
            }
            holder.cardView.setCardElevation(2f);
        }

        // Xử lý sự kiện click
        holder.itemView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                int clickedPosition = holder.getAdapterPosition();

                // Kiểm tra nếu người dùng click vào danh mục đang được chọn
                if (selectedPosition == clickedPosition) {
                    // Bỏ chọn danh mục hiện tại
                    selectedPosition = -1;
                    notifyItemChanged(clickedPosition);
                } else {
                    // Chọn danh mục mới
                    int previousSelected = selectedPosition;
                    selectedPosition = clickedPosition;

                    // Cập nhật UI cho cả item cũ và mới
                    if (previousSelected != -1) {
                        notifyItemChanged(previousSelected);
                    }
                    notifyItemChanged(selectedPosition);
                }

                // Gọi callback khi click
                if (listener != null) {
                    listener.onCategoryClick(cd, selectedPosition);
                }
            }
        });
    }

    @Override
    public int getItemCount() {
        return data.size();
    }

    class KHUNGNHIN_CHUDE extends RecyclerView.ViewHolder {
        TextView tvTenChude;
        MaterialCardView cardView;

        public KHUNGNHIN_CHUDE(@NonNull View itemView) {
            super(itemView);
            tvTenChude = itemView.findViewById(R.id.tvChude);
            cardView = itemView.findViewById(R.id.card_chude);
        }
    }

    // Phương thức để thiết lập vị trí được chọn
    public void setSelectedPosition(int position) {
        int previousSelected = selectedPosition;
        selectedPosition = position;

        // Cập nhật UI cho các mục đã thay đổi
        if (previousSelected != -1) {
            notifyItemChanged(previousSelected);
        }
        if (position != -1) {
            notifyItemChanged(position);
        }
    }

    // Phương thức để lấy vị trí được chọn hiện tại
    public int getSelectedPosition() {
        return selectedPosition;
    }

    // Phương thức để xóa chọn
    public void clearSelection() {
        int previousSelected = selectedPosition;
        selectedPosition = -1;

        // Cập nhật UI nếu cần
        if (previousSelected != -1) {
            notifyItemChanged(previousSelected);
        }
    }
}