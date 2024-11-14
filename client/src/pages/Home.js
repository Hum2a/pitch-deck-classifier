import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import FileUploadForm from '../components/FileUploadForm';
import OmniWidget from '../components/OmniWidget';
import { Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  const [hasRoundOneSuccess] = useState(true); // Set to true by default
  const navigate = useNavigate();

  const handleRoundTwoNavigation = () => {
    navigate('/round2');
  };

  return (
    <div>
      <Navbar />
      <div className="home-container">
        <FileUploadForm />
      </div>
      <OmniWidget />
      {hasRoundOneSuccess && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Typography variant="h6">Round 1 Analysis Completed!</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRoundTwoNavigation}
            style={{ marginTop: '10px' }}
          >
            Proceed to Round 2 Analysis
          </Button>
        </div>
      )}
    </div>
  );
};

export default Home;
