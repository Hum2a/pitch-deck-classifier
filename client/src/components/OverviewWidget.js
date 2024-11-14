import React, { useState, useEffect } from 'react';
import { IconButton, Typography, Button, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import PopUpModal from './PopUpModal'; // Import the PopUpModal component
import '../styles/OverviewWidget.css';

const OverviewWidget = () => {
  const [overviews, setOverviews] = useState([]);
  const [selectedOverview, setSelectedOverview] = useState(null);
  const [parsedOverview, setParsedOverview] = useState({});
  const [isModalOpen, setModalOpen] = useState(false); // State for controlling modal visibility
  const [filenameToDelete, setFilenameToDelete] = useState(null); // Track the file selected for deletion
  const [deleteAll, setDeleteAll] = useState(false); // Track if delete all is selected

  useEffect(() => {
    fetchOverviews();
  }, []);

  const fetchOverviews = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/overviews");
      setOverviews(response.data);
    } catch (error) {
      console.error("Error fetching overviews:", error);
    }
  };

  const handleViewOverview = async (filename) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/overviews/${filename}`);
      setSelectedOverview(filename);
      setParsedOverview(response.data);
    } catch (error) {
      console.error("Error fetching overview content:", error);
    }
  };

  const handleDeleteClick = (filename) => {
    setFilenameToDelete(filename); // Set the file to delete
    setDeleteAll(false); // Set delete all to false
    setModalOpen(true); // Open the modal
  };

  const handleDeleteOverview = async () => {
    try {
      if (filenameToDelete) {
        await axios.delete(`http://localhost:5000/api/overviews/${filenameToDelete}`);
        setOverviews((prevOverviews) => prevOverviews.filter((file) => file !== filenameToDelete));
        if (selectedOverview === filenameToDelete) {
          setSelectedOverview(null);
          setParsedOverview({});
        }
        setModalOpen(false); // Close the modal after deletion
        setFilenameToDelete(null); // Reset the filename to delete
      }
    } catch (error) {
      console.error("Error deleting overview:", error);
    }
  };

  const handleDeleteAllClick = () => {
    setDeleteAll(true); // Set delete all to true
    setModalOpen(true); // Open the modal
  };

  const handleDeleteAllOverviews = async () => {
    try {
      await axios.delete("http://localhost:5000/api/overviews"); // Assuming the endpoint deletes all overviews
      setOverviews([]); // Clear the overviews state
      setSelectedOverview(null); // Reset any selected overview
      setParsedOverview({}); // Clear parsed overview data
      setModalOpen(false); // Close the modal after deletion
    } catch (error) {
      console.error("Error deleting all overviews:", error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFilenameToDelete(null);
    setDeleteAll(false); // Reset delete all to false
  };

  return (
    <div className="overview-widget-card">
      <div className="overview-widget-header">
        <Typography className="overview-widget-title" variant="h5">
          <span className="highlight-text">Saved</span> Overviews
        </Typography>
        <IconButton onClick={fetchOverviews} color="primary">
          <RefreshIcon />
        </IconButton>
        <Tooltip title="Delete All Overviews">
          <IconButton onClick={handleDeleteAllClick} color="secondary">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>
      <ul className="overview-list">
        {overviews.map((filename, index) => (
          <li key={index} className="overview-item">
            <Button variant="outlined" className="view-button" onClick={() => handleViewOverview(filename)}>
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
      {selectedOverview && (
        <div className="overview-content">
          <Typography variant="h6" gutterBottom>Overview for {selectedOverview}</Typography>
          <div className="overview-section" style={{ backgroundColor: "#F0F0F0", borderRadius: '8px', padding: '15px', marginBottom: '20px' }}>
            <Typography variant="body1"><strong>Geography:</strong> {parsedOverview.Geography}</Typography>
            <Typography variant="body1"><strong>Industry:</strong> {parsedOverview.Industry}</Typography>
            <Typography variant="body1"><strong>Stage:</strong> {parsedOverview.Stage}</Typography>
            <Typography variant="body1"><strong>Overall Score:</strong> {parsedOverview.OverallScore}</Typography>
          </div>
        </div>
      )}

      {/* Popup Modal for Delete Confirmation */}
      <PopUpModal
        open={isModalOpen}
        onClose={handleModalClose}
        onConfirm={deleteAll ? handleDeleteAllOverviews : handleDeleteOverview} // Choose the appropriate delete action
        title="Are you sure?"
      >
        <p>Are you sure you want to {deleteAll ? "delete all overviews" : "delete this overview"}?</p>
      </PopUpModal>
    </div>
  );
};

export default OverviewWidget;
