package main

import (
	"backend/initializers"
	"backend/routes"
	"log"

	"github.com/gin-gonic/gin"
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

	routes.Route(r)

	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
