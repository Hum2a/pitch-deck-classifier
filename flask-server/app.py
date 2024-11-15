import os
import json  # Import the json module
import openai
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pdfminer.high_level import extract_text
from datetime import datetime
import re
import logging
import shutil
from urllib.parse import unquote
import firebase_admin
from firebase_admin import credentials, storage
import tempfile
from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file

openai.api_key = os.getenv("OPENAI_API_KEY")
firebase_credentials_path = os.getenv("FIREBASE_CREDENTIALS_PATH")

app = Flask(__name__)
CORS(app)

# Directories to store uploaded files, analyses, and responses
UPLOAD_FOLDER = "./uploads"
ANALYSIS_FOLDER = "./analyses"
RESPONSES_FOLDER = "./responses"  # Folder to store full API responses
OVERVIEWS_FOLDER = "./overviews"  # Folder to store overview files
SUCCESSFUL_PITCHDECK_FOLDER = "./r1_successful_pitchdecks"
ANALYSIS_FOLDER_R2 = "./r2_analysis"
RESPONSE_FOLDER_R2 = "./r2_response"
LOCAL_SAVE_ENABLED = True  # Flag to control local saving

firebase_creds_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
# Initialize Firebase
if firebase_creds_path and os.path.exists(firebase_creds_path):
    cred = credentials.Certificate(firebase_creds_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'pitchdeckclassifier.firebasestorage.app'  # Use the storage bucket from your Firebase project
    })
else:
    raise ValueError("Firebase credentials are missing.")
if not os.path.exists(firebase_creds_path):
    raise ValueError(f"Cannot access Firebase credentials file at {firebase_creds_path}")



# Create directories if they do not exist
for folder in [UPLOAD_FOLDER, ANALYSIS_FOLDER, RESPONSES_FOLDER, OVERVIEWS_FOLDER, SUCCESSFUL_PITCHDECK_FOLDER, ANALYSIS_FOLDER_R2, RESPONSE_FOLDER_R2]:
    if not os.path.exists(folder):
        os.makedirs(folder)

# Function to parse the overview text
def parse_overview(text):
    overview_data = {
        "Geography": "Not mentioned",
        "Industry": "Not mentioned",
        "Stage": "Not mentioned",
        "OverallScore": 0
    }

    # Updated regex pattern to match the expected overview structure
    overview_pattern = (
        r"Geography:\s*\[(.+?)\]\n"
        r"- Industry:\s*\[(.+?)\]\n"
        r"- Stage:\s*\[(.+?)\]\n"
        r"- Overall Score:\s*\[(\d+)"
    )

    # Match pattern to extract each field individually
    overview_match = re.search(overview_pattern, text, re.DOTALL)
    if overview_match:
        overview_data["Geography"] = overview_match.group(1).strip()
        overview_data["Industry"] = overview_match.group(2).strip()
        overview_data["Stage"] = overview_match.group(3).strip()
        overview_data["OverallScore"] = int(overview_match.group(4).strip())
        logging.info(f"Overview parsed successfully: {overview_data}")
    else:
        logging.warning("No overview information found in the response.")
        
    return overview_data

import tempfile
import json

def upload_to_firebase(data, firebase_path, from_file=True):
    """
    Uploads JSON content to Firebase Storage.
    Parameters:
    - data: path to local file or dictionary of JSON content
    - firebase_path: the path in Firebase Storage
    - from_file: if True, expects data to be a file path; if False, expects data to be a dictionary
    """
    try:
        bucket = storage.bucket()
        blob = bucket.blob(firebase_path)

        if from_file:
            # Upload directly from a file if from_file is True
            if not os.path.exists(data):
                logging.error(f"Local file {data} does not exist.")
                return False
            blob.upload_from_filename(data)
        else:
            # Create a temporary file to store JSON data
            with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json") as temp_file:
                json.dump(data, temp_file)
                temp_file_path = temp_file.name

            # Upload the temporary JSON file to Firebase
            blob.upload_from_filename(temp_file_path, content_type="application/json")

            # Clean up the temporary file after upload
            os.remove(temp_file_path)

        # Confirm upload
        if blob.exists():
            logging.info(f"Firebase upload confirmed for {firebase_path}.")
            return True
        else:
            logging.error(f"Upload failed. {firebase_path} does not exist in Firebase Storage.")
            return False
    except Exception as e:
        logging.error(f"Failed to upload {firebase_path} to Firebase: {e}")
        return False


    
def save_analysis_locally(parsed_detailed_analysis, analysis_filename):
    analysis_file_path = os.path.join(ANALYSIS_FOLDER, analysis_filename)

    try:
        # Save the parsed analysis data locally
        with open(analysis_file_path, "w") as file:
            json.dump(parsed_detailed_analysis, file, indent=4)
        logging.info(f"Analysis saved locally at {analysis_file_path}")
        
        # Check if file exists and has content
        if os.path.exists(analysis_file_path) and os.path.getsize(analysis_file_path) > 0:
            logging.info(f"Local analysis file {analysis_filename} exists and is ready for upload.")
            return analysis_file_path
        else:
            logging.error(f"Local analysis file {analysis_filename} is empty or not saved correctly.")
            return None
    except Exception as e:
        logging.error(f"Error saving analysis locally: {e}")
        return None
    
