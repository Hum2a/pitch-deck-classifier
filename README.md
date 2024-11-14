# Pitch Deck Analyzer

This is a full-stack application for analyzing and ranking pitch decks. The application has a React frontend and a Python Flask backend. The backend processes PDF pitch decks and ranks them based on analysis criteria, while the frontend provides a user-friendly interface for uploading, analyzing, and managing pitch decks.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Backend - Python Flask Setup](#backend---python-flask-setup)
4. [Frontend - React Setup](#frontend---react-setup)
5. [Running the Application](#running-the-application)
6. [API Endpoints](#api-endpoints)
7. [Usage](#usage)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

To run this application, you need:
- [Node.js](https://nodejs.org/en/download/) (for React frontend)
- [Python 3.x](https://www.python.org/downloads/) (for Flask backend)
- [MongoDB](https://www.mongodb.com/try/download/community) (for data storage)
- [pip](https://pip.pypa.io/en/stable/installation/) (Python package manager)

## Project Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repository-url/pitch-deck-analyzer.git
   cd pitch-deck-analyzer
   ```

2. The project structure should look like this:
   ```
   pitch-deck-analyzer/
   ├── backend/       # Python Flask backend
   └── frontend/      # React frontend
   ```

## Backend - Python Flask Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   - Set up a virtual environment (optional but recommended):
     ```bash
     python -m venv venv
     source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
     ```
   - Install Python packages:
     ```bash
     pip install -r requirements.txt
     ```

3. **Configure MongoDB**:
   - Ensure MongoDB is running on your system.
   - In `app.py`, adjust the MongoDB connection string as needed:
     ```python
     client = MongoClient("mongodb://localhost:27017/")
     ```

4. **Set up OpenAI API Key**:
   - Add your OpenAI API key in `app.py`:
     ```python
     openai.api_key = "YOUR_OPENAI_API_KEY"
     ```

5. **Run the Flask server**:
   ```bash
   python app.py
   ```
   - The server should start on `http://localhost:5000`.

## Frontend - React Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure API URL**:
   - In the frontend source code, ensure all API calls point to `http://localhost:5000` (default Flask server URL).

4. **Run the React application**:
   ```bash
   npm start
   ```
   - The React app should start on `http://localhost:3000`.

## Running the Application

With both backend and frontend running:
- Go to `http://localhost:3000` in your browser to view the application.
- The frontend communicates with the backend at `http://localhost:5000` for API requests.

## API Endpoints

The backend provides several endpoints for interacting with the pitch decks:

- **File Upload and Analysis**:
  - `POST /api/upload`: Upload a new pitch deck (PDF).
  - `POST /api/analyze`: Analyze an uploaded pitch deck.
  - `POST /api/round_two_analysis`: Run a detailed analysis on pitch decks.
  
- **File Management**:
  - `GET /api/local-uploads`: List all locally stored uploads.
  - `DELETE /api/delete/<filename>`: Delete an uploaded file by filename.
  
- **Analysis Retrieval and Ranking**:
  - `GET /api/r2_analyses`: Retrieve all Round 2 analysis files.
  - `GET /api/r2_analyses/<filename>`: Retrieve the analysis details of a specific pitch deck.
  
## Usage

1. **Upload Pitch Decks**:
   - Use the upload form on the frontend to select and upload PDF files.

2. **Analyze Pitch Decks**:
   - Click the **Analyze** button on individual files to run an analysis on a specific pitch deck.
   - Click the **Analyze All** button to analyze all uploaded pitch decks in one go.

3. **View Rankings**:
   - The frontend displays a ranked list of pitch decks based on analysis scores.

4. **Delete Files**:
   - Delete individual files by clicking the **Delete** button.
   - Delete all files by clicking the **Delete All** button.

## Troubleshooting

1. **Backend Errors**:
   - Check if MongoDB is running.
   - Confirm the OpenAI API key is correctly configured.
   - Check Flask server logs for errors.

2. **Frontend Errors**:
   - Ensure the frontend API URLs are correct.
   - Check console logs in the browser for debugging.

3. **CORS Issues**:
   - If CORS errors occur, ensure `flask-cors` is installed and properly configured in `app.py`.
