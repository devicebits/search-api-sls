# Check docker is installed
check-docker-installed:
	@command -v docker >/dev/null 2>&1 || { echo >&2 "Docker is not installed. Please install Docker to proceed."; exit 1; }

# Check docker is running
check-docker-running:
	@docker info >/dev/null 2>&1 || { echo >&2 "Docker is not running. Please start Docker to proceed."; exit 1; }

# Combined check for Docker installation and running status
check-docker: check-docker-installed check-docker-running

# Build the Docker image
docker-build:
	docker build -t search-api-sls .

# Run the Docker container
docker-run:
	docker rm -f search-api-sls || true
	docker run --rm --env-file .env -p 3000:3000 --name search-api-sls search-api-sls

# Show Dockerfile CMD commands (extracts CMD lines from Dockerfile)
dockerfile-cmd-commands:
	@grep '^CMD ' Dockerfile || echo "No CMD commands found in Dockerfile."

# List Docker images
docker-list-images:
	docker images

# List Docker containers
docker-list-containers:
	docker ps -a

# Remove Docker image
docker-remove-image:
	docker rmi search-api-sls || echo "Image not found or could not be removed."

# Docker Compose commands
compose-up:
	docker compose up

compose-down:
	docker compose down

compose-build:
	docker compose build

compose-ps:
	docker compose ps

compose-logs:
	docker compose logs

compose-restart:
	docker compose restart

compose-stop:
	docker compose stop

.PHONY: check-docker-installed check-docker-running docker-build docker-run dockerfile-cmd-commands docker-list-images docker-list-containers docker-remove-image compose-up compose-down compose-build compose-ps compose-logs compose-restart compose-stop