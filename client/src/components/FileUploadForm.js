import React, { useState, useEffect } from 'react';
import { Button, TextField, Typography, LinearProgress, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../firebaseconfig';
import apiUrl from '../config';
import PopUpModal from './PopUpModal';
import '../styles/FileUploadForm.css';

const FileUploadForm = () => {
  const [files, setFiles] = useState([]);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [localUploads, setLocalUploads] = useState([]);
  const [firebaseUploads, setFirebaseUploads] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [filenameToDelete, setFilenameToDelete] = useState(null);
  const [deleteSource, setDeleteSource] = useState('');
  const [deleteAll, setDeleteAll] = useState(false);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      // Fetch local uploads
      const localResponse = await axios.get(`${apiUrl}/api/local-uploads`);
      setLocalUploads(localResponse.data);

      // Fetch Firebase uploads
      const firebaseRef = ref(storage, 'uploads/');
      const firebaseFiles = await listAll(firebaseRef);
      const firebaseUploadsData = await Promise.all(
        firebaseFiles.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return { filename: itemRef.name, url };
        })
      );
      setFirebaseUploads(firebaseUploadsData);
    } catch (error) {
      console.error("Error fetching uploads:", error);
      setMessage("Error fetching uploads.");
    }
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleNameChange = (e) => {
    setFileName(e.target.value);
  };

  const handleFirebaseUpload = async () => {
    if (files.length === 0) {
      setMessage("Please select one or more files to upload.");
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const finalFileName = fileName || file.name.split(".").slice(0, -1).join(".");
      const firebaseRef = ref(storage, `uploads/${finalFileName}.pdf`);
      const uploadTask = uploadBytesResumable(firebaseRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setLoadingProgress(progress);
        },
        (error) => {
          console.error("Error uploading to Firebase:", error);
          setMessage(`Error uploading file ${file.name}. Please try again.`);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setFirebaseUploads((prev) => [...prev, { filename: `${finalFileName}.pdf`, url: downloadURL }]);
            setMessage(`File ${file.name} uploaded successfully to Firebase.`);
          } catch (error) {
            console.error("Error getting Firebase URL:", error);
            setMessage("Failed to retrieve file URL from Firebase.");
          }
        }
      );
      setLoadingProgress(null);
    }
    setFiles([]);
  };

  const handleAnalyzeFirebase = async (filename) => {
    try {
        setLoadingProgress(0);
        setMessage(`Analyzing ${filename} on Firebase...`);
        const response = await axios.post(
            `${apiUrl}/api/analyze-firebase`,
            { filename },
            {
                onDownloadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setLoadingProgress(percentCompleted);
                },
            }
        );
        setLoadingProgress(null);
        setMessage(response.data.message);
    } catch (error) {
        console.error("Error analyzing Firebase file:", error.response ? error.response.data : error);
        setMessage("Error analyzing Firebase file. Please try again.");
        setLoadingProgress(null);
    }
};


  const handleAnalyze = async (filename, source) => {
    try {
      setLoadingProgress(0);
      setMessage(`Analyzing ${filename}...`);

      const endpoint = source === 'firebase' ? `${apiUrl}/api/analyze-firebase` : `${apiUrl}/api/analyze`;
      const response = await axios.post(
        endpoint,
        { filename },
        {
          onDownloadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setLoadingProgress(percentCompleted);
          },
        }
      );

      setLoadingProgress(null);
      setMessage(response.data.message);
    } catch (error) {
      console.error("Error analyzing file:", error.response ? error.response.data : error);
      setMessage("Error analyzing file. Please try again.");
      setLoadingProgress(null);
    }
  };

  const handleAnalyzeAll = async () => {
    setMessage("Analyzing all uploaded files...");
    for (const upload of localUploads) {
      await handleAnalyze(upload.filename, 'local');
    }
    for (const upload of firebaseUploads) {
      await handleAnalyze(upload.filename, 'firebase');
    }
    setMessage("All files analyzed successfully.");
  };

  const handleDeleteClick = (filename, source) => {
    setFilenameToDelete(filename);
    setDeleteSource(source);
    setDeleteAll(false);
    setModalOpen(true);
  };

  const handleDeleteAllClick = (source) => {
    setDeleteAll(true);
    setDeleteSource(source);
    setModalOpen(true);
  };


  const handleLocalUpload = async () => {
    if (files.length === 0) {
      setMessage("Please select one or more files to upload.");
      return;
    }
  
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const finalFileName = fileName || file.name.split(".").slice(0, -1).join(".");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fileName", `${finalFileName}.pdf`);
  
      try {
        const response = await axios.post(`${apiUrl}/api/upload`, formData);
        if (response.data.message) {
          setMessage(`File ${file.name} uploaded successfully to local server.`);
          setLocalUploads((prev) => [...prev, { filename: `${finalFileName}.pdf` }]);
        } else {
          setMessage(`File ${file.name} uploaded, but no confirmation received.`);
        }
      } catch (error) {
        console.error("Error uploading file to local server:", error);
        setMessage(`Error uploading file ${file.name} to local server. Please try again.`);
      }
    }
    setFiles([]);
  };
  
  const handleDelete = async () => {
    try {
      if (deleteAll) {
        if (deleteSource === 'local') {
          await axios.delete(`${apiUrl}/api/uploads`);
          setMessage("All files deleted successfully from local server.");
          setLocalUploads([]);
        } else if (deleteSource === 'firebase') {
          const deletePromises = firebaseUploads.map((upload) =>
            deleteObject(ref(storage, `uploads/${upload.filename}`))
          );
          await Promise.all(deletePromises);
          setFirebaseUploads([]);
          setMessage("All files deleted successfully from Firebase.");
        }
      } else if (filenameToDelete) {
        if (deleteSource === 'local') {
          await axios.delete(`${apiUrl}/api/delete/${filenameToDelete}`);
          setLocalUploads((prev) => prev.filter((upload) => upload.filename !== filenameToDelete));
          setMessage(`Deleted ${filenameToDelete} successfully from local server.`);
        } else if (deleteSource === 'firebase') {
          const firebaseRef = ref(storage, `uploads/${filenameToDelete}`);
          await deleteObject(firebaseRef);
          setFirebaseUploads((prev) => prev.filter((upload) => upload.filename !== filenameToDelete));
          setMessage(`Deleted ${filenameToDelete} successfully from Firebase.`);
        }
      }
      setModalOpen(false);
      setFilenameToDelete(null);
      setDeleteAll(false);
      setDeleteSource('');
    } catch (error) {
      console.error("Error deleting file(s):", error);
      setMessage("Error deleting file(s). Please try again.");
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFilenameToDelete(null);
    setDeleteAll(false);
    setDeleteSource('');
  };

  return (
    <div className="file-upload-card">
      <div className="file-upload-header">
        <Typography className="file-upload-title" variant="h5" gutterBottom>
          <span className="highlight-text">Upload</span> Your Pitch Decks
        </Typography>
        <IconButton onClick={fetchUploads} color="primary">
          <RefreshIcon />
        </IconButton>
      </div>

      <form className="upload-form">
        <TextField
          label="File Name (optional)"
          value={fileName}
          onChange={handleNameChange}
          fullWidth
          variant="outlined"
          className="file-name-input"
          placeholder="Enter file name (will be saved as .pdf)"
          style={{ marginBottom: '20px' }}
        />
        <TextField
          className="file-input"
          type="file"
          fullWidth
          inputProps={{ multiple: true }}
          onChange={handleFileChange}
          variant="outlined"
          InputLabelProps={{ shrink: true }}
        />
        <Button className="upload-button" variant="contained" onClick={handleFirebaseUpload}>
          Upload to Firebase
        </Button>
        <Button className="upload-button" variant="contained" onClick={handleLocalUpload}>
          Upload to Local
        </Button>
        <Button
          variant="contained"
          onClick={handleAnalyzeAll}
          className="analyze-all-button"
        >
          Analyze All
        </Button>
      </form>

      {loadingProgress !== null && (
        <LinearProgress
          variant="determinate"
          value={loadingProgress}
          style={{ marginTop: '10px', marginBottom: '10px' }}
        />
      )}
      {message && (
        <Typography className="message" variant="body1" style={{ marginTop: '10px' }}>
          {message}
        </Typography>
      )}

      <Typography className="upload-list-title" variant="h6" gutterBottom>
        <span className="highlight-text">Local</span> Uploads
      </Typography>
      <ul className="upload-list">
        {localUploads.map((upload, index) => (
          <li key={index} className="upload-item">
            <a
              href={`${apiUrl}/uploads/${upload.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="upload-link"
            >
              {upload.filename}
            </a>
            <Button
              variant="outlined"
              className="analyze-button"
              onClick={() => handleAnalyze(upload.filename, 'local')}
            >
              Analyze
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              className="delete-button"
              onClick={() => handleDeleteClick(upload.filename, 'local')}
              style={{ marginLeft: '10px' }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      <Typography className="upload-list-title" variant="h6" gutterBottom>
        <span className="highlight-text">Firebase</span> Uploads
      </Typography>
      <ul className="upload-list">
        {firebaseUploads.map((upload, index) => (
          <li key={index} className="upload-item">
            <a
              href={upload.url}
              target="_blank"
              rel="noopener noreferrer"
              className="upload-link"
            >
              {upload.filename}
            </a>
            <Button
              variant="outlined"
              className="analyze-button"
              onClick={() => handleAnalyzeFirebase(upload.filename, 'firebase')}
            >
              Analyze
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              className="delete-button"
              onClick={() => handleDeleteClick(upload.filename, 'firebase')}
              style={{ marginLeft: '10px' }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      <PopUpModal
        open={isModalOpen}
        onClose={handleModalClose}
        onConfirm={handleDelete}
        title="Are you sure?"
      >
        <p>Are you sure you want to {deleteAll ? "delete all files" : "delete this file"}?</p>
      </PopUpModal>
    </div>
  );
};

export default FileUploadForm;
