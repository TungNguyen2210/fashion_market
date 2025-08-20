package com.example.tech.activity;

import android.annotation.SuppressLint;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.text.Html;
import android.util.Log;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.bumptech.glide.Glide;
import com.example.apptrangsuc.R;
import com.example.tech.model.News;
import com.google.gson.Gson;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class NewsDetailActivity extends AppCompatActivity {

    private static final String TAG = "NewsDetailActivity";
    private static final String BASE_URL = "http://10.0.2.2:3100";

    private Toolbar toolbar;
    private ImageView imgNewsDetail;
    private TextView tvTitle, tvDate, tvContent;
    private LinearLayout contentContainer;
    private ProgressBar progressBar;
    private RequestQueue requestQueue;
    private Gson gson;

    @SuppressLint("MissingInflatedId")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_news_detail);

        // Khởi tạo RequestQueue và Gson
        requestQueue = Volley.newRequestQueue(this);
        gson = new Gson();

        // Khởi tạo các view
        toolbar = findViewById(R.id.toolbar);
        imgNewsDetail = findViewById(R.id.imgNewsDetail);
        tvTitle = findViewById(R.id.tvTitle);
        tvDate = findViewById(R.id.tvDate);
        tvContent = findViewById(R.id.tvContent);
        contentContainer = findViewById(R.id.contentContainer);
        progressBar = findViewById(R.id.progressBar);

        // Thiết lập toolbar
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        getSupportActionBar().setTitle("Chi Tiết Tin Tức");

        // Lấy newsId từ intent
        String newsId = getIntent().getStringExtra("NEWS_ID");
        if (newsId != null && !newsId.isEmpty()) {
            loadNewsDetail(newsId);
        } else {
            Toast.makeText(this, "Không tìm thấy thông tin tin tức", Toast.LENGTH_SHORT).show();
            finish();
        }
    }

    private void loadNewsDetail(String newsId) {
        progressBar.setVisibility(View.VISIBLE);

        // Xây dựng URL API
        String url = BASE_URL + "/api/news/" + newsId;
        Log.d(TAG, "Loading news detail from URL: " + url);

        JsonObjectRequest request = new JsonObjectRequest(Request.Method.GET, url, null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        progressBar.setVisibility(View.GONE);
                        Log.d(TAG, "Response received: " + response.toString());

                        try {
                            if (response.has("data")) {
                                JSONObject newsData = response.getJSONObject("data");
                                News news = gson.fromJson(newsData.toString(), News.class);
                                displayNewsDetail(news);
                            } else {
                                Log.e(TAG, "Response doesn't contain 'data' field");
                                Toast.makeText(NewsDetailActivity.this, "Định dạng dữ liệu không hợp lệ", Toast.LENGTH_SHORT).show();
                            }
                        } catch (JSONException e) {
                            Log.e(TAG, "Error parsing JSON: " + e.getMessage(), e);
                            Toast.makeText(NewsDetailActivity.this, "Lỗi khi xử lý dữ liệu: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        progressBar.setVisibility(View.GONE);

                        String errorMessage = "Không thể tải chi tiết tin tức";

                        if (error.networkResponse != null) {
                            errorMessage += " (Mã lỗi: " + error.networkResponse.statusCode + ")";

                            if (error.networkResponse.data != null) {
                                try {
                                    String errorData = new String(error.networkResponse.data, "UTF-8");
                                    Log.e(TAG, "Error response: " + errorData);
                                } catch (Exception e) {
                                    Log.e(TAG, "Cannot parse error data", e);
                                }
                            }
                        } else {
                            errorMessage += ": " + error.getMessage();
                        }

                        Log.e(TAG, errorMessage, error);
                        Toast.makeText(NewsDetailActivity.this, errorMessage, Toast.LENGTH_SHORT).show();
                    }
                });

        // Tăng timeout và số lần thử lại
        request.setRetryPolicy(new DefaultRetryPolicy(
                30000, // 30 giây timeout
                DefaultRetryPolicy.DEFAULT_MAX_RETRIES,
                DefaultRetryPolicy.DEFAULT_BACKOFF_MULT));

        // Thêm request vào queue
        requestQueue.add(request);
    }

    private void displayNewsDetail(News news) {
        if (news == null) {
            Log.e(TAG, "News object is null");
            Toast.makeText(this, "Không tìm thấy thông tin tin tức", Toast.LENGTH_SHORT).show();
            return;
        }

        // Hiển thị tiêu đề
        if (news.getTitle() != null) {
            tvTitle.setText(news.getTitle());
            getSupportActionBar().setTitle(news.getTitle());
        }

        // Hiển thị ngày
        if (news.getCreatedAt() != null && !news.getCreatedAt().isEmpty()) {
            try {
                SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                SimpleDateFormat outputFormat = new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault());
                Date date = inputFormat.parse(news.getCreatedAt());
                tvDate.setText(outputFormat.format(date));
                tvDate.setVisibility(View.VISIBLE);
            } catch (ParseException e) {
                tvDate.setText(news.getCreatedAt());
                Log.e(TAG, "Error parsing date: " + e.getMessage(), e);
            }
        } else {
            tvDate.setVisibility(View.GONE);
        }

        // Hiển thị ảnh chính nếu có
        if (news.getImage() != null && !news.getImage().isEmpty()) {
            String imageUrl = processImageUrl(news.getImage());
            Log.d(TAG, "Loading main image from: " + imageUrl);

            Glide.with(this)
                    .load(imageUrl)
                    .placeholder(R.drawable.placeholder_image)
                    .error(R.drawable.error_image)
                    .into(imgNewsDetail);
            imgNewsDetail.setVisibility(View.VISIBLE);
        } else {
            imgNewsDetail.setVisibility(View.GONE);
        }

        // Hiển thị nội dung
        if (news.getContent() != null && !news.getContent().isEmpty()) {
            displayContentInTextView(news.getContent());
        } else {
            tvContent.setText("Không có nội dung chi tiết");
        }
    }

    private void displayContentInTextView(String content) {
        // Xử lý nội dung HTML
        String processedContent = processHtmlContent(content);

        // Tách nội dung thành các đoạn văn bản và hình ảnh
        List<ContentSegment> segments = extractContentSegments(processedContent);

        // Xóa nội dung TextView chính
        tvContent.setText("");

        // Lấy parent của TextView chính (LinearLayout)
        ViewGroup parent = (ViewGroup) tvContent.getParent();
        int contentIndex = parent.indexOfChild(tvContent);

        // Xóa tất cả view đã thêm sau TextView chính
        for (int i = parent.getChildCount() - 1; i > contentIndex; i--) {
            parent.removeViewAt(i);
        }

        // Thêm từng segment vào layout theo đúng thứ tự
        boolean isFirstTextSegment = true;

        for (ContentSegment segment : segments) {
            if (segment.type == ContentSegment.TYPE_TEXT) {
                if (isFirstTextSegment) {
                    // Đối với đoạn văn đầu tiên, sử dụng TextView đã có
                    tvContent.setText(segment.content);
                    isFirstTextSegment = false;
                } else {
                    // Tạo TextView mới cho các đoạn tiếp theo
                    TextView textView = new TextView(this);
                    LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT);
                    params.setMargins(0, 16, 0, 0);
                    textView.setLayoutParams(params);
                    textView.setTextColor(getResources().getColor(R.color.black));
                    textView.setTextSize(16);
                    textView.setLineSpacing(0, 1.6f);
                    textView.setText(segment.content);

                    parent.addView(textView);
                }
            } else if (segment.type == ContentSegment.TYPE_IMAGE) {
                // Tạo ImageView mới cho hình ảnh
                ImageView imageView = new ImageView(this);
                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT);
                params.setMargins(0, 24, 0, 24);
                imageView.setLayoutParams(params);
                imageView.setAdjustViewBounds(true);
                imageView.setScaleType(ImageView.ScaleType.FIT_CENTER);

                // Tải hình ảnh bằng Glide
                Glide.with(this)
                        .load(segment.content)
                        .placeholder(R.drawable.placeholder_image)
                        .error(R.drawable.error_image)
                        .into(imageView);

                parent.addView(imageView);
            }
        }
    }

    // Class để lưu trữ các phần của nội dung
    private static class ContentSegment {
        static final int TYPE_TEXT = 1;
        static final int TYPE_IMAGE = 2;

        int type;
        String content;

        ContentSegment(int type, String content) {
            this.type = type;
            this.content = content;
        }
    }

    // Phương thức để tách nội dung thành text và image
    private List<ContentSegment> extractContentSegments(String htmlContent) {
        List<ContentSegment> segments = new ArrayList<>();

        try {
            // Pattern để nhận dạng thẻ img
            Pattern imgPattern = Pattern.compile("<img[^>]+src=[\"']([^\"']+)[\"'][^>]*>");
            Matcher imgMatcher = imgPattern.matcher(htmlContent);

            // Tìm tất cả vị trí của thẻ img
            List<Integer> imgStartPositions = new ArrayList<>();
            List<Integer> imgEndPositions = new ArrayList<>();
            List<String> imgUrls = new ArrayList<>();

            while (imgMatcher.find()) {
                imgStartPositions.add(imgMatcher.start());
                imgEndPositions.add(imgMatcher.end());
                imgUrls.add(processImageUrl(imgMatcher.group(1)));
            }

            // Nếu không có ảnh, trả về một segment text duy nhất
            if (imgStartPositions.isEmpty()) {
                segments.add(new ContentSegment(ContentSegment.TYPE_TEXT, cleanHtmlText(htmlContent)));
                return segments;
            }

            // Xử lý văn bản trước ảnh đầu tiên
            if (imgStartPositions.get(0) > 0) {
                String textBeforeFirstImg = htmlContent.substring(0, imgStartPositions.get(0));
                if (!textBeforeFirstImg.trim().isEmpty()) {
                    segments.add(new ContentSegment(ContentSegment.TYPE_TEXT, cleanHtmlText(textBeforeFirstImg)));
                }
            }

            // Xử lý lần lượt từng ảnh và văn bản giữa các ảnh
            for (int i = 0; i < imgUrls.size(); i++) {
                // Thêm segment ảnh
                segments.add(new ContentSegment(ContentSegment.TYPE_IMAGE, imgUrls.get(i)));

                // Thêm văn bản sau ảnh hiện tại
                if (i < imgUrls.size() - 1) {
                    String textBetweenImages = htmlContent.substring(imgEndPositions.get(i), imgStartPositions.get(i + 1));
                    if (!textBetweenImages.trim().isEmpty()) {
                        segments.add(new ContentSegment(ContentSegment.TYPE_TEXT, cleanHtmlText(textBetweenImages)));
                    }
                }
            }

            // Xử lý văn bản sau ảnh cuối cùng
            if (imgEndPositions.get(imgEndPositions.size() - 1) < htmlContent.length()) {
                String textAfterLastImg = htmlContent.substring(imgEndPositions.get(imgEndPositions.size() - 1));
                if (!textAfterLastImg.trim().isEmpty()) {
                    segments.add(new ContentSegment(ContentSegment.TYPE_TEXT, cleanHtmlText(textAfterLastImg)));
                }
            }
        } catch (Exception e) {
            // Nếu có lỗi xảy ra, trả về nội dung gốc dưới dạng text
            Log.e(TAG, "Error extracting content segments: " + e.getMessage(), e);
            segments.add(new ContentSegment(ContentSegment.TYPE_TEXT, cleanHtmlText(htmlContent)));
        }

        return segments;
    }

    // Phương thức để làm sạch văn bản HTML
    private String cleanHtmlText(String html) {
        if (html == null) return "";

        try {
            return html
                    .replaceAll("</?p>", "\n")
                    .replaceAll("</?br>", "\n")
                    .replaceAll("</?div[^>]*>", "")
                    .replaceAll("</?span[^>]*>", "")
                    .replaceAll("<b>(.*?)</b>", "$1")
                    .replaceAll("<strong>(.*?)</strong>", "$1")
                    .replaceAll("<i>(.*?)</i>", "$1")
                    .replaceAll("<em>(.*?)</em>", "$1")
                    .replaceAll("<h1[^>]*>(.*?)</h1>", "\n\n$1\n\n")
                    .replaceAll("<h2[^>]*>(.*?)</h2>", "\n\n$1\n\n")
                    .replaceAll("<h3[^>]*>(.*?)</h3>", "\n\n$1\n\n")
                    .replaceAll("<h4[^>]*>(.*?)</h4>", "\n\n$1\n\n")
                    .replaceAll("<h5[^>]*>(.*?)</h5>", "\n\n$1\n\n")
                    .replaceAll("<h6[^>]*>(.*?)</h6>", "\n\n$1\n\n")
                    .replaceAll("</?ul[^>]*>", "\n")
                    .replaceAll("</?ol[^>]*>", "\n")
                    .replaceAll("<li[^>]*>(.*?)</li>", "\n• $1")
                    .replaceAll("<a[^>]+href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", "$2")
                    .replaceAll("<[^>]*>", "")
                    .replaceAll("&nbsp;", " ")
                    .replaceAll("&amp;", "&")
                    .replaceAll("&lt;", "<")
                    .replaceAll("&gt;", ">")
                    .replaceAll("&quot;", "\"")
                    .replaceAll("&#39;", "'")
                    .replaceAll("\n\n+", "\n\n")
                    .trim();
        } catch (Exception e) {
            Log.e(TAG, "Error cleaning HTML: " + e.getMessage(), e);
            return html;
        }
    }

    private String processHtmlContent(String htmlContent) {
        if (htmlContent == null) return "";

        try {
            htmlContent = htmlContent.replaceAll("src=\"http://localhost:3100", "src=\"http://10.0.2.2:3100");
            htmlContent = htmlContent.replaceAll("src='http://localhost:3100", "src='http://10.0.2.2:3100");

            htmlContent = htmlContent.replaceAll("src=\"/uploads", "src=\"http://10.0.2.2:3100/uploads");
            htmlContent = htmlContent.replaceAll("src='/uploads", "src='http://10.0.2.2:3100/uploads");

            htmlContent = htmlContent.replaceAll("\\\\\\\\", "/");
            htmlContent = htmlContent.replaceAll("\\\\", "/");

            return htmlContent;
        } catch (Exception e) {
            Log.e(TAG, "Error processing HTML content: " + e.getMessage(), e);
            return htmlContent;
        }
    }

    private String processImageUrl(String url) {
        if (url == null) return "";

        try {
            if (url.contains("localhost")) {
                url = url.replace("localhost", "10.0.2.2");
            }

            if (url.startsWith("//")) {
                url = "http:" + url;
            }

            if (url.startsWith("/")) {
                url = "http://10.0.2.2:3100" + url;
            }

            url = url.replace("\\\\", "/");
            url = url.replace("\\", "/");

            return url;
        } catch (Exception e) {
            Log.e(TAG, "Error processing image URL: " + e.getMessage(), e);
            return url;
        }
    }

    @Override
    public boolean onOptionsItemSelected(@NonNull MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            onBackPressed();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}