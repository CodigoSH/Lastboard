package main

import (
	"log"
	"net/http"
	"os"

	"github.com/codigosh/Kashboard/internal/platform/database"
	"github.com/codigosh/Kashboard/internal/web"
)

func main() {
	// 1. Initialize Database
	dbFile := os.Getenv("DB_FILE")
	if dbFile == "" {
		dbFile = "./dashboard.db"
	}
	db, err := database.InitDB(dbFile)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()
	log.Println("Database initialized at", dbFile)

	// 2. Initialize Server (Dependency Injection)
	srv := web.NewServer(db.DB)

	// 3. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on :%s", port)
	if err := http.ListenAndServe(":"+port, srv); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
