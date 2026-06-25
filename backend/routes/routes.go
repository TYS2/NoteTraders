package routes

import (
	"backend/handlers"

	"github.com/gin-gonic/gin"
)

func Route(r *gin.Engine) {
	r.POST("/signup", handlers.Signup)
	r.PATCH("/users/:id/profile-picture", handlers.UploadProfilePicture)
	r.POST("/login", handlers.Login)
	r.POST("/updateUser", handlers.UpdateUser)
	r.POST("/addBalance", handlers.IncreaseUserBalance)
	r.POST("/withdrawBalance", handlers.DecreaseUserBalance)
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
}
