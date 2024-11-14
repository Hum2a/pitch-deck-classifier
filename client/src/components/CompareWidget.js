import React, { useState, useEffect } from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import { ref, getDownloadURL, listAll, uploadBytes } from 'firebase/storage';
import { storage } from '../firebaseconfig'; // Firebase config for storage reference
import axios from 'axios';
import apiUrl from '../config';
import '../styles/CompareWidget.css';

const CompareWidget = () => {
  const [analyses, setAnalyses] = useState([]);
  const [rankedAnalyses, setRankedAnalyses] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAndRankAnalyses();
  }, []);

  const fetchAndRankAnalyses = async () => {
    try {
      const firebaseRef = ref(storage, 'analyses/');
      const analysisFiles = await listAll(firebaseRef);

      const analysesData = await Promise.all(
        analysisFiles.items.map(async (itemRef) => {
          const filename = itemRef.name;
          const analysisUrl = await getDownloadURL(itemRef);
          const analysisResponse = await fetch(analysisUrl);
          const analysis = await analysisResponse.json();

          const overviewFilename = filename.replace("_analysis.json", "_overview.json");
          const overviewRef = ref(storage, `overviews/${overviewFilename}`);
          const overviewUrl = await getDownloadURL(overviewRef);
          const overviewResponse = await fetch(overviewUrl);
          const overview = await overviewResponse.json(); // Fetch as JSON to match the new format

          const totalScore = calculateTotalScore(analysis);
          const passesThreshold = totalScore >= 115;

          return { filename, analysis, overview, totalScore, passesThreshold };
        })
      );

      const rankedData = analysesData.sort((a, b) => b.totalScore - a.totalScore);
      setRankedAnalyses(rankedData);
      setAnalyses(analysisFiles.items.map((file) => file.name));
    } catch (error) {
      console.error("Error fetching analyses for comparison:", error);
    }
  };

  const calculateTotalScore = (analysis) => {
    let totalScore = 0;
    Object.keys(analysis).forEach((category) => {
      if (Array.isArray(analysis[category])) {
        analysis[category].forEach((item) => {
          totalScore += item.Score;
        });
      }
    });
    return totalScore;
  };

  const copyAllSuccessfulPitchDecks = async () => {
    const passingPitchDecks = rankedAnalyses
      .filter((data) => data.passesThreshold)
      .map((data) => data.filename.replace("_analysis.json", ".pdf")); // Convert to original filename format
  
    try {
      for (const filename of passingPitchDecks) {
        // Reference to the original PDF in Firebase Storage
        const originalRef = ref(storage, `uploads/${filename}`);
        
        // Fetch the download URL
        const url = await getDownloadURL(originalRef);
        
        // Fetch the file as a Blob
        const response = await fetch(url);
        const fileBlob = await response.blob();
        
        // Define the destination in Firebase Storage
        const destinationRef = ref(storage, `successful_pitchdecks/${filename}`);
        
        // Upload the Blob to Firebase Storage
        await uploadBytes(destinationRef, fileBlob);
  
        console.log(`Successfully copied ${filename} to successful_pitchdecks/`);
      }
  
      setMessage("All successful pitch decks copied to Firebase.");
    } catch (error) {
      console.error("Error copying successful pitch decks:", error);
      setMessage("Failed to copy successful pitch decks to Firebase.");
    }
  };

  const toggleRowExpansion = (filename) => {
    setExpandedRow(expandedRow === filename ? null : filename);
  };

  return (
    <div className="compare-widget-card">
      <div className="compare-widget-header">
        <Typography className="compare-widget-title" variant="h5">
          <span className="highlight-text">Compare</span> Analyses
        </Typography>
        <Tooltip title="Copy All Successful Pitch Decks">
          <IconButton onClick={copyAllSuccessfulPitchDecks} color="primary">
            <FileCopyIcon />
          </IconButton>
        </Tooltip>
        <IconButton onClick={fetchAndRankAnalyses} color="primary">
          <RefreshIcon />
        </IconButton>
      </div>
      {message && (
        <Typography className="message" variant="body1" style={{ marginTop: '10px' }}>
          {message}
        </Typography>
      )}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Rank</strong></TableCell>
              <TableCell><strong>Pitch Deck</strong></TableCell>
              <TableCell><strong>Total Score</strong></TableCell>
              <TableCell><strong>Pass/Fail</strong></TableCell>
              <TableCell><strong>Overall Score</strong></TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rankedAnalyses.map((data, index) => (
              <React.Fragment key={data.filename}>
                <TableRow
                  onClick={() => toggleRowExpansion(data.filename)}
                  style={{ cursor: 'pointer' }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{data.filename}</TableCell>
                  <TableCell>{data.totalScore}</TableCell>
                  <TableCell>{data.passesThreshold ? 'Pass' : 'Fail'}</TableCell>
                  <TableCell>{data.overview.OverallScore || 'N/A'}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      {expandedRow === data.filename ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                </TableRow>
                
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={expandedRow === data.filename} timeout="auto" unmountOnExit>
                      <div style={{ margin: '20px' }}>
                        {/* Overview Section */}
                        <div className="expanded-section overview-section" style={{ backgroundColor: "#F0F0F0", padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                          <Typography variant="h6" gutterBottom>Overview</Typography>
                          <Typography variant="body1"><strong>Geography:</strong> {data.overview.Geography}</Typography>
                          <Typography variant="body1"><strong>Industry:</strong> {data.overview.Industry}</Typography>
                          <Typography variant="body1"><strong>Stage:</strong> {data.overview.Stage}</Typography>
                          <Typography variant="body1"><strong>Overall Score:</strong> {data.overview.OverallScore}</Typography>
                        </div>

                        {/* Detailed Analysis Sections */}
                        {Object.keys(data.analysis).map((category) => (
                          Array.isArray(data.analysis[category]) && (
                            <div key={category} className="expanded-section">
                              <Typography variant="h6" className="expanded-category" gutterBottom>
                                {category}
                              </Typography>
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell><strong>Criteria</strong></TableCell>
                                    <TableCell><strong>Score</strong></TableCell>
                                    <TableCell><strong>Explanation</strong></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {data.analysis[category].map((item, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell>{item.Criteria}</TableCell>
                                      <TableCell>{item.Score}</TableCell>
                                      <TableCell>{item.Explanation}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )
                        ))}
                      </div>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default CompareWidget;
