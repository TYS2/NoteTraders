package main

import (
	"log"
    "github.com/gin-gonic/gin"
    "backend/initializers"
	"backend/routes"
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
	 r.Run("")
	if err := r.Run(); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}