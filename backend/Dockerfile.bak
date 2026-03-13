FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway assigns PORT dynamically
ENV PORT=8000
EXPOSE ${PORT}

# Start server — exec form with sh -c avoids CRLF issues
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
