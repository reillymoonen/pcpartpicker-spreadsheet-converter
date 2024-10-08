import pandas as pd
import requests
import time
import os
from bs4 import BeautifulSoup
from tqdm import tqdm
from colorama import Fore, init

# Initialize colorama
init(autoreset=True)


# functions go here

# yes_no_checker from the tutorial
def yes_no(question):
    while True:
        response = input(question).lower()
        if response in ["yes", "y"]:
            return "yes"
        elif response in ["no", "n"]:
            return "no"
        else:
            print("Please enter yes or no")


# Loading bar
def load_with_tqdm(total_steps):
    bar_format = '{desc}: {percentage:.2f}%|{bar}|'
    with tqdm(total=total_steps, desc=f'{Fore.LIGHTWHITE_EX}Loading{Fore.LIGHTWHITE_EX}', ncols=100,
              bar_format=bar_format, ascii="*#") as pbar:
        for _ in range(total_steps):
            time.sleep(0.01)
            pbar.update(1)


# Uses tqdm to get the components from the website
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


# saves the data from the website to a csv file
def save_to_csv(data, filename):
    if isinstance(data, pd.DataFrame):
        df = data
    elif isinstance(data, list):
        df = pd.DataFrame(data)
    else:
        print("Invalid data format. Cannot save to CSV.")
        return

    if df.empty:
        print("No data to save. Exiting without creating CSV.")
        return

    df.to_csv(f"{filename}.csv", index=False)
    print(f"PCPartPicker list has been saved to {filename}.csv")


# Asks the user for the pcpartpicker url
def ask_user_for_url():
    while True:
        response = input("Please enter a PCPartPicker URL: ")
        items = ['pcpartpicker.com', 'user', 'saved']
        alt_items = ['pcpartpicker.com', 'list']
        if all(item in response for item in items) or all(item in response for item in alt_items):
            return response
        else:
            print("Please enter a valid PCPartPicker URL")


# Asks the user for what they want the filename to be
def ask_user_for_filename():
    while True:
        response = input("Please enter a filename (without .csv extension): ")
        if response.endswith('.csv'):
            print("Please enter a filename without .csv extension")
        elif os.path.exists(f"{response}.csv"):
            print(f"A file named '{response}.csv' already exists. Please choose a different name.")
        else:
            return response


# Lets the user choose specific lines
def display_specific_lines(df):
    while True:
        line_input = input("Enter line numbers to display (comma-separated, or 'all' for all lines): ")
        if line_input.lower() == 'all':
            print(df)
            return df
        else:
            try:
                lines = [int(x.strip()) for x in line_input.split(',')]
                invalid_lines = [str(line) for line in lines if line < 1 or line > len(df)]
                if invalid_lines:
                    raise ValueError(f"Invalid line number(s): {', '.join(invalid_lines)}")

                selected_df = df.iloc[[line - 1 for line in lines]].reset_index(drop=True)
                print(selected_df)
                return selected_df
            except ValueError as e:
                if "invalid literal for int()" in str(e):
                    print("Error: Please enter only numbers separated by commas.")
                else:
                    print(f"Error: {e}")
                print(f"Please enter valid line numbers between 1 and {len(df)}.")


# main loop

