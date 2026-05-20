package routes

import (
 "github.com/gin-gonic/gin"
 "backend/handlers"
)

func Route(r *gin.Engine) {
	r.POST("/signup", handlers.Signup)
	r.POST("/login", handlers.Login)
	r.POST("/createListing", handlers.CreateListing)
	r.GET("/listings", handlers.GetAllListings)
	r.GET("/allUsers", handlers.GetAllUsers)
}