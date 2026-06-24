#!/bin/bash
# =============================================================================
# HALLO Projects — Ubuntu/Debian Setup Installer
# =============================================================================
set -e

# Setup formatting colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}       🚀 Welcome to the HALLO Projects Production Installer 🚀       ${NC}"
echo -e "${BLUE}======================================================================${NC}\n"

# 1. Prerequisite Checks
echo -e "${YELLOW}[1/6] Checking system prerequisites...${NC}"
command -v git >/dev/null 2>&1 || { echo -e "${RED}✘ git is required but not installed. Please install git first.${NC}" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo -e "${RED}✘ curl is required but not installed. Please install curl first.${NC}" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo -e "${RED}✘ docker is required but not installed. Please install Docker first.${NC}" >&2; exit 1; }

# Check docker-compose or docker compose
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD="docker-compose"
else
  echo -e "${RED}✘ docker compose is required but not installed. Please install Docker Compose v2 first.${NC}" >&2
  exit 1;
fi
echo -e "${GREEN}✓ All prerequisites met.${NC}\n"

# 2. Configuration Prompts
echo -e "${YELLOW}[2/6] Configuring installation variables...${NC}"
read -p "Enter your target DOMAIN (e.g. projects.yourdomain.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo -e "${RED}✘ Domain cannot be empty.${NC}"
  exit 1
fi

read -p "Enter initial ADMIN EMAIL [admin@hallo.local]: " ADMIN_EMAIL
ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@hallo.local"}

read -s -p "Enter initial ADMIN PASSWORD [admin123456]: " ADMIN_PASSWORD
echo ""
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"admin123456"}
echo -e "${GREEN}✓ Variables configured.${NC}\n"

# 3. Generating secrets
echo -e "${YELLOW}[3/6] Generating secure environment secrets...${NC}"
DB_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -base64 48)
ENCRYPTION_KEY=$(openssl rand -hex 32)
GITHUB_WEBHOOK_SECRET=$(openssl rand -hex 20)
echo -e "${GREEN}✓ Secure credentials generated.${NC}\n"

# 4. Creating Env File
echo -e "${YELLOW}[4/6] Creating production environment configurations...${NC}"
ENV_FILE=".env"
cat <<EOF > "$ENV_FILE"
# General
DOMAIN=$DOMAIN

# Database
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://hallo:$DB_PASSWORD@postgres:5432/hallo_projects

# Redis
REDIS_URL=redis://redis:6379

# API
PORT=4000
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=$ENCRYPTION_KEY
GITHUB_WEBHOOK_SECRET=$GITHUB_WEBHOOK_SECRET
LOG_LEVEL=info
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Web & Worker
NEXT_PUBLIC_API_URL=https://$DOMAIN/api
HEALTH_CHECK_INTERVAL=60
HEALTH_CHECK_TIMEOUT=10
DEPLOYMENT_POLL_INTERVAL=5
EOF
echo -e "${GREEN}✓ Environment configuration written to $ENV_FILE.${NC}\n"

# 5. Booting Container Stack
echo -e "${YELLOW}[5/6] Starting Docker container services...${NC}"
$DOCKER_COMPOSE_CMD -f docker/docker-compose.yml pull || echo -e "${YELLOW}Registry images not available yet. Building locally...${NC}"
$DOCKER_COMPOSE_CMD -f docker/docker-compose.yml up -d --build
echo -e "${GREEN}✓ Container services are starting up.${NC}\n"

# 6. Database Migrations and Seeding
echo -e "${YELLOW}[6/6] Applying database schema migrations and seeding templates...${NC}"
echo "Waiting for database to become healthy..."
until $DOCKER_COMPOSE_CMD -f docker/docker-compose.yml exec -T postgres pg_isready -U hallo -d hallo_projects >/dev/null 2>&1; do
  sleep 2
done

echo "Running migrations..."
$DOCKER_COMPOSE_CMD -f docker/docker-compose.yml exec -T api pnpm --filter @hallo/api exec prisma migrate deploy
echo "Seeding default data..."
$DOCKER_COMPOSE_CMD -f docker/docker-compose.yml exec -T api pnpm --filter @hallo/api run seed

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}        🎉 HALLO Projects has been successfully installed! 🎉        ${NC}"
echo -e "${GREEN}======================================================================${NC}\n"
echo -e "You can access your system at the following URLs:"
echo -e "  - ${BLUE}Main Application${NC} : http://$DOMAIN (or https://$DOMAIN if SSL is active)"
echo -e "  - ${BLUE}Documentation Page${NC}: http://docs.$DOMAIN (or https://docs.$DOMAIN)"
echo -e "\nInitial Admin Login Credentials:"
echo -e "  - ${BLUE}Email${NC}    : $ADMIN_EMAIL"
echo -e "  - ${BLUE}Password${NC} : $ADMIN_PASSWORD"
echo -e "\n${YELLOW}Please store these credentials in a safe place!${NC}"
echo -e "${BLUE}======================================================================${NC}"
