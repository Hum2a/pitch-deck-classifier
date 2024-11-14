# Backend stage
FROM python:3.9 AS backend
WORKDIR /app

# Copy backend requirements and install dependencies
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy backend application code
COPY backend/ .

# Frontend build stage
FROM node:14 AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json .
RUN npm install
COPY frontend/ .
RUN npm run build

# Final stage to combine frontend and backend
FROM backend AS final
WORKDIR /app

# Copy the built frontend files to the backend static files directory
COPY --from=frontend-build /frontend/build /app/static

# Expose the backend port
EXPOSE 5000

# Run the backend application
CMD ["python", "app.py"]
