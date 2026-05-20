package handlers

import (
	"context"
	"net/http"
	"log"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"

)

func CreateListing(c *gin.Context) {
	client := initializers.GetDB()
	var listing models.CreateListing
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing data"})
		return
	}

	result, err := client.Database("NoteTraders").Collection("listings").InsertOne(context.TODO(), listing)
	insertedID := result.InsertedID.(bson.ObjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create listing"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Listing created successfully", "id": insertedID})
}

func UpdateListing(c *gin.Context) {
	client := initializers.GetDB()
	var listing models.Listing
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing data"})
		return
	}

	var updatedListing models.Listing
	err := client.Database("NoteTraders").Collection("listings").FindOneAndUpdate(
		context.TODO(),
		bson.M{"_id": listing.ID},
		bson.M{"$set": listing},
	).Decode(&updatedListing)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update listing"})
		log.Println("Error updating listing:", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Listing updated successfully", "listing": updatedListing})
}

func DeleteListing(c *gin.Context) {
	client := initializers.GetDB()
	var listing models.DeleteListing
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing data"})
		return
	}

	_,err := client.Database("NoteTraders").Collection("listings").DeleteOne(
		context.TODO(),
		bson.M{"_id": listing.ID},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete listing"})
		log.Println("Error deleting listing:", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Listing deleted successfully"})
}

func GetAllListings(c *gin.Context){
	client := initializers.GetDB()
	cursor, err := client.Database("NoteTraders").Collection("listings").Find(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch listings"})
		return
	}

	var listings []models.Listing
	if err = cursor.All(context.TODO(), &listings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode listings"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"listings": listings})
}