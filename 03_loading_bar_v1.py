# implemented from https://www.geeksforgeeks.org/progress-bars-in-python/ and the tqdm GitHub documentation
from tqdm import tqdm
import time


def load_with_tqdm(total_steps):
    # Customize the bar format to display only the bar and percentage
    bar_format = '{l_bar}{bar}| {percentage:.2f}%'
    for _ in tqdm(range(total_steps), desc='Loading', ncols=100, ascii=False, bar_format=bar_format):
        time.sleep(0.01)  # Simulate some work being done


# Example usage
load_with_tqdm(100)
