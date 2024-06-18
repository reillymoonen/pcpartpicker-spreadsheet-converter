import pandas as pd
import requests
from bs4 import BeautifulSoup


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
    df.to_csv(filename, index=False)
    print(f"PCPartPicker list has been saved to {filename}")


# URL of the PCPartPicker list
url = 'https://nz.pcpartpicker.com/list/HgdVpB'
# Fetch the parts list
parts = fetch_pcpartpicker_list(url)
# Save the parts list to a CSV file
save_to_csv(parts, 'pcpartpicker_list.csv')
