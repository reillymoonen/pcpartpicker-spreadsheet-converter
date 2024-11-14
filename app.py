from flask import Flask, render_template, request, send_file
import pandas as pd
import requests
from bs4 import BeautifulSoup
import time
from tqdm import tqdm
from colorama import Fore, init
import io

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
        price = price_wrapper.get_text(strip=True).replace('Price', '').strip()

        parts.append({'Component': component, 'Name': name, 'Price': price})

    return parts

# Convert parts list to CSV and send it as a response
def save_to_csv(parts):
    if not parts:
        return None

    df = pd.DataFrame(parts)
    # Save to a BytesIO stream for returning as a downloadable file
    output = io.BytesIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return output

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
    
    csv_output = save_to_csv(parts)
    
    if csv_output:
        return send_file(csv_output, as_attachment=True, download_name=f"{filename}.csv", mimetype='text/csv')
    else:
        return "Failed to fetch parts or no parts found", 400

if __name__ == '__main__':
    app.run(debug=True)
