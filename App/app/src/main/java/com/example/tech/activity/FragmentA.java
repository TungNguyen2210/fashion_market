package com.example.tech.activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import android.content.Intent;
import android.content.res.Resources;
import android.graphics.Rect;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.view.animation.LayoutAnimationController;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ViewFlipper;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.tech.R;
import com.example.tech.SERVER;
import com.example.tech.adapter.ChuDeAdapter;
import com.example.tech.adapter.SanPhamAdapter;
import com.example.tech.model.ChuDe;
import com.example.tech.model.SanPham;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.snackbar.Snackbar;
import com.squareup.picasso.Picasso;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

public class FragmentA extends Fragment {

    private static final String TAG = "FragmentA";

    RecyclerView rvChude;
    RecyclerView recyclerView;
    ArrayList<SanPham> data = new ArrayList<>();
    ArrayList<SanPham> allProductsData = new ArrayList<>();
    SanPhamAdapter adaptersp;
    ArrayList<ChuDe> chude = new ArrayList<>();
    ChuDeAdapter chuDeAdapter;
    ViewFlipper viewFlipper;
    EditText edtsearch;
    SwipeRefreshLayout swipeRefresh;
    private boolean isLoadingProducts = false;

    // Biến phân trang
    private int currentPage = 1;
    private int itemsPerPage = 6;
    private int totalPages = 1;
    private boolean isLastPage = false;
    private String currentCategoryId = null;

