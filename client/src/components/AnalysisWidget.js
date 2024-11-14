import React, { useState, useEffect } from 'react';
import { IconButton, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import PopUpModal from './PopUpModal'; // Import the PopupModal component
import '../styles/AnalysisWidget.css';

const AnalysisWidget = () => {
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [parsedAnalysis, setParsedAnalysis] = useState({});
  const [viewMode, setViewMode] = useState('pretty');
  const [isModalOpen, setModalOpen] = useState(false); // State for controlling modal visibility
  const [filenameToDelete, setFilenameToDelete] = useState(null); // Track which file is selected for deletion
  const [deleteAll, setDeleteAll] = useState(false); // Track if delete all is selected

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/analyses");
      setAnalyses(response.data);
    } catch (error) {
      console.error("Error fetching analyses:", error);
    }
  };

  const handleViewAnalysis = async (filename) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/analyses/${filename}`);
      setSelectedAnalysis(filename);
      setParsedAnalysis(response.data);
    } catch (error) {
      console.error("Error fetching analysis content:", error);
    }
  };

  const handleDeleteClick = (filename) => {
    setFilenameToDelete(filename); // Set the file to delete
    setDeleteAll(false); // Set delete all to false
    setModalOpen(true); // Open the modal
  };

  const handleDeleteAnalysis = async () => {
    try {
      if (filenameToDelete) {
        await axios.delete(`http://localhost:5000/api/analyses/${filenameToDelete}`);
        setAnalyses((prevAnalyses) => prevAnalyses.filter((file) => file !== filenameToDelete));
        if (selectedAnalysis === filenameToDelete) {
          setSelectedAnalysis(null);
          setParsedAnalysis({});
        }
        setModalOpen(false); // Close the modal after deletion
        setFilenameToDelete(null); // Reset the filename to delete
      }
    } catch (error) {
      console.error("Error deleting analysis:", error);
    }
  };

  const handleDeleteAllClick = () => {
    setDeleteAll(true); // Set delete all to true
    setModalOpen(true); // Open the modal
  };

  const handleDeleteAllAnalyses = async () => {
    try {
      await axios.delete("http://localhost:5000/api/analyses"); // Assuming the endpoint deletes all analyses
      setAnalyses([]); // Clear the analyses state
      setSelectedAnalysis(null); // Reset any selected analysis
      setParsedAnalysis({}); // Clear parsed analysis data
      setModalOpen(false); // Close the modal after deletion
    } catch (error) {
      console.error("Error deleting all analyses:", error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFilenameToDelete(null);
    setDeleteAll(false); // Reset delete all to false
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case "Team": return "#FFEBEE";
      case "Market": return "#E3F2FD";
      case "Product/Technology": return "#E8F5E9";
      case "Impact": return "#FFF3E0";
      case "Investment Opportunity": return "#F3E5F5";
      default: return "#F5F5F5";
    }
  };

  return (
    <div className="analysis-widget-card">
      <div className="analysis-widget-header">
        <Typography className="analysis-widget-title" variant="h5">
          <span className="highlight-text">Saved</span> Analyses
        </Typography>
        <IconButton onClick={fetchAnalyses} color="primary">
          <RefreshIcon />
        </IconButton>
        <Tooltip title="Delete All Analyses">
          <IconButton onClick={handleDeleteAllClick} color="secondary">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>
      <ul className="analysis-list">
        {analyses.map((filename, index) => (
          <li key={index} className="analysis-item">
            <Button variant="outlined" className="view-button" onClick={() => handleViewAnalysis(filename)}>
              {filename}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              className="delete-button"
              onClick={() => handleDeleteClick(filename)} // Trigger the modal on delete click
              style={{ marginLeft: '10px' }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      {selectedAnalysis && (
        <div className="analysis-content">
          <Typography variant="h6" gutterBottom>Analysis for {selectedAnalysis}</Typography>

          {parsedAnalysis.Overview && (
            <div className="analysis-section" style={{ backgroundColor: "#F0F0F0", borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <Typography variant="h6" className="analysis-category" gutterBottom>Overview</Typography>
              <Typography variant="body1"><strong>Geography:</strong> {parsedAnalysis.Overview.Geography}</Typography>
              <Typography variant="body1"><strong>Industry:</strong> {parsedAnalysis.Overview.Industry}</Typography>
              <Typography variant="body1"><strong>Stage:</strong> {parsedAnalysis.Overview.Stage}</Typography>
              <Typography variant="body1"><strong>Overall Score:</strong> {parsedAnalysis.Overview.OverallScore}</Typography>
            </div>
          )}

          {Object.keys(parsedAnalysis).filter(category => category !== "Overview").map((category, index) => (
            <div key={index} className="analysis-section" style={{ backgroundColor: getCategoryColor(category), borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
              <Typography variant="h6" className="analysis-category" gutterBottom>{category}</Typography>
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
                    {parsedAnalysis[category].map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.Criteria}</TableCell>
                        <TableCell>{item.Score}</TableCell>
                        <TableCell>{item.Explanation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          ))}
        </div>
      )}

      {/* Popup Modal for Delete Confirmation */}
      <PopUpModal
        open={isModalOpen}
        onClose={handleModalClose}
        onConfirm={deleteAll ? handleDeleteAllAnalyses : handleDeleteAnalysis} // Choose the appropriate delete action
        title="Are you sure?"
      >
        <p>Are you sure you want to {deleteAll ? "delete all analyses" : "delete this analysis"}?</p>
      </PopUpModal>
    </div>
  );
};

export default AnalysisWidget;
