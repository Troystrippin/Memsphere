console.log('🔍 TEST - NODE_ENV:', process.env.NODE_ENV);
console.log('🔍 TEST - REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('🔍 TEST - REACT_APP_SUPABASE_ANON_KEY exists:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);


import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css'; // If you created this file

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);