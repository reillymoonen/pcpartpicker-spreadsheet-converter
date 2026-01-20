# PCPARTPICKER spreadsheet converter

This project is a web application built with **Flask** and various dependencies to provide specific functionality. Below you will find instructions on how to run the project, its dependencies, and how to use the individual files.

## Download the Latest Release

You can download the latest release of the project from the following link:

**[Download Latest Release](https://github.com/reillymoonen/pcpartpicker-spreadsheet-converter/releases/latest)**

This release includes the latest features and bug fixes. Once downloaded, extract the files and follow the setup instructions below.

## Prerequisites

Before running the app, make sure you have the following dependencies installed:

- **Flask**: A web framework for Python.
- **Pandas**: A library for data manipulation.
- **Requests**: A simple HTTP library for Python.
- **BeautifulSoup**: A library for web scraping.
- **TQDM**: A progress bar library.
- **Colorama**: A library to print colored terminal text.

### Install Dependencies

You can install all required dependencies by running the `requirements.txt` file with the following command:

**Install Dependencies**:
```bash
pip install -r requirements.txt
 ```

## Running the Web Application

### 1. Run `app.py`

To run the web application, execute the `app.py` file. This file sets up a Flask web server and provides the main functionality of the application.

**Run the server**:
```bash
python app.py
```
### 2. Accessing the Web Application

Once the server is running, you can access the web application by opening a web browser and navigating to one of the following addresses:

- `http://localhost:5000`
- `http://127.0.0.1:5000`

This will open the web app in your browser.

## Running the 00 Files Separately

The files starting with `00` can be run separately from the command line. These files are independent and can be executed for specific tasks, which may not require the web app.

### Running any of the `00` files

1. Open your terminal or command prompt.
2. Navigate to the directory containing the file you want to run.
3. Execute the desired file using Python.

### Details of Each Dependency used

- **Flask**: A micro web framework for Python, used to handle web requests and route them to specific functions.
- **pandas**: A powerful data manipulation and analysis library, used for reading and processing CSV files or other data structures.
- **requests**: A library for making HTTP requests to external services or APIs.
- **BeautifulSoup**: A web scraping library, used to parse HTML and extract information from web pages.
- **tqdm**: A library for displaying progress bars in the terminal, useful for long-running tasks.
- **colorama**: A library to add color to text printed in the terminal, making logs and outputs more readable.


### Copyright 2026 Reilly Moonen
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

**http://www.apache.org/licenses/LICENSE-2.0**

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
