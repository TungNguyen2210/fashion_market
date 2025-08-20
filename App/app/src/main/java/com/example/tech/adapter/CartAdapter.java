package com.example.tech.adapter;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Paint;
import android.text.TextUtils;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;

import com.example.apptrangsuc.R;
import com.example.tech.SERVER;
import com.example.tech.activity.GioHang;
import com.example.tech.model.SanPham;
import com.google.gson.Gson;
import com.squareup.picasso.Callback;
import com.squareup.picasso.Picasso;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Locale;

public class CartAdapter extends ArrayAdapter<SanPham> {

    private static final String TAG = "CartAdapter";
    private Context context;
    private ArrayList<SanPham> cartItems;

    public CartAdapter(Context context, ArrayList<SanPham> cartItems) {
        super(context, 0, cartItems);
        this.context = context;
        this.cartItems = cartItems;
    }

    @NonNull
    @Override
    public View getView(final int position, @Nullable View convertView, @NonNull ViewGroup parent) {
        View itemView = convertView;
        ViewHolder holder;

        if (itemView == null) {
            itemView = LayoutInflater.from(context).inflate(R.layout.list_item_cart, parent, false);

            holder = new ViewHolder();
            holder.tvName = itemView.findViewById(R.id.tvProductName);
            holder.tvPrice = itemView.findViewById(R.id.tvProductPrice);
            holder.tvOriginalPrice = itemView.findViewById(R.id.tvOriginalPrice);
            holder.tvSize = itemView.findViewById(R.id.tvSize);
            holder.tvColor = itemView.findViewById(R.id.tvColor);
            holder.tvQuantity = itemView.findViewById(R.id.tvQuantity);
            holder.btnDecreaseQuantity = itemView.findViewById(R.id.btnDecreaseQuantity);
            holder.btnIncreaseQuantity = itemView.findViewById(R.id.btnIncreaseQuantity);
            holder.btnDelete = itemView.findViewById(R.id.btnDelete);
            holder.ivProductImage = itemView.findViewById(R.id.ivProductImage);

            itemView.setTag(holder);
        } else {
            holder = (ViewHolder) itemView.getTag();
        }

        // Get the current item in the list
        final SanPham currentItem = cartItems.get(position);
        SanPham.ProductVariant variant = null;
        if (currentItem.getVariants() != null && !currentItem.getVariants().isEmpty()) {
            variant = currentItem.getVariants().get(0);
        }

        // Set the data to the views
        holder.tvName.setText(currentItem.getTensanpham());

        // Format the price with proper locale
        NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("vi", "VN"));

