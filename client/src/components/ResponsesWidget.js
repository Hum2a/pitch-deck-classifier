import React, { useState, useEffect } from 'react';
import { IconButton, Typography, Button, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { ref, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../firebaseconfig';
import apiUrl from '../config';
import PopUpModal from './PopUpModal';
import '../styles/ResponsesWidget.css';

const ResponsesWidget = () => {
  const [localResponses, setLocalResponses] = useState([]);
  const [firebaseResponses, setFirebaseResponses] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [parsedResponse, setParsedResponse] = useState({});
  const [firebaseSelectedResponse, setFirebaseSelectedResponse] = useState(null);
  const [firebaseParsedResponse, setFirebaseParsedResponse] = useState({});
  const [isModalOpen, setModalOpen] = useState(false);
  const [deleteAll, setDeleteAll] = useState(false);
  const [filenameToDelete, setFilenameToDelete] = useState(null);

  useEffect(() => {
    fetchLocalResponses();
    fetchFirebaseResponses();
  }, []);

  const fetchLocalResponses = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/responses`);
      setLocalResponses(response.data);
    } catch (error) {
      console.error("Error fetching local responses:", error);
    }
  };

  const fetchFirebaseResponses = async () => {
    try {
      const firebaseRef = ref(storage, 'responses/');
      const firebaseFiles = await listAll(firebaseRef);
      const firebaseResponsesData = await Promise.all(
        firebaseFiles.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return { name: itemRef.name, url };
        })
      );
      setFirebaseResponses(firebaseResponsesData);
    } catch (error) {
      console.error("Error fetching Firebase responses:", error);
    }
  };

  const handleViewResponse = async (filename) => {
    try {
      const response = await axios.get(`${apiUrl}/api/responses/${filename}`);
      setParsedResponse(response.data);
      setSelectedResponse(filename);
    } catch (error) {
      console.error("Error fetching response content:", error);
    }
  };

  const handleViewFirebaseResponse = async (file) => {
    try {
      console.log("Attempting to fetch Firebase URL:", file.url);
      const response = await fetch(file.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch from Firebase with status ${response.status}`);
      }
      const responseData = await response.json();
      setFirebaseParsedResponse(responseData);
      setFirebaseSelectedResponse(file.name);
    } catch (error) {
      console.error("Error fetching Firebase response content:", error);
    }
  };

  const handleDeleteClick = (filename, isFirebase = false) => {
    setFilenameToDelete({ filename, isFirebase });
    setDeleteAll(false);
    setModalOpen(true);
  };

  const handleDeleteResponse = async () => {
    try {
      const { filename, isFirebase } = filenameToDelete;
      if (isFirebase) {
        const fileRef = ref(storage, `responses/${filename}`);
        await deleteObject(fileRef);
        setFirebaseResponses((prev) => prev.filter((file) => file.name !== filename));
        if (firebaseSelectedResponse === filename) {
          setFirebaseSelectedResponse(null);
          setFirebaseParsedResponse({});
        }
      } else {
        await axios.delete(`${apiUrl}/api/responses/${filename}`);
        setLocalResponses((prev) => prev.filter((file) => file !== filename));
        if (selectedResponse === filename) {
          setSelectedResponse(null);
          setParsedResponse({});
        }
      }
      setModalOpen(false);
      setFilenameToDelete(null);
    } catch (error) {
      console.error("Error deleting response:", error);
    }
  };

  const handleDeleteAllClick = () => {
    setDeleteAll(true);
    setModalOpen(true);
  };

  const handleDeleteAllResponses = async () => {
    try {
      await axios.delete(`${apiUrl}/api/responses`);
      setLocalResponses([]);

      const firebaseRef = ref(storage, 'responses/');
      const firebaseFiles = await listAll(firebaseRef);
      await Promise.all(firebaseFiles.items.map((fileRef) => deleteObject(fileRef)));
      setFirebaseResponses([]);
      
      setSelectedResponse(null);
      setParsedResponse({});
      setFirebaseSelectedResponse(null);
      setFirebaseParsedResponse({});
      setModalOpen(false);
    } catch (error) {
      console.error("Error deleting all responses:", error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFilenameToDelete(null);
    setDeleteAll(false);
  };

  return (
    <div className="responses-widget-card">
      <div className="responses-widget-header">
        <Typography className="responses-widget-title" variant="h5">
          <span className="highlight-text">Saved</span> Responses
        </Typography>
        <IconButton onClick={() => { fetchLocalResponses(); fetchFirebaseResponses(); }} color="primary">
          <RefreshIcon />
        </IconButton>
        <Tooltip title="Delete All Responses">
          <IconButton onClick={handleDeleteAllClick} color="secondary">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>

      <Typography variant="h6">Local Responses</Typography>
      <ul className="response-list">
        {localResponses.map((filename, index) => (
          <li key={index} className="response-item">
            <Button variant="outlined" onClick={() => handleViewResponse(filename)}>
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

      <Typography variant="h6">Firebase Responses</Typography>
      <ul className="response-list">
        {firebaseResponses.map((file, index) => (
          <li key={index} className="response-item">
            <Button variant="outlined" onClick={() => handleViewFirebaseResponse(file)}>
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

      {selectedResponse && (
        <div className="response-content">
          <Typography variant="h6" gutterBottom>Local Response for {selectedResponse}</Typography>
          <pre className="response-text">{JSON.stringify(parsedResponse, null, 2)}</pre>
        </div>
      )}

      {firebaseSelectedResponse && (
        <div className="response-content">
          <Typography variant="h6" gutterBottom>Firebase Response for {firebaseSelectedResponse}</Typography>
          <pre className="response-text">{JSON.stringify(firebaseParsedResponse, null, 2)}</pre>
        </div>
      )}

      <PopUpModal
        open={isModalOpen}
        onClose={handleModalClose}
        onConfirm={deleteAll ? handleDeleteAllResponses : handleDeleteResponse}
        title="Are you sure?"
      >
        <p>Are you sure you want to {deleteAll ? "delete all responses" : "delete this response"}?</p>
      </PopUpModal>
    </div>
  );
};

export default ResponsesWidget;
