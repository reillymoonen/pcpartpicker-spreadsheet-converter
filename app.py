from flask import Flask, render_template, request, send_file, jsonify
import pandas as pd
import requests
from bs4 import BeautifulSoup
import time
from tqdm import tqdm
from colorama import Fore, init
import io
import re

# Initialize Flask and colorama
app = Flask(__name__)
init(autoreset=True)

def clean_price(price_text):
    # Match any currency symbol followed by numbers
    match = re.search(r'([€$£¥₩₹₽R฿kr₺])\s*(\d+(?:[.,]\d{2})?)', price_text)
    if match:
        symbol = match.group(1)
        amount = match.group(2)
        return f'{symbol}{amount}'
    
    # If no currency symbol found, just try to find the numbers
    number_match = re.search(r'\d+(?:[.,]\d{2})?', price_text)
    if number_match:
        return number_match.group(0)
    
    return '0.00'  # Default return with no currency assumption

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
        price = clean_price(price_wrapper.get_text(strip=True))

        parts.append({'Component': component, 'Name': name, 'Price': price})

    return parts

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fetch_parts', methods=['POST'])
def fetch_parts():
    url = request.form['url']
    
    # Check if the URL looks valid (basic regex for URL format)
    if not re.match(r'https?://(?:www\.)?pcpartpicker\.com/list/\w+', url):
        return jsonify({'success': False, 'message': 'Invalid URL. Please enter a valid PCPartPicker list URL.'}), 400
    
    parts = fetch_pcpartpicker_list(url)
    
    if parts:
        return jsonify({'success': True, 'data': parts})
    else:
        return jsonify({'success': False, 'message': 'Failed to fetch parts or no parts found'}), 400

@app.route('/download_csv', methods=['POST'])
def download_csv():
    data = request.json.get('data', [])
    filename = request.json.get('filename', 'parts_list')
    
    if not data:
        return "No data provided", 400
        
    df = pd.DataFrame(data)
    output = io.BytesIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return send_file(output, as_attachment=True, download_name=f"{filename}.csv", mimetype='text/csv')

if __name__ == '__main__':
    app.run(debug=True)