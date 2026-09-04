# Two stages: build the React app with node, serve everything from Python.
# One container, one port, no CORS — the UI calls /api on its own origin.

FROM node:20-alpine AS ui
WORKDIR /ui
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY data/ ./data/
COPY backend/ ./backend/
COPY --from=ui /ui/dist ./backend/static

WORKDIR /app/backend

# Railway injects PORT. 8080 is the local default.
EXPOSE 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
