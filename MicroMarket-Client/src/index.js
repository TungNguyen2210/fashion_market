import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';
import { BrowserRouter } from 'react-router-dom';
import Router from './routers/routes';
import reportWebVitals from './reportWebVitals';
import { GoogleOAuthProvider } from '@react-oauth/google';

// ✅ LẤY GOOGLE CLIENT ID TỪ .env
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

// ✅ DEBUG: KIỂM TRA CLIENT ID
console.log('🔑 Google Client ID:', GOOGLE_CLIENT_ID);
console.log('🌐 API URL:', process.env.REACT_APP_API_URL);

if (!GOOGLE_CLIENT_ID) {
  console.error('❌ THIẾU REACT_APP_GOOGLE_CLIENT_ID trong file .env!');
  console.error('📝 Thêm vào file .env:');
  console.error('REACT_APP_GOOGLE_CLIENT_ID=540767250173-khgv1btdgc13i4gst0knmpomca3j0fab.apps.googleusercontent.com');
} else {
  console.log('✅ Google Client ID đã được load!');
}

function App() {
  return (
    <div>
      <Suspense fallback={null}>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <BrowserRouter>
            <Router />
          </BrowserRouter>
        </GoogleOAuthProvider>
      </Suspense>
    </div>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();