from tqdm import tqdm
import time
from colorama import Fore, Style, init

# Initialize colorama
init(autoreset=True)


def load_with_tqdm(total_steps):
    # Customize the bar format to display only the bar and percentage
    bar_format = f'{Fore.GREEN}{{l_bar}}{{bar}}{Style.RESET_ALL}| {{percentage:.2f}}%'

    for _ in tqdm(range(total_steps), desc=f'{Fore.CYAN}Loading{Style.RESET_ALL}',
                  ncols=100, ascii=True, bar_format=bar_format):
        time.sleep(0.1)  # Simulate some work being done


# Example usage
load_with_tqdm(100)
