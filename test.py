# Use the native inference API to send a text message to Anthropic Claude.
import boto3
import json
import os
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv
import base64
import requests

# BASE_IMAGE = "./testImages"

# Load environment variables
load_dotenv()

# Set up AWS credentials
aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID")
aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
aws_region = os.environ.get("AWS_REGION")

SUNO_API_KEY = os.getenv("SUNO_API_KEY")

def encode_image_to_base64(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')
    

# image_path = "./testImages/testImage.png"
# base64_image = encode_image_to_base64(image_path)

def generate_music(input_prompt):
    payload = {
        "prompt": input_prompt,
        "makeInstrumental": False
    }
    # Send POST request to the backend
    response = requests.post(
        "https://studio-api.prod.suno.com/api/v2/external/hackmit/generate",
        headers={"Authorization": f"Bearer {SUNO_API_KEY}", "Content-Type": "application/json"},
        json=payload
    )

    # Print result directly to terminal
    print("\n--- Music Generation Response ---")
    print(response.status_code, response.text)
# Create a Bedrock Runtime client
client = boto3.client(
    "bedrock-runtime",
    region_name=aws_region,
    aws_access_key_id=aws_access_key,
    aws_secret_access_key=aws_secret_key
)

image_files = [
    os.path.join("./public/", f)
    for f in os.listdir("./public/")
    if f.lower().endswith(('.png', '.jpg', '.jpeg'))
]
if not image_files:
    raise ValueError("No images found in the folder!")

print(f"Available images: {image_files}")

# Create a Bedrock Runtime client in the AWS Region of your choice.
# client = boto3.client("bedrock-runtime", region_name="us-east-1")

# Set the model ID, e.g., Claude 3 Sonnet.
model_id = "anthropic.claude-3-sonnet-20240229-v1:0"

# Define the prompt for the model.
prompt = f"""
You are given a list of images. Select one image at random from the provided list.
Take specific note of the emotions that the landscape is representing. 
Please limit your description to no more than 1 sentence.
"""

messages_content = []

# Add each image
for path in image_files:
    messages_content.append({
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": encode_image_to_base64(path)
        }
    })

# Add the prompt as a proper string
messages_content.append({
    "type": "text",
    "text": prompt  # MUST be a plain string
})

# Format the request payload using the model's native structure.
native_request = {
    "anthropic_version": "bedrock-2023-05-31",
    "max_tokens": 512,
    "temperature": 0.5,
    "messages": [
        {
            "role": "user",
            "content": messages_content
        }
    ],
}

# Convert the native request to JSON.
request = json.dumps(native_request)

try:
    # Invoke the model with the request.
    response = client.invoke_model(modelId=model_id, body=request)

except (Exception) as e:
    print(f"ERROR: Can't invoke '{model_id}'. Reason: {e}")
    exit(1)

# Decode the response body.
model_response = json.loads(response["body"].read())

# Extract and print the response text.
response_text = model_response["content"][0]["text"]
print(response_text)

# generates the music based on the response
music_clip = generate_music(response_text)