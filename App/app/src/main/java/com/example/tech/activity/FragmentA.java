package com.example.tech.activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DividerItemDecoration;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.Toast;
import android.widget.ViewFlipper;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.tech.R;
import com.example.tech.SERVER;
import com.example.tech.adapter.ChuDeAdapter;

import com.example.tech.adapter.SanPhamAdapter;
import com.example.tech.model.ChuDe;
import com.example.tech.model.SanPham;
import com.squareup.picasso.Picasso;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

public class FragmentA extends Fragment {


    RecyclerView rvChude;
    RecyclerView recyclerView;
    ArrayList<SanPham> data = new ArrayList<>();
    SanPhamAdapter adaptersp;
    ArrayList<ChuDe> chude = new ArrayList<>();
    ChuDeAdapter chuDeAdapter;
    ViewFlipper viewFlipper;
    EditText edtsearch;


    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.activity_fragment_a, container, false);
        // lay slide
        viewFlipper=view.findViewById(R.id.viewflipper);
        LoadViewFlipper();
        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // ánh xa
        recyclerView=view.findViewById(R.id.rcSanpham);
        rvChude= view.findViewById(R.id.rcchude);
        edtsearch=view.findViewById(R.id.edtsearch);

        ImageView imgGioHang = view.findViewById(R.id.imggiohang);
        imgGioHang.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // Xử lý khi người dùng nhấp vào ImageView "imggiohang"
                // Ở đây, bạn có thể chuyển sang trang "GioHang" bằng cách gọi phương thức startActivity() với Intent tương ứng
                Intent intent = new Intent(getActivity(), GioHang.class);
                startActivity(intent);
            }
        });

        // lay chu de
        LoadChuDe();
        // lay san pham
        LoadSanPham();

        // tim kiem
        edtsearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence charSequence, int i, int i1, int i2) {

            }

            @Override
            public void onTextChanged(CharSequence charSequence, int i, int i1, int i2) {

                String chuoitim = charSequence.toString();
                adaptersp.getFilter().filter(chuoitim);
            }

            @Override
            public void afterTextChanged(Editable editable) {

            }
        });

    }


    // lay chu de
    private void LoadChuDe() {
        RequestQueue requestQueue = Volley.newRequestQueue(getContext());
        StringRequest stringRequest = new StringRequest(Request.Method.POST, SERVER.chudepath, new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {
                try {
                    // Xử lý phản hồi từ máy chủ sau khi gửi yêu cầu POST thành công
                    JSONObject responseObject = new JSONObject(response);

                    // Kiểm tra xem có trường "data" không
                    if (responseObject.has("data")) {
                        JSONObject dataObject = responseObject.getJSONObject("data");

                        // Kiểm tra xem có trường "docs" không
                        if (dataObject.has("docs")) {
                            JSONArray docsArray = dataObject.getJSONArray("docs");
                            for (int i = 0; i < docsArray.length(); i++) {
                                JSONObject jsonObject = docsArray.getJSONObject(i);
                                chude.add(new ChuDe(
                                        jsonObject.getString("_id"),
                                        jsonObject.getString("name"),
                                        jsonObject.getString("image")));
                            }

                            chuDeAdapter.notifyDataSetChanged();
                        }
                    }
                } catch (JSONException e) {
                    Toast.makeText(getContext(), e.getMessage(), Toast.LENGTH_LONG).show();
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                // Xử lý lỗi nếu có
                Toast.makeText(getContext(), error.getMessage(), Toast.LENGTH_LONG).show();
            }
        });
        requestQueue.add(stringRequest);
        chuDeAdapter = new ChuDeAdapter(chude, getContext());
        rvChude.setAdapter(chuDeAdapter);
        rvChude.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
    }


    // lay hinh anh tu sever ve
    private void LoadSanPham() {
        RequestQueue requestQueue = Volley.newRequestQueue(getContext());

        JsonObjectRequest jsonObjectRequest = new JsonObjectRequest(Request.Method.POST, SERVER.laysanphampath, null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject responseObject) {
                        try {
                            // Xử lý phản hồi từ máy chủ sau khi gửi yêu cầu GET thành công
                            data.clear(); // Xóa dữ liệu cũ trước khi thêm dữ liệu mới

                            // Kiểm tra xem có phải là 'data' và 'docs' hay không, tùy thuộc vào cấu trúc API
                            if (responseObject.has("data")) {
                                JSONObject dataObject = responseObject.getJSONObject("data");

                                // Kiểm tra xem có trường "docs" không
                                if (dataObject.has("docs")) {
                                    JSONArray docsArray = dataObject.getJSONArray("docs");
                                    for (int j = 0; j < docsArray.length(); j++) {
                                        JSONObject docsObject = docsArray.getJSONObject(j);
                                        data.add(new SanPham(
                                                docsObject.getString("_id"),
                                                docsObject.getString("quantity"),
                                                docsObject.getString("name"),
                                                docsObject.getInt("promotion"),
                                                docsObject.getString("image"),
                                                docsObject.getString("description")
                                        ));
                                    }
                                }
                            }

                            adaptersp.notifyDataSetChanged();
                        } catch (JSONException e) {
                            Toast.makeText(getContext(), e.getMessage(), Toast.LENGTH_LONG).show();
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        // Xử lý lỗi nếu có
                        Toast.makeText(getContext(), error.getMessage(), Toast.LENGTH_LONG).show();
                    }
                });

        requestQueue.add(jsonObjectRequest);

        adaptersp = new SanPhamAdapter(data, getContext());
        adaptersp.setOnItemClickListener(new SanPhamAdapter.OnItemClickListener() {
            @Override
            public void onItemClick(SanPham sp) {
                Intent intent = new Intent(getContext(), ChiTietSanPhamActivity.class);
                //chuyền dữ liệu
                intent.putExtra("id", sp.getIdsanpham());
                intent.putExtra("name", sp.getTensanpham());
                intent.putExtra("price", sp.giasanpham);
                intent.putExtra("img", sp.getHinhsanpham());
                intent.putExtra("mota", sp.getMotasanpham());
                startActivity(intent);
            }
        });

        recyclerView.setAdapter(adaptersp);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.VERTICAL, false));
        recyclerView.addItemDecoration(new DividerItemDecoration(getContext(), DividerItemDecoration.VERTICAL));
    }



    // load slide
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
            hinh.setScaleType(ImageView.ScaleType.FIT_XY); // Cố định lại 2 chiều hình ảnh\
            viewFlipper.addView(hinh);
        }
        // Animation
        Animation in = AnimationUtils.loadAnimation(getContext(), android.R.anim.slide_in_left);
        Animation out = AnimationUtils.loadAnimation(getContext(), android.R.anim.slide_out_right);
        viewFlipper.setInAnimation(in);
        viewFlipper.setOutAnimation(out);
        // Set autoStart
        viewFlipper.setAutoStart(true);
        // Set time run Slide
        viewFlipper.setFlipInterval(3000);
    }

}
