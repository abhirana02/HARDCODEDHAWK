# Use an official lightweight Python image as base
FROM python:3.12-slim

# Prevent Python from buffering outputs
ENV PYTHONUNBUFFERED=1

# Install system dependencies, Git, and Trivy
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    wget \
    apt-transport-https \
    gnupg \
    ca-certificates \
    && wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor -o /etc/apt/keyrings/trivy.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" | tee /etc/apt/sources.list.d/trivy.list \
    && apt-get update && apt-get install -y --no-install-recommends trivy \
    && rm -rf /var/lib/apt/lists/*

# Install Semgrep via pip
RUN pip install --no-cache-dir semgrep

# Set working directory
WORKDIR /app

# Copy Python dependencies and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Expose Flask default port
EXPOSE 5000

# Start Flask backend with Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "backend.app:app"]
