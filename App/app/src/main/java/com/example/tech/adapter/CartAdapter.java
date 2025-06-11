package com.example.tech.adapter;

import android.content.Context;
import android.content.SharedPreferences;
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

import com.example.tech.R;
import com.example.tech.SERVER;
import com.example.tech.activity.GioHang;
import com.example.tech.model.Product;
import com.google.gson.Gson;
import com.squareup.picasso.Picasso;

import java.util.ArrayList;

public class CartAdapter extends ArrayAdapter<Product> {
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
        if (itemView == null) {
            itemView = LayoutInflater.from(context).inflate(R.layout.list_item_cart, parent, false);
        }

        // Get the current item in the list
        final Product currentItem = cartItems.get(position);

        // Set the data to the views in the list item layout
        TextView tvName = itemView.findViewById(R.id.tvProductName);
        TextView tvPrice = itemView.findViewById(R.id.tvProductPrice);
        final TextView tvQuantity = itemView.findViewById(R.id.tvQuantity);
        ImageButton btnDecreaseQuantity = itemView.findViewById(R.id.btnDecreaseQuantity);
        ImageButton btnIncreaseQuantity = itemView.findViewById(R.id.btnIncreaseQuantity);
        Button btnDelete = itemView.findViewById(R.id.btnDelete);
        ImageView ivProductImage = itemView.findViewById(R.id.ivProductImage);

        tvName.setText(currentItem.getName());
        tvPrice.setText(currentItem.getPrice());
        tvQuantity.setText(String.valueOf(currentItem.getQuantity()));

        Log.d("TAG", "duong dan image: " + currentItem.getImageUrl());

        // Load product image using Picasso library
        Picasso.get().load(SERVER.imagepath + currentItem.getImageUrl()).placeholder(R.drawable.default_product_image).into(ivProductImage);

        btnDecreaseQuantity.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                int quantity = currentItem.getQuantity();
                if (quantity > 1) {
                    currentItem.setQuantity(quantity - 1);
                    notifyDataSetChanged();
                    updateTotalPrice();
                    saveCartItems();
                }
            }
        });

        btnIncreaseQuantity.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                int quantity = currentItem.getQuantity();
                currentItem.setQuantity(quantity + 1);
                notifyDataSetChanged();
                updateTotalPrice();
                saveCartItems();
            }
        });

        btnDelete.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                cartItems.remove(position);
                notifyDataSetChanged();
                updateTotalPrice();
                saveCartItems();
            }
        });

        return itemView;
    }

    private void updateTotalPrice() {
        int totalPrice = 0;
        for (Product product : cartItems) {
            String price = product.getPrice();
            int quantity = product.getQuantity();
            if (price != null) {
                int numericPrice = Integer.parseInt(price.replaceAll("[\\D]", ""));
                totalPrice += numericPrice * quantity;
            }
        }

        // Notify the activity to update the total price
        if (context instanceof GioHang) {
            ((GioHang) context).updateTotalPrice(totalPrice);
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
}
