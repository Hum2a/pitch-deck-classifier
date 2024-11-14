// src/config.js
const apiUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-render-backend-url.onrender.com' 
    : 'http://localhost:5000';

export default apiUrl;
