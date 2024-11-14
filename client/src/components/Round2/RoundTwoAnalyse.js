import React, { useState, useEffect } from 'react';
import { Typography, Button, CircularProgress, Card, CardContent, List, ListItem, ListItemText } from '@mui/material';
import axios from 'axios';
import '../../styles/RoundTwoAnalyse.css';

const RoundTwoAnalyse = () => {
  const [pitchDecks, setPitchDecks] = useState([]);
  const [loadingStates, setLoadingStates] = useState({}); // Track loading state for each button
  const [error, setError] = useState(null);

  // Fetch list of pitch decks from r1_successful_pitchdecks on component mount
  useEffect(() => {
    const fetchPitchDecks = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/successful_pitchdecks");
        setPitchDecks(response.data.filenames);
      } catch (error) {
        setError("Failed to load successful pitch decks.");
      }
    };
    fetchPitchDecks();
  }, []);

  // Handle analysis on a selected pitch deck
  const handleAnalyze = async (filename) => {
    setLoadingStates((prevStates) => ({ ...prevStates, [filename]: true }));
    setError(null);

    try {
      await axios.post("http://localhost:5000/api/round_two_analysis", { filename });
      setError(`Analysis complete for ${filename}.`);
    } catch (error) {
      setError(`Error analyzing ${filename}. Please try again.`);
    } finally {
      setLoadingStates((prevStates) => ({ ...prevStates, [filename]: false }));
    }
  };

  // Handle delete pitch deck
  const handleDelete = async (filename) => {
    try {
      await axios.delete(`http://localhost:5000/api/delete/${filename}`);
      setPitchDecks((prevDecks) => prevDecks.filter((deck) => deck !== filename));
      setError(`Deleted ${filename} successfully.`);
    } catch (error) {
      setError(`Failed to delete ${filename}. Please try again.`);
    }
  };

  return (
    <div className="round-two-widget">
      <Typography variant="h5" className="widget-title">Round 2 Analysis</Typography>

      {/* List of Pitch Decks */}
      <Card className="pitchdeck-list-container">
        <CardContent>
          <Typography variant="h6" className="section-title">Successful Pitch Decks</Typography>
          <List>
            {pitchDecks.length > 0 ? (
              pitchDecks.map((filename, index) => (
                <ListItem key={index} className="pitchdeck-item">
                  <ListItemText primary={filename} />
                  <Button
                    variant="contained"
                    className="analyze-button"
                    onClick={() => handleAnalyze(filename)}
                    disabled={loadingStates[filename]} // Disable only this button when loading
                  >
                    {loadingStates[filename] ? <CircularProgress size={24} /> : "Analyze"}
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    className="delete-button"
                    onClick={() => handleDelete(filename)}
                    style={{ marginLeft: '10px' }}
                  >
                    Delete
                  </Button>
                </ListItem>
              ))
            ) : (
              <Typography className="no-decks-message">No pitch decks available for deep analysis.</Typography>
            )}
          </List>
        </CardContent>
      </Card>

      {error && <Typography className="error-message">{error}</Typography>}
    </div>
  );
};

export default RoundTwoAnalyse;
