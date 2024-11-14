// src/pages/RoundTwo.js

import React from 'react';
import Navbar from '../components/Navbar';
import RoundTwoAnalyse from '../components/Round2/RoundTwoAnalyse';
import RoundTwoAnalysis from '../components/Round2/RoundTwoAnalysis';
import RoundTwoResponses from '../components/Round2/RoundTwoResponse';
import RoundTwoCompare from '../components/Round2/RoundTwoCompare';
import '../styles/RoundTwo.css'; // Optional: Create this stylesheet if needed

const RoundTwo = () => {
  return (
    <div>
      <Navbar />
      <div className="round-two-container">
        <RoundTwoAnalyse />
      </div>
      <RoundTwoAnalysis />
      <RoundTwoResponses />
      <RoundTwoCompare />
    </div>
  );
};

export default RoundTwo;
