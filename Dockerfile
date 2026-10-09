FROM python:3.10-slim
WORKDIR /app

# Copy your requirements and install them
COPY ml_pipeline/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your ML code and models
COPY ml_pipeline /app/ml_pipeline
WORKDIR /app/ml_pipeline

# Hugging Face requires applications to run on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]