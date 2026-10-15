# Backend image for Render (also usable locally). Build context is the repo root:
#   docker build -f backend/Dockerfile -t casecompass-api .
FROM python:3.12-slim
WORKDIR /srv
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/app backend/app
# Runtime caches (query embeddings, usage ledger) live on the container's disk and are
# disposable: the free tier wipes them on every restart.
RUN mkdir -p data/cache
ENV PYTHONPATH=/srv/backend

# Render injects $PORT; secrets come from the dashboard environment, never from the image.
CMD ["sh", "-c", "uvicorn app.api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
