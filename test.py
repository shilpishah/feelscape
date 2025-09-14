












# main.py

import boto3
import json
import os
from typing import List
from dotenv import load_dotenv
import base64
import requests

# Import FastAPI components
from fastapi import FastAPI, File, UploadFile, HTTPException
from starlette.responses import JSONResponse

# Load environment variables from a .env file
load_dotenv()

# --- Configuration and Client Initialization ---

# Fetch AWS credentials and region from environment variables
aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
aws_region = os.environ.get("AWS_REGION")

# Fetch Suno API Key
SUNO_API_KEY = os.getenv("SUNO_API_KEY")

# Validate that all required environment variables are set
if not all([aws_access_key, aws_secret_key, aws_region, SUNO_API_KEY]):
    raise RuntimeError("One or more required environment variables are not set. (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, SUNO_API_KEY)")

# Create a Bedrock Runtime client
# This is done once when the application starts
try:
    bedrock_client = boto3.client(
        "bedrock-runtime",
        region_name=aws_region,
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key
    )
except Exception as e:
    raise RuntimeError(f"Could not create AWS Bedrock client. Error: {e}")


# --- Helper Functions ---

def encode_image_to_base64(image_data: bytes) -> str:
    """Encodes image data (in bytes) to a base64 string."""
    return base64.b64encode(image_data).decode('utf-8')

def generate_music_from_prompt(input_prompt: str) -> dict:
    """
    Sends a prompt to the Suno API to generate music and returns the response.
    """
    api_url = "https://studio-api.prod.suno.com/api/v2/external/hackmit/generate"
    payload = {
        "prompt": input_prompt,
        "makeInstrumental": False
    }
    headers = {
        "Authorization": f"Bearer {SUNO_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=90)
        # Raise an exception for bad status codes (4xx or 5xx)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        # Handle network errors, timeouts, or bad responses from the Suno API
        raise HTTPException(status_code=502, detail=f"Failed to generate music from Suno API: {e}")


# --- FastAPI Application ---

app = FastAPI(
    title="Image to Music Generator API",
    description="This API generates a musical clip based on the emotional context of uploaded images.",
    version="1.0.0"
)

@app.post("/generate-from-images/", summary="Create Music from Images")
async def create_music_from_images(files: List[UploadFile] = File(..., description="One or more image files to process.")):
    """
    This endpoint performs the following steps:
    1.  Accepts one or more uploaded image files.
    2.  Encodes the images into base64 format.
    3.  Sends the images to AWS Bedrock (Anthropic Claude 3 Sonnet) with a prompt to describe the emotion of one of them.
    4.  Takes the generated text description.
    5.  Sends the description to the Suno API to generate a music clip.
    6.  Returns the text description and the response from the Suno API.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No image files were uploaded.")

    messages_content = []

    # Process and encode each uploaded image
    for file in files:
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail=f"File '{file.filename}' is not a valid image. Please upload only images.")

        image_data = await file.read()
        base64_image = encode_image_to_base64(image_data)

        messages_content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": file.content_type,
                "data": base64_image
            }
        })

    # Define the text prompt for the model
    prompt = """
    You are given a list of images. Select one image at random from the provided list.
    Take specific note of the emotions that the landscape is representing. 
    Please limit your description to no more than 1 sentence.
    """
    messages_content.append({
        "type": "text",
        "text": prompt
    })

    # Configure the request for the Anthropic Claude 3 model on Bedrock
    model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
    native_request = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 512,
        "temperature": 0.5,
        "messages": [{"role": "user", "content": messages_content}],
    }

    # Invoke the model
    try:
        response = bedrock_client.invoke_model(modelId=model_id, body=json.dumps(native_request))
        model_response = json.loads(response["body"].read())
        # Extract the generated text from the model's response
        generated_text = model_response["content"][0]["text"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error invoking AWS Bedrock model: {e}")

    # Generate music using the text from the model
    music_generation_response = generate_music_from_prompt(generated_text)

    # Return a structured JSON response
    return JSONResponse(content={
        "image_description_prompt": generated_text,
        "music_generation_details": music_generation_response
    })