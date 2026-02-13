package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/CodigoSH/Lastboard/internal/platform/database"
	"github.com/CodigoSH/Lastboard/internal/version"
	"github.com/CodigoSH/Lastboard/internal/web"
)

func main() {
	// Parse flags
	versionFlag := flag.Bool("version", false, "Print version and exit")
	flag.Parse()

	if *versionFlag {
		fmt.Printf("Lastboard %s\n", version.Current)
		os.Exit(0)
	}

	// 1. Initialize Database
	dbFile := os.Getenv("DB_FILE")
	if dbFile == "" {
		dbFile = "./lastboard.db"
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
