import React, { useState, useEffect } from 'react';
import { Typography, Button, CircularProgress, Card, CardContent, List, ListItem, ListItemText } from '@mui/material';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../../firebaseconfig'; // Import Firebase storage config
import axios from 'axios';
import apiUrl from '../../config'; // Import apiUrl
import '../../styles/RoundTwoAnalyse.css';

const RoundTwoAnalyse = () => {
  const [pitchDecks, setPitchDecks] = useState([]);
  const [loadingStates, setLoadingStates] = useState({}); // Track loading state for each button
  const [error, setError] = useState(null);

  // Fetch list of pitch decks from Firebase "successful_pitchdecks" on component mount
  useEffect(() => {
    const fetchPitchDecks = async () => {
      try {
        const successfulRef = ref(storage, 'successful_pitchdecks/');
        const pitchDecksList = await listAll(successfulRef);

        const filenames = pitchDecksList.items.map((item) => item.name); // Retrieve filenames from Firebase
        setPitchDecks(filenames);
      } catch (error) {
        console.error("Error fetching successful pitch decks from Firebase:", error);
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
      await axios.post(`${apiUrl}/api/round_two_analysis`, { filename });
      setError(`Analysis complete for ${filename}.`);
    } catch (error) {
      console.error(`Error analyzing ${filename}:`, error);
      setError(`Error analyzing ${filename}. Please try again.`);
    } finally {
      setLoadingStates((prevStates) => ({ ...prevStates, [filename]: false }));
    }
  };

  // Handle delete pitch deck from Firebase
  const handleDelete = async (filename) => {
    try {
      const fileRef = ref(storage, `successful_pitchdecks/${filename}`);
      await deleteObject(fileRef); // Delete file from Firebase Storage

      setPitchDecks((prevDecks) => prevDecks.filter((deck) => deck !== filename));
      setError(`Deleted ${filename} successfully.`);
    } catch (error) {
      console.error(`Failed to delete ${filename} from Firebase:`, error);
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
