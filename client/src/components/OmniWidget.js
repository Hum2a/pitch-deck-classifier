import React, { useState } from 'react';
import { Button, Typography, Box, Grid } from '@mui/material';
import AnalysisWidget from './AnalysisWidget';
import CompareWidget from './CompareWidget';
import OverviewWidget from './OverviewWidget';
import ResponsesWidget from './ResponsesWidget';
import '../styles/OmniWidget.css';

const OmniWidget = () => {
  // State to keep track of the selected widget
  const [activeWidget, setActiveWidget] = useState('Analysis');

  // Function to render the currently selected widget
  const renderWidget = () => {
    switch (activeWidget) {
      case 'Analysis':
        return <AnalysisWidget />;
      case 'Compare':
        return <CompareWidget />;
      case 'Overview':
        return <OverviewWidget />;
      case 'Responses':
        return <ResponsesWidget />;
      default:
        return null;
    }
  };

  return (
    <div className="omni-widget">
      <Typography variant="h4" gutterBottom>
        <span className="highlight-text">Omni</span> Widget
      </Typography>
      
      {/* Toggle Buttons */}
      <Box sx={{ marginBottom: 2 }}>
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Button
              variant={activeWidget === 'Analysis' ? 'contained' : 'outlined'}
              onClick={() => setActiveWidget('Analysis')}
            >
              Analysis
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant={activeWidget === 'Overview' ? 'contained' : 'outlined'}
              onClick={() => setActiveWidget('Overview')}
            >
              Overview
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant={activeWidget === 'Responses' ? 'contained' : 'outlined'}
              onClick={() => setActiveWidget('Responses')}
            >
              Responses
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant={activeWidget === 'Compare' ? 'contained' : 'outlined'}
              onClick={() => setActiveWidget('Compare')}
            >
              Compare
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Render Selected Widget */}
      <Box className="widget-display">
        {renderWidget()}
      </Box>
    </div>
  );
};

export default OmniWidget;