def analyze_and_upload(filename):
    try:
        # Assuming parsed_detailed_analysis contains the analysis data
        parsed_detailed_analysis = get_detailed_analysis_data()  # Hypothetical function call
        analysis_filename = f"{filename.split('.')[0]}_analysis.json"
        
        # Step 1: Save locally
        local_analysis_path = save_analysis_locally(parsed_detailed_analysis, analysis_filename)
        
        if local_analysis_path:
            # Step 2: Upload to Firebase
            firebase_path = f"analyses/{analysis_filename}"
            if not upload_to_firebase(local_analysis_path, firebase_path):
                logging.error(f"Failed to upload {analysis_filename} to Firebase.")
            else:
                logging.info(f"{analysis_filename} successfully uploaded to Firebase.")
        else:
            logging.error(f"Skipping upload as local file {analysis_filename} was not created properly.")
    except Exception as e:
        logging.error(f"Error in analyze_and_upload for {filename}: {e}")


# Helper function to download Firebase file to a temporary location
def download_firebase_file(filename):
    try:
        bucket = storage.bucket()
        blob = bucket.blob(f"uploads/{filename}")
        
        # Create a temporary file to store the downloaded content
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        blob.download_to_filename(temp_file.name)
        return temp_file.name
    except Exception as e:
        logging.error(f"Error downloading file from Firebase: {e}")
        return None
    
# Helper function to download a Round 2 file from "successful_pitchdecks" folder in Firebase to a temporary location    
def download_round_2_file(filename):
    try:
        bucket = storage.bucket()
        # Specify the path within Firebase Storage
        blob = bucket.blob(f"successful_pitchdecks/{filename}")
        
        # Create a temporary file to store the downloaded content
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        blob.download_to_filename(temp_file.name)
        
        logging.info(f"File {filename} downloaded from 'successful_pitchdecks' to {temp_file.name}")
        return temp_file.name
    except Exception as e:
        logging.error(f"Error downloading file {filename} from 'successful_pitchdecks': {e}")
        return None


def parse_detailed_analysis(data):
    analysis_data = {
        "Team": [],
        "Market": [],
        "Product/Technology": [],
        "Impact": [],
        "Investment Opportunity": []
    }

    # Ensure data is a list of parsed dictionaries
    if not isinstance(data, list):
        logging.error("Expected data to be a list of dictionaries")
        return analysis_data

    # Populate analysis_data with entries grouped by category
    for item in data:
        category = item.get("Category", "Uncategorized")
        entry = {
            "Criteria": item.get("Criteria", ""),
            "Score": item.get("Score", 0),
            "Explanation": item.get("Explanation", "")
        }
        # Append entry to the appropriate category
        if category in analysis_data:
            analysis_data[category].append(entry)
        else:
            analysis_data["Uncategorized"].append(entry)

    logging.info("Detailed analysis parsed successfully into categories.")
    return analysis_data

def extract_text_from_pdf(file_path):
    logging.info(f"Extracting text from PDF at {file_path}")
    return extract_text(file_path)

def upload_file_to_openai(file_path):
    # Use OpenAI's file upload API to upload the file
    with open(file_path, "rb") as file:
        response = openai.File.create(
            file=file,
            purpose="fine-tune"  # Update purpose if needed for your API endpoint
        )
    return response["id"]

def get_overview(text):
    prompt = f"""
        You are a venture capital analyst evaluating a pitch deck. Extract only the overview information and format it strictly as JSON, structured as shown:

        {{
            "Geography": "[Startup's location, e.g., Europe]",
            "Industry": "[Specify the industry, e.g., Agricultural Robotics]",
            "Stage": "[Specify the startup stage, e.g., Pre-Seed]",
            "OverallScore": [Provide a score out of 10, e.g., 7]
        }}

        Do not include any extra text, headings, or markdown. The response should be in this JSON structure only.

        **Text to evaluate**: {text}
    """
    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    overview_text = response['choices'][0]['message']['content']
    
    # Attempt to parse overview_text as JSON
    try:
        parsed_overview = json.loads(overview_text)  # Parses the string into a JSON object
        logging.info("Overview extracted and parsed successfully.")
    except json.JSONDecodeError:
        logging.error("Failed to parse overview as JSON. Raw text returned.")
        parsed_overview = {"Overview": overview_text}  # Fallback to raw text if parsing fails

    return parsed_overview

