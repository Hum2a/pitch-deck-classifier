// src/config.js
const apiUrl = process.env.NODE_ENV === 'production' 
    ? 'https://pitch-deck-classifier-1.onrender.com' 
    : 'http://localhost:5000'

export default apiUrl;
