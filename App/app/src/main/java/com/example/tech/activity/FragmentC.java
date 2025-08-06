package com.example.tech.activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.Toast;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonArrayRequest;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.example.tech.R;
import com.example.tech.adapter.NewsAdapter;
import com.example.tech.model.News;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

public class FragmentC extends Fragment implements NewsAdapter.OnNewsItemClickListener {

    private static final String TAG = "FragmentC";
    private static final String BASE_URL = "http://10.0.2.2:3100";

    private RecyclerView recyclerViewNews;
    private NewsAdapter newsAdapter;
    private List<News> newsList;
    private ProgressBar progressBar;
    private SwipeRefreshLayout swipeRefreshLayout;
    private RequestQueue requestQueue;
    private Gson gson;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.activity_fragment_c, container, false);
        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        // Khởi tạo RequestQueue và Gson
        requestQueue = Volley.newRequestQueue(requireContext());
        gson = new Gson();

        // Khởi tạo các view
        recyclerViewNews = view.findViewById(R.id.recyclerViewNews);
        progressBar = view.findViewById(R.id.progressBar);
        swipeRefreshLayout = view.findViewById(R.id.swipeRefreshNews);

        // Thiết lập RecyclerView
        newsList = new ArrayList<>();
        newsAdapter = new NewsAdapter(getContext(), newsList, this);
        recyclerViewNews.setLayoutManager(new LinearLayoutManager(getContext()));
        recyclerViewNews.setAdapter(newsAdapter);

        // Thiết lập SwipeRefreshLayout
        swipeRefreshLayout.setOnRefreshListener(this::loadNewsData);
        swipeRefreshLayout.setColorSchemeResources(R.color.teal_700);

        // Lấy dữ liệu tin tức
        loadNewsData();
    }

    private void loadNewsData() {
        if (!swipeRefreshLayout.isRefreshing()) {
            progressBar.setVisibility(View.VISIBLE);
        }

        String url = BASE_URL + "/api/news/search";
        Log.d(TAG, "Loading news from URL: " + url);

        JsonObjectRequest request = new JsonObjectRequest(Request.Method.POST, url, null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        progressBar.setVisibility(View.GONE);
                        swipeRefreshLayout.setRefreshing(false);

                        try {
                            Log.d(TAG, "Received response: " + response.toString());

                            // Lấy object data và mảng docs
                            JSONObject dataObject = response.getJSONObject("data");
                            JSONArray newsArray = dataObject.getJSONArray("docs");

                            // Chuyển đổi JSON thành danh sách đối tượng News
                            Type listType = new TypeToken<ArrayList<News>>(){}.getType();
                            List<News> fetchedNews = gson.fromJson(newsArray.toString(), listType);

                            // Debug
                            Log.d(TAG, "Parsed " + fetchedNews.size() + " news items");
                            for (News news : fetchedNews) {
                                Log.d(TAG, "News item: " + news.toString());
                            }

                            // Cập nhật UI
                            newsList.clear();
                            newsList.addAll(fetchedNews);
                            newsAdapter.notifyDataSetChanged();

                        } catch (JSONException e) {
                            Log.e(TAG, "Error parsing JSON: " + e.getMessage(), e);
                            Toast.makeText(getContext(), "Lỗi khi xử lý dữ liệu: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        progressBar.setVisibility(View.GONE);
                        swipeRefreshLayout.setRefreshing(false);

                        String errorMsg = "Không thể tải dữ liệu tin tức";

                        if (error.networkResponse != null) {
                            errorMsg += " (Mã lỗi: " + error.networkResponse.statusCode + ")";

                            if (error.networkResponse.data != null) {
                                try {
                                    String responseBody = new String(error.networkResponse.data, "utf-8");
                                    Log.e(TAG, "Error response body: " + responseBody);
                                } catch (Exception e) {
                                    Log.e(TAG, "Cannot parse error response", e);
                                }
                            }
                        }

                        Log.e(TAG, errorMsg, error);
                        Toast.makeText(getContext(), errorMsg, Toast.LENGTH_SHORT).show();
                    }
                });

        request.setRetryPolicy(new DefaultRetryPolicy(
                30000,  // 30 giây timeout
                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        requestQueue.add(request);
    }

    @Override
    public void onNewsItemClick(News news) {
        Log.d(TAG, "News clicked: " + news.toString());

        if (news.getId() == null || news.getId().isEmpty()) {
            Toast.makeText(getContext(), "Không tìm thấy ID tin tức", Toast.LENGTH_SHORT).show();
            return;
        }

        Intent intent = new Intent(getActivity(), NewsDetailActivity.class);
        intent.putExtra("NEWS_ID", news.getId());
        startActivity(intent);
    }
}