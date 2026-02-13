.PHONY: all build run clean test test-verbose test-coverage test-quick benchmark help

APP_NAME := lastboard
CMD_PATH := ./cmd/dashboard/main.go
BUILD_DIR := ./bin

all: build

help:
	@echo "Lastboard - Available Commands"
	@echo "=============================="
	@echo "  make build           - Build frontend + backend"
	@echo "  make test            - Run all tests"
	@echo "  make test-verbose    - Run tests with verbose output"
	@echo "  make test-coverage   - Generate coverage report"
	@echo "  make test-quick      - Run quick tests only"
	@echo "  make benchmark       - Run benchmark tests"
	@echo "  make run             - Run the application"
	@echo "  make clean           - Clean build artifacts"

frontend:
	@echo "Building frontend..."
	@bun run build

build: frontend
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME) $(CMD_PATH)

test:
	@echo "Running tests..."
	@go test ./internal/... -cover

test-verbose:
	@echo "Running tests (verbose)..."
	@go test ./internal/... -v -cover

test-coverage:
	@echo "Generating coverage report..."
	@mkdir -p coverage
	@go test ./internal/... -coverprofile=coverage/coverage.out
	@go tool cover -html=coverage/coverage.out -o coverage/coverage.html
	@echo "✓ Coverage report: coverage/coverage.html"
	@go tool cover -func=coverage/coverage.out | grep total

test-quick:
	@echo "Running quick tests..."
	@go test ./internal/... -short

benchmark:
	@echo "Running benchmarks..."
	@go test ./internal/... -bench=. -benchmem

run:
	@echo "Running $(APP_NAME)..."
	@go run $(CMD_PATH)

clean:
	@echo "Cleaning up..."
	@rm -rf $(BUILD_DIR)
	@rm -rf coverage/*.out coverage/*.html
	@rm -rf web/dist

# --- Docker ---
docker:
	@echo "Building Docker image..."
	@docker build -t lastboard:local .

# --- Release Shortcuts ---
release-beta:
	@./scripts/release.sh beta

release-rc:
	@./scripts/release.sh rc

release-stable:
	@./scripts/release.sh stable

# --- Dev ---
dev:
	@if command -v air > /dev/null; then \
	    air; \
	else \
	    read -p "Go 'air' is not installed. Run 'go install github.com/air-verse/air@latest' (y/N)? " choice; \
	    if [ "$$choice" = "y" ] || [ "$$choice" = "Y" ]; then \
	        go install github.com/air-verse/air@latest; \
	        air; \
	    else \
	        echo "Please install air manually or use 'make run'"; \
	        exit 1; \
	    fi; \
	fi