        // Xử lý giá gốc và giá khuyến mãi
        if (currentItem.isOnSale()) {
            // Có giảm giá
            int promotionPrice = currentItem.getGiasanpham();
            int originalPrice = currentItem.getGiagoc();

            try {
                // Định dạng giá khuyến mãi
                holder.tvPrice.setText(formatter.format(promotionPrice) + "đ");

                // Định dạng giá gốc
                holder.tvOriginalPrice.setText(formatter.format(originalPrice) + "đ");
                holder.tvOriginalPrice.setPaintFlags(holder.tvOriginalPrice.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
                holder.tvOriginalPrice.setVisibility(View.VISIBLE);
            } catch (Exception e) {
                Log.e(TAG, "Error formatting price: " + e.getMessage());
                holder.tvPrice.setText(String.valueOf(promotionPrice) + "đ");
                holder.tvOriginalPrice.setText(String.valueOf(originalPrice) + "đ");
                holder.tvOriginalPrice.setVisibility(View.VISIBLE);
            }
        } else {
            // Không có giảm giá
            int price = currentItem.getGiasanpham();
            try {
                holder.tvPrice.setText(formatter.format(price) + "đ");
                holder.tvOriginalPrice.setVisibility(View.GONE);
            } catch (Exception e) {
                Log.e(TAG, "Error formatting price: " + e.getMessage());
                holder.tvPrice.setText(String.valueOf(price) + "đ");
                holder.tvOriginalPrice.setVisibility(View.GONE);
            }
        }

        // Hiển thị thông tin kích thước và màu sắc
        if (variant != null && variant.getSize() != null) {
            holder.tvSize.setText("Size: " + variant.getSize());
            holder.tvSize.setVisibility(View.VISIBLE);
        } else {
            holder.tvSize.setVisibility(View.GONE);
        }

        if (variant != null && variant.getColor() != null) {
            holder.tvColor.setText("Màu: " + variant.getColor());
            holder.tvColor.setVisibility(View.VISIBLE);
        } else {
            holder.tvColor.setVisibility(View.GONE);
        }

        int quantity = 1;
        if (variant != null) {
            quantity = variant.getQuantity();
        } else if (currentItem.getInventory() != null) {
            quantity = currentItem.getInventory().getQuantityOnHand();
        }
        holder.tvQuantity.setText(String.valueOf(quantity));

        // Load product image
        String imageUrl = currentItem.getHinhsanpham();
        if (!TextUtils.isEmpty(imageUrl)) {
            // Check if the URL is already complete or needs the base URL
            if (!imageUrl.startsWith("http")) {
                imageUrl = SERVER.imagepath + imageUrl;
            }

            Log.d(TAG, "Loading image from: " + imageUrl);
            Picasso.get()
                    .load(imageUrl)
                    .placeholder(R.drawable.default_product_image)
                    .error(R.drawable.default_product_image)
                    .into(holder.ivProductImage, new Callback() {
                        @Override
                        public void onSuccess() {
                            Log.d(TAG, "Image loaded successfully");
                        }

                        @Override
                        public void onError(Exception e) {
                            Log.e(TAG, "Error loading image: " + e.getMessage());
                        }
                    });
        } else {
            holder.ivProductImage.setImageResource(R.drawable.default_product_image);
        }

        // Set up button click listeners
        final ViewHolder finalHolder = holder;
        final SanPham.ProductVariant finalVariant = variant;

        holder.btnDecreaseQuantity.setOnClickListener(v -> {
            int currentQuantity = Integer.parseInt(finalHolder.tvQuantity.getText().toString());
            if (currentQuantity > 1) {
                int newQuantity = currentQuantity - 1;
                finalHolder.tvQuantity.setText(String.valueOf(newQuantity));

                if (finalVariant != null) {
                    finalVariant.setQuantity(newQuantity);
                } else if (currentItem.getInventory() != null) {
                    currentItem.getInventory().setQuantityOnHand(newQuantity);
                }

                updateTotalPrice();
                saveCartItems();
            }
        });

        holder.btnIncreaseQuantity.setOnClickListener(v -> {
            int currentQuantity = Integer.parseInt(finalHolder.tvQuantity.getText().toString());
            int newQuantity = currentQuantity + 1;
            finalHolder.tvQuantity.setText(String.valueOf(newQuantity));

            if (finalVariant != null) {
                finalVariant.setQuantity(newQuantity);
            } else if (currentItem.getInventory() != null) {
                currentItem.getInventory().setQuantityOnHand(newQuantity);
            }

            updateTotalPrice();
            saveCartItems();
        });

        holder.btnDelete.setOnClickListener(v -> {
            if (context instanceof GioHang) {
                ((GioHang) context).removeProduct(position);
            }
        });

        // Add animation or visual effects to the item
        itemView.setAlpha(0f);
        itemView.animate().alpha(1f).setDuration(300).start();

        return itemView;
    }

    private void updateTotalPrice() {
        // Notify the activity to update the total price
        if (context instanceof GioHang) {
            ((GioHang) context).updateTotalPrice();
        }
    }

    private void saveCartItems() {
        SharedPreferences preferences = context.getSharedPreferences("Cart", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        Gson gson = new Gson();
        String jsonCart = gson.toJson(cartItems);
        editor.putString("cartItems", jsonCart);
        editor.apply();
    }

    // ViewHolder pattern improves performance
    private static class ViewHolder {
        CardView cardView;
        TextView tvName;
        TextView tvPrice;
        TextView tvOriginalPrice;
        TextView tvSize;
        TextView tvColor;
        TextView tvQuantity;
        ImageButton btnDecreaseQuantity;
        ImageButton btnIncreaseQuantity;
        Button btnDelete;
        ImageView ivProductImage;
    }
}