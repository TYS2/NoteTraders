package routes

import (
 "github.com/gin-gonic/gin"
 "backend/handlers"
)

func Route(r *gin.Engine) {
	r.POST("/signup", handlers.Signup)
	r.POST("/login", handlers.Login)
	r.GET("/allUsers", handlers.GetAllUsers)
}