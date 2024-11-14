import React, { useState, useEffect } from 'react';
import { IconButton, Typography, Button, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import PopUpModal from './PopUpModal'; // Import the PopUpModal component
import '../styles/ResponsesWidget.css';

const ResponsesWidget = () => {
  const [responses, setResponses] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [parsedResponse, setParsedResponse] = useState({});
  const [isModalOpen, setModalOpen] = useState(false); // State for controlling modal visibility
  const [deleteAll, setDeleteAll] = useState(false); // Track if delete all is selected
  const [filenameToDelete, setFilenameToDelete] = useState(null); // Track the file selected for deletion

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/responses");
      setResponses(response.data);
    } catch (error) {
      console.error("Error fetching responses:", error);
    }
  };

  const handleViewResponse = async (filename) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/responses/${filename}`);
      setSelectedResponse(filename);
      setParsedResponse(response.data);
    } catch (error) {
      console.error("Error fetching response content:", error);
    }
  };

  const handleDeleteClick = (filename) => {
    setFilenameToDelete(filename); // Set the file to delete
    setDeleteAll(false); // Set delete all to false
    setModalOpen(true); // Open the modal
  };

  const handleDeleteResponse = async () => {
    try {
      if (filenameToDelete) {
        await axios.delete(`http://localhost:5000/api/responses/${filenameToDelete}`);
        setResponses((prevResponses) => prevResponses.filter((file) => file !== filenameToDelete));
        if (selectedResponse === filenameToDelete) {
          setSelectedResponse(null);
          setParsedResponse({});
        }
        setModalOpen(false); // Close the modal after deletion
        setFilenameToDelete(null); // Reset the filename to delete
      }
    } catch (error) {
      console.error("Error deleting response:", error);
    }
  };

  const handleDeleteAllClick = () => {
    setDeleteAll(true); // Set delete all to true
    setModalOpen(true); // Open the modal
  };

  const handleDeleteAllResponses = async () => {
    try {
      await axios.delete("http://localhost:5000/api/responses"); // Assuming the endpoint deletes all responses
      setResponses([]); // Clear the responses state
      setSelectedResponse(null); // Reset any selected response
      setParsedResponse({}); // Clear parsed response data
      setModalOpen(false); // Close the modal after deletion
    } catch (error) {
      console.error("Error deleting all responses:", error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFilenameToDelete(null);
    setDeleteAll(false); // Reset delete all to false
  };

  return (
    <div className="responses-widget-card">
      <div className="responses-widget-header">
        <Typography className="responses-widget-title" variant="h5">
          <span className="highlight-text">Saved</span> Responses
        </Typography>
        <IconButton onClick={fetchResponses} color="primary">
          <RefreshIcon />
        </IconButton>
        <Tooltip title="Delete All Responses">
          <IconButton onClick={handleDeleteAllClick} color="secondary">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>
      <ul className="response-list">
        {responses.map((filename, index) => (
          <li key={index} className="response-item">
            <Button variant="outlined" className="view-button" onClick={() => handleViewResponse(filename)}>
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
      {selectedResponse && (
        <div className="response-content">
          <Typography variant="h6" gutterBottom>Response for {selectedResponse}</Typography>
          <pre className="response-text">{JSON.stringify(parsedResponse, null, 2)}</pre>
        </div>
      )}

      {/* Popup Modal for Delete Confirmation */}
      <PopUpModal
        open={isModalOpen}
        onClose={handleModalClose}
        onConfirm={deleteAll ? handleDeleteAllResponses : handleDeleteResponse} // Choose the appropriate delete action
        title="Are you sure?"
      >
        <p>Are you sure you want to {deleteAll ? "delete all responses" : "delete this response"}?</p>
      </PopUpModal>
    </div>
  );
};

export default ResponsesWidget;
