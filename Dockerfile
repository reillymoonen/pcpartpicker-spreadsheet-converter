# Use official Python runtime as base image
FROM python:3.11-slim

# Set working directory in container
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Expose port 5000 (Flask default)
EXPOSE 5000

# Command to run the Flask application
# Use --host=0.0.0.0 to make Flask accessible from outside the container
CMD ["python", "-c", "from app import app; app.run(host='0.0.0.0', port=5000)"]