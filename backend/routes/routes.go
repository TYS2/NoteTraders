package routes

import (
	"backend/handlers"

	"github.com/gin-gonic/gin"
)

func Route(r *gin.Engine) {
	r.POST("/signup", handlers.Signup)
	r.POST("/login", handlers.Login)
	r.POST("/updateUser", handlers.UpdateUser)
	r.POST("/createListing", handlers.CreateListing)
	r.POST("/updateListing", handlers.UpdateListing)
	r.POST("/deleteListing", handlers.DeleteListing)
	r.GET("/listings", handlers.GetAllListings)
}
