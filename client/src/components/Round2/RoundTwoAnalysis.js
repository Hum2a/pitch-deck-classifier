import React, { useState, useEffect } from 'react';
import { Typography, List, ListItem, ListItemText, Card, CardContent, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import '../../styles/RoundTwoAnalysis.css';

const RoundTwoAnalysis = () => {
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [analysisContent, setAnalysisContent] = useState(null);
  const [error, setError] = useState(null);

  // Function to fetch analyses
  const fetchAnalyses = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/r2_analyses");
      setAnalyses(response.data);
      setError(null);
    } catch (error) {
      setError("Failed to load analyses.");
    }
  };

  // Fetch analyses on component mount
  useEffect(() => {
    fetchAnalyses();
  }, []);

  // Load selected analysis content or toggle it off
  const loadAnalysisContent = async (filename) => {
    if (selectedAnalysis === filename) {
      setSelectedAnalysis(null);
      setAnalysisContent(null);
    } else {
      setSelectedAnalysis(filename);
      setAnalysisContent(null);

      try {
        const response = await axios.get(`http://localhost:5000/api/r2_analyses/${filename}`);
        setAnalysisContent(response.data.analysis);
        setError(null);
      } catch (error) {
        setError(`Failed to load content for ${filename}.`);
      }
    }
  };

  // Delete selected analysis file
  const deleteAnalysis = async (filename) => {
    try {
      await axios.delete(`http://localhost:5000/api/r2_analyses/${filename}`);
      setAnalyses((prevAnalyses) => prevAnalyses.filter((file) => file !== filename));
      if (selectedAnalysis === filename) {
        setSelectedAnalysis(null);
        setAnalysisContent(null);
      }
      setError(null);
    } catch (error) {
      setError(`Failed to delete ${filename}.`);
    }
  };

  // Helper function to render the table for each category
  const renderTable = (categoryData) => (
    <TableContainer component={Paper} className="analysis-table-container">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>Criteria</strong></TableCell>
            <TableCell><strong>Score</strong></TableCell>
            <TableCell><strong>Explanation</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(Array.isArray(categoryData) ? categoryData : []).map((item, idx) => (
            <TableRow key={idx}>
              <TableCell>{item.Criteria}</TableCell>
              <TableCell>{item.Score}</TableCell>
              <TableCell>{item.Explanation}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <div className="round-two-analysis-container">
      <div className="analysis-list-section">
        <Typography variant="h5" className="widget-title">Round 2 Analyses</Typography>

        {/* Refresh Button */}
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchAnalyses}
          className="refresh-button"
        >
          Refresh
        </Button>

        {/* List of Analysis Files */}
        <Card className="analysis-list-container">
          <CardContent>
            <Typography variant="h6" className="section-title">Available Analyses</Typography>
            <List>
              {analyses.length > 0 ? (
                analyses.map((filename, index) => (
                  <ListItem key={index} className="analysis-item">
                    <ListItemText
                      primary={filename}
                      onClick={() => loadAnalysisContent(filename)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div className="button-container">
                      <Button
                        variant={selectedAnalysis === filename ? "contained" : "outlined"}
                        color={selectedAnalysis === filename ? "primary" : "default"}
                        className="view-button"
                        onClick={() => loadAnalysisContent(filename)}
                        fullWidth
                      >
                        {selectedAnalysis === filename ? "Viewing" : "View"}
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        className="delete-button"
                        onClick={() => deleteAnalysis(filename)}
                        fullWidth
                        style={{ marginTop: '5px' }}
                      >
                        Delete
                      </Button>
                    </div>
                  </ListItem>
                ))
              ) : (
                <Typography className="no-analyses-message">No analyses available for viewing.</Typography>
              )}
            </List>
          </CardContent>
        </Card>
      </div>

      {/* Display Selected Analysis Content */}
      <div className="analysis-content-section">
        {selectedAnalysis && analysisContent ? (
          <Paper elevation={3} className="analysis-content-container">
            <Typography variant="h6">Detailed Analysis for {selectedAnalysis}</Typography>

            {/* Render each category table */}
            {Object.keys(analysisContent).map((category, idx) => (
              <div key={idx} className="analysis-section">
                <Typography variant="h6" gutterBottom>{category}</Typography>
                {renderTable(analysisContent[category])}
              </div>
            ))}
          </Paper>
        ) : (
          <Typography className="select-analysis-message">
            Select an analysis to view its content.
          </Typography>
        )}
      </div>

      {error && <Typography className="error-message">{error}</Typography>}
    </div>
  );
};

export default RoundTwoAnalysis;
