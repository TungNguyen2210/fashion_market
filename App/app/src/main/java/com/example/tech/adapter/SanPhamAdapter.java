package com.example.tech.adapter;

import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Paint;
import android.text.TextUtils;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.Filter;
import android.widget.Filterable;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.tech.R;
import com.example.tech.SERVER;
import com.example.tech.activity.GioHang;
import com.example.tech.model.SanPham;
import com.squareup.picasso.Picasso;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Locale;

public class SanPhamAdapter extends RecyclerView.Adapter<KHUNGNHIN_SanPham> implements Filterable {

    ArrayList<SanPham> data;
    Context context;
    ArrayList<SanPham> dataOrigin;
    private static final String TAG = "SanPhamAdapter";

    // click item recyclerview
    public interface OnItemClickListener {
        void onItemClick(SanPham sp);
    }

    private OnItemClickListener listener;

    public void setOnItemClickListener(OnItemClickListener listener) {
        this.listener = listener;
    }

    public SanPhamAdapter(ArrayList<SanPham> data, Context context) {
        this.data = data;
        this.context = context;
        this.dataOrigin = data;
    }

    @NonNull
    @Override
    public KHUNGNHIN_SanPham onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_sanpham, parent, false);
        return new KHUNGNHIN_SanPham(view);
    }

    @Override
    public void onBindViewHolder(@NonNull KHUNGNHIN_SanPham holder, int position) {
        SanPham sp = data.get(position);

        // Cải thiện cách hiển thị ảnh
        String imageUrl = sp.getHinhsanpham();
        if (!TextUtils.isEmpty(imageUrl)) {
            if (!imageUrl.startsWith("http")) {
                // Nếu URL không bắt đầu bằng http, thêm SERVER.imagepath
                Picasso.get()
                        .load(SERVER.imagepath + imageUrl)
                        .placeholder(R.drawable.placeholder_image)
                        .error(R.drawable.error_image)
                        .into(holder.hinhtrangsuc);
            } else {
                // Nếu đã là URL đầy đủ
                Picasso.get()
                        .load(imageUrl)
                        .placeholder(R.drawable.placeholder_image)
                        .error(R.drawable.error_image)
                        .into(holder.hinhtrangsuc);
            }
        } else {
            holder.hinhtrangsuc.setImageResource(R.drawable.placeholder_image);
        }

        holder.tvten.setText(sp.tensanpham);

        // Xử lý hiển thị giá gốc và giá giảm
        try {
            // Kiểm tra xem sản phẩm có giảm giá không
            if (sp.isOnSale()) {
                // Có giảm giá - Hiển thị cả giá gốc và giá giảm
                holder.tvGiaGoc.setVisibility(View.VISIBLE);
                holder.tvGiaGoc.setText(formatPrice(sp.getGiagoc()));
                holder.tvGiaGoc.setPaintFlags(holder.tvGiaGoc.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);

                holder.tvgia.setText(formatPrice(sp.getGiasanpham()));

                // Hiển thị badge giảm giá
                holder.tvDiscountBadge.setVisibility(View.VISIBLE);
                holder.tvDiscountBadge.setText("-" + sp.getDiscountPercentage() + "%");
            } else {
                // Không giảm giá - Chỉ hiển thị giá thường
                holder.tvGiaGoc.setVisibility(View.GONE);
                holder.tvDiscountBadge.setVisibility(View.GONE);
                holder.tvgia.setText(formatPrice(sp.getGiasanpham()));
            }
        } catch (Exception e) {
            // Nếu có lỗi, chỉ hiển thị giá thường
            holder.tvgia.setText(formatPrice(sp.getGiasanpham()));
            holder.tvGiaGoc.setVisibility(View.GONE);
            holder.tvDiscountBadge.setVisibility(View.GONE);
            Log.e(TAG, "Lỗi xử lý giá: " + e.getMessage(), e);
        }

        // click item
        holder.itemView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (listener != null) {
                    listener.onItemClick(sp);
                }
            }
        });

        // Thêm sự kiện cho nút "MUA HÀNG"
        holder.btnAddToCart.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showQuantityDialog(sp);
            }
        });
    }

    // Phương thức để hiển thị dialog chọn số lượng
    private void showQuantityDialog(SanPham product) {
        // Tạo dialog
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        View view = LayoutInflater.from(context).inflate(R.layout.quantity_dialog, null);
        builder.setView(view);

        // Ánh xạ các view trong dialog
        TextView tvProductName = view.findViewById(R.id.tvProductName);
        TextView tvProductPrice = view.findViewById(R.id.tvProductPrice);
        TextView tvQuantity = view.findViewById(R.id.tvQuantity);
        Button btnDecrease = view.findViewById(R.id.btnDecrease);
        Button btnIncrease = view.findViewById(R.id.btnIncrease);
        Button btnCancel = view.findViewById(R.id.btnCancel);
        Button btnAddToCart = view.findViewById(R.id.btnAddToCart);

        // Thiết lập giá trị ban đầu
        tvProductName.setText(product.getTensanpham());
        tvProductPrice.setText("Giá: " + formatPrice(product.getGiasanpham()));

        final int[] quantity = {1};
        tvQuantity.setText(String.valueOf(quantity[0]));

        // Xử lý sự kiện click nút giảm
        btnDecrease.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (quantity[0] > 1) {
                    quantity[0]--;
                    tvQuantity.setText(String.valueOf(quantity[0]));
                }
            }
        });

        // Xử lý sự kiện click nút tăng
        btnIncrease.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                quantity[0]++;
                tvQuantity.setText(String.valueOf(quantity[0]));
            }
        });

        // Tạo dialog
        AlertDialog dialog = builder.create();

        // Xử lý sự kiện click nút hủy
        btnCancel.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialog.dismiss();
            }
        });

        // Xử lý sự kiện click nút thêm vào giỏ hàng
        btnAddToCart.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                addToCart(product, quantity[0]);
                dialog.dismiss();
            }
        });

        // Hiển thị dialog
        dialog.show();
    }

    // Phương thức để thêm sản phẩm vào giỏ hàng
    private void addToCart(SanPham product, int quantity) {
        try {
            // Tạo intent để chuyển dữ liệu sang GioHang Activity
            Intent intent = new Intent(context, GioHang.class);
            intent.putExtra("id", product.getIdsanpham());
            intent.putExtra("name", product.getTensanpham());
            intent.putExtra("price", String.valueOf(product.getGiasanpham()));
            intent.putExtra("img", product.getHinhsanpham());
            intent.putExtra("quantity", quantity); // Thêm số lượng vào intent
            intent.putExtra("original_price", String.valueOf(product.getGiagoc())); // Thêm giá gốc

            // Hiển thị thông báo
            Toast.makeText(context, "Đã thêm " + quantity + " " + product.getTensanpham() + " vào giỏ hàng", Toast.LENGTH_SHORT).show();

            // Khởi chạy Activity GioHang
            context.startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(context, "Lỗi: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            Log.e(TAG, "Lỗi thêm vào giỏ hàng: " + e.getMessage(), e);
        }
    }

    // Phương thức định dạng giá tiền
    private String formatPrice(double price) {
        NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("vi", "VN"));
        return formatter.format(price) + " VND";
    }

    @Override
    public int getItemCount() {
        return data.size();
    }

    @Override
    public Filter getFilter() {
        return new ItemFilter();
    }

    private class ItemFilter extends Filter {
        @Override
        protected FilterResults performFiltering(CharSequence charSequence) {
            String chuoitim = charSequence.toString().toLowerCase().trim();
            FilterResults filterResults = new FilterResults();

            if (!TextUtils.isEmpty(chuoitim)) {
                ArrayList<SanPham> tam = new ArrayList<>();
                for (SanPham sp : dataOrigin) {
                    if (sp.tensanpham.toLowerCase().contains(chuoitim))
                        tam.add(sp);
                }
                filterResults.values = tam;
                filterResults.count = tam.size();
            } else {
                filterResults.values = dataOrigin;
                filterResults.count = dataOrigin.size();
            }
            return filterResults;
        }

        @Override
        protected void publishResults(CharSequence constraint, FilterResults filterResults) {
            if (filterResults != null && filterResults.count > 0) {
                data = (ArrayList<SanPham>) filterResults.values;
                notifyDataSetChanged();
            }
        }
    }
}

class KHUNGNHIN_SanPham extends RecyclerView.ViewHolder {
    ImageView hinhtrangsuc;
    TextView tvten;
    TextView tvgia;
    TextView tvGiaGoc;
    TextView tvDiscountBadge;
    Button btnAddToCart;

    public KHUNGNHIN_SanPham(@NonNull View itemView) {
        super(itemView);
        hinhtrangsuc = itemView.findViewById(R.id.imgView);
        tvten = itemView.findViewById(R.id.tvTen);
        tvgia = itemView.findViewById(R.id.tvGia);
        tvGiaGoc = itemView.findViewById(R.id.tvGiaGoc);
        tvDiscountBadge = itemView.findViewById(R.id.tvDiscountBadge);
        btnAddToCart = itemView.findViewById(R.id.btnAddToCart);
    }
}