def get_detailed_analysis(text):
    # Construct the prompt for OpenAI with additional fields for overview information
    prompt = f"""
        You are a venture capital analyst evaluating a pitch deck. Please provide a structured analysis using the criteria below. Use a scale of 1 to 10 for scoring each criterion and provide a detailed explanation. Please be critical, noting any weaknesses or areas for improvement, to help assess the startup's investment viability.

        **Output the result as a JSON array**, with each entry strictly in the following format:

        [
            {{
                "Category": "Team",
                "Criteria": "Does the founding team look complete?",
                "Score": 8,
                "Explanation": "The team covers essential roles in engineering, software, and marketing. However, lacks a finance expert which may hinder growth."
            }},
            {{
                "Category": "Market",
                "Criteria": "Is the top-down TAM above €1B?",
                "Score": 7,
                "Explanation": "The target market is estimated above €1B, with high growth potential."
            }},
            {{
                "Category": "Product/Technology",
                "Criteria": "Is the TRL above 3?",
                "Score": 6,
                "Explanation": "The technology readiness level is moderate (TRL 4-5), needing more development to scale."
            }},
            ...
        ]

        Categories and criteria to include:

        - **Team**: 
            - Does the founding team look complete?
            - Does the team look strong and right to compete in this space?
            - (Team) Suitable for next step?

        - **Market**: 
            - Is the top-down TAM above €1B?
            - Does the team create a new market or unlock a shadow market?
            - Is it a growing market? (Market Growth Rate > 5%)
            - Is the timing right for this kind of business?
            - (Market) Suitable for next step?

        - **Product/Technology**: 
            - Is the TRL above 3?
            - (Product/Technology) Suitable for next step?

        - **Impact**: 
            - Does the team aim to achieve climate impact through a scalable and innovative approach?
            - Could there be a conflict with EU Taxonomy alignment?
            - (Impact) Suitable for next step?

        - **Investment Opportunity**:
            - Could a minimum equity stake of 8% be achieved given the round size and company funding history?
            - Could there be a conflict of interest with an existing portfolio company?
            - (Investment Opportunity) Suitable for next step?

        Only output the JSON array with the listed fields and content as structured. Avoid any additional explanations or formatting, such as backticks.

        **Text to evaluate**: {text}
    """

    logging.info("Sending prompt to OpenAI API...")

    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    detailed_analysis_json = response['choices'][0]['message']['content']
    
    # Parse the JSON-formatted response
    try:
        parsed_analysis = json.loads(detailed_analysis_json)
        return parsed_analysis
    except json.JSONDecodeError as e:
        logging.error(f"Error parsing JSON: {e}")
        return None

def parse_round_two_analysis(analysis_text):
    # Initialize a dictionary to hold the structured parsed data
    parsed_data = {
        "Team": [],
        "Market": [],
        "Product/Technology": []
    }
    
    # Define the pattern to match each row in the analysis table
    row_pattern = re.compile(
        r"\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|"
    )

    # Extract only the table content (inside the triple backticks)
    table_start = analysis_text.find("```") + 3
    table_end = analysis_text.rfind("```")
    table_content = analysis_text[table_start:table_end]

    # Iterate over each row in the table and parse it
    for line in table_content.splitlines():
        match = row_pattern.match(line)
        if match:
            category, criteria, score, explanation = match.groups()
            entry = {
                "Criteria": criteria.strip(),
                "Score": int(score.strip()),
                "Explanation": explanation.strip()
            }
            # Add the entry to the appropriate category
            if category in parsed_data:
                parsed_data[category].append(entry)
            else:
                parsed_data[category] = [entry]  # Add new category if it doesn't exist

    return parsed_data


# @app.route('/api/round_two_analysis', methods=['POST'])
# def round_two_analysis():
#     try:
#         data = request.get_json()
#         filename = data.get("filename")
        
#         # Ensure filename is provided
#         if not filename:
#             logging.error("Filename is required")
#             return jsonify({"error": "Filename is required"}), 400

#         # Step 1: Download file from Firebase specifically from the "successful_pitchdecks" folder
#         file_path = download_round_2_file(filename)
#         if not file_path:
#             logging.error(f"Failed to download {filename} from Firebase 'successful_pitchdecks'.")
#             return jsonify({"error": f"File '{filename}' could not be downloaded from 'successful_pitchdecks'"}), 404

#         # Step 2: Extract text from the downloaded PDF
#         text = extract_text_from_pdf(file_path)
#         logging.info("Text extracted from PDF successfully.")

#         # Step 3: Define the prompt for detailed Round 2 analysis
#         prompt = f"""
#         You are a venture capital analyst conducting a second-round, in-depth evaluation of a pitch deck.
#         Use a scale of 1 to 10 for scoring each criterion, and provide a thorough explanation for each score.
#         Be as critical as possible, focusing on any risks, potential red flags, strengths, and the overall potential of the startup.

#         Format the response strictly as a JSON array in brackets, with each item following this structure:

#         [
#             {{
#                 "Category": "Team",
#                 "Criteria": "Founder-Market Fit: Relevant prior experience to build this company?",
#                 "Score": 7,
#                 "Explanation": "Founders have strong backgrounds in related industries but lack direct experience in the target market."
#             }},
#             {{
#                 "Category": "Market",
#                 "Criteria": "Top-Down TAM: Is it above €10B?",
#                 "Score": 8,
#                 "Explanation": "The target market is substantial, with TAM estimates exceeding €10B."
#             }},
#             ...
#         ]

#         Below is every question and category, please use them:

