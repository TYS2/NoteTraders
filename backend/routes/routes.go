package routes

import (
	"backend/handlers"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func Route(r *gin.Engine) {

	r.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
			"http://localhost:3000",
		},
		AllowMethods: []string{
			"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
		},
		AllowHeaders: []string{
			"Origin",
			"Content-Type",
			"Authorization",
		},
		ExposeHeaders: []string{
			"Content-Length",
		},
		AllowCredentials: true,
		MaxAge: 12 * time.Hour,
	}))

	r.POST("/signup", handlers.Signup)
	r.PATCH("/users/:id/profile-picture", handlers.UploadProfilePicture)
	r.POST("/login", handlers.Login)
	r.POST("/updateUser", handlers.UpdateUser)
	r.POST("/addBalance", handlers.IncreaseUserBalance)
	r.POST("/withdrawBalance", handlers.DecreaseUserBalance)
	r.POST("/purchaseListing", handlers.PurchaseListing)
	r.GET("/transactions/:id", handlers.GetUserTransactions)
	r.POST("/createListing", handlers.CreateListing)
	r.POST("/updateListing", handlers.UpdateListing)
	r.POST("/deleteListing", handlers.DeleteListing)
	r.PATCH("/listings/:id/listing-picture", handlers.UploadListingPicture)
	r.GET("/listings", handlers.GetListings)
	r.GET("/listings/search", handlers.SearchListings)
	r.GET("/subjects/:subjectName", handlers.GetSubjectsID)
	r.POST("/addSubject", handlers.AddSubject)
	r.GET("/academicLevels/:levelName", handlers.GetLevelsID)
	r.POST("/addAcademicLevel", handlers.AddLevel)
	r.GET("/transactions/:id/history", handlers.GetTransactionHistory)
	r.POST("/conversations", handlers.CreateConversation)
	r.GET("/conversations/:conversationId/messages", handlers.GetConversationMessages)
	r.GET("/ws/chat/:conversationId", handlers.HandleChatWebSocket)
	r.GET("/favourites/:userId", handlers.GetFavourites)
	r.POST("/favourites", handlers.AddFavourite)
	// r.DELETE("/favourites", handlers.RemoveFavourite)
}
