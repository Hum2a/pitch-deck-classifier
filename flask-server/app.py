import os
import json  # Import the json module
import openai
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pdfminer.high_level import extract_text
from pymongo import MongoClient
from datetime import datetime
import re
import logging
import shutil
from urllib.parse import unquote

app = Flask(__name__)
CORS(app)

# MongoDB setup
client = MongoClient("mongodb://localhost:27017/")
db = client["pitch_deck_db"]
collection = db["pitch_decks"]

# Set your OpenAI API key
openai.api_key = "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"

# Directories to store uploaded files, analyses, and responses
UPLOAD_FOLDER = "./uploads"
ANALYSIS_FOLDER = "./analyses"
RESPONSES_FOLDER = "./responses"  # Folder to store full API responses
OVERVIEWS_FOLDER = "./overviews"  # Folder to store overview files
SUCCESSFUL_PITCHDECK_FOLDER = "./r1_successful_pitchdecks"
ANALYSIS_FOLDER_R2 = "./r2_analysis"
RESPONSE_FOLDER_R2 = "./r2_response"

# Create directories if they do not exist
for folder in [UPLOAD_FOLDER, ANALYSIS_FOLDER, RESPONSES_FOLDER, OVERVIEWS_FOLDER, SUCCESSFUL_PITCHDECK_FOLDER, ANALYSIS_FOLDER_R2, RESPONSE_FOLDER_R2]:
    if not os.path.exists(folder):
        os.makedirs(folder)

# Function to parse the overview text
def parse_overview(text):
    overview_data = {
        "Geography": "",
        "Industry": "",
        "Stage": "",
        "OverallScore": 0
    }

    # Update regex pattern to make it more flexible
    overview_pattern = (
        r"Geography:\s*(.+?)\n"
        r"- Industry:\s*(.+?)\n"
        r"- Stage:\s*(.+?)\n"
        r"- Overall Score:\s*(\d+)"
    )
    
    # Match pattern to extract the overview details
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

