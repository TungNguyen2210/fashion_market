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

import com.example.tech.R;
import com.example.tech.SERVER;
import com.example.tech.activity.GioHang;
import com.example.tech.model.Product;
import com.google.gson.Gson;
import com.squareup.picasso.Callback;
import com.squareup.picasso.Picasso;

import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.Locale;

public class CartAdapter extends ArrayAdapter<Product> {

    private static final String TAG = "CartAdapter";
    private Context context;
    private ArrayList<Product> cartItems;

    public CartAdapter(Context context, ArrayList<Product> cartItems) {
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
        final Product currentItem = cartItems.get(position);

        // Set the data to the views
        holder.tvName.setText(currentItem.getName());

        // Format the price with proper locale
        NumberFormat formatter = NumberFormat.getNumberInstance(new Locale("vi", "VN"));

        // Xử lý giá gốc và giá khuyến mãi
        if (currentItem.hasDiscount()) {
            // Có giảm giá
            String promotionPriceStr = currentItem.getPromotionPrice();
            String originalPriceStr = currentItem.getPrice();

            try {
                // Định dạng giá khuyến mãi
                String numericPromo = promotionPriceStr.replaceAll("[\\D]", "");
                if (!numericPromo.isEmpty()) {
                    int promoPrice = Integer.parseInt(numericPromo);
                    holder.tvPrice.setText(formatter.format(promoPrice) + "đ");
                } else {
                    holder.tvPrice.setText(promotionPriceStr);
                }

                // Định dạng giá gốc
                String numericOriginal = originalPriceStr.replaceAll("[\\D]", "");
                if (!numericOriginal.isEmpty()) {
                    int originalPrice = Integer.parseInt(numericOriginal);
                    holder.tvOriginalPrice.setText(formatter.format(originalPrice) + "đ");
                    holder.tvOriginalPrice.setPaintFlags(holder.tvOriginalPrice.getPaintFlags() | Paint.STRIKE_THRU_TEXT_FLAG);
                    holder.tvOriginalPrice.setVisibility(View.VISIBLE);
                }
            } catch (NumberFormatException e) {
                Log.e(TAG, "Error formatting price: " + e.getMessage());
                holder.tvPrice.setText(promotionPriceStr);
                holder.tvOriginalPrice.setText(originalPriceStr);
                holder.tvOriginalPrice.setVisibility(View.VISIBLE);
            }
        } else {
            // Không có giảm giá
            String priceStr = currentItem.getPrice();
            try {
                String numericPrice = priceStr.replaceAll("[\\D]", "");
                if (!numericPrice.isEmpty()) {
                    int price = Integer.parseInt(numericPrice);
                    holder.tvPrice.setText(formatter.format(price) + "đ");
                } else {
                    holder.tvPrice.setText(priceStr);
                }
                holder.tvOriginalPrice.setVisibility(View.GONE);
            } catch (NumberFormatException e) {
                Log.e(TAG, "Error formatting price: " + e.getMessage());
                holder.tvPrice.setText(priceStr);
                holder.tvOriginalPrice.setVisibility(View.GONE);
            }
        }

        // Hiển thị thông tin kích thước và màu sắc
        if (!TextUtils.isEmpty(currentItem.getSelectedSize())) {
            holder.tvSize.setText("Size: " + currentItem.getSelectedSize());
            holder.tvSize.setVisibility(View.VISIBLE);
        } else {
            holder.tvSize.setVisibility(View.GONE);
        }

        if (!TextUtils.isEmpty(currentItem.getSelectedColor())) {
            holder.tvColor.setText("Màu: " + currentItem.getSelectedColor());
            holder.tvColor.setVisibility(View.VISIBLE);
        } else {
            holder.tvColor.setVisibility(View.GONE);
        }

        holder.tvQuantity.setText(String.valueOf(currentItem.getQuantity()));

        // Load product image
        String imageUrl = currentItem.getImageUrl();
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

        holder.btnDecreaseQuantity.setOnClickListener(v -> {
            int quantity = currentItem.getQuantity();
            if (quantity > 1) {
                currentItem.setQuantity(quantity - 1);
                finalHolder.tvQuantity.setText(String.valueOf(quantity - 1));
                updateTotalPrice();
                saveCartItems();
            }
        });

        holder.btnIncreaseQuantity.setOnClickListener(v -> {
            int quantity = currentItem.getQuantity();
            currentItem.setQuantity(quantity + 1);
            finalHolder.tvQuantity.setText(String.valueOf(quantity + 1));
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
        int totalPrice = 0;
        for (Product product : cartItems) {
            String price = product.getDisplayPrice(); // Sử dụng phương thức mới để lấy giá hiển thị
            int quantity = product.getQuantity();
            if (price != null) {
                try {
                    String numericPrice = price.replaceAll("[\\D]", "");
                    if (!numericPrice.isEmpty()) {
                        int priceValue = Integer.parseInt(numericPrice);
                        totalPrice += priceValue * quantity;
                    }
                } catch (NumberFormatException e) {
                    Log.e(TAG, "Error parsing price: " + e.getMessage());
                }
            }
        }

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