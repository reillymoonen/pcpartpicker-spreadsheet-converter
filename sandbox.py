import csv

def test_save_to_csv():
    parts = [{'Component': 'CPU', 'Name': 'Intel Core i9', 'Price': '$500'}]
    filename = "test_parts"
    csv_path = f"{filename}.csv"
    
    try:
        with open(csv_path, mode='w', newline='') as file:
            fieldnames = ['Component', 'Name', 'Price']
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            writer.writeheader()
            for part in parts:
                writer.writerow(part)
        print("CSV saved successfully at:", csv_path)
    except Exception as e:
        print("Error saving CSV:", e)

test_save_to_csv()