    // UI components cho phân trang
    private Button btnPrevPage;
    private Button btnNextPage;
    private TextView tvPageInfo;
    private LinearLayout paginationLayout;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.activity_fragment_a, container, false);
        // lay slide
        viewFlipper = view.findViewById(R.id.viewflipper);
        LoadViewFlipper();
        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // Ánh xạ views
        recyclerView = view.findViewById(R.id.rcSanpham);
        rvChude = view.findViewById(R.id.rcchude);
        edtsearch = view.findViewById(R.id.edtsearch);

        // Ánh xạ các thành phần phân trang
        btnPrevPage = view.findViewById(R.id.btnPrevPage);
        btnNextPage = view.findViewById(R.id.btnNextPage);
        tvPageInfo = view.findViewById(R.id.tvPageInfo);
        paginationLayout = view.findViewById(R.id.paginationLayout);

        // Thiết lập sự kiện cho nút phân trang
        btnPrevPage.setOnClickListener(v -> {
            if (currentPage > 1) {
                currentPage--;
                if (currentCategoryId != null) {
                    loadProductsByCategory(currentCategoryId);
                } else {
                    loadAllProductsWithPagination();
                }
            }
        });

        btnNextPage.setOnClickListener(v -> {
            if (!isLastPage) {
                currentPage++;
                if (currentCategoryId != null) {
                    loadProductsByCategory(currentCategoryId);
                } else {
                    loadAllProductsWithPagination();
                }
            }
        });

        // Thiết lập SwipeRefreshLayout
        swipeRefresh = view.findViewById(R.id.swipeRefresh);
        swipeRefresh.setColorSchemeResources(R.color.teal_700, R.color.purple_500);
        swipeRefresh.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {
                // Reset trang về 1 khi refresh
                currentPage = 1;
                refreshData();
            }
        });

        // Thiết lập nút giỏ hàng
        FloatingActionButton imgGioHang = view.findViewById(R.id.imggiohang);
        imgGioHang.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getActivity(), GioHang.class);
                startActivity(intent);
            }
        });

        // Thiết lập nút "Xem tất cả"
        try {
            MaterialButton btnViewAll = view.findViewById(R.id.btnViewAll);
            if (btnViewAll != null) {
                btnViewAll.setOnClickListener(new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        // Bỏ chọn tất cả danh mục
                        if (chuDeAdapter != null) {
                            chuDeAdapter.clearSelection();
                        }

                        // Reset trang về 1 khi chuyển sang xem tất cả
                        currentPage = 1;
                        currentCategoryId = null;

                        // Hiển thị tất cả sản phẩm với phân trang
                        loadAllProductsWithPagination();

                        Toast.makeText(getContext(), "Xem tất cả sản phẩm", Toast.LENGTH_SHORT).show();
                    }
                });
            }
        } catch (Exception e) {
            // Xử lý nếu không tìm thấy view
            Log.e(TAG, "btnViewAll not found", e);
        }

        // Thiết lập RecyclerViews
        setupRecyclerViews();

        // Tải dữ liệu
        LoadChuDe();
        LoadSanPham();

        // Cập nhật UI phân trang ban đầu
        updatePaginationUI();

        // Thiết lập tìm kiếm
        edtsearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence charSequence, int i, int i1, int i2) {
            }

            @Override
            public void onTextChanged(CharSequence charSequence, int i, int i1, int i2) {
                String chuoitim = charSequence.toString();
                if (adaptersp != null) {
                    adaptersp.getFilter().filter(chuoitim);
                }
            }

            @Override
            public void afterTextChanged(Editable editable) {
            }
        });
    }

    // Phương thức mới để cập nhật UI phân trang
    private void updatePaginationUI() {
        // Cập nhật thông tin trang
        tvPageInfo.setText("Trang " + currentPage + "/" + (totalPages > 0 ? totalPages : "?"));

        // Kích hoạt/vô hiệu hóa nút Previous
        btnPrevPage.setEnabled(currentPage > 1);

        // Kích hoạt/vô hiệu hóa nút Next
        btnNextPage.setEnabled(!isLastPage);

        // Hiển thị/ẩn layout phân trang dựa trên số lượng sản phẩm
        if (allProductsData.size() <= itemsPerPage && currentPage == 1) {
            paginationLayout.setVisibility(View.GONE);
        } else {
            paginationLayout.setVisibility(View.VISIBLE);
        }
    }

    // Phương thức mới để hiển thị tất cả sản phẩm với phân trang
    private void loadAllProductsWithPagination() {
        if (isLoadingProducts) {
            Log.d(TAG, "Đang tải sản phẩm, bỏ qua yêu cầu");
            return;
        }

        // Tính toán vị trí bắt đầu và kết thúc cho trang hiện tại
        int startIndex = (currentPage - 1) * itemsPerPage;
        int endIndex = Math.min(startIndex + itemsPerPage, allProductsData.size());

        // Nếu vị trí bắt đầu lớn hơn kích thước của danh sách, reset về trang 1
        if (startIndex >= allProductsData.size() && allProductsData.size() > 0) {
            currentPage = 1;
            startIndex = 0;
            endIndex = Math.min(itemsPerPage, allProductsData.size());
        }

        // Kiểm tra xem có phải là trang cuối không
        isLastPage = (endIndex >= allProductsData.size());

        // Tính tổng số trang
        totalPages = (int) Math.ceil((double) allProductsData.size() / itemsPerPage);

        // Chuẩn bị dữ liệu cho trang hiện tại
        data.clear();

        if (startIndex < allProductsData.size()) {
            for (int i = startIndex; i < endIndex; i++) {
                data.add(allProductsData.get(i));
            }
        }

        // Cập nhật UI
        if (adaptersp != null) {
            adaptersp.notifyDataSetChanged();
            recyclerView.scheduleLayoutAnimation();
        }

        // Cập nhật UI phân trang
        updatePaginationUI();

        // Log thông tin
        Log.d(TAG, "Hiển thị trang " + currentPage + "/" + totalPages +
                " (" + startIndex + "-" + endIndex + " / " + allProductsData.size() + " sản phẩm)");
    }

    public class GridSpacingItemDecoration extends RecyclerView.ItemDecoration {
        private int spanCount;
        private int spacing;
        private boolean includeEdge;

        public GridSpacingItemDecoration(int spanCount, int spacing, boolean includeEdge) {
            this.spanCount = spanCount;
            this.spacing = spacing;
            this.includeEdge = includeEdge;
        }

        @Override
        public void getItemOffsets(Rect outRect, View view, RecyclerView parent, RecyclerView.State state) {
            int position = parent.getChildAdapterPosition(view);
            int column = position % spanCount;

            if (includeEdge) {
                outRect.left = spacing - column * spacing / spanCount;
                outRect.right = (column + 1) * spacing / spanCount;
                if (position < spanCount) {
                    outRect.top = spacing;
                }
                outRect.bottom = spacing;
            } else {
                outRect.left = column * spacing / spanCount;
                outRect.right = spacing - (column + 1) * spacing / spanCount;
                if (position >= spanCount) {
                    outRect.top = spacing;
                }
            }
        }
    }

    // Phương thức để thiết lập RecyclerViews
    private void setupRecyclerViews() {
        // Thiết lập RecyclerView cho danh mục
        LinearLayoutManager categoryLayoutManager = new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false);
        rvChude.setLayoutManager(categoryLayoutManager);
        rvChude.setHasFixedSize(true);

        GridLayoutManager productLayoutManager = new GridLayoutManager(getContext(), 2); // 2 cột
        recyclerView.setLayoutManager(productLayoutManager);
        recyclerView.setHasFixedSize(true);

        int spacingInPixels = getResources().getDimensionPixelSize(R.dimen.grid_spacing);
        recyclerView.addItemDecoration(new GridSpacingItemDecoration(2, spacingInPixels, true));

        try {
            LayoutAnimationController categoryAnimation = AnimationUtils.loadLayoutAnimation(getContext(), R.anim.layout_animation_slide_right);
            rvChude.setLayoutAnimation(categoryAnimation);

            LayoutAnimationController productAnimation = AnimationUtils.loadLayoutAnimation(getContext(), R.anim.layout_animation_from_bottom);
            recyclerView.setLayoutAnimation(productAnimation);
        } catch (Resources.NotFoundException e) {
            Log.e(TAG, "Animation resources not found", e);
        }
    }

    // Phương thức để làm mới dữ liệu
    private void refreshData() {
        // Xóa dữ liệu hiện tại
        chude.clear();
        data.clear();
        allProductsData.clear();

        // Bỏ chọn danh mục hiện tại
        if (chuDeAdapter != null) {
            try {
                chuDeAdapter.clearSelection();
            } catch (Exception e) {
                Log.e(TAG, "Cannot reset category selection", e);
            }
        }

        // Reset biến phân trang
        currentPage = 1;
        currentCategoryId = null;

        // Tải lại dữ liệu
        LoadChuDe();
        LoadSanPham();
    }

    // Phương thức để hiển thị tất cả sản phẩm
    private void showAllProducts() {
        currentCategoryId = null;
        currentPage = 1;

        // Hiển thị tất cả sản phẩm với phân trang
        if (allProductsData.size() > 0) {
            loadAllProductsWithPagination();
            Log.d(TAG, "Hiển thị tất cả " + allProductsData.size() + " sản phẩm với phân trang");
        } else {
            // Nếu không có dữ liệu, tải lại
            LoadSanPham();
        }
    }

    // Phương thức mới để gọi API lấy sản phẩm theo danh mục
    private void loadProductsByCategory(String categoryId) {
        if (getContext() == null) {
            return;
        }

        if (isLoadingProducts) {
            return;
        }

        // Lưu danh mục hiện tại
        currentCategoryId = categoryId;

        isLoadingProducts = true;
        swipeRefresh.setRefreshing(true);

        try {
            String baseUrl = "http://10.0.2.2:3100";
            String url = baseUrl + "/api/category/products/" + categoryId;
            Log.d(TAG, "Gọi API: " + url + ", Trang: " + currentPage);

            // Tạo request body với thông tin phân trang
            JSONObject requestBody = new JSONObject();
            requestBody.put("page", currentPage);
            requestBody.put("limit", itemsPerPage);

            RequestQueue requestQueue = Volley.newRequestQueue(getContext());

            JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.POST, url, requestBody,
                    new Response.Listener<JSONObject>() {
                        @Override
                        public void onResponse(JSONObject responseObject) {
                            try {
                                Log.d(TAG, "Phản hồi API danh mục: " + responseObject.toString().substring(0, Math.min(500, responseObject.toString().length())));

                                data.clear();

                                // Kiểm tra cấu trúc JSON
                                if (responseObject.has("data")) {
                                    JSONObject dataObject = responseObject.getJSONObject("data");

                                    // Xử lý thông tin phân trang
                                    if (dataObject.has("totalDocs")) {
                                        int totalItems = dataObject.getInt("totalDocs");
                                        totalPages = dataObject.optInt("totalPages", 1);
                                        currentPage = dataObject.optInt("page", 1);
                                        isLastPage = currentPage >= totalPages;

                                        Log.d(TAG, "Thông tin phân trang: Trang " + currentPage + "/" + totalPages +
                                                ", Tổng số sản phẩm: " + totalItems);
                                    }

                                    // Kiểm tra xem có trường "docs" không
                                    if (dataObject.has("docs")) {
                                        JSONArray docsArray = dataObject.getJSONArray("docs");

                                        if (docsArray.length() > 0) {
                                            Log.d(TAG, "Tìm thấy " + docsArray.length() + " sản phẩm trong trang " + currentPage);

                                            for (int j = 0; j < docsArray.length(); j++) {
                                                try {
                                                    JSONObject docsObject = docsArray.getJSONObject(j);

                                                    // Sử dụng tên trường chính xác từ API
                                                    String id = docsObject.optString("_id", "");
                                                    int giagoc = docsObject.optInt("price", 0); // Giá gốc
                                                    int giasanpham = docsObject.optInt("promotion", 0); // Giá sau khi giảm
                                                    String tensanpham = docsObject.optString("name", "");
                                                    String hinhsanpham = docsObject.optString("image", "");
                                                    String motasanpham = docsObject.optString("description", "");

                                                    // Kiểm tra nếu giá giảm <= 0 hoặc >= giá gốc, sử dụng giá gốc
                                                    if (giasanpham <= 0 || giasanpham >= giagoc) {
                                                        giasanpham = giagoc;
                                                    }

                                                    // Tạo đối tượng SanPham với constructor mới
                                                    SanPham product = new SanPham(id, categoryId, tensanpham, giagoc, giasanpham, hinhsanpham, motasanpham);
                                                    data.add(product);

                                                    Log.d(TAG, "Thêm sản phẩm danh mục: " + tensanpham + " - Giá gốc: " + giagoc + " - Giá giảm: " + giasanpham);
                                                } catch (Exception e) {
                                                    Log.e(TAG, "Lỗi xử lý sản phẩm thứ " + j + ": " + e.getMessage());
                                                }
                                            }
                                        } else {
                                            Toast.makeText(getContext(), "Không có sản phẩm nào trong trang này", Toast.LENGTH_SHORT).show();
                                        }
                                    }
                                }

                                // Cập nhật UI
                                if (adaptersp != null) {
                                    adaptersp.notifyDataSetChanged();
                                    recyclerView.scheduleLayoutAnimation();
                                }

                                // Cập nhật UI phân trang
                                updatePaginationUI();

                                // Cuộn lên đầu danh sách
                                recyclerView.smoothScrollToPosition(0);

                            } catch (Exception e) {
                                handleError("Lỗi xử lý dữ liệu sản phẩm theo danh mục: " + e.getMessage());
                                Log.e(TAG, "Lỗi chi tiết:", e);
                            } finally {
                                isLoadingProducts = false;
                                // Tắt loading
                                if (swipeRefresh != null && swipeRefresh.isRefreshing()) {
                                    swipeRefresh.setRefreshing(false);
                                }
                            }
                        }
                    },
                    new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            isLoadingProducts = false;

                            String errorMessage = "Lỗi kết nối khi tải sản phẩm theo danh mục";
                            if (error != null) {
                                if (error.networkResponse != null) {
                                    errorMessage += " (mã lỗi: " + error.networkResponse.statusCode + ")";
                                } else if (error.getMessage() != null) {
                                    errorMessage += ": " + error.getMessage();
                                }
                            }
                            handleError(errorMessage);

                            // Reset về trang 1 nếu có lỗi
                            currentPage = 1;

                            if (swipeRefresh != null && swipeRefresh.isRefreshing()) {
                                swipeRefresh.setRefreshing(false);
                            }
                        }
                    });

            jsonObjectRequest.setRetryPolicy(new DefaultRetryPolicy(
                    15000,
                    1,
                    DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
            ));

            requestQueue.add(jsonObjectRequest);

        } catch (Exception e) {
            isLoadingProducts = false;
            Log.e(TAG, "Lỗi khi tạo request sản phẩm theo danh mục: " + e.getMessage(), e);

            if (swipeRefresh != null && swipeRefresh.isRefreshing()) {
                swipeRefresh.setRefreshing(false);
            }

            // Reset về trang 1 nếu có lỗi
            currentPage = 1;
        }
    }

    private void LoadChuDe() {
        RequestQueue requestQueue = Volley.newRequestQueue(getContext());
        StringRequest stringRequest = new StringRequest(Request.Method.POST, SERVER.chudepath, new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {
                try {
                    // Xử lý phản hồi từ máy chủ sau khi gửi yêu cầu POST thành công
                    JSONObject responseObject = new JSONObject(response);

                    if (responseObject.has("data")) {
                        JSONObject dataObject = responseObject.getJSONObject("data");

                        if (dataObject.has("docs")) {
                            JSONArray docsArray = dataObject.getJSONArray("docs");
                            for (int i = 0; i < docsArray.length(); i++) {
                                JSONObject jsonObject = docsArray.getJSONObject(i);
                                chude.add(new ChuDe(
                                        jsonObject.getString("_id"),
                                        jsonObject.getString("name"),
                                        jsonObject.getString("image")));
                            }

                            setupChuDeAdapter();
                        }
                    }

                    if (swipeRefresh.isRefreshing()) {
                        swipeRefresh.setRefreshing(false);
                    }
                } catch (JSONException e) {
                    handleError("Lỗi xử lý dữ liệu danh mục: " + e.getMessage());
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                handleError("Lỗi kết nối: " + error.getMessage());
            }
        });
        requestQueue.add(stringRequest);
    }

    private void LoadSanPham() {
        if (getContext() == null) {
            return;
        }

        isLoadingProducts = true;
        try {
            RequestQueue requestQueue = Volley.newRequestQueue(getContext());

            JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.POST, SERVER.laysanphampath, null,
                    new Response.Listener<JSONObject>() {
                        @Override
                        public void onResponse(JSONObject responseObject) {
                            try {
                                Log.d(TAG, "Phản hồi API sản phẩm: " + responseObject.toString().substring(0, Math.min(500, responseObject.toString().length())));

                                data.clear();
                                allProductsData.clear();

                                // Kiểm tra cấu trúc JSON
                                if (responseObject.has("data")) {
                                    JSONObject dataObject = responseObject.getJSONObject("data");

                                    // Kiểm tra xem có trường "docs" không
                                    if (dataObject.has("docs")) {
                                        JSONArray docsArray = dataObject.getJSONArray("docs");

                                        if (docsArray.length() > 0) {
                                            Log.d(TAG, "Tìm thấy " + docsArray.length() + " sản phẩm");

                                            for (int j = 0; j < docsArray.length(); j++) {
                                                try {
                                                    JSONObject docsObject = docsArray.getJSONObject(j);

                                                    // Sử dụng tên trường chính xác từ model SanPham và API
                                                    String id = docsObject.optString("_id", "");
                                                    String categoryId = docsObject.optString("category_id", ""); // Lấy ID danh mục từ JSON
                                                    String tensanpham = docsObject.optString("name", "");
                                                    int giagoc = docsObject.optInt("price", 0); // Giá gốc
                                                    int giasanpham = docsObject.optInt("promotion", 0); // Giá giảm
                                                    String hinhsanpham = docsObject.optString("image", "");
                                                    String motasanpham = docsObject.optString("description", "");

                                                    // Kiểm tra nếu giá giảm <= 0 hoặc >= giá gốc, sử dụng giá gốc
                                                    if (giasanpham <= 0 || giasanpham >= giagoc) {
                                                        giasanpham = giagoc;
                                                    }

                                                    // Kiểm tra dữ liệu quan trọng trước khi thêm vào danh sách
                                                    if (!id.isEmpty() && !tensanpham.isEmpty()) {
                                                        // Tạo đối tượng SanPham với constructor mới
                                                        SanPham product = new SanPham(id, categoryId, tensanpham, giagoc, giasanpham, hinhsanpham, motasanpham);

                                                        allProductsData.add(product); // Thêm vào danh sách tất cả sản phẩm

                                                        Log.d(TAG, "Thêm sản phẩm: " + tensanpham + " - Danh mục: " + categoryId +
                                                                " - Giá gốc: " + giagoc + " - Giá giảm: " + giasanpham);
                                                    } else {
                                                        Log.w(TAG, "Bỏ qua sản phẩm thiếu dữ liệu quan trọng");
                                                    }
                                                } catch (Exception e) {
                                                    Log.e(TAG, "Lỗi xử lý sản phẩm thứ " + j + ": " + e.getMessage());
                                                }
                                            }
                                        } else {
                                            Log.w(TAG, "Không tìm thấy sản phẩm nào");
                                        }
                                    }
                                }

                                setupSanPhamAdapter();
                                loadAllProductsWithPagination();
                                totalPages = (int) Math.ceil((double) allProductsData.size() / itemsPerPage);
                                isLastPage = currentPage >= totalPages;
                                updatePaginationUI();

                            } catch (Exception e) {
                                handleError("Lỗi xử lý dữ liệu sản phẩm: " + e.getMessage());
                                Log.e(TAG, "Lỗi chi tiết:", e);
                            } finally {
                                isLoadingProducts = false;
                                if (swipeRefresh != null && swipeRefresh.isRefreshing()) {
                                    swipeRefresh.setRefreshing(false);
                                }
                            }
                        }
                    },
                    new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            isLoadingProducts = false;
                            String errorMessage = "Lỗi kết nối";
                            if (error != null) {
                                if (error.networkResponse != null) {
                                    errorMessage += " (mã lỗi: " + error.networkResponse.statusCode + ")";
                                } else if (error.getMessage() != null) {
                                    errorMessage += ": " + error.getMessage();
                                }
                            }
                            handleError(errorMessage);
                            if (getContext() != null) {
                                Toast.makeText(getContext(), "Không thể tải sản phẩm", Toast.LENGTH_SHORT).show();
                            }

                            if (swipeRefresh != null && swipeRefresh.isRefreshing()) {
                                swipeRefresh.setRefreshing(false);
                            }
                        }
                    });

            jsonObjectRequest.setRetryPolicy(new DefaultRetryPolicy(
                    15000,
                    1,
                    DefaultRetryPolicy.DEFAULT_BACKOFF_MULT
            ));

            requestQueue.add(jsonObjectRequest);

        } catch (Exception e) {
            isLoadingProducts = false;
            Log.e(TAG, "Lỗi khi tạo request: " + e.getMessage(), e);

            if (swipeRefresh != null && swipeRefresh.isRefreshing()) {
                swipeRefresh.setRefreshing(false);
            }

            if (getContext() != null) {
                Toast.makeText(getContext(), "Không thể tải sản phẩm, vui lòng thử lại", Toast.LENGTH_SHORT).show();
            }
        }
    }

    // Phương thức để thiết lập SanPhamAdapter
    private void setupSanPhamAdapter() {
        try {
            // Kiểm tra context và recyclerView
            if (getContext() == null || recyclerView == null) {
                Log.e(TAG, "Context hoặc recyclerView là null");
                return;
            }

            // Kiểm tra dữ liệu
            if (data == null) {
                data = new ArrayList<>();
                Log.w(TAG, "Tạo mới ArrayList sản phẩm");
            }

            // Kiểm tra LayoutManager
            if (recyclerView.getLayoutManager() == null) {
                GridLayoutManager layoutManager = new GridLayoutManager(getContext(), 2);
                recyclerView.setLayoutManager(layoutManager);
                Log.d(TAG, "Đã thiết lập GridLayoutManager mới");
            }

            // Thiết lập adapter
            if (adaptersp == null) {
                adaptersp = new SanPhamAdapter(data, getContext());
                adaptersp.setOnItemClickListener(new SanPhamAdapter.OnItemClickListener() {
                    @Override
                    public void onItemClick(SanPham sp) {
                        openProductDetail(sp);
                    }
                });

                recyclerView.setAdapter(adaptersp);
                recyclerView.scheduleLayoutAnimation();
                Log.d(TAG, "Đã tạo adapter mới");
            } else {
                adaptersp.setOnItemClickListener(new SanPhamAdapter.OnItemClickListener() {
                    @Override
                    public void onItemClick(SanPham sp) {
                        openProductDetail(sp);
                    }
                });

                adaptersp.notifyDataSetChanged();
                recyclerView.scheduleLayoutAnimation();
                Log.d(TAG, "Đã cập nhật adapter hiện có");
            }
        } catch (Exception e) {
            Log.e(TAG, "Lỗi khi thiết lập adapter: " + e.getMessage(), e);
        }
    }

    // Phương thức để mở màn hình chi tiết sản phẩm
    private void openProductDetail(SanPham sp) {
        try {
            Intent intent = new Intent(getActivity(), ChiTietSanPhamActivity.class);
            intent.putExtra("id", sp.getIdsanpham());
            intent.putExtra("name", sp.getTensanpham());
            intent.putExtra("price", sp.getGiasanpham());
            intent.putExtra("original_price", sp.getGiagoc());
            intent.putExtra("img", sp.getHinhsanpham());
            intent.putExtra("mota", sp.getMotasanpham());

            Log.d(TAG, "Chuyển đến chi tiết sản phẩm: " + sp.getTensanpham());

            // Kiểm tra xem intent đã được thiết lập đúng không
            Log.d(TAG, "Intent data: id=" + sp.getIdsanpham() + ", name=" + sp.getTensanpham() +
                    ", original_price=" + sp.getGiagoc() + ", sale_price=" + sp.getGiasanpham() +
                    ", img=" + sp.getHinhsanpham());

            startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(getContext(), "Không thể mở chi tiết sản phẩm: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    // Phương thức để xử lý lỗi
    private void handleError(String message) {
        if (swipeRefresh.isRefreshing()) {
            swipeRefresh.setRefreshing(false);
        }

        try {
            Snackbar.make(requireView(), message, Snackbar.LENGTH_LONG)
                    .setAction("Thử lại", new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            refreshData();
                        }
                    })
                    .show();
        } catch (Exception e) {
            Toast.makeText(getContext(), message, Toast.LENGTH_LONG).show();
        }
    }

    // Phương thức để load slide
    void LoadViewFlipper() {
        ArrayList<String> slidepnj = new ArrayList<>();
        slidepnj.add("https://img.tgdd.vn/imgt/f_webp,fit_outside,quality_100/https://cdn.tgdd.vn/2023/11/banner/IP15-720-220-720x220-3.png");
        slidepnj.add("https://img.tgdd.vn/imgt/f_webp,fit_outside,quality_100/https://cdn.tgdd.vn/2023/12/banner/Camera-Tiandy-720-220-720x220-1.png");
        slidepnj.add("https://img.tgdd.vn/imgt/f_webp,fit_outside,quality_100/https://cdn.tgdd.vn/2023/11/banner/C53-HC-720-220-720x220-4.png");
        slidepnj.add("https://img.tgdd.vn/imgt/f_webp,fit_outside,quality_100/https://cdn.tgdd.vn/2023/11/banner/Le-hoi-OPPO-720-220-720x220-2.png");
        slidepnj.add("https://img.tgdd.vn/imgt/f_webp,fit_outside,quality_100/https://cdn.tgdd.vn/2023/12/banner/Smartwatch-720-220-720x220-3.png");

        for (String slide : slidepnj) {
            ImageView hinh = new ImageView(getContext());
            Picasso.get().load(slide).into(hinh);
            hinh.setScaleType(ImageView.ScaleType.FIT_XY);
            viewFlipper.addView(hinh);
        }
        Animation in = AnimationUtils.loadAnimation(getContext(), android.R.anim.slide_in_left);
        Animation out = AnimationUtils.loadAnimation(getContext(), android.R.anim.slide_out_right);
        viewFlipper.setInAnimation(in);
        viewFlipper.setOutAnimation(out);
        viewFlipper.setAutoStart(true);
        viewFlipper.setFlipInterval(3000);
    }

    // Phương thức để thiết lập ChuDeAdapter
    private void setupChuDeAdapter() {
        chuDeAdapter = new ChuDeAdapter(chude, getContext());

        try {
            chuDeAdapter.setOnCategoryClickListener(new ChuDeAdapter.OnCategoryClickListener() {
                @Override
                public void onCategoryClick(ChuDe chuDe, int position) {
                    if (chuDeAdapter.getSelectedPosition() == -1) {
                        currentPage = 1;
                        currentCategoryId = null;

                        loadAllProductsWithPagination();
                        Toast.makeText(getContext(), "Hiển thị tất cả sản phẩm", Toast.LENGTH_SHORT).show();
                    } else {
                        currentPage = 1;

                        String categoryId = chuDe.getIdchude();
                        Log.d(TAG, "Tải sản phẩm theo danh mục: " + categoryId);

                        loadProductsByCategory(categoryId);
                        Toast.makeText(getContext(), "Danh mục: " + chuDe.getTenchude(), Toast.LENGTH_SHORT).show();
                    }
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "ChuDeAdapter doesn't support click listeners", e);
        }

        rvChude.setAdapter(chuDeAdapter);
        rvChude.scheduleLayoutAnimation();
    }
}