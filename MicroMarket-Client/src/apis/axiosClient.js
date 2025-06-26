import axios from 'axios';
import queryString from 'query-string';
import { createBrowserHistory } from "history";

export const history = createBrowserHistory();

const axiosClient = axios.create({
    baseURL: process.env.REACT_APP_API_URL,
    headers: {
        'content-type': 'application/json'
    },
    paramsSerializer: params => queryString.stringify(params),
});

axiosClient.interceptors.request.use(async (config) => {
    const token = localStorage.getItem('client');
    config.headers.Authorization = `${token}`;
    return config;
});

axiosClient.interceptors.response.use((response) => {
    if (response && response.data) {
        return response.data;
    }
    return response;
}, (error) => {
    // if (error.response.status === 401) {
    //     history.push("/");
    //     localStorage.clear();
    //     localStorage.removeItem("token");
    // }
    console.log(error.response.status);
});

export default axiosClient; 
