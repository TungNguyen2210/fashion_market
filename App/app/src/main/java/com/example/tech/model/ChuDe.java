package com.example.tech.model;

import java.io.Serializable;

public class ChuDe implements Serializable {
    public  String idchude,tenchude,hinhchude;

    public ChuDe(String idchude, String tenchude, String hinhchude) {
        this.idchude = idchude;
        this.tenchude = tenchude;
        this.hinhchude = hinhchude;
    }

    public String getIdchude() {
        return idchude;
    }

    public void setIdchude(String idchude) {
        this.idchude = idchude;
    }

    public String getTenchude() {
        return tenchude;
    }

    public void setTenchude(String tenchude) {
        this.tenchude = tenchude;
    }

    public String getHinhchude() {
        return hinhchude;
    }

    public void setHinhchude(String hinhchude) {
        this.hinhchude = hinhchude;
    }
}
