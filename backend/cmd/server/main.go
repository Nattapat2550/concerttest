package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"backend/internal/config"
	"backend/internal/httpapi"
)

func main() {
	cfg := config.Load()

	port := os.Getenv("PORT")
	if port == "" { port = cfg.Port }
	port = strings.TrimSpace(port)
	if port == "" { port = "5000" }

	concertDBUrl := os.Getenv("CONCERT_DB_URL")
	var concertDB *sql.DB
	if concertDBUrl != "" {
		var err error
		concertDB, err = sql.Open("postgres", concertDBUrl)
		if err != nil { log.Fatalf("Cannot connect to Concert DB: %v", err) }
		if err = concertDB.Ping(); err != nil { log.Fatalf("Concert DB ping failed: %v", err) }
		
		// 🌟 ตั้งค่า Connection Pool ป้องกัน DB ล่มเมื่อโหลดหนัก
		concertDB.SetMaxOpenConns(150)
		concertDB.SetMaxIdleConns(30)
		concertDB.SetConnMaxLifetime(15 * time.Minute)

		defer concertDB.Close()
		log.Println("[backend] Connected to Concert DB successfully")
	}

	srv := &http.Server{
		Addr:              "0.0.0.0:" + port,
		Handler:           httpapi.NewRouter(cfg, concertDB),
		ReadHeaderTimeout: 15 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       90 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("[backend] listening on 0.0.0.0:%s (env=%s)\n", port, cfg.NodeEnv)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed { log.Fatalf("listen error: %v", err) }
	}()

	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}