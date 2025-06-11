package com.example.tech.adapter;


import android.content.Context;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Filter;
import android.widget.Filterable;
import android.widget.ImageView;
import android.widget.TextView;


import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;


import com.example.tech.R;
import com.example.tech.SERVER;
import com.example.tech.model.SanPham;
import com.squareup.picasso.Picasso;

import java.util.ArrayList;

public class SanPhamAdapter  extends  RecyclerView.Adapter<KHUNGNHIN_SanPham> implements Filterable {
    ArrayList<SanPham> data;
    Context context;
    ArrayList<SanPham> dataOrigin;


    // click item recyclerview
    public interface OnItemClickListener {
        void onItemClick(SanPham sp);
    }

    private OnItemClickListener listener;

    public void setOnItemClickListener(OnItemClickListener listener) {
        this.listener = listener;
    }


    public SanPhamAdapter(ArrayList<SanPham> data,Context context){
        this.data = data;
        this.context = context;
        this.dataOrigin = data;
    }
    @NonNull
    @Override
    public KHUNGNHIN_SanPham onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_sanpham, null);
        return new KHUNGNHIN_SanPham(view);
    }

    @Override
    public void onBindViewHolder(@NonNull KHUNGNHIN_SanPham holder, int position) {
        SanPham sp = data.get(position);
        Picasso.get().load(SERVER.imagepath + sp.getHinhsanpham()).into(holder.hinhtrangsuc);
        holder.tvten.setText(sp.tensanpham );
        holder.tvgia.setText(sp.giasanpham+"");


        // click item
        holder.itemView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (listener != null) {
                    listener.onItemClick(sp);
                }
            }
        });

    }

    @Override
    public int getItemCount() {
        return data.size();
    }

    @Override
    public  Filter getFilter() {
        return new ItemFilter();
    }

    private class ItemFilter extends Filter {
        @Override
        protected FilterResults performFiltering(CharSequence charSequence) {

            String chuoitim = charSequence.toString().toLowerCase().trim();
            FilterResults filterResults = new FilterResults();
            if (!TextUtils.isEmpty(chuoitim)) {
                ArrayList<SanPham> tam = new ArrayList<>();
                for (SanPham sp : dataOrigin) {
                    if (sp.tensanpham.toLowerCase().toString().contains(chuoitim))
                        tam.add(sp);
                }
                filterResults.values = tam;
                filterResults.count = tam.size();

            } else {
                filterResults.values = dataOrigin;
                filterResults.count = dataOrigin.size();
            }
            return filterResults;
        }

        @Override
        protected void publishResults(CharSequence constraint, FilterResults filterResults) {
            if (filterResults != null && filterResults.count > 0) {
                data = (ArrayList<SanPham>) filterResults.values;
                notifyDataSetChanged();
            }
        }
    }
}

class KHUNGNHIN_SanPham extends RecyclerView.ViewHolder {
    ImageView hinhtrangsuc;
    TextView tvten;
    TextView tvgia;
    public KHUNGNHIN_SanPham(@NonNull View itemView) {
        super(itemView);
        hinhtrangsuc=itemView.findViewById(R.id.imgView);
        tvten = itemView.findViewById(R.id.tvTen);
        tvgia = itemView.findViewById(R.id.tvGia);
    }
}



