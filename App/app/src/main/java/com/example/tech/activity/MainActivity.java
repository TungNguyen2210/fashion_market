package com.example.tech.activity;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTransaction;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.MenuItem;
import android.widget.Toast;

import com.example.tech.R;
import com.example.tech.utils.UserManager;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.navigation.NavigationBarView;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "MainActivity";
    BottomNavigationView bottomNavigationView;
    Fragment fragment;
    FragmentTransaction transaction;
    private UserManager userManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Khởi tạo UserManager
        userManager = UserManager.getInstance(this);

        // Kiểm tra đăng nhập
        if (!userManager.isLoggedIn()) {
            logout();
            return;
        }

        // bottom navigation
        bottomNavigationView = findViewById(R.id.bottomnavigation);

        OpenFragment(new FragmentA());

        bottomNavigationView.setOnItemSelectedListener(new NavigationBarView.OnItemSelectedListener() {
            @Override
            public boolean onNavigationItemSelected(@NonNull MenuItem item) {
                int id = item.getItemId();
                switch (id) {
                    case R.id.nav_home:
                        fragment = new FragmentA();
                        break;
                    case R.id.nav_product:
                        fragment = new FragmentB();
                        break;
                    case R.id.nav_notification:
                        fragment = new FragmentC();
                        break;
                    case R.id.nav_profile:
                        fragment = new FragmentD();
                        break;
                }
                OpenFragment(fragment);
                return true;
            }
        });
    }

    void OpenFragment(Fragment f) {
        transaction = getSupportFragmentManager().beginTransaction();
        transaction.replace(R.id.bottom_nav_framelayout, f);
        transaction.commit();
    }

    // Thêm phương thức navigateToFragment
    public void navigateToFragment(int index) {
        MenuItem menuItem = bottomNavigationView.getMenu().getItem(index);
        if (menuItem != null) {
            menuItem.setChecked(true);
            onNavigationItemSelected(menuItem);
        }
    }

    // Phương thức hỗ trợ cho navigateToFragment
    private boolean onNavigationItemSelected(MenuItem item) {
        int id = item.getItemId();
        switch (id) {
            case R.id.nav_home:
                fragment = new FragmentA();
                break;
            case R.id.nav_product:
                fragment = new FragmentB();
                break;
            case R.id.nav_notification:
                fragment = new FragmentC();
                break;
            case R.id.nav_profile:
                fragment = new FragmentD();
                break;
        }
        OpenFragment(fragment);
        return true;
    }

    /**
     * Đăng xuất người dùng hiện tại và chuyển đến màn hình đăng nhập
     */
    public void logout() {
        Log.d(TAG, "Đăng xuất người dùng: " + userManager.getUsername());

        // Xóa thông tin phiên đăng nhập
        userManager.logout();
        Toast.makeText(this, "Đã đăng xuất thành công", Toast.LENGTH_SHORT).show();

        // Chuyển đến màn hình đăng nhập
        Intent intent = new Intent(this, LoginActivity.class);

        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    /**
     * Gọi phương thức này từ bất kỳ fragment nào khi cần đăng xuất
     * Ví dụ: ((MainActivity) requireActivity()).logout();
     */
    public void performLogout() {
        logout();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!userManager.isLoggedIn()) {
            logout();
        }
    }
}