# Smart-HR: Local Docker Setup

This guide explains how to run the Smart-HR application locally using Docker and Docker Compose. This is the recommended approach for local development and testing.

## Prerequisites
- Docker
- Docker Compose (v2)

## Services Overview
Our `docker-compose.local.yml` spins up the following services:
- **django**: The main Django API running on `localhost:8000`.
- **postgres**: The PostgreSQL database.
- **redis**: The Redis instance used for caching and Celery.
- **celeryworker**: The Celery worker to process asynchronous tasks (like emails and churn prediction).
- **celerybeat**: The Celery beat scheduler for periodic tasks.
- **frontend**: The Vite dev server for the React app running on `localhost:5173`.

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Zoubeir23/Smart-HR.git
   cd Smart-HR
   ```

2. **Environment Variables**:
   Create a `.envs/.local/` directory inside `Backend/` and configure the necessary `.django` and `.postgres` files. For local development, you can use dummy values.
   ```bash
   mkdir -p Backend/.envs/.local
   # Create .django
   echo "DJANGO_SETTINGS_MODULE=config.settings.local" > Backend/.envs/.local/.django
   echo "DJANGO_SECRET_KEY=local_insecure_key" >> Backend/.envs/.local/.django
   # Create .postgres
   echo "POSTGRES_HOST=postgres" > Backend/.envs/.local/.postgres
   echo "POSTGRES_DB=smart_hr" >> Backend/.envs/.local/.postgres
   echo "POSTGRES_USER=smart_hr_user" >> Backend/.envs/.local/.postgres
   echo "POSTGRES_PASSWORD=smart_hr_pass" >> Backend/.envs/.local/.postgres
   ```

3. **Build the Stack**:
   Navigate to the Backend directory where the compose file is located, then build the images.
   ```bash
   cd Backend
   docker compose -f docker-compose.local.yml build
   ```

4. **Run the Database Migrations**:
   Before starting the server, apply the Django migrations.
   ```bash
   docker compose -f docker-compose.local.yml run --rm django python manage.py migrate
   ```

5. **Start the Application**:
   Bring up all services in detached mode.
   ```bash
   docker compose -f docker-compose.local.yml up -d
   ```

6. **Seed the Database (Optional but Recommended)**:
   Populate the database with demo users, employees, and dummy data for testing.
   ```bash
   docker compose -f docker-compose.local.yml run --rm django python manage.py seed_demo_data
   ```

## Accessing the Apps
- **Frontend App**: `http://localhost:5173`
- **Django Admin**: `http://localhost:8000/admin`
- **Swagger API Docs**: `http://localhost:8000/api/schema/swagger-ui/`

## Stopping the Environment
Ensure you are in the `Backend/` directory when running these commands.

To stop the containers without removing your database data:
```bash
docker compose -f docker-compose.local.yml stop
```

To tear down the containers and wipe the database:
```bash
docker compose -f docker-compose.local.yml down -v
```
