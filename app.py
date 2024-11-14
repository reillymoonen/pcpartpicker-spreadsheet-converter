from flask import Flask, render_template, request, send_file
import pandas as pd
import requests
from bs4 import BeautifulSoup 
import time
from tqdm import tqdm
import re
import io
from colorama import Fore, init
import json

# Initialize Flask and colorama
app = Flask(__name__)
init(autoreset=True)

# Function for loading with a tqdm-like progress bar
def load_with_tqdm(total_steps):
    bar_format = '{desc}: {percentage:.2f}%|{bar}|'
    progress = tqdm(total=total_steps, desc=f'{Fore.LIGHTWHITE_EX}Loading{Fore.LIGHTWHITE_EX}', ncols=100, bar_format=bar_format, ascii="*#")
    for _ in range(total_steps):
        time.sleep(0.01)  # Simulate work
        progress.update(1)
    progress.close()

# Fetch parts from PCPartPicker
def fetch_pcpartpicker_list(url):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        return []

    soup = BeautifulSoup(response.text, 'html.parser')
    parts = []
    product_rows = soup.select('.tr__product')

    if not product_rows:
        return parts

    for part in product_rows:
        component_wrapper = part.select_one('.td__component')
        name_wrapper = part.select_one('.td__name')
        price_wrapper = part.select_one('.td__price')

        if not component_wrapper or not name_wrapper or not price_wrapper:
            continue

        component = component_wrapper.get_text(strip=True)
        name = name_wrapper.get_text(strip=True)
        
        # Extract the price and remove any non-numeric characters except for the currency symbol
        price = price_wrapper.get_text(strip=True).replace('Price', '').strip()
        
        # Use regex to match the currency symbol and the number (e.g., $100, €200, etc.)
        price = re.sub(r'[^0-9\.\,\-\$€£]', '', price)  # This removes anything other than digits, commas, periods, and some symbols
        
        parts.append({'Component': component, 'Name': name, 'Price': price})

    return parts

# Convert parts list to CSV and send it as a response
def save_to_csv(parts, filename):
    # Check if parts is a list and each element is a dictionary
    if not isinstance(parts, list) or not all(isinstance(part, dict) for part in parts):
        print("Error: The parts data structure is incorrect.")
        print("Received parts:", parts)  # Debug output to inspect the content
        return "Data structure issue: Could not save to CSV"

    # If parts is empty, notify user
    if not parts:
        print("Error: No parts data available to save.")
        return "No data to save"

    # Create DataFrame and save to CSV
    df = pd.DataFrame(parts)
    csv_path = f"{filename}.csv"
    df.to_csv(csv_path, index=False)
    print(f"PCPartPicker list has been saved to {csv_path}")
    return csv_path

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fetch_parts', methods=['POST'])
def fetch_parts():
    url = request.form['url']
    filename = request.form['filename']
    
    load_with_tqdm(50)  # Simulate loading bar
    
    parts = fetch_pcpartpicker_list(url)
    load_with_tqdm(70)  # Simulate progress bar while fetching parts
    
    if not parts:
        return "Failed to fetch parts or no parts found", 400
    
    return render_template('display_parts.html', parts=parts, filename=filename)

@app.route('/download_csv', methods=['POST'])
def download_csv():
    parts_json = request.form.get('parts', '')
    print("Received parts_json:", parts_json)  # Debug output

    if not parts_json:
        return "No parts data received", 400

    try:
        parts = json.loads(parts_json)
        print("Decoded parts:", parts)  # Debug output
    except json.JSONDecodeError as e:
        print("JSON decoding error:", e)  # Print the error for debugging
        return "Invalid JSON data", 400

if __name__ == '__main__':
    app.run(debug=True)