#         ```
#         | Category               | Criteria                                                                                  | Score (1-10) | Explanation                                                                 |
#         |------------------------|------------------------------------------------------------------------------------------|--------------|-----------------------------------------------------------------------------|
#         | Team                   | Founder-Market Fit: Relevant prior experience to build this company?                     | ""           | ""                                                                          |
#         | Team                   | Deep Knowledge: Do the founders show deep knowledge in their operating space?            | ""           | ""                                                                          |
#         | Team                   | Previous Collaboration: Have the founders worked together or known each other before?    | ""           | ""                                                                          |
#         | Team                   | VC Mindset: Do they have a 10x mindset suitable for a VC-backed company?                 | ""           | ""                                                                          |
#         | Team                   | Entrepreneurial Experience: Does anyone have entrepreneurial experience?                 | ""           | ""                                                                          |
#         | Team                   | Completeness: Is the founding team complete?                                             | ""           | ""                                                                          |
#         | Team                   | Full-time Commitment: Are they working full-time or planning to post-investment?         | ""           | ""                                                                          |
#         | Team                   | Persuasiveness: Do they demonstrate strong persuasion and conviction abilities?          | ""           | ""                                                                          |
#         | Team                   | Self-Critical: Are they self-aware, open to feedback, and aware of their strengths and weaknesses? | ""   | ""                                                                          |
#         | Team                   | Innovator Mentality: Do they demonstrate first-principle thinking, efficiency, etc.?    | ""           | ""                                                                          |
#         | Team                   | Engineering Approach: Do they iterate and test the product pre-launch?                   | ""           | ""                                                                          |
#         | Team                   | Founder Appeal: Would you want to work with this team?                                   | ""           | ""                                                                          |
#         | Market                 | Top-Down TAM: Is it above €10B?                                                          | ""           | ""                                                                          |
#         | Market                 | Bottom-Up TAM: Is it above €500m?                                                        | ""           | ""                                                                          |
#         | Market                 | Market Tailwinds: Are there favorable market dynamics or regulatory benefits?            | ""           | ""                                                                          |
#         | Market                 | Timing: Is the timing favorable for this company's entry into the market?               | ""           | ""                                                                          |
#         | Product/Technology     | Problem-Solution Fit: Does the product create real value?                               | ""           | ""                                                                          |
#         | Product/Technology     | Defensibility: Does it have IP, patents, or other defensibility factors?                | ""           | ""                                                                          |
#         | Product/Technology     | Scalability: Can it scale, considering factors like delivery complexity and capital intensity? | "" | ""                                                                          |
#         | Product/Technology     | Competitive Advantage: If not novel, does it improve processes in a way that competes with novel solutions? | "" | ""        |
#         | Product/Technology     | TRL Level: Is the Technology Readiness Level (TRL) above 3?                             | ""           | ""                                                                          |
#         ```

#         Only include the JSON array as shown, with no additional text, comments, or formatting.
#         **Text to evaluate**: {text}
#         """

#         # Step 4: Send prompt to OpenAI API
#         response = openai.ChatCompletion.create(
#             model="gpt-4-turbo",
#             messages=[{"role": "user", "content": prompt}]
#         )
#         deep_analysis_text = response['choices'][0]['message']['content']
#         logging.info("Received response from OpenAI.")

#         # Step 5: Parse the response as JSON
#         try:
#             parsed_analysis = json.loads(deep_analysis_text)
#             logging.info("Parsed analysis response successfully.")
#         except json.JSONDecodeError as e:
#             logging.error(f"Error parsing analysis response: {e}")
#             return jsonify({"error": "Failed to parse analysis response from OpenAI"}), 500

#         # Step 6: Define filenames for Firebase storage
#         analysis_filename = f"{filename.split('.')[0]}_r2_analysis.json"
#         response_filename = f"{filename.split('.')[0]}_r2_response.json"

#         # Step 7: Upload parsed analysis to Firebase
#         if not upload_to_firebase(parsed_analysis, f"r2_analysis/{analysis_filename}", from_file=False):
#             logging.error(f"Failed to upload parsed analysis for {filename} to Firebase.")
#             return jsonify({"error": "Failed to upload parsed analysis to Firebase"}), 500

#         # Step 8: Upload raw response to Firebase
#         if not upload_to_firebase(deep_analysis_text, f"r2_responses/{response_filename}", from_file=False):
#             logging.error(f"Failed to upload raw response for {filename} to Firebase.")
#             return jsonify({"error": "Failed to upload raw response to Firebase"}), 500

#         # Step 9: Clean up local file after processing
#         os.remove(file_path)
#         logging.info(f"Temporary file {file_path} removed after analysis.")

#         # Step 10: Return structured response
#         return jsonify({"DetailedAnalysis": parsed_analysis}), 200

#     except Exception as e:
#         logging.error(f"Error during round two analysis: {e}")
#         return jsonify({"error": str(e)}), 500
  
@app.route('/api/analyze', methods=['POST'])
def analyze_pitch_deck():
    try:
        data = request.get_json()
        filename = data.get("filename")
        file_path = os.path.join(UPLOAD_FOLDER, filename)

        if not os.path.exists(file_path):
            logging.error("File not found in uploads directory")
            return jsonify({"error": "File not found in uploads directory"}), 404

        # Extract text from PDF file
        text = extract_text_from_pdf(file_path)

        # Step 1: Get and parse overview
        overview_text = get_overview(text)
        parsed_overview = parse_overview(overview_text)

        # Step 2: Get detailed analysis
        detailed_analysis_data = get_detailed_analysis(text)
        parsed_detailed_analysis = parse_detailed_analysis(detailed_analysis_data)

        # Save to Firebase
        analysis_filename = f"{filename.split('.')[0]}_analysis.json"
        upload_to_firebase(parsed_detailed_analysis, f"analyses/{analysis_filename}", from_file=False)

        # Save overview and analysis locally or log status
        combined_data = {"Overview": parsed_overview, "DetailedAnalysis": parsed_detailed_analysis}
        return jsonify({
            "Overview": parsed_overview,
            "DetailedAnalysis": parsed_detailed_analysis
        }), 200

    except Exception as e:
        logging.error(f"Error during analysis: {e}")
        return jsonify({"error": str(e)}), 500


