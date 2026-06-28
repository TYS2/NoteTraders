package main

import (
	"backend/initializers"
	"backend/routes"
	"log"
	"context"
	"fmt"
	"time"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func init() {
}

func main() {
	// Initialize Gin router
	initializers.ConnectDB()
	r := gin.Default()
	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"connected": "true",
		})
	})
	
	defer initializers.GetDB().Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := initializers.GetDB().PingContext(ctx); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	fmt.Println("Connected to Neon successfully")

	routes.Route(r)

	
	er := godotenv.Load()
	if er != nil {
		log.Fatal("Error loading .env file")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
