# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Build static files
RUN python manage.py collectstatic --noinput

# Automate reset, migrations, and start gunicorn
CMD sh -c "python manage.py migrate && python scripts/reset_db.py || true && python manage.py createsuperuser --noinput || true && gunicorn vspp.wsgi:application --bind 0.0.0.0:8000"
