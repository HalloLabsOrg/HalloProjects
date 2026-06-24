#!/bin/bash
# =============================================================================
# HALLO Projects — Updater Script
# =============================================================================
set -e

# Setup formatting colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}           🚀 Updating HALLO Projects Workspace to Latest 🚀          ${NC}"
echo -e "${BLUE}======================================================================${NC}\n"

# Check docker-compose or docker compose
if docker compose version >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DOCKER_COMPOSE_CMD="docker-compose"
else
  echo -e "${RED}✘ docker compose is required but not installed.${NC}" >&2
  exit 1;
fi

# 1. Pull latest commits
echo -e "${YELLOW}[1/4] Pulling latest codebase commits...${NC}"
git pull origin main || echo -e "${YELLOW}Warning: Git pull failed or not in a git repo. Continuing...${NC}"
echo -e "${GREEN}✓ Codebase updated.${NC}\n"

# 2. Re-create / Re-build Docker images
echo -e "${YELLOW}[2/4] Pulling latest registry images or building locally...${NC}"
$DOCKER_COMPOSE_CMD -f docker/docker-compose.yml pull || echo -e "${YELLOW}Registry images not available yet. Rebuilding locally...${NC}"
$DOCKER_COMPOSE_CMD -f docker/docker-compose.yml up -d --build
echo -e "${GREEN}✓ Containers updated and restarted.${NC}\n"

# 3. Database migrations
echo -e "${YELLOW}[3/4] Running new database migrations...${NC}"
echo "Waiting for database to be ready..."
until $DOCKER_COMPOSE_CMD -f docker/docker-compose.yml exec -T postgres pg_isready -U hallo -d hallo_projects >/dev/null 2>&1; do
  sleep 2
done

$DOCKER_COMPOSE_CMD -f docker/docker-compose.yml exec -T api pnpm --filter @hallo/api exec prisma migrate deploy
echo -e "${GREEN}✓ Database schema is up-to-date.${NC}\n"

# 4. Re-seeding
echo -e "${YELLOW}[4/4] Seed templates and built-in configurations...${NC}"
$DOCKER_COMPOSE_CMD -f docker/docker-compose.yml exec -T api pnpm --filter @hallo/api run seed
echo -e "${GREEN}✓ Seeding complete.${NC}\n"

echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}        🎉 HALLO Projects has been successfully updated! 🎉         ${NC}"
echo -e "${GREEN}======================================================================${NC}\n"
