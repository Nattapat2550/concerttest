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

	_ "github.com/lib/pq" // เพิ่ม Driver สำหรับ PostgreSQL

	"backend/internal/config"
	"backend/internal/httpapi"
)

func main() {
	cfg := config.Load()

	// ✅ 1. ดึง PORT จากระบบ Render เป็นอันดับแรก (สำคัญมาก)
	port := os.Getenv("PORT")
	if port == "" {
		port = cfg.Port
	}
	// ป้องกันปัญหาการเผลอเคาะเว้นวรรคในไฟล์ .env
	port = strings.TrimSpace(port)
	if port == "" {
		port = "5000"
	}

	// ✅ 2. เชื่อมต่อฐานข้อมูล Concert (แยกจากระบบ Auth)
	concertDBUrl := os.Getenv("CONCERT_DB_URL")
	var concertDB *sql.DB
	if concertDBUrl != "" {
		var err error
		concertDB, err = sql.Open("postgres", concertDBUrl)
		if err != nil {
			log.Fatalf("Cannot connect to Concert DB: %v", err)
		}
		// ทดสอบการเชื่อมต่อ
		if err = concertDB.Ping(); err != nil {
			log.Fatalf("Concert DB ping failed: %v", err)
		}
		defer concertDB.Close()
		log.Println("[backend] Connected to Concert DB successfully")
	} else {
		log.Println("[backend] WARNING: CONCERT_DB_URL is not set in .env")
	}

	srv := &http.Server{
		// ✅ 3. ระบุ 0.0.0.0 เพื่อให้ Render ตรวจจับ Port ผ่าน IPv4 ได้
		Addr:              "0.0.0.0:" + port,
		Handler:           httpapi.NewRouter(cfg, concertDB), // ส่ง concertDB เข้าไปใน Router
		ReadHeaderTimeout: 15 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       90 * time.Second,
	}

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("[backend] listening on 0.0.0.0:%s (env=%s)\n", port, cfg.NodeEnv)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen error: %v", err)
		}
	}()

	<-stop
	log.Println("[backend] shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}