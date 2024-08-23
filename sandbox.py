import customtkinter as ctk
import pandas as pd
from tkinter import messagebox

ctk.set_appearance_mode("dark")  # Modes: system (default), light, dark
ctk.set_default_color_theme("blue")  # Themes: blue (default), dark-blue, green


class CSVViewer(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("CSV File Viewer")
        self.geometry("800x600")

        # Prevent resizing of the window
        self.resizable(False, False)

        # Assuming 'list.csv' is in the same directory as this script
        self.csv_file_path = 'temp/list.csv'

        self.display_frame = ctk.CTkScrollableFrame(self)
        self.display_frame.pack(fill="both", expand=True, padx=10, pady=10)

        self.load_csv()

    def load_csv(self):
        try:
            df = pd.read_csv(self.csv_file_path)
            self.display_csv(df)
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load CSV file: {e}")

    def display_csv(self, df):
        for widget in self.display_frame.winfo_children():
            widget.destroy()

        # Iterate through each row in the DataFrame
        for index, row in df.iterrows():
            # Create a separate block for each item in the row
            for col, value in row.items():
                block = ctk.CTkFrame(self.display_frame)
                block.pack(fill="x", pady=5)

                label = ctk.CTkLabel(block, text=f"{col}: {value}")
                label.pack(anchor="w")


if __name__ == "__main__":
    app = CSVViewer()
    app.mainloop()