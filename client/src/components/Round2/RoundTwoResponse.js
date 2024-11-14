import React, { useState, useEffect } from 'react';
import { Typography, List, ListItem, ListItemText, Card, CardContent, Button, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import '../../styles/RoundTwoResponse.css';

const RoundTwoResponses = () => {
  const [responses, setResponses] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [responseContent, setResponseContent] = useState(null);
  const [error, setError] = useState(null);

  // Fetch responses function
  const fetchResponses = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/r2_responses");
      setResponses(response.data);
      setError(null);
    } catch (error) {
      setError("Failed to load responses.");
    }
  };

  // Fetch responses on component mount
  useEffect(() => {
    fetchResponses();
  }, []);

  // Load selected response content or toggle it off
  const loadResponseContent = async (filename) => {
    if (selectedResponse === filename) {
      // Toggle off if already selected
      setSelectedResponse(null);
      setResponseContent(null);
    } else {
      // Load content for the new selected response
      setSelectedResponse(filename);
      setResponseContent(null); // Clear content before loading new file

      try {
        const response = await axios.get(`http://localhost:5000/api/r2_responses/${filename}`);
        setResponseContent(response.data);
        setError(null);
      } catch (error) {
        setError(`Failed to load content for ${filename}.`);
      }
    }
  };

  // Handle response deletion
  const handleDeleteResponse = async (filename) => {
    try {
      await axios.delete(`http://localhost:5000/api/r2_responses/${filename}`);
      setResponses(responses.filter((file) => file !== filename));
      if (selectedResponse === filename) {
        setSelectedResponse(null);
        setResponseContent(null);
      }
    } catch (error) {
      setError(`Failed to delete ${filename}.`);
    }
  };

  return (
    <div className="round-two-responses-container">
      <div className="responses-list-section">
        <Typography variant="h5" className="widget-title">Round 2 Responses</Typography>

        {/* Refresh Button */}
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchResponses}
          className="refresh-button"
        >
          Refresh
        </Button>

        {/* List of Response Files */}
        <Card className="responses-list-container">
          <CardContent>
            <Typography variant="h6" className="section-title">Available Responses</Typography>
            <List>
              {responses.length > 0 ? (
                responses.map((filename, index) => (
                  <ListItem key={index} className="response-item">
                    <ListItemText
                      primary={filename}
                      onClick={() => loadResponseContent(filename)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div className="button-container">
                      <Button
                        variant={selectedResponse === filename ? "contained" : "outlined"}
                        color={selectedResponse === filename ? "primary" : "default"}
                        className="view-button"
                        onClick={() => loadResponseContent(filename)}
                        fullWidth
                      >
                        {selectedResponse === filename ? "Viewing" : "View"}
                      </Button>
                      <Button
                        variant="outlined"
                        color="secondary"
                        className="delete-button"
                        onClick={() => handleDeleteResponse(filename)}
                        fullWidth
                        style={{ marginTop: '5px' }}
                      >
                        Delete
                      </Button>
                    </div>
                  </ListItem>
                ))
              ) : (
                <Typography className="no-responses-message">No responses available for viewing.</Typography>
              )}
            </List>
          </CardContent>
        </Card>
      </div>

      {/* Display Selected Response Content */}
      <div className="response-content-section">
        {selectedResponse && responseContent ? (
          <Paper elevation={3} className="response-content-container">
            <Typography variant="h6">Response Content for {selectedResponse}</Typography>
            <pre className="response-content">
              {JSON.stringify(responseContent, null, 2)}
            </pre>
          </Paper>
        ) : (
          <Typography className="select-response-message">
            Select a response to view its content.
          </Typography>
        )}
      </div>

      {error && <Typography className="error-message">{error}</Typography>}
    </div>
  );
};

export default RoundTwoResponses;
