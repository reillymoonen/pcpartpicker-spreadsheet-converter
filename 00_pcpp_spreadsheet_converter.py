import pandas as pd
import requests
import time
from bs4 import BeautifulSoup
from tqdm import tqdm
from colorama import Fore, init

# implemented from https://www.geeksforgeeks.org/progress-bars-in-python/ and the tqdm GitHub documentation
# Initialize colorama
init(autoreset=True)


def load_with_tqdm(total_steps):
    # Customize the bar format to integrate the percentage with the progress bar
    bar_format = '{desc}: {percentage:.2f}%|{bar}|'

    with tqdm(total=total_steps, desc=f'{Fore.LIGHTWHITE_EX}Loading{Fore.LIGHTWHITE_EX}', ncols=100,
              bar_format=bar_format) as pbar:
        for _ in range(total_steps):
            time.sleep(0.01)  # Simulate some work being done
            pbar.update(1)


# Example usage
load_with_tqdm(100)


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
        name_wrapper = part.select_one('.td__component a')
        price_wrapper = part.select_one('.td__price')

        if not name_wrapper:
            print("Name wrapper not found for a part. Skipping...")
            continue

        if not price_wrapper:
            print("Price wrapper not found for a part. Skipping...")
            continue

        name = name_wrapper.get_text(strip=True)
        price = price_wrapper.get_text(strip=True).replace('Price', '').strip()

        # Append to the parts list
        parts.append({'Name': name, 'Price': price})

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
        if all(item in response for item in items):
            return response
        else:
            print("Please enter a valid pcpartpicker URL")


def ask_user_for_filename():
    return input("Please enter a filename (without .csv extension): ")


# Fetch the parts list
parts = fetch_pcpartpicker_list(ask_user_for_url())
# Save the parts list to a CSV file
save_to_csv(parts, ask_user_for_filename())
