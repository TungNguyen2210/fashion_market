package com.example.tech.activity;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;

import com.example.tech.R;
import com.example.tech.adapter.CartAdapter;
import com.example.tech.model.Product;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Locale;

import com.paypal.android.sdk.payments.PayPalConfiguration;
import com.paypal.android.sdk.payments.PayPalPayment;
import com.paypal.android.sdk.payments.PayPalService;
import com.paypal.android.sdk.payments.PaymentActivity;
import com.paypal.android.sdk.payments.PaymentConfirmation;

public class GioHang extends AppCompatActivity {

    private ListView lvcart;
    private ArrayList<Product> cartItems;
    private CartAdapter cartAdapter;

    private static final int PAYPAL_REQUEST_CODE = 123;

    private static PayPalConfiguration paypalConfig = new PayPalConfiguration()
            .environment(PayPalConfiguration.ENVIRONMENT_SANDBOX) // Thay thế bằng ENVIRONMENT_PRODUCTION trong trường hợp sản phẩm thực tế.
            .clientId("AeyFK0Tomu06wnDGB4dmS3LMICoI_YezaWZBdHy6upiZ3S1YBDbmeJdKEQG2hXKnNf-XYcCE2lOgpVd2");

    private Button btnPayPal;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_gio_hang);
        anhxa();

        // Retrieve the selected product details from the intent
        Intent intent = getIntent();
        String name = intent.getStringExtra("name");
        String price = intent.getStringExtra("price");
        String imageUrl = intent.getStringExtra("img");
        String id = intent.getStringExtra("id");

        // Create a new Product object with the retrieved details
        Product selectedProduct = new Product(name, price, imageUrl);

        // Load the existing cart items from SharedPreferences
        loadCartItems();

        // Check if selectedProduct has data
        // Check if selectedProduct has data and is not null
        if (selectedProduct.getName() != null && selectedProduct.getPrice() != null) {
            // Check if the product already exists in the cart
            boolean productExists = false;
            for (Product cartItem : cartItems) {
                if (cartItem.getName().equals(selectedProduct.getName())) {
                    // Increase the quantity if the product already exists
                    int quantity = cartItem.getQuantity();
                    cartItem.setQuantity(quantity + 1);
                    productExists = true;
                    break;
                }
            }

            // If the product does not exist, add it to the cart
            if (!productExists) {
                selectedProduct.setQuantity(1);
                cartItems.add(selectedProduct);
            }
        }


        // Update the cart list view
        updateCartListView();

        // Save the updated cart items to SharedPreferences
        saveCartItems();

        // Calculate and display the total price
        int totalPrice = calculateTotalPrice();
        updateTotalPrice(totalPrice);

        btnPayPal = findViewById(R.id.btnPayPal);
        btnPayPal.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                makePayPalPayment();
            }
        });

    }

    private void makePayPalPayment() {
        int totalPrice = calculateTotalPrice();
        PayPalPayment payment = new PayPalPayment(new BigDecimal(String.valueOf(totalPrice)), "USD", "Payment Description",
                PayPalPayment.PAYMENT_INTENT_SALE);

        Intent intent = new Intent(this, PaymentActivity.class);
        //putting the paypal configuration to the intent from the configuration we have created above.
        intent.putExtra(PayPalService.EXTRA_PAYPAL_CONFIGURATION, paypalConfig);
        // Putting paypal payment to the intent on below line.
        intent.putExtra(PaymentActivity.EXTRA_PAYMENT, payment);
        // Starting the intent activity for result
        // the request code will be used on the method onActivityResult
        startActivityForResult(intent, PAYPAL_REQUEST_CODE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        // If the result is from paypal request code
        if (requestCode == PAYPAL_REQUEST_CODE) {
            // If the result is OK i.e. user has not canceled the payment
            if (resultCode == Activity.RESULT_OK) {
                // Getting the payment confirmation
                PaymentConfirmation confirm = data.getParcelableExtra(PaymentActivity.EXTRA_RESULT_CONFIRMATION);
                // if confirmation is not null
                if (confirm != null) {
                    try {
                        // Getting the payment details
                        String paymentDetails = confirm.toJSONObject().toString(4);
                        // on below line we are extracting json response and displaying it in a text view.
                        JSONObject payObj = new JSONObject(paymentDetails);
                        String payID = payObj.getJSONObject("response").getString("id");
                        String state = payObj.getJSONObject("response").getString("state");
                        // on below line displaying a toast message with the payment status
                        Toast.makeText(this, "Payment : " + state + " with payment id is : " + payID, Toast.LENGTH_SHORT).show();
                    } catch (JSONException e) {
                        // handling json exception on below line
                        Log.e("Error", "an extremely unlikely failure occurred: ", e);
                    }
                }
            } else if (resultCode == Activity.RESULT_CANCELED) {
                // on below line we are displaying a toast message as user cancelled the payment.
                Toast.makeText(this, "User cancelled the payment..", Toast.LENGTH_SHORT).show();
            } else if (resultCode == PaymentActivity.RESULT_EXTRAS_INVALID) {
                // on below line displaying toast message for invalid payment config.
                Toast.makeText(this, "Invalid payment config was submitted..", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    public void onDestroy() {
        stopService(new Intent(this, PayPalService.class));
        super.onDestroy();
    }

    private int calculateTotalPrice() {
        int totalPrice = 0;
        for (Product product : cartItems) {
            String price = product.getPrice();
            int quantity = product.getQuantity();
            if (price != null) {
                int numericPrice = Integer.parseInt(price.replaceAll("[\\D]", ""));
                totalPrice += numericPrice * quantity;
            }
        }
        return totalPrice;
    }

    private void anhxa() {
        lvcart = findViewById(R.id.lvcart);
    }

    private void loadCartItems() {
        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
        String jsonCart = preferences.getString("cartItems", "");

        if (!jsonCart.isEmpty()) {
            Gson gson = new Gson();
            Type type = new TypeToken<ArrayList<Product>>() {}.getType();
            cartItems = gson.fromJson(jsonCart, type);
        } else {
            cartItems = new ArrayList<>();
        }
    }

    private void updateCartListView() {
        cartAdapter = new CartAdapter(this, cartItems);
        lvcart.setAdapter(cartAdapter);
    }

    private void saveCartItems() {
        SharedPreferences preferences = getSharedPreferences("Cart", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        Gson gson = new Gson();
        String jsonCart = gson.toJson(cartItems);
        editor.putString("cartItems", jsonCart);
        editor.apply();
    }

    public void updateTotalPrice(int totalPrice) {
        TextView tvTotalMoney = findViewById(R.id.tvtotalmoney);
        tvTotalMoney.setText(String.format(Locale.getDefault(), "%,dđ", totalPrice));
    }

}
