import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import '../../styles/RoundTwoCompare.css';

const RoundTwoCompare = () => {
  const [rankedPitchDecks, setRankedPitchDecks] = useState([]);
  const [error, setError] = useState(null);

  // Function to fetch and process analysis data
  const fetchAndRankPitchDecks = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/r2_analyses');
      const filenames = response.data;
      const pitchDecks = [];

      // Fetch and process each pitch deck's analysis
      for (const filename of filenames) {
        const { data } = await axios.get(`http://localhost:5000/api/r2_analyses/${filename}`);
        const totalScore = calculateTotalScore(data.analysis);
        pitchDecks.push({ filename, totalScore });
      }

      // Sort pitch decks by totalScore in descending order
      pitchDecks.sort((a, b) => b.totalScore - a.totalScore);
      setRankedPitchDecks(pitchDecks);
      setError(null);
    } catch (error) {
      setError("Failed to load and rank pitch deck analyses.");
    }
  };

  // Calculate the total score for a pitch deck
  const calculateTotalScore = (analysis) => {
    let totalScore = 0;
    Object.values(analysis).forEach((category) => {
      category.forEach((item) => {
        totalScore += item.Score;
      });
    });
    return totalScore;
  };

  // Fetch and rank pitch decks on component mount
  useEffect(() => {
    fetchAndRankPitchDecks();
  }, []);

  return (
    <div className="round-two-compare-container">
      <Typography variant="h5" className="widget-title">Pitch Deck Rankings</Typography>

      {error && <Typography className="error-message">{error}</Typography>}

      <Card className="ranked-list-container">
        <CardContent>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" className="section-title">Ranked Pitch Decks</Typography>
            <IconButton onClick={fetchAndRankPitchDecks} aria-label="refresh">
              <RefreshIcon />
            </IconButton>
          </div>
          <TableContainer component={Paper} className="ranked-table-container">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Rank</strong></TableCell>
                  <TableCell><strong>Pitch Deck</strong></TableCell>
                  <TableCell><strong>Total Score</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rankedPitchDecks.map((deck, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{deck.filename}</TableCell>
                    <TableCell>{deck.totalScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoundTwoCompare;
