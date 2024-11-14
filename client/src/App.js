// src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './navigation/navigation';
import Home from './pages/Home';
import RoundTwo from './pages/RoundTwo'; // Import the Round2 page component
import './styles/App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} /> {/* Home page route */}
        <Route path="/round2" element={<RoundTwo />} /> {/* Round 2 page route */}
      </Routes>
    </Router>
  );
}

export default App;
