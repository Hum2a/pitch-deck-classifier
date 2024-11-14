import React, { useState, useEffect } from 'react';
import { IconButton, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebaseconfig'; // Firebase configuration
import axios from 'axios';
import apiUrl from '../config'; // API configuration
import PopUpModal from './PopUpModal'; // PopupModal component
import '../styles/AnalysisWidget.css';

const AnalysisWidget = () => {
  const [localAnalyses, setLocalAnalyses] = useState([]);
  const [firebaseAnalyses, setFirebaseAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [parsedAnalysis, setParsedAnalysis] = useState({});
  const [isModalOpen, setModalOpen] = useState(false);
  const [filenameToDelete, setFilenameToDelete] = useState(null);
  const [deleteAll, setDeleteAll] = useState(false);

  useEffect(() => {
    fetchLocalAnalyses();
    fetchFirebaseAnalyses();
  }, []);

  // Fetch analyses from the local server
  const fetchLocalAnalyses = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/analyses`);
      setLocalAnalyses(response.data);
    } catch (error) {
      console.error("Error fetching local analyses:", error);
    }
  };

  // Fetch analyses from Firebase storage
  const fetchFirebaseAnalyses = async () => {
    try {
      const analysisRef = ref(storage, 'analyses/');
      const fileList = await listAll(analysisRef);
      const firebaseAnalysesData = await Promise.all(
        fileList.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return { name: itemRef.name, url };
        })
      );
      setFirebaseAnalyses(firebaseAnalysesData);
    } catch (error) {
      console.error("Error fetching Firebase analyses:", error);
    }
  };

  // View analysis from Firebase or local server
  const handleViewAnalysis = async (filenameOrUrl, isFirebase = false) => {
    try {
      const response = isFirebase
        ? await fetch(filenameOrUrl).then((res) => res.json())
        : await axios.get(`${apiUrl}/api/analyses/${filenameOrUrl}`).then((res) => res.data);

      setSelectedAnalysis(filenameOrUrl);
      setParsedAnalysis(response);
    } catch (error) {
      console.error("Error fetching analysis content:", error);
    }
  };

  const handleDeleteClick = (filename, isFirebase = false) => {
    setFilenameToDelete({ filename, isFirebase });
    setDeleteAll(false);
    setModalOpen(true);
  };

  // Delete a specific analysis from Firebase or local storage
  const handleDeleteAnalysis = async () => {
    try {
      const { filename, isFirebase } = filenameToDelete;
      if (isFirebase) {
        const fileRef = ref(storage, `analyses/${filename}`);
        await deleteObject(fileRef);
        setFirebaseAnalyses((prev) => prev.filter((file) => file.name !== filename));
      } else {
        await axios.delete(`${apiUrl}/api/analyses/${filename}`);
        setLocalAnalyses((prev) => prev.filter((file) => file !== filename));
      }

      if (selectedAnalysis === filename) {
        setSelectedAnalysis(null);
        setParsedAnalysis({});
      }
      setModalOpen(false);
      setFilenameToDelete(null);
    } catch (error) {
      console.error("Error deleting analysis:", error);
    }
  };

  const handleDeleteAllClick = () => {
    setDeleteAll(true);
    setModalOpen(true);
  };

  // Delete all analyses from Firebase and local storage
  const handleDeleteAllAnalyses = async () => {
    try {
      await axios.delete(`${apiUrl}/api/analyses`);
      setLocalAnalyses([]);

      const analysisRef = ref(storage, 'analyses/');
      const fileList = await listAll(analysisRef);
      await Promise.all(fileList.items.map((fileRef) => deleteObject(fileRef)));
      setFirebaseAnalyses([]);

      setSelectedAnalysis(null);
      setParsedAnalysis({});
      setModalOpen(false);
    } catch (error) {
      console.error("Error deleting all analyses:", error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFilenameToDelete(null);
    setDeleteAll(false);
  };

  // Styling for analysis categories
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
        <IconButton onClick={() => { fetchLocalAnalyses(); fetchFirebaseAnalyses(); }} color="primary">
          <RefreshIcon />
        </IconButton>
        <Tooltip title="Delete All Analyses">
          <IconButton onClick={handleDeleteAllClick} color="secondary">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>
  
      <Typography variant="h6">Local Analyses</Typography>
      <ul className="analysis-list">
        {localAnalyses.map((filename, index) => (
          <li key={index} className="analysis-item">
            <Button variant="outlined" onClick={() => handleViewAnalysis(filename)}>
              {filename}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => handleDeleteClick(filename)}
              style={{ marginLeft: '10px' }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
  
      <Typography variant="h6">Firebase Analyses</Typography>
      <ul className="analysis-list">
        {firebaseAnalyses.map((file, index) => (
          <li key={index} className="analysis-item">
            <Button variant="outlined" onClick={() => handleViewAnalysis(file.url, true)}>
              {file.name}
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => handleDeleteClick(file.name, true)}
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
                    {/* Check if parsedAnalysis[category] is an array before mapping */}
                    {Array.isArray(parsedAnalysis[category]) ? (
                      parsedAnalysis[category].map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.Criteria}</TableCell>
                          <TableCell>{item.Score}</TableCell>
                          <TableCell>{item.Explanation}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      // Display a fallback message if the data is not an array
                      <TableRow>
                        <TableCell colSpan={3} style={{ textAlign: 'center' }}>
                          No data available for {category}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          ))}
        </div>
      )}
  
      <PopUpModal
        open={isModalOpen}
        onClose={handleModalClose}
        onConfirm={deleteAll ? handleDeleteAllAnalyses : handleDeleteAnalysis}
        title="Are you sure?"
      >
        <p>Are you sure you want to {deleteAll ? "delete all analyses" : "delete this analysis"}?</p>
      </PopUpModal>
    </div>
  );
  
};

export default AnalysisWidget;