# implemented from https://www.geeksforgeeks.org/progress-bars-in-python/ and the tqdm GitHub documentation
if __name__ == "__main__":
    load_with_tqdm(50)

    want_instructions = yes_no("Do you want to read the instructions? ")
    if want_instructions == "yes":
        print("""
    ==============================================
    WELCOME TO THE PCPARTPICKER SPREADSHEET CONVERTER
    ==============================================

    This tool helps you fetch and save the components of a PC build list from a PCPartPicker URL. Follow the steps below to use the tool:

    ──────────────────────────────────────────────
    Step 1: Start the Program
    ──────────────────────────────────────────────
    Run the program, and you will see a loading animation. This is just a visual indication that the tool is starting up.

    ──────────────────────────────────────────────
    Step 2: Read the Instructions (Optional)
    ──────────────────────────────────────────────
    The program will ask if you want to read the instructions. If you are familiar with the tool, you can skip this step by entering "no." Otherwise, enter "yes" to review the instructions.

    ──────────────────────────────────────────────
    Step 3: Enter a PCPartPicker URL
    ──────────────────────────────────────────────
    You will be prompted to enter a valid PCPartPicker URL. Ensure that the URL includes "pcpartpicker.com," "user," and "saved," or "pcpartpicker.com" and "list."

    Example URL formats:
    • https://pcpartpicker.com/user/username/saved/
    • https://pcpartpicker.com/list/

    ──────────────────────────────────────────────
    Step 4: Fetching Components
    ──────────────────────────────────────────────
    After entering the URL, the program will fetch the components of your PC build list from the website. You will see another loading animation during this process.

    ──────────────────────────────────────────────
    Step 5: Include GST (Optional)
    ──────────────────────────────────────────────
    The program will ask if you want to include GST (Goods and Services Tax) in the prices. If you choose "no," the prices will be adjusted to exclude GST.

    ──────────────────────────────────────────────
    Step 6: View the Data
    ──────────────────────────────────────────────
    The program will display the fetched components in a table format. This includes the component type, name, and price.

    ──────────────────────────────────────────────
    Step 7: Select Specific Lines (Optional)
    ──────────────────────────────────────────────
    You have the option to display specific lines from the table. If you enter "yes," you can specify the line numbers you want to see, separated by commas. If you want to see all lines, simply enter "all."

    Example input for specific lines: 1, 3, 5  
    Example input for all lines: all

    ──────────────────────────────────────────────
    Step 8: Save Data to CSV (Optional)
    ──────────────────────────────────────────────
    If you would like to save the displayed data to a CSV file, enter "yes" when prompted. You will then be asked to provide a filename (without the .csv extension).

    Ensure that the filename you choose doesn't already exist in the directory. If it does, the program will ask you to choose a different name.

    ──────────────────────────────────────────────
    Step 9: Convert Another Link (Optional)
    ──────────────────────────────────────────────
    After saving the data, you will be asked if you want to convert another PCPartPicker URL. If you do, enter "yes" and repeat the process. If not, enter "no" to exit the program.

    ──────────────────────────────────────────────
    Final Step: Exit
    ──────────────────────────────────────────────
    Once you're done, the program will thank you for using the tool and exit automatically.

    ==============================================
    """)

    while True:
        url = ask_user_for_url()

        # Display a loading animation
        load_with_tqdm(70)

        parts = fetch_pcpartpicker_list(url)

        if parts:
            ask_gst = yes_no("Do you want to include GST (Goods and Services Tax, generly you would want to include this)? ")

            # Formats the price and removes GST if the user wants
            total_price = 0
            for part in parts:
                if part['Price'] is not None:
                    price_value = float(part['Price'][1:])
                    if ask_gst == "no":
                        price_value = round(price_value / 1.15, 2)
                    part['Price'] = f"${price_value:.2f}"
                    total_price += price_value

            # Create a pandas DataFrame from the parts list
            df = pd.DataFrame(parts)
            print("\nInitial Data:\n")
            print(df)
            print()

            # Ask if the user wants to select specific lines
            ask_select = yes_no("Do you want to select specific lines? ")
            if ask_select == "yes":
                selected_df = display_specific_lines(df)
            else:
                selected_df = df

            # Ask if the user wants to save the data to a CSV file
            ask_to_save = yes_no("Would you like to save this to a CSV file (spreadsheet)?")
            if ask_to_save == "yes":
                save_to_csv(selected_df, ask_user_for_filename())

        # Ask if the user wants to convert another link
        replay = yes_no("Do you want to convert another link? ")
        if replay == "no":
            break

    print("Thank you for using the PCPartPicker Spreadsheet Converter!")