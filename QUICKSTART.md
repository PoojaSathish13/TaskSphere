# TaskSphere Quick Start

Get the full TaskSphere stack (Django + Next.js + Postgres + Redis + Celery) running locally in minutes.

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| [Docker](https://docs.docker.com/get-docker/) | 24+ |
| [Docker Compose](https://docs.docker.com/compose/install/) | v2.20+ |

---

## One-command startup

```bash
# 1. Copy the environment template
cp .env.example backend/.env

# 2. Build images and start all services
docker-compose up --build
```

Then visit **http://localhost:3000** 🚀

---

## Services & Ports

| Service | URL / Port | Description |
|---------|-----------|-------------|
| **frontend** | http://localhost:3000 | Next.js 16 dev server |
| **backend** | http://localhost:8000 | Django / Daphne ASGI |
| **db** | localhost:5432 | PostgreSQL 15 |
| **redis** | localhost:6379 | Redis 7 |
| **celery** | — | Async task worker |
| **celery-beat** | — | Periodic task scheduler |

---

## Useful Commands

```bash
# Run in detached (background) mode
docker-compose up --build -d

# View logs for a specific service
docker-compose logs -f backend
docker-compose logs -f celery

# Run Django management commands
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py collectstatic

# Open a Django shell
docker-compose exec backend python manage.py shell

# Open a Postgres shell
docker-compose exec db psql -U postgres -d tasksphere_db

# Stop all services
docker-compose down

# Stop and remove volumes (⚠️  destroys DB data)
docker-compose down -v
```

---

## Environment Variables

All environment variables are documented in [`.env.example`](.env.example).  
Copy it to `backend/.env` and edit values as needed before starting the stack.

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `True` | Django debug mode |
| `SECRET_KEY` | *(change me)* | Django secret key |
| `DATABASE_URL` | `postgres://postgres:postgres@db:5432/tasksphere_db` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379/0` | Redis connection string |
| `CELERY_BROKER_URL` | `redis://redis:6379/0` | Celery broker |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/0` | Celery result backend |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | API base URL exposed to the browser |

---

## Health Checks

Docker Compose waits for each service to be healthy before starting its dependants:

- **db** → `pg_isready` every 10 s
- **redis** → `redis-cli ping` every 10 s
- **backend** → `GET /api/v1/auth/token/` every 30 s

---

## Troubleshooting

**Port already in use?**
```bash
# Find the process using port 8000
netstat -ano | findstr :8000      # Windows
lsof -i :8000                     # macOS / Linux
```

**Database migration errors?**
```bash
docker-compose exec backend python manage.py migrate --run-syncdb
```

**Dependency / npm errors?**
```bash
docker-compose exec frontend npm install --legacy-peer-deps
```
