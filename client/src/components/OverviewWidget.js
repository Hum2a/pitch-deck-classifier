import React, { useState, useEffect } from 'react';
import { IconButton, Typography, Button, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import { ref, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../firebaseconfig'; // Firebase config for storage reference
import apiUrl from '../config';
import PopUpModal from './PopUpModal';
import '../styles/OverviewWidget.css';

const OverviewWidget = () => {
  const [localOverviews, setLocalOverviews] = useState([]);
  const [firebaseOverviews, setFirebaseOverviews] = useState([]);
  const [selectedOverview, setSelectedOverview] = useState(null);
  const [parsedOverview, setParsedOverview] = useState({});
  const [isModalOpen, setModalOpen] = useState(false);
  const [filenameToDelete, setFilenameToDelete] = useState(null);
  const [deleteAll, setDeleteAll] = useState(false);

  useEffect(() => {
    fetchLocalOverviews();
    fetchFirebaseOverviews();
  }, []);

  const fetchLocalOverviews = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/overviews`);
      setLocalOverviews(response.data);
    } catch (error) {
      console.error("Error fetching local overviews:", error);
    }
  };

  const fetchFirebaseOverviews = async () => {
    try {
      const firebaseRef = ref(storage, 'overviews/');
      const firebaseFiles = await listAll(firebaseRef);
      const firebaseOverviewsData = await Promise.all(
        firebaseFiles.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return { name: itemRef.name, url };
        })
      );
      setFirebaseOverviews(firebaseOverviewsData);
    } catch (error) {
      console.error("Error fetching Firebase overviews:", error);
    }
  };

  const handleViewOverview = async (filenameOrUrl, isFirebase = false) => {
    try {
      const response = isFirebase
        ? await fetch(filenameOrUrl).then((res) => res.json())
        : await axios.get(`${apiUrl}/api/overviews/${filenameOrUrl}`).then((res) => res.data);

      setParsedOverview(response.Overview || {}); // Access nested "Overview" object
      setSelectedOverview(filenameOrUrl);
    } catch (error) {
      console.error("Error fetching overview content:", error);
    }
  };

  const handleDeleteClick = (filename, isFirebase = false) => {
    setFilenameToDelete({ filename, isFirebase });
    setDeleteAll(false);
    setModalOpen(true);
  };

  const handleDeleteOverview = async () => {
    try {
      const { filename, isFirebase } = filenameToDelete;
      if (isFirebase) {
        const fileRef = ref(storage, `overviews/${filename}`);
        await deleteObject(fileRef);
        setFirebaseOverviews((prev) => prev.filter((file) => file.name !== filename));
      } else {
        await axios.delete(`${apiUrl}/api/overviews/${filename}`);
        setLocalOverviews((prev) => prev.filter((file) => file !== filename));
      }

      if (selectedOverview === filename) {
        setSelectedOverview(null);
        setParsedOverview({});
      }
      setModalOpen(false);
      setFilenameToDelete(null);
    } catch (error) {
      console.error("Error deleting overview:", error);
    }
  };

  const handleDeleteAllClick = () => {
    setDeleteAll(true);
    setModalOpen(true);
  };

  const handleDeleteAllOverviews = async () => {
    try {
      await axios.delete(`${apiUrl}/api/overviews`);
      setLocalOverviews([]);

      const firebaseRef = ref(storage, 'overviews/');
      const firebaseFiles = await listAll(firebaseRef);
      await Promise.all(firebaseFiles.items.map((fileRef) => deleteObject(fileRef)));
      setFirebaseOverviews([]);

      setSelectedOverview(null);
      setParsedOverview({});
      setModalOpen(false);
    } catch (error) {
      console.error("Error deleting all overviews:", error);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFilenameToDelete(null);
    setDeleteAll(false);
  };

  return (
    <div className="overview-widget-card">
      <div className="overview-widget-header">
        <Typography className="overview-widget-title" variant="h5">
          <span className="highlight-text">Saved</span> Overviews
        </Typography>
        <IconButton onClick={() => { fetchLocalOverviews(); fetchFirebaseOverviews(); }} color="primary">
          <RefreshIcon />
        </IconButton>
        <Tooltip title="Delete All Overviews">
          <IconButton onClick={handleDeleteAllClick} color="secondary">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>

      <Typography variant="h6">Local Overviews</Typography>
      <ul className="overview-list">
        {localOverviews.map((filename, index) => (
          <li key={index} className="overview-item">
            <Button variant="outlined" onClick={() => handleViewOverview(filename)}>
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

      <Typography variant="h6">Firebase Overviews</Typography>
      <ul className="overview-list">
        {firebaseOverviews.map((file, index) => (
          <li key={index} className="overview-item">
            <Button variant="outlined" onClick={() => handleViewOverview(file.url, true)}>
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

      <PopUpModal
        open={isModalOpen}
        onClose={handleModalClose}
        onConfirm={deleteAll ? handleDeleteAllOverviews : handleDeleteOverview}
        title="Are you sure?"
      >
        <p>Are you sure you want to {deleteAll ? "delete all overviews" : "delete this overview"}?</p>
      </PopUpModal>
    </div>
  );
};

export default OverviewWidget;
