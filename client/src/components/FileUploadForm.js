import React, { useState, useEffect } from 'react';
import { Button, TextField, Typography, LinearProgress, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import PopUpModal from './PopUpModal'; // Import the PopUpModal component
import '../styles/FileUploadForm.css';

const FileUploadForm = () => {
  const [files, setFiles] = useState([]);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [localUploads, setLocalUploads] = useState([]);
  const [networkUploads, setNetworkUploads] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [filenameToDelete, setFilenameToDelete] = useState(null);
  const [deleteAll, setDeleteAll] = useState(false);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    try {
      const localResponse = await axios.get("http://localhost:5000/api/local-uploads");
      setLocalUploads(localResponse.data);

      const networkResponse = await axios.get("http://localhost:5000/api/uploads");
      setNetworkUploads(networkResponse.data);
    } catch (error) {
      console.error("Error fetching uploads:", error);
    }
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleNameChange = (e) => {
    setFileName(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        setLoadingProgress(0);
        const response = await axios.post("http://localhost:5000/api/upload", formData, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setLoadingProgress(percentCompleted);
          },
        });

        if (response.data.file_id) {
          setMessage(`File ${file.name} uploaded successfully`);
          setLocalUploads((prev) => [...prev, { filename: `${finalFileName}.pdf` }]);
          setNetworkUploads((prev) => [
            ...prev,
            { filename: `${finalFileName}.pdf`, file_id: response.data.file_id, analysis: response.data.analysis },
          ]);
        } else {
          setMessage(`File ${file.name} uploaded, but no file_id received.`);
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        setMessage(`Error uploading file ${file.name}. Please try again.`);
      }
      setLoadingProgress(null);
    }
    setFiles([]);
  };

  const handleAnalyze = async (filename) => {
    try {
      setLoadingProgress(0);
      setMessage(`Analyzing ${filename}...`);
      const response = await axios.post(
        "http://localhost:5000/api/analyze",
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

      setNetworkUploads((prev) =>
        prev.map((upload) =>
          upload.filename === filename ? { ...upload, analysis: response.data.analysis } : upload
        )
      );
    } catch (error) {
      console.error("Error analyzing file:", error);
      setMessage("Error analyzing file. Please try again.");
      setLoadingProgress(null);
    }
  };

  const handleAnalyzeAll = async () => {
    setMessage("Analyzing all uploaded files...");
    for (const upload of localUploads) {
      await handleAnalyze(upload.filename);
    }
    setMessage("All files analyzed successfully.");
  };

  const handleDeleteClick = (filename) => {
    setFilenameToDelete(filename);
    setDeleteAll(false);
    setModalOpen(true);
  };

  const handleDeleteAllClick = () => {
    setDeleteAll(true);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      if (deleteAll) {
        await axios.delete("http://localhost:5000/api/uploads");
        setMessage("All files deleted successfully.");
        setLocalUploads([]);
        setNetworkUploads([]);
      } else if (filenameToDelete) {
        await axios.delete(`http://localhost:5000/api/delete/${filenameToDelete}`);
        setMessage(`Deleted ${filenameToDelete} successfully.`);
        setLocalUploads((prev) => prev.filter((upload) => upload.filename !== filenameToDelete));
        setNetworkUploads((prev) => prev.filter((upload) => upload.filename !== filenameToDelete));
      }
      setModalOpen(false);
      setFilenameToDelete(null);
      setDeleteAll(false);
    } catch (error) {
      console.error("Error deleting file(s):", error);
      setMessage("Error deleting file(s). Please try again.");
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setFilenameToDelete(null);
    setDeleteAll(false);
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
        <Tooltip title="Delete All Files">
          <IconButton onClick={handleDeleteAllClick} color="secondary">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
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
        <Button className="upload-button" variant="contained" type="submit">
          Upload
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
              href={`http://localhost:5000/uploads/${upload.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              className="upload-link"
            >
              {upload.filename}
            </a>
            <Button
              variant="outlined"
              className="analyze-button"
              onClick={() => handleAnalyze(upload.filename)}
            >
              Analyze
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              className="delete-button"
              onClick={() => handleDeleteClick(upload.filename)}
              style={{ marginLeft: '10px' }}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>

      <Typography className="upload-list-title" variant="h6" gutterBottom>
        <span className="highlight-text">Network</span> Uploads
      </Typography>
      <ul className="upload-list">
        {networkUploads.map((upload, index) => (
          <li key={index} className="upload-item">
            <strong>Filename:</strong> {upload.filename} <br />
            <strong>Analysis:</strong> {upload.analysis || "Not analyzed yet"}
            <br />
            <Button
              variant="outlined"
              className="analyze-button"
              onClick={() => handleAnalyze(upload.filename)}
            >
              Analyze
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              className="delete-button"
              onClick={() => handleDeleteClick(upload.filename)}
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
