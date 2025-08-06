package com.example.tech.adapter;

import android.content.Context;
import android.graphics.Color;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.tech.R;
import com.example.tech.model.Order;
import com.example.tech.model.OrderItem;
import com.example.tech.utils.CurrencyFormatter;
import com.example.tech.utils.UserManager;

import java.text.SimpleDateFormat;
import java.util.List;
import java.util.Locale;

public class OrderAdapter extends RecyclerView.Adapter<OrderAdapter.ViewHolder> {

    private Context context;
    private List<Order> orderList;
    private OnOrderItemClickListener listener;

    public interface OnOrderItemClickListener {
        void onOrderItemClick(Order order);
    }

    public OrderAdapter(Context context, List<Order> orderList, OnOrderItemClickListener listener) {
        this.context = context;
        this.orderList = orderList;
        this.listener = listener;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_order, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Order order = orderList.get(position);

        // Thiết lập ID đơn hàng
        String orderId = order.getId();
        if (orderId != null && orderId.length() > 8) {
            // Hiển thị một phần của ID để ngắn gọn hơn
            orderId = orderId.substring(orderId.length() - 8);
        }
        holder.tvOrderId.setText("Đơn hàng #" + orderId);

        // Thiết lập ngày đặt hàng
        SimpleDateFormat dateFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());
        if (order.getCreatedAt() != null) {
            holder.tvOrderDate.setText(dateFormat.format(order.getCreatedAt()));
        }

        // Thiết lập tổng tiền đơn hàng
        holder.tvOrderTotal.setText(CurrencyFormatter.format(order.getOrderTotal()));

        // Thiết lập phương thức thanh toán sử dụng phương thức tiện ích
        holder.tvBillingMethod.setText(order.getBillingInVietnamese());

        // Thiết lập trạng thái đơn hàng sử dụng phương thức tiện ích
        holder.tvOrderStatus.setText(order.getStatusInVietnamese());

        // Thiết lập màu sắc cho trạng thái
        if (order.getStatus() != null) {
            switch (order.getStatus().toLowerCase()) {
                case "pending":
                    holder.tvOrderStatus.setTextColor(context.getResources().getColor(R.color.orange));
                    break;
                case "approved":
                case "processing":
                case "shipped":
                    holder.tvOrderStatus.setTextColor(context.getResources().getColor(R.color.blue));
                    break;
                case "final":
                case "delivered":
                    holder.tvOrderStatus.setTextColor(context.getResources().getColor(R.color.teal_700));
                    break;
                case "rejected":
                case "cancelled":
                    holder.tvOrderStatus.setTextColor(Color.RED);
                    break;
                default:
                    holder.tvOrderStatus.setTextColor(Color.GRAY);
                    break;
            }
        }

        // Thiết lập địa chỉ giao hàng
        holder.tvAddress.setText(order.getAddress() != null ? order.getAddress() : "Không có địa chỉ");

        // Thiết lập ghi chú đơn hàng
        String description = order.getDescription();
        if (description != null && !description.isEmpty()) {
            holder.tvDescription.setVisibility(View.VISIBLE);
            holder.tvDescription.setText("Ghi chú: " + description);
        } else {
            holder.tvDescription.setVisibility(View.GONE);
        }

        // Thiết lập thời gian tạo đơn và cập nhật
        SimpleDateFormat datetimeFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault());
        if (order.getCreatedAt() != null) {
            holder.tvCreatedAt.setText(datetimeFormat.format(order.getCreatedAt()));
        }
        if (order.getUpdatedAt() != null) {
            holder.tvUpdatedAt.setText(datetimeFormat.format(order.getUpdatedAt()));
        }

        // Thiết lập thông tin người dùng
        if (order.getUserId() != null) {
            holder.tvUserId.setText("ID: " + order.getUserId());
        }

        // Thiết lập username từ order hoặc từ UserManager nếu có thể
        String username = order.getUsername();
        if (username != null && !username.isEmpty()) {
            holder.tvUsername.setText("Tên tài khoản: " + username);
        } else {
            // Thử lấy username từ UserManager nếu userId trùng khớp với người dùng hiện tại
            UserManager userManager = UserManager.getInstance(context);
            if (userManager.isLoggedIn() && order.getUserId() != null &&
                    order.getUserId().equals(userManager.getUserId())) {
                String currentUsername = userManager.getUsername();
                if (currentUsername != null && !currentUsername.isEmpty()) {
                    holder.tvUsername.setText("Tên tài khoản: " + currentUsername);
                } else {
                    holder.tvUsername.setText("Tên tài khoản: (không có thông tin)");
                }
            } else {
                holder.tvUsername.setText("Tên tài khoản: (không có thông tin)");
            }
        }

        // Thiết lập adapter cho danh sách sản phẩm
        OrderProductAdapter productAdapter = new OrderProductAdapter(context, order.getProducts());
        holder.rvOrderProducts.setLayoutManager(new LinearLayoutManager(context));
        holder.rvOrderProducts.setAdapter(productAdapter);

        // Thiết lập sự kiện click cho toàn bộ item
        holder.itemView.setOnClickListener(v -> {
            if (listener != null) {
                listener.onOrderItemClick(order);
            }
        });
    }

    @Override
    public int getItemCount() {
        return orderList.size();
    }

    // Phương thức mới để cập nhật một sản phẩm cụ thể
    public void updateProductItem(String productId) {
        // Tìm vị trí của sản phẩm trong các đơn hàng và cập nhật
        for (int i = 0; i < orderList.size(); i++) {
            Order order = orderList.get(i);
            boolean updated = false;

            if (order.getProducts() != null) {
                for (OrderItem item : order.getProducts()) {
                    if (productId.equals(item.getProductId())) {
                        updated = true;
                        break;
                    }
                }
            }

            if (updated) {
                notifyItemChanged(i);
            }
        }
    }

    public static class ViewHolder extends RecyclerView.ViewHolder {
        TextView tvOrderId, tvOrderDate, tvOrderTotal, tvBillingMethod;
        TextView tvOrderStatus, tvAddress, tvDescription;
        TextView tvCreatedAt, tvUpdatedAt, tvUsername, tvUserId;
        RecyclerView rvOrderProducts;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            tvOrderId = itemView.findViewById(R.id.tvOrderId);
            tvOrderDate = itemView.findViewById(R.id.tvOrderDate);
            tvOrderTotal = itemView.findViewById(R.id.tvOrderTotal);
            tvBillingMethod = itemView.findViewById(R.id.tvBillingMethod);
            tvOrderStatus = itemView.findViewById(R.id.tvOrderStatus);
            tvAddress = itemView.findViewById(R.id.tvAddress);
            tvDescription = itemView.findViewById(R.id.tvDescription);
            tvCreatedAt = itemView.findViewById(R.id.tvCreatedAt);
            tvUpdatedAt = itemView.findViewById(R.id.tvUpdatedAt);
            tvUsername = itemView.findViewById(R.id.tvUsername);
            tvUserId = itemView.findViewById(R.id.tvUserId);
            rvOrderProducts = itemView.findViewById(R.id.rvOrderProducts);
        }
    }
}