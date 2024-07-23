import pandas as pd
import requests
import time
from bs4 import BeautifulSoup
from tqdm import tqdm
from colorama import Fore, init

# Initialize colorama
init(autoreset=True)

def yes_no(question):
    while True:
        response = input(question).lower()
        if response in ["yes", "y"]:
            return "yes"
        elif response in ["no", "n"]:
            return "no"
        else:
            print("Please enter yes or no")

def load_with_tqdm(total_steps):
    # Customize the bar format to integrate the percentage with the progress bar
    bar_format = '{desc}: {percentage:.2f}%|{bar}|'
    with tqdm(total=total_steps, desc=f'{Fore.LIGHTWHITE_EX}Loading{Fore.LIGHTWHITE_EX}', ncols=100,
              bar_format=bar_format, ascii="*#") as pbar:
        for _ in range(total_steps):
            time.sleep(0.01)  # Simulate some work being done
            pbar.update(1)

def fetch_pcpartpicker_list(url):
    # Add headers to mimic a browser request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) '
                      'Chrome/91.0.4472.124 Safari/537.36'
    }
    # Send a GET request to the URL
    response = requests.get(url, headers=headers)
    # Check if the request was successful
    if response.status_code != 200:
        print(f"Failed to fetch the page. Status code: {response.status_code}")
        return []
    # Parse the HTML content
    soup = BeautifulSoup(response.text, 'html.parser')
    # List to store parts information
    parts = []
    # Find the table rows in the parts list
    product_rows = soup.select('.tr__product')
    if not product_rows:
        print("No product rows found. Check the HTML structure or URL.")
        return parts
    for part in product_rows:
        # Extract the part name and price
        component_wrapper = part.select_one('.td__component')
        name_wrapper = part.select_one('.td__name')
        price_wrapper = part.select_one('.td__price')
        if not component_wrapper or not name_wrapper or not price_wrapper:
            print("Missing wrapper for a part. Skipping...")
            continue
        component = component_wrapper.get_text(strip=True)
        name = name_wrapper.get_text(strip=True)
        price = price_wrapper.get_text(strip=True).replace('Price', '').strip()
        if price.startswith('$'):
            try:
                price = float(price[1:].replace(',', ''))
            except ValueError:
                price = None
        else:
            price = None
        parts.append({'Component': component, 'Name': name, 'Price': price})
    return parts

def save_to_csv(parts, filename):
    if not parts:
        print("No parts to save. Exiting without creating CSV.")
        return
    # Create a DataFrame from the list of parts
    df = pd.DataFrame(parts)
    # Save the DataFrame to a CSV file
    df.to_csv(f"{filename}.csv", index=False)
    print(f"PCPartPicker list has been saved to {filename}.csv")

def ask_user_for_url():
    while True:
        response = input("Please enter a URL: ")
        items = ['pcpartpicker.com', 'user', 'saved']
        alt_items = ['pcpartpicker.com', 'list']
        # Check if response contains all items from either items or alt_items
        if all(item in response for item in items) or all(item in response for item in alt_items):
            return response
        else:
            print("Please enter a valid pcpartpicker URL")

def ask_user_for_filename():
    while True:
        response = input("Please enter a filename (without .csv extension): ")
        if response.endswith('.csv'):
            print("Please enter a filename without .csv extension")
        else:
            return response

# Main loop
# Initial loading bar
load_with_tqdm(50)

while True:
    want_instructions = yes_no("Do you want to read the instructions? ")
    if want_instructions == "yes":
        print("Instructions go here")
    print()

    parts = fetch_pcpartpicker_list(ask_user_for_url())
    load_with_tqdm(70)  # Show loading bar while fetching parts

    ask_gst = yes_no("Do you want to include GST? ")

    if ask_gst == "no":
        # Divide the price by 1.15 for all parts
        for part in parts:
            if part['Price'] is not None:
                part['Price'] = round(part['Price'] / 1.15, 2)

    # Save the parts list to a CSV file
    save_to_csv(parts, ask_user_for_filename())
    break
