package com.example.tech.adapter;

import android.content.Context;
import android.graphics.drawable.Drawable;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.RatingBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.target.Target;
import com.example.tech.R;
import com.example.tech.model.OrderItem;
import com.example.tech.utils.CurrencyFormatter;
import com.google.android.material.button.MaterialButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

public class OrderProductAdapter extends RecyclerView.Adapter<OrderProductAdapter.ViewHolder> {

    private static final String TAG = "OrderProductAdapter";
    private Context context;
    private List<OrderItem> products;
    private OnProductClickListener listener;
    private boolean canRate;

    public interface OnProductClickListener {
        void onProductClick(OrderItem product);
        void onRateProductClick(OrderItem product);
    }

    public OrderProductAdapter(Context context, List<OrderItem> products, OnProductClickListener listener, boolean canRate) {
        this.context = context;
        this.products = products;
        this.listener = listener;
        this.canRate = canRate;

        // Log khởi tạo adapter
        Log.d(TAG, "Adapter created with " + products.size() + " products and canRate=" + canRate);
        if (listener == null) {
            Log.e(TAG, "WARNING: listener is NULL during adapter creation!");
        }
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        Log.d(TAG, "onCreateViewHolder called");
        View view = LayoutInflater.from(context).inflate(R.layout.item_order_product, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull final ViewHolder holder, int position) {
        // KHÔNG sử dụng tham số position trực tiếp trong các listeners
        // Thay vào đó, lấy item tại vị trí hiện tại
        final OrderItem product = products.get(position);

        // Log binding
        Log.d(TAG, "onBindViewHolder position " + position + " - product: " + product.getProductName());

        // Hiển thị tên sản phẩm
        holder.tvProductName.setText(product.getDisplayName() != null ?
                product.getDisplayName() : product.getProductName());

        // Hiển thị số lượng và đơn giá
        holder.tvProductQuantity.setText("SL: " + product.getQuantity());
        holder.tvProductPrice.setText(CurrencyFormatter.format(product.getPrice()));

        // QUAN TRỌNG: Tổng tiền cho sản phẩm này = số lượng * giá đơn vị
        int totalForItem = product.getQuantity() * product.getPrice();
        holder.tvProductTotal.setText(CurrencyFormatter.format(totalForItem));

        // Log để debug
        Log.d(TAG, "Hiển thị sản phẩm: " + product.getDisplayName() +
                ", SL: " + product.getQuantity() +
                ", Đơn giá: " + product.getPrice() +
                ", Tổng: " + totalForItem);

        // Hiển thị size và màu nếu có
        String variantInfo = "";
        if (product.getSize() != null && !product.getSize().isEmpty()) {
            variantInfo += "Size: " + product.getSize();
        }

        if (product.getColor() != null && !product.getColor().isEmpty()) {
            if (!variantInfo.isEmpty()) variantInfo += ", ";
            variantInfo += "Màu: " + getColorName(product.getColor());
        }

        if (!variantInfo.isEmpty()) {
            holder.tvProductVariant.setText(variantInfo);
            holder.tvProductVariant.setVisibility(View.VISIBLE);
        } else {
            holder.tvProductVariant.setVisibility(View.GONE);
        }

        // Hiển thị hình ảnh với xử lý đường dẫn
        if (product.getProductImage() != null && !product.getProductImage().isEmpty()) {
            // Fix lỗi: Tạo biến final/effectively final mới
            final String imageUrlFinal = processImageUrl(product.getProductImage());

            Log.d(TAG, "Tải hình ảnh từ URL: " + imageUrlFinal);

            // Sử dụng Glide với listener để ghi log
            Glide.with(context)
                    .load(imageUrlFinal)
                    .placeholder(R.drawable.placeholder_image)
                    .error(R.drawable.error_image)
                    .listener(new RequestListener<Drawable>() {
                        @Override
                        public boolean onLoadFailed(@Nullable GlideException e, Object model,
                                                    Target<Drawable> target, boolean isFirstResource) {
                            Log.e(TAG, "Lỗi tải hình ảnh: " + imageUrlFinal, e);
                            return false;
                        }

                        @Override
                        public boolean onResourceReady(Drawable resource, Object model,
                                                       Target<Drawable> target, DataSource dataSource,
                                                       boolean isFirstResource) {
                            Log.d(TAG, "Đã tải hình ảnh thành công: " + imageUrlFinal);
                            return false;
                        }
                    })
                    .into(holder.ivProductImage);
        } else {
            holder.ivProductImage.setImageResource(R.drawable.placeholder_image);
            Log.d(TAG, "Không có URL hình ảnh cho sản phẩm: " + product.getProductName());
        }

        // Hiển thị nút đánh giá và trạng thái đánh giá
        if (canRate) {
            holder.btnRate.setVisibility(View.VISIBLE);

            // Cập nhật trạng thái nút đánh giá
            if (product.isRated()) {
                holder.btnRate.setText("Đã đánh giá (" + product.getRating() + "★)");
                holder.btnRate.setBackgroundTintList(context.getResources().getColorStateList(R.color.gray));
            } else {
                holder.btnRate.setText("Đánh giá");
                holder.btnRate.setBackgroundTintList(context.getResources().getColorStateList(R.color.teal_700));
            }
        } else {
            holder.btnRate.setVisibility(View.GONE);
        }

        // Hiển thị đánh giá đã có
        if (product.isRated() && product.getRating() != null && product.getRating() > 0) {
            holder.ratingBar.setRating(product.getRating());
            holder.ratingBar.setVisibility(View.VISIBLE);

            if (product.getComment() != null && !product.getComment().isEmpty()) {
                holder.tvComment.setText(product.getComment());
                holder.tvComment.setVisibility(View.VISIBLE);
            } else {
                holder.tvComment.setVisibility(View.GONE);
            }
        } else {
            holder.ratingBar.setVisibility(View.GONE);
            holder.tvComment.setVisibility(View.GONE);
        }

        // Xử lý sự kiện click cho item
        holder.itemView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Sử dụng getAdapterPosition để lấy vị trí hiện tại
                int adapterPosition = holder.getAdapterPosition();
                if (adapterPosition != RecyclerView.NO_POSITION) {
                    OrderItem currentProduct = products.get(adapterPosition);
                    Log.d(TAG, "Item clicked for product: " + currentProduct.getProductName());
                    if (listener != null) {
                        listener.onProductClick(currentProduct);
                    } else {
                        Log.e(TAG, "Listener is null for item click!");
                    }
                }
            }
        });

        // Đặt OnClickListener cho nút đánh giá
        holder.btnRate.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Sử dụng getAdapterPosition để lấy vị trí hiện tại
                int adapterPosition = holder.getAdapterPosition();
                if (adapterPosition != RecyclerView.NO_POSITION) {
                    OrderItem currentProduct = products.get(adapterPosition);
                    Log.d(TAG, "Rate button clicked for product: " + currentProduct.getProductName());

                    // Hiển thị toast để kiểm tra sự kiện click
                    Toast.makeText(context, "Đánh giá sản phẩm: " + currentProduct.getProductName(), Toast.LENGTH_SHORT).show();

                    if (listener != null) {
                        listener.onRateProductClick(currentProduct);
                    } else {
                        Log.e(TAG, "Listener is null for rate button click!");
                    }
                } else {
                    Log.e(TAG, "Invalid adapter position when rate button clicked");
                }
            }
        });
    }

    @Override
    public int getItemCount() {
        return products.size();
    }

    // Phương thức tiện ích để xử lý URL hình ảnh
    private String processImageUrl(String originalUrl) {
        if (originalUrl == null || originalUrl.isEmpty()) {
            return "";
        }

        if (!originalUrl.startsWith("http") && !originalUrl.startsWith("/")) {
            return "http://10.0.2.2:3100/" + originalUrl;
        } else if (originalUrl.startsWith("/")) {
            return "http://10.0.2.2:3100" + originalUrl;
        }

        return originalUrl;
    }

    // Mã màu sang tên màu
    private String getColorName(String colorCode) {
        if (colorCode == null || colorCode.isEmpty()) {
            return "Không xác định";
        }

        switch (colorCode.toLowerCase()) {
            case "#ffffff":
            case "ffffff":
                return "Trắng";
            case "#000000":
            case "000000":
                return "Đen";
            case "#1c78fa":
            case "1c78fa":
                return "Xanh dương";
            case "#5b79a3":
            case "5b79a3":
                return "Xanh navy";
            case "#ff0000":
            case "ff0000":
                return "Đỏ";
            case "#ffa500":
            case "ffa500":
                return "Cam";
            case "#ffff00":
            case "ffff00":
                return "Vàng";
            case "#008000":
            case "008000":
                return "Xanh lá";
            case "#800080":
            case "800080":
                return "Tím";
            case "#ffc0cb":
            case "ffc0cb":
                return "Hồng";
            case "#a52a2a":
            case "a52a2a":
                return "Nâu";
            case "#808080":
            case "808080":
                return "Xám";
            default:
                return colorCode;
        }
    }

    /**
     * Cập nhật thông tin sản phẩm và làm mới UI
     * @param productId ID sản phẩm cần cập nhật
     * @param name Tên mới (nếu có)
     * @param imageUrl URL hình ảnh mới (nếu có)
     * @param size Kích thước mới (nếu có)
     * @param color Mã màu mới (nếu có)
     */
    public void updateProductInfo(String productId, String name, String imageUrl, String size, String color) {
        for (int i = 0; i < products.size(); i++) {
            OrderItem item = products.get(i);
            if (productId != null && productId.equals(item.getProductId())) {
                boolean updated = false;

                // Cập nhật hình ảnh
                if (imageUrl != null && !imageUrl.isEmpty() &&
                        (item.getProductImage() == null || item.getProductImage().isEmpty())) {
                    item.setProductImage(imageUrl);
                    Log.d(TAG, "Đã cập nhật URL hình ảnh cho sản phẩm " + productId + ": " + imageUrl);
                    updated = true;
                }

                // Cập nhật tên
                if (name != null && !name.isEmpty() &&
                        (item.getProductName() == null || item.getProductName().isEmpty() ||
                                item.getProductName().startsWith("Sản phẩm #"))) {
                    item.setProductName(name);
                    updated = true;
                    Log.d(TAG, "Đã cập nhật tên cho sản phẩm " + productId + ": " + name);
                }

                // Cập nhật size
                if (size != null && !size.isEmpty() &&
                        (item.getSize() == null || item.getSize().isEmpty())) {
                    item.setSize(size);
                    updated = true;
                    Log.d(TAG, "Đã cập nhật kích thước cho sản phẩm " + productId + ": " + size);
                }

                // Cập nhật màu sắc
                if (color != null && !color.isEmpty() &&
                        (item.getColor() == null || item.getColor().isEmpty())) {
                    item.setColor(color);
                    updated = true;
                    Log.d(TAG, "Đã cập nhật màu sắc cho sản phẩm " + productId + ": " + color);
                }

                // Cập nhật displayName nếu có thay đổi
                if (updated) {
                    updateDisplayName(item);
                    notifyItemChanged(i);
                }
            }
        }
    }

    /**
     * Cập nhật tên hiển thị với size và màu sắc
     */
    private void updateDisplayName(OrderItem item) {
        StringBuilder displayName = new StringBuilder(item.getProductName());

        if (item.getSize() != null && !item.getSize().isEmpty()) {
            displayName.append(" - Size: ").append(item.getSize());
        }

        if (item.getColor() != null && !item.getColor().isEmpty()) {
            displayName.append(" - Màu: ").append(getColorName(item.getColor()));
        }

        item.setDisplayName(displayName.toString());
        Log.d(TAG, "Đã cập nhật tên hiển thị thành: " + displayName);
    }

    /**
     * Cập nhật tất cả các sản phẩm có cùng ID
     * @param productId ID sản phẩm
     * @param data Dữ liệu sản phẩm từ API
     */
    public void updateProductsFromApiData(String productId, JSONObject data) {
        try {
            String name = data.optString("name", "");
            String imageUrl = data.optString("image", data.optString("thumbnail", ""));

            // Tìm và cập nhật tất cả các sản phẩm có cùng ID
            for (int i = 0; i < products.size(); i++) {
                OrderItem item = products.get(i);
                if (productId != null && productId.equals(item.getProductId())) {
                    boolean updated = false;

                    // Cập nhật thông tin cơ bản
                    if (!name.isEmpty() &&
                            (item.getProductName() == null || item.getProductName().isEmpty() ||
                                    item.getProductName().startsWith("Sản phẩm #"))) {
                        item.setProductName(name);
                        updated = true;
                    }

                    if (!imageUrl.isEmpty() &&
                            (item.getProductImage() == null || item.getProductImage().isEmpty())) {
                        item.setProductImage(imageUrl);
                        updated = true;
                    }

                    // Tìm thông tin variant phù hợp nếu có
                    if (item.getVariantId() != null && !item.getVariantId().isEmpty() &&
                            data.has("variants")) {
                        JSONArray variants = data.getJSONArray("variants");
                        for (int j = 0; j < variants.length(); j++) {
                            JSONObject variant = variants.getJSONObject(j);
                            if (item.getVariantId().equals(variant.optString("variantId", ""))) {
                                // Cập nhật thông tin size và màu từ variant
                                String size = variant.optString("size", "");
                                String color = variant.optString("color", "");

                                if (!size.isEmpty() && (item.getSize() == null || item.getSize().isEmpty())) {
                                    item.setSize(size);
                                    updated = true;
                                }

                                if (!color.isEmpty() && (item.getColor() == null || item.getColor().isEmpty())) {
                                    item.setColor(color);
                                    updated = true;
                                }

                                break;
                            }
                        }
                    }

                    // Cập nhật tên hiển thị nếu có thay đổi
                    if (updated) {
                        updateDisplayName(item);
                        notifyItemChanged(i);
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi cập nhật sản phẩm từ API data: " + e.getMessage());
        }
    }

    class ViewHolder extends RecyclerView.ViewHolder {
        ImageView ivProductImage;
        TextView tvProductName, tvProductQuantity, tvProductPrice, tvProductTotal, tvProductVariant, tvComment;
        RatingBar ratingBar;
        MaterialButton btnRate;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            ivProductImage = itemView.findViewById(R.id.ivProductImage);
            tvProductName = itemView.findViewById(R.id.tvProductName);
            tvProductQuantity = itemView.findViewById(R.id.tvProductQuantity);
            tvProductPrice = itemView.findViewById(R.id.tvProductPrice);
            tvProductTotal = itemView.findViewById(R.id.tvProductTotal);
            tvProductVariant = itemView.findViewById(R.id.tvProductVariant);
            ratingBar = itemView.findViewById(R.id.ratingBar);
            tvComment = itemView.findViewById(R.id.tvComment);
            btnRate = itemView.findViewById(R.id.btnRate);
        }
    }
}