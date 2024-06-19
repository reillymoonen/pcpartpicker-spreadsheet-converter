# implemented from https://www.geeksforgeeks.org/progress-bars-in-python/ and the tqdm GitHub documentation
from tqdm import tqdm
import time
from colorama import Fore, Style, init

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
