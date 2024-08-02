import pandas as pd
import requests
import time
import os
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
    bar_format = '{desc}: {percentage:.2f}%|{bar}|'
    with tqdm(total=total_steps, desc=f'{Fore.LIGHTWHITE_EX}Loading{Fore.LIGHTWHITE_EX}', ncols=100,
              bar_format=bar_format, ascii="*#") as pbar:
        for _ in range(total_steps):
            time.sleep(0.01)
            pbar.update(1)


def fetch_pcpartpicker_list(url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) '
                      'Chrome/91.0.4472.124 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')
        parts = []
        product_rows = soup.select('.tr__product')

        if not product_rows:
            print("No product rows found. Check the HTML structure or URL.")
            return None

        for part in product_rows:
            component_wrapper = part.select_one('.td__component')
            name_wrapper = part.select_one('.td__name')
            price_wrapper = part.select_one('.td__price')

            if not component_wrapper or not name_wrapper or not price_wrapper:
                continue

            component = component_wrapper.get_text(strip=True)
            name = name_wrapper.get_text(strip=True)
            price = price_wrapper.get_text(strip=True).replace('Price', '').strip()

            try:
                cleaned_price = ''.join(c for c in price if c.isdigit() or c == '.')
                price = f'${float(cleaned_price):.2f}' if cleaned_price else None
            except ValueError:
                price = None

            parts.append({'Component': component, 'Name': name, 'Price': price})

        return parts
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print("An error occurred and the page was not found: Error 404: Is there a typo? Please try again:")
        else:
            print(f"An error occurred while fetching the page: {type(e).__name__} please try again:")
        return None
    except requests.exceptions.RequestException as e:
        print(f"An error occurred while fetching the page: {type(e).__name__} please try again:")
        return None


def save_to_csv(parts, filename):
    if not parts:
        print("No parts to save. Exiting without creating CSV.")
        return
    df = pd.DataFrame(parts)
    df.to_csv(f"{filename}.csv", index=False)
    print(f"PCPartPicker list has been saved to {filename}.csv")


def ask_user_for_url():
    while True:
        response = input("Please enter a PCPartPicker URL: ")
        items = ['pcpartpicker.com', 'user', 'saved']
        alt_items = ['pcpartpicker.com', 'list']
        if all(item in response for item in items) or all(item in response for item in alt_items):
            return response
        else:
            print("Please enter a valid PCPartPicker URL")


def ask_user_for_filename():
    while True:
        response = input("Please enter a filename (without .csv extension): ")
        if response.endswith('.csv'):
            print("Please enter a filename without .csv extension")
        elif os.path.exists(f"{response}.csv"):
            print(f"A file named '{response}.csv' already exists. Please choose a different name.")
        else:
            return response


if __name__ == "__main__":
    load_with_tqdm(50)

    want_instructions = yes_no("Do you want to read the instructions? ")
    if want_instructions == "yes":
        print("Instructions go here")
    print()

    while True:
        url = ask_user_for_url()
        load_with_tqdm(70)
        parts = fetch_pcpartpicker_list(url)

        if parts:
            ask_gst = yes_no("Do you want to include GST? ")

            total_price = 0
            for part in parts:
                if part['Price'] is not None:
                    price_value = float(part['Price'][1:])
                    if ask_gst == "no":
                        price_value = round(price_value / 1.15, 2)
                    part['Price'] = f"${price_value:.2f}"
                    total_price += price_value

            parts.append({'Component': 'Total', 'Name': '', 'Price': f"${total_price:.2f}"})

            df = pd.DataFrame(parts)
            print("\nFinal Data:\n")
            print(df)
            print()

            ask_to_save = yes_no("Would you like to save this to a CSV file (spreadsheet)?")
            if ask_to_save == "yes":
                save_to_csv(parts, ask_user_for_filename())

        replay = yes_no("Do you want to convert another link? ")
        if replay == "no":
            break

print("Thank you for using the PCPartPicker Spreadsheet Converter!")