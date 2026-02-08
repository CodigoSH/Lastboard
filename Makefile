.PHONY: all build run clean

APP_NAME := lastboard
CMD_PATH := ./cmd/dashboard/main.go
BUILD_DIR := ./bin

all: build

frontend:
	@echo "Building frontend..."
	@bun run build

build: frontend
	@echo "Building $(APP_NAME)..."
	@mkdir -p $(BUILD_DIR)
	@go build -o $(BUILD_DIR)/$(APP_NAME) $(CMD_PATH)

run:
	@echo "Running $(APP_NAME)..."
	@go run $(CMD_PATH)

clean:
	@echo "Cleaning up..."
	@rm -rf $(BUILD_DIR)