# Main analysis function
@app.route('/api/analyze-firebase', methods=['POST'])
def analyze_pitch_deck_firebase():
    try:
        data = request.get_json()
        filename = data.get("filename")
        
        if not filename:
            return jsonify({"error": "Filename is required"}), 400

        # Download file from Firebase
        file_path = download_firebase_file(filename)
        if not file_path:
            return jsonify({"error": "Failed to download file from Firebase"}), 404

        # Extract text from the downloaded PDF
        text = extract_text(file_path)

        # Step 1: Extract overview
        overview_text = get_overview(text)
        overview_filename = f"{filename.split('.')[0]}_overview.json"
        overview_path = os.path.join(OVERVIEWS_FOLDER, overview_filename)
        with open(overview_path, "w") as file:
            json.dump({"Overview": overview_text}, file, indent=4)

        # Upload overview to Firebase and log status
        if not upload_to_firebase(overview_path, f"overviews/{overview_filename}"):
            logging.warning(f"Failed to upload overview file {overview_filename} to Firebase.")

        # Step 2: Extract detailed analysis
        detailed_analysis_text = get_detailed_analysis(text)
        analysis_filename = f"{filename.split('.')[0]}_analysis.json"
        analysis_path = os.path.join(ANALYSIS_FOLDER, analysis_filename)
        with open(analysis_path, "w") as file:
            json.dump({"DetailedAnalysis": detailed_analysis_text}, file, indent=4)

        # Upload detailed analysis to Firebase and log status
        if not upload_to_firebase(analysis_path, f"analyses/{analysis_filename}"):
            logging.warning(f"Failed to upload analysis file {analysis_filename} to Firebase.")

        # Full API response storage
        response_data = {
            "Overview": overview_text,
            "DetailedAnalysis": detailed_analysis_text
        }
        response_filename = f"{filename.split('.')[0]}_response.json"
        response_path = os.path.join(RESPONSES_FOLDER, response_filename)
        with open(response_path, "w") as file:
            json.dump(response_data, file, indent=4)

        # Upload response data to Firebase and log status
        if not upload_to_firebase(response_path, f"responses/{response_filename}"):
            logging.warning(f"Failed to upload response file {response_filename} to Firebase.")

        # Clean up the temporary file after analysis
        os.remove(file_path)

        return jsonify({
            "message": "Analysis complete",
            "overview_file": overview_filename,
            "analysis_file": analysis_filename,
            "response_file": response_filename
        }), 200

    except Exception as e:
        logging.error(f"Error during analysis: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/sync_check', methods=['GET'])
def sync_check():
    try:
        # List local files
        local_files = {
            "overviews": os.listdir(OVERVIEWS_FOLDER),
            "analyses": os.listdir(ANALYSIS_FOLDER),
            "responses": os.listdir(RESPONSES_FOLDER)
        }

        # List Firebase files
        bucket = storage.bucket()
        firebase_files = {
            "overviews": [blob.name for blob in bucket.list_blobs(prefix="overviews/")],
            "analyses": [blob.name for blob in bucket.list_blobs(prefix="analyses/")],
            "responses": [blob.name for blob in bucket.list_blobs(prefix="responses/")]
        }

        # Remove prefixes from Firebase paths for easy comparison
        firebase_files_cleaned = {
            folder: [name.replace(f"{folder}/", "") for name in names]
            for folder, names in firebase_files.items()
        }

        # Compare files and find discrepancies
        discrepancies = {
            folder: list(set(local_files[folder]) ^ set(firebase_files_cleaned[folder]))
            for folder in local_files
        }

        return jsonify({
            "local_files": local_files,
            "firebase_files": firebase_files_cleaned,
            "discrepancies": discrepancies
        }), 200

    except Exception as e:
        logging.error(f"Error during sync check: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/local-uploads', methods=['GET'])
def get_local_uploads():
    try:
        files = os.listdir(UPLOAD_FOLDER)
        file_list = [{"filename": file} for file in files]
        return jsonify(file_list), 200
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyses', methods=['GET'])
def get_analyses():
    try:
        files = os.listdir(ANALYSIS_FOLDER)
        return jsonify(files), 200
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyses/<filename>', methods=['GET'])
def get_analysis_file(filename):
    try:
        return send_from_directory(ANALYSIS_FOLDER, filename)
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/uploads/<filename>', methods=['GET'])
def download_file(filename):
    try:
        return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/analyses/<filename>', methods=['DELETE'])
def delete_analysis(filename):
    try:
        file_path = os.path.join(ANALYSIS_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)  # Delete the file
            return jsonify({"message": "Analysis deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500
    

@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_uploaded_file(filename):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)  # Delete the file from the uploads folder
            
            # Remove the file record from MongoDB
            collection.delete_one({"filename": filename})
            
            return jsonify({"message": "File deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        print("Error:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/api/overviews', methods=['GET'])
def get_overviews():
    try:
        files = os.listdir(OVERVIEWS_FOLDER)
        return jsonify(files), 200
    except Exception as e:
        logging.error(f"Error fetching overviews: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/overviews/<filename>', methods=['GET'])
def get_overview_file(filename):
    try:
        return send_from_directory(OVERVIEWS_FOLDER, filename)
    except Exception as e:
        logging.error(f"Error fetching overview file {filename}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/overviews/<filename>', methods=['DELETE'])
def delete_overview(filename):
    try:
        file_path = os.path.join(OVERVIEWS_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": "Overview deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting overview {filename}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/responses', methods=['GET'])
def get_responses():
    try:
        files = os.listdir(RESPONSES_FOLDER)
        return jsonify(files), 200
    except Exception as e:
        logging.error(f"Error fetching responses: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/responses/<filename>', methods=['GET'])
def get_response_file(filename):
    try:
        return send_from_directory(RESPONSES_FOLDER, filename)
    except Exception as e:
        logging.error(f"Error fetching response file {filename}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/responses/<filename>', methods=['DELETE'])
def delete_response(filename):
    try:
        file_path = os.path.join(RESPONSES_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": "Response deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting response {filename}: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/responses', methods=['DELETE'])
def delete_all_responses():
    try:
        # Get a list of all files in the RESPONSES_FOLDER
        files = os.listdir(RESPONSES_FOLDER)
        
        # Loop through the files and delete each one
        for filename in files:
            file_path = os.path.join(RESPONSES_FOLDER, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Return success message after all files are deleted
        return jsonify({"message": "All responses deleted successfully."}), 200

    except Exception as e:
        logging.error(f"Error deleting all responses: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/overviews', methods=['DELETE'])
def delete_all_overviews():
    try:
        # Get a list of all files in the OVERVIEWS_FOLDER
        files = os.listdir(OVERVIEWS_FOLDER)
        
        # Loop through the files and delete each one
        for filename in files:
            file_path = os.path.join(OVERVIEWS_FOLDER, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Return success message after all files are deleted
        return jsonify({"message": "All overviews deleted successfully."}), 200

    except Exception as e:
        logging.error(f"Error deleting all overviews: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/analyses', methods=['DELETE'])
def delete_all_analyses():
    try:
        # Get a list of all files in the ANALYSIS_FOLDER
        files = os.listdir(ANALYSIS_FOLDER)
        
        # Loop through the files and delete each one
        for filename in files:
            file_path = os.path.join(ANALYSIS_FOLDER, filename)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Return success message after all files are deleted
        return jsonify({"message": "All analyses deleted successfully."}), 200

    except Exception as e:
        logging.error(f"Error deleting all analyses: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/uploads', methods=['DELETE'])
def delete_all_uploads():
    try:
        # Get a list of all files in the UPLOAD_FOLDER
        files = os.listdir(UPLOAD_FOLDER)
        
        # Loop through the files and delete each one
        for filename in files:
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.exists(file_path):
                os.remove(file_path)

        # Optionally, clear the MongoDB collection for uploaded files
        collection.delete_many({})  # Assuming each upload has an entry in MongoDB
        
        # Return success message after all files are deleted
        return jsonify({"message": "All uploads deleted successfully."}), 200

    except Exception as e:
        logging.error(f"Error deleting all uploads: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/copy_successful_pitchdecks', methods=['POST'])
def copy_successful_pitchdecks():
    try:
        data = request.get_json()
        filenames = data.get("filenames", [])

        if not filenames:
            return jsonify({"error": "No filenames provided"}), 400

        successful_pitchdecks = []

        for filename in filenames:
            source_path = os.path.join(UPLOAD_FOLDER, filename)
            destination_path = os.path.join(SUCCESSFUL_PITCHDECK_FOLDER, filename)

            if os.path.exists(source_path):
                shutil.copy2(source_path, destination_path)
                successful_pitchdecks.append(filename)
            else:
                logging.warning(f"File {filename} not found in uploads folder.")

        return jsonify({"message": f"Copied {len(successful_pitchdecks)} successful pitch decks to r1_successful_pitchdecks."}), 200

    except Exception as e:
        logging.error(f"Error copying successful pitch decks: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/successful_pitchdecks', methods=['GET'])
def get_successful_pitchdecks():
    try:
        files = os.listdir(SUCCESSFUL_PITCHDECK_FOLDER)
        pdf_files = [file for file in files if file.endswith(".pdf")]
        return jsonify({"filenames": pdf_files}), 200
    except Exception as e:
        logging.error(f"Error fetching successful pitch decks: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/r2_analyses', methods=['GET'])
def get_r2_analyses():
    try:
        bucket = storage.bucket()
        blobs = bucket.list_blobs(prefix="r2_analysis/")
        analysis_files = [blob.name.split('/')[-1] for blob in blobs if blob.name.endswith(".json")]
        return jsonify(analysis_files), 200
    except Exception as e:
        logging.error(f"Error fetching round 2 analyses from Firebase: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/r2_analyses/<filename>', methods=['GET'])
def get_r2_analysis_file(filename):
    try:
        firebase_path = f"r2_analysis/{filename}"
        bucket = storage.bucket()
        blob = bucket.blob(firebase_path)

        if not blob.exists():
            return jsonify({"error": "File not found"}), 404

        file_content = blob.download_as_text()
        content = json.loads(file_content)
        return jsonify(content), 200
    except Exception as e:
        logging.error(f"Error fetching round 2 analysis file {filename} from Firebase: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/r2_analyses/<filename>', methods=['DELETE'])
def delete_r2_analysis(filename):
    try:
        firebase_path = f"r2_analysis/{filename}"
        bucket = storage.bucket()
        blob = bucket.blob(firebase_path)

        if blob.exists():
            blob.delete()
            return jsonify({"message": f"Analysis {filename} deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting round 2 analysis {filename} from Firebase: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/r2_responses', methods=['GET'])
def get_r2_responses():
    try:
        bucket = storage.bucket()
        blobs = bucket.list_blobs(prefix="r2_response/")
        response_files = [blob.name.split('/')[-1] for blob in blobs if blob.name.endswith(".json")]
        return jsonify(response_files), 200
    except Exception as e:
        logging.error(f"Error fetching round 2 responses from Firebase: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/r2_responses/<filename>', methods=['GET'])
def get_r2_response_file(filename):
    try:
        firebase_path = f"r2_response/{filename}"
        bucket = storage.bucket()
        blob = bucket.blob(firebase_path)

        if not blob.exists():
            return jsonify({"error": "File not found"}), 404

        file_content = blob.download_as_text()
        content = json.loads(file_content)
        return jsonify(content), 200
    except Exception as e:
        logging.error(f"Error fetching round 2 response file {filename} from Firebase: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/r2_responses/<filename>', methods=['DELETE'])
def delete_r2_response(filename):
    try:
        firebase_path = f"r2_response/{filename}"
        bucket = storage.bucket()
        blob = bucket.blob(firebase_path)

        if blob.exists():
            blob.delete()
            return jsonify({"message": "Round 2 response deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting round 2 response {filename} from Firebase: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_upload(filename):
    try:
        # Decode URL-encoded filename
        decoded_filename = unquote(filename)
        
        # Path to the file in the successful pitchdeck folder
        file_path = os.path.join(SUCCESSFUL_PITCHDECK_FOLDER, decoded_filename)
        
        # Check if the file exists before attempting deletion
        if os.path.exists(file_path):
            os.remove(file_path)  # Delete the file
            # Optionally, remove the record from MongoDB if stored there
            collection.delete_one({"filename": decoded_filename})
            return jsonify({"message": f"File '{decoded_filename}' deleted successfully"}), 200
        else:
            return jsonify({"error": f"File '{decoded_filename}' not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting file '{decoded_filename}': {e}")
        return jsonify({"error": f"Error deleting file '{decoded_filename}': {str(e)}"}), 500
    


# Function to download the Round 2 PDF file from Firebase
def download_round_2_file(filename):
    try:
        bucket = storage.bucket()
        blob = bucket.blob(f"successful_pitchdecks/{filename}")
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        blob.download_to_filename(temp_file.name)
        if os.path.exists(temp_file.name):
            logging.info(f"File {filename} downloaded to {temp_file.name}")
            return temp_file.name
        else:
            logging.error("Downloaded file not found locally.")
            return None
    except Exception as e:
        logging.error(f"Error downloading file from Firebase: {e}")
        return None

# Function to extract text from a PDF file with error handling
def extract_text_from_pdf(file_path):
    try:
        logging.info(f"Extracting text from PDF at {file_path}")
        return extract_text(file_path)
    except Exception as e:
        logging.error(f"Error extracting text from PDF: {e}")
        return None

# Function to send a prompt to OpenAI for Round 2 analysis
def get_round_two_analysis(text):
    prompt = f"""
        You are a venture capital analyst conducting a second-round, in-depth evaluation of a pitch deck.
        Use a scale of 1 to 10 for scoring each criterion, and provide a thorough explanation for each score.
        Be as critical as possible, focusing on any risks, potential red flags, strengths, and the overall potential of the startup.

        Format the response strictly as a JSON array in brackets, with each item following this structure:

        [
            {{
                "Category": "Team",
                "Criteria": "Founder-Market Fit: Relevant prior experience to build this company?",
                "Score": 7,
                "Explanation": "Founders have strong backgrounds in related industries but lack direct experience in the target market."
            }},
            {{
                "Category": "Market",
                "Criteria": "Top-Down TAM: Is it above €10B?",
                "Score": 8,
                "Explanation": "The target market is substantial, with TAM estimates exceeding €10B."
            }},
            ...
        ]

        Below is every question and category, please use them:

        ```
        | Category               | Criteria                                                                                  | Score (1-10) | Explanation                                                                 |
        |------------------------|------------------------------------------------------------------------------------------|--------------|-----------------------------------------------------------------------------|
        | Team                   | Founder-Market Fit: Relevant prior experience to build this company?                     | ""           | ""                                                                          |
        | Team                   | Deep Knowledge: Do the founders show deep knowledge in their operating space?            | ""           | ""                                                                          |
        | Team                   | Previous Collaboration: Have the founders worked together or known each other before?    | ""           | ""                                                                          |
        | Team                   | VC Mindset: Do they have a 10x mindset suitable for a VC-backed company?                 | ""           | ""                                                                          |
        | Team                   | Entrepreneurial Experience: Does anyone have entrepreneurial experience?                 | ""           | ""                                                                          |
        | Team                   | Completeness: Is the founding team complete?                                             | ""           | ""                                                                          |
        | Team                   | Full-time Commitment: Are they working full-time or planning to post-investment?         | ""           | ""                                                                          |
        | Team                   | Persuasiveness: Do they demonstrate strong persuasion and conviction abilities?          | ""           | ""                                                                          |
        | Team                   | Self-Critical: Are they self-aware, open to feedback, and aware of their strengths and weaknesses? | ""   | ""                                                                          |
        | Team                   | Innovator Mentality: Do they demonstrate first-principle thinking, efficiency, etc.?    | ""           | ""                                                                          |
        | Team                   | Engineering Approach: Do they iterate and test the product pre-launch?                   | ""           | ""                                                                          |
        | Team                   | Founder Appeal: Would you want to work with this team?                                   | ""           | ""                                                                          |
        | Market                 | Top-Down TAM: Is it above €10B?                                                          | ""           | ""                                                                          |
        | Market                 | Bottom-Up TAM: Is it above €500m?                                                        | ""           | ""                                                                          |
        | Market                 | Market Tailwinds: Are there favorable market dynamics or regulatory benefits?            | ""           | ""                                                                          |
        | Market                 | Timing: Is the timing favorable for this company's entry into the market?               | ""           | ""                                                                          |
        | Product/Technology     | Problem-Solution Fit: Does the product create real value?                               | ""           | ""                                                                          |
        | Product/Technology     | Defensibility: Does it have IP, patents, or other defensibility factors?                | ""           | ""                                                                          |
        | Product/Technology     | Scalability: Can it scale, considering factors like delivery complexity and capital intensity? | "" | ""                                                                          |
        | Product/Technology     | Competitive Advantage: If not novel, does it improve processes in a way that competes with novel solutions? | "" | ""        |
        | Product/Technology     | TRL Level: Is the Technology Readiness Level (TRL) above 3?                             | ""           | ""                                                                          |
        ```

        Only include the JSON array as shown, with no additional text, comments, or formatting.
        **Text to evaluate**: {text}
        """
    try:
        logging.info("Sending prompt to OpenAI for analysis.")
        response = openai.ChatCompletion.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        return response['choices'][0]['message']['content']
    except openai.error.OpenAIError as e:
        logging.error(f"OpenAI API error: {e}")
        return None
    except Exception as e:
        logging.error(f"Unexpected error communicating with OpenAI: {e}")
        return None

# Function to parse JSON from OpenAI response
def parse_analysis(analysis_text):
    try:
        return json.loads(analysis_text)
    except json.JSONDecodeError as e:
        logging.error(f"Error parsing analysis response: {e}")
        return None
    
# Save analysis locally
def save_locally(data, folder, filename):
    try:
        file_path = os.path.join(folder, filename)
        with open(file_path, "w") as file:
            json.dump(data, file, indent=4)
        logging.info(f"Saved file locally at {file_path}")
        return file_path
    except Exception as e:
        logging.error(f"Failed to save file locally: {e}")
        return None

# Firebase upload function
def upload_to_firebase(local_path, firebase_path):
    try:
        bucket = storage.bucket()
        blob = bucket.blob(firebase_path)
        blob.upload_from_filename(local_path)
        logging.info(f"Uploaded {firebase_path} to Firebase.")
        return True
    except Exception as e:
        logging.error(f"Failed to upload to Firebase: {e}")
        return False


@app.route('/api/round_two_analysis', methods=['POST'])
def round_two_analysis():
    data = request.get_json()
    filename = data.get("filename")
    if not filename:
        logging.error("Filename is required.")
        return jsonify({"error": "Filename is required"}), 400

    # Step 1: Download file
    file_path = download_round_2_file(filename)
    if not file_path:
        logging.error("File download failed.")
        return jsonify({"error": "File download failed"}), 404

    # Step 2: Extract text
    text = extract_text_from_pdf(file_path)
    os.remove(file_path)  # Clean up file after extraction
    if not text:
        logging.error("Text extraction failed.")
        return jsonify({"error": "Text extraction failed"}), 500

    # Step 3: Get analysis from OpenAI
    analysis_text = get_round_two_analysis(text)
    if not analysis_text:
        logging.error("OpenAI analysis failed.")
        return jsonify({"error": "OpenAI analysis failed"}), 500

    # Step 4: Parse the JSON response
    parsed_analysis = parse_analysis(analysis_text)
    if not parsed_analysis:
        logging.error("Failed to parse analysis response.")
        return jsonify({"error": "Failed to parse analysis"}), 500

    # Step 5: Define filenames for analysis and response
    analysis_filename = f"{filename.split('.')[0]}_r2_analysis.json"
    response_filename = f"{filename.split('.')[0]}_r2_response.json"

    # Step 6: Save parsed analysis locally
    analysis_local_path = None
    if LOCAL_SAVE_ENABLED:
        analysis_local_path = save_locally(parsed_analysis, ANALYSIS_FOLDER_R2, analysis_filename)
        if analysis_local_path:
            logging.info(f"Analysis successfully saved locally at {analysis_local_path}")
        else:
            logging.error("Failed to save analysis locally.")

    # Step 7: Save raw response locally
    response_local_path = None
    if LOCAL_SAVE_ENABLED:
        response_local_path = save_locally(analysis_text, RESPONSE_FOLDER_R2, response_filename)
        if response_local_path:
            logging.info(f"Response successfully saved locally at {response_local_path}")
        else:
            logging.error("Failed to save response locally.")

    # Step 8: Upload parsed analysis to Firebase if local save was successful
    if analysis_local_path and not upload_to_firebase(analysis_local_path, f"r2_analysis/{analysis_filename}"):
        logging.error(f"Failed to upload parsed analysis for {filename} to Firebase.")
        return jsonify({"error": "Failed to upload parsed analysis"}), 500

    # Step 9: Upload raw response to Firebase if local save was successful
    if response_local_path and not upload_to_firebase(response_local_path, f"r2_responses/{response_filename}"):
        logging.error(f"Failed to upload raw response for {filename} to Firebase.")
        return jsonify({"error": "Failed to upload raw response"}), 500

    # Return success message with the parsed analysis data
    return jsonify({"DetailedAnalysis": parsed_analysis}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))