# Function to parse the detailed analysis text
def parse_detailed_analysis(text):
    analysis_data = {
        "Team": [],
        "Market": [],
        "Product/Technology": [],
        "Impact": [],
        "Investment Opportunity": []
    }
    row_pattern = r"\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(\d+)\s*\|\s*(.*?)\s*\|"
    lines = text.splitlines()
    for line in lines:
        match = re.match(row_pattern, line)
        if match:
            category, criteria, score, explanation = match.groups()
            if category in analysis_data:
                analysis_data[category].append({
                    "Criteria": criteria,
                    "Score": int(score),
                    "Explanation": explanation
                })
    logging.info("Detailed analysis parsed successfully.")
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
    You are a venture capital analyst evaluating a pitch deck. Extract only the overview information using the format strictly as shown:
    
    **Overview**:
    - Geography: [Provide the startup's location]
    - Industry: [Specify the industry]
    - Stage: [Specify the startup stage]
    - Overall Score: [Provide a score out of 10 summarizing the pitch deck's quality]

    Text to evaluate: {text}
    """
    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    overview_text = response['choices'][0]['message']['content']
    logging.info("Overview extracted successfully.")
    return overview_text

def get_detailed_analysis(text):
    # Construct the prompt for OpenAI with additional fields for overview information
    prompt = f"""
    You are a venture capital analyst evaluating a pitch deck. Please provide a structured analysis using the criteria below. Use a scale of 1 to 10 for scoring each criterion and provide a detailed explanation. Please try to be as critical as possible. Look for any faults and cross-reference with other pitch decks you can find online. We are trying to create an accurate pitch deck classifier modal that can assist a business in deciding whether a  VC Startup is worth investing in.
    Format the output strictly as shown.

    **Detailed Analysis**:
    ```
    | Category               | Criteria                                    | Score (1-10) | Explanation                                                                 |
    |------------------------|---------------------------------------------|--------------|-----------------------------------------------------------------------------|
    | Team                   | Does the founding team look complete?       | ""            | "" |
    | Team                   | Does the team look strong and right to compete in this space? | "" | "" |
    | Team                   | (Team) Suitable for next step?              | ""            | "" |
    | Market                 | Is the top-down TAM above €1B?              | ""            | "" |
    | Market                 | Does the team create a new market or unlock a shadow market? | "" | "" |
    | Market                 | Is it a growing market? (Market Growth Rate > 5%) | "" | "" |
    | Market                 | Is the timing right for this kind of business? | "" | "" |
    | Market                 | (Market) Suitable for next step?            | ""            | "" |
    | Product/Technology     | Is the TRL above 3?                         | ""            | "" |
    | Product/Technology     | (Product/Technology) Suitable for next step? | "" | "" |
    | Impact                 | Does the team aim to achieve climate impact through a scalable and innovative approach? | "" | "" |
    | Impact                 | Could there be a conflict with EU Taxonomy alignment? | "" | "" |
    | Impact                 | (Impact) Suitable for next step?            | ""            | "" |
    | Investment Opportunity | Could a minimum equity stake of 8% be achieved given the round size and company funding history? | "" | "" |
    | Investment Opportunity | Could there be a conflict of interest with an existing portfolio company? | "" | "" |
    | Investment Opportunity | (Investment Opportunity) Suitable for next step? | "" | "" |
    ```

    - Do not include any extra text before or after the response.
    - Each category must have criteria with scores and explanations.
    
    **Text to evaluate**: {text}
    """
    logging.info("Sending prompt to OpenAI API...")

    response = openai.ChatCompletion.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    detailed_analysis_text = response['choices'][0]['message']['content']
    logging.info("Detailed analysis extracted successfully.")
    return detailed_analysis_text

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


@app.route('/api/round_two_analysis', methods=['POST'])
def round_two_analysis():
    try:
        data = request.get_json()
        filename = data.get("filename")
        if not filename:
            return jsonify({"error": "Filename is required"}), 400

        # File path in the successful pitch decks folder
        file_path = os.path.join(SUCCESSFUL_PITCHDECK_FOLDER, filename)
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found"}), 404

        text = extract_text_from_pdf(file_path)

        # Updated prompt for deeper analysis with strict table format
        prompt = f"""
        You are a venture capital analyst conducting a second-round, in-depth evaluation of a pitch deck.
        Use a scale of 1 to 10 for scoring each criterion, and provide a thorough explanation for each score. 
        Be as critical as possible, focusing on any risks, potential red flags, strengths, and the overall potential of the startup.
        Please provide your analysis in a structured table format, as shown below:

        **Detailed Second-Round Analysis**:
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

        - Do not include any extra text before or after the response.
        - Each row should contain the category, specific criterion, score, and a detailed explanation.

        **Text to evaluate**: {text}
        """

        # Send the request to OpenAI and capture the response
        response = openai.ChatCompletion.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        deep_analysis_text = response['choices'][0]['message']['content']

        # Parse the received analysis text into the structured format
        parsed_analysis = parse_round_two_analysis(deep_analysis_text)

        # Prepare file paths
        analysis_filename = f"{filename.split('.')[0]}_r2_analysis.json"
        analysis_path = os.path.join(ANALYSIS_FOLDER_R2, analysis_filename)
        response_filename = f"{filename.split('.')[0]}_r2_response.json"
        response_path = os.path.join(RESPONSE_FOLDER_R2, response_filename)

        # Save parsed structured analysis to `r2_analysis` folder
        with open(analysis_path, "w") as analysis_file:
            json.dump({"filename": filename, "analysis": parsed_analysis}, analysis_file, indent=4)

        # Save raw response text to `r2_response` folder
        with open(response_path, "w") as response_file:
            json.dump({"filename": filename, "response": deep_analysis_text}, response_file, indent=4)

        # Return structured analysis result for the specific pitch deck
        return jsonify({"analysis": parsed_analysis}), 200

    except Exception as e:
        logging.error(f"Error during round two analysis: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/upload', methods=['POST'])
def upload_pitch_deck():
    try:
        # Check if 'file' is in request.files
        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        # Save file
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(file_path)  # This is where the file saves locally

        # MongoDB entry
        collection.insert_one({
            "filename": file.filename,
            "analysis": None,
            "timestamp": datetime.now()
        })
        logging.info(f"File uploaded successfully: {file_path}")

        return jsonify({"message": "File successfully uploaded"}), 200
    except Exception as e:
        logging.error(f"Error in file upload: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/analyze', methods=['POST'])
def analyze_pitch_deck():
    try:
        data = request.get_json()
        filename = data.get("filename")
        file_path = os.path.join(UPLOAD_FOLDER, filename)

        if not os.path.exists(file_path):
            logging.error("File not found in uploads directory")
            return jsonify({"error": "File not found in uploads directory"}), 404

        text = extract_text_from_pdf(file_path)
        
        # Step 1: Get and save Overview
        overview_text = get_overview(text)
        parsed_overview = parse_overview(overview_text)
        
        # Save the overview in the "overviews" folder
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        overview_filename = f"{filename.split('.')[0]}_overview.json"
        overview_path = os.path.join(OVERVIEWS_FOLDER, overview_filename)
        with open(overview_path, "w") as file:
            json.dump(parsed_overview, file, indent=4)
        logging.info(f"Overview saved to {overview_path}")

        # Step 2: Get and save Detailed Analysis
        detailed_analysis_text = get_detailed_analysis(text)
        parsed_detailed_analysis = parse_detailed_analysis(detailed_analysis_text)
        
        # Save the detailed analysis separately
        analysis_filename = f"{filename.split('.')[0]}_analysis.json"
        analysis_file_path = os.path.join(ANALYSIS_FOLDER, analysis_filename)
        with open(analysis_file_path, "w") as file:
            json.dump(parsed_detailed_analysis, file, indent=4)
        logging.info(f"Detailed analysis saved to {analysis_file_path}")

        # Save the full API response to "responses" folder
        response_data = {
            "Overview": overview_text,
            "DetailedAnalysis": detailed_analysis_text
        }
        response_filename = f"{filename.split('.')[0]}_response.json"
        response_file_path = os.path.join(RESPONSES_FOLDER, response_filename)
        with open(response_file_path, "w") as file:
            json.dump(response_data, file, indent=4)
        logging.info(f"Full API response saved to {response_file_path}")

        # Combine both into MongoDB record
        combined_data = {
            "Overview": parsed_overview,
            "DetailedAnalysis": parsed_detailed_analysis
        }
        
        collection.update_one(
            {"filename": filename},
            {"$set": {"analysis": combined_data, "timestamp": datetime.now()}}
        )

        return jsonify({
            "message": "Analysis complete",
            "overview_file": overview_filename,
            "analysis_file": analysis_filename,
            "response_file": response_filename
        }), 200

    except Exception as e:
        logging.error(f"Error during analysis: {e}")
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
    
    # Endpoint to get the list of all files in r2_analysis
@app.route('/api/r2_analyses', methods=['GET'])
def get_r2_analyses():
    try:
        files = os.listdir(ANALYSIS_FOLDER_R2)
        analysis_files = [file for file in files if file.endswith(".json")]
        return jsonify(analysis_files), 200
    except Exception as e:
        logging.error(f"Error fetching round 2 analyses: {e}")
        return jsonify({"error": str(e)}), 500

# Endpoint to get the content of a specific analysis file
@app.route('/api/r2_analyses/<filename>', methods=['GET'])
def get_r2_analysis_file(filename):
    try:
        file_path = os.path.join(ANALYSIS_FOLDER_R2, filename)
        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                content = json.load(file)
            return jsonify(content), 200  # Serve the structured JSON
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logging.error(f"Error fetching round 2 analysis file {filename}: {e}")
        return jsonify({"error": str(e)}), 500


    
@app.route('/api/r2_analyses/<filename>', methods=['DELETE'])
def delete_r2_analysis(filename):
    try:
        file_path = os.path.join(ANALYSIS_FOLDER_R2, filename)
        if os.path.exists(file_path):
            os.remove(file_path)  # Delete the file
            return jsonify({"message": f"Analysis {filename} deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting round 2 analysis {filename}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/r2_responses', methods=['GET'])
def get_r2_responses():
    try:
        files = os.listdir(RESPONSE_FOLDER_R2)
        response_files = [file for file in files if file.endswith(".json")]
        return jsonify(response_files), 200
    except Exception as e:
        logging.error(f"Error fetching round 2 responses: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/r2_responses/<filename>', methods=['GET'])
def get_r2_response_file(filename):
    try:
        file_path = os.path.join(RESPONSE_FOLDER_R2, filename)
        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                content = json.load(file)
            return jsonify(content), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logging.error(f"Error fetching round 2 response file {filename}: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/r2_responses/<filename>', methods=['DELETE'])
def delete_r2_response(filename):
    try:
        file_path = os.path.join(RESPONSE_FOLDER_R2, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"message": "Round 2 response deleted successfully"}), 200
        else:
            return jsonify({"error": "File not found"}), 404
    except Exception as e:
        logging.error(f"Error deleting round 2 response {filename}: {e}")
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))


