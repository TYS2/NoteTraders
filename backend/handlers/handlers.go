package handlers

import (
	"context"
	"net/http"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func Signup(c *gin.Context) {
	client := initializers.GetDB()
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user data"})
		return
	}

	_, err := client.Database("NoteTraders").Collection("users").InsertOne(context.TODO(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully"})
}

func Login(c *gin.Context) {
	client := initializers.GetDB()
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid login data"})
		return
	}

	var result models.User
	err := client.Database("NoteTraders").Collection("users").FindOne(context.TODO(), bson.M{"username": user.Username, "password": user.Password}).Decode(&result)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Login successful", "user": result})
}

func GetAllUsers(c *gin.Context) {
	client := initializers.GetDB()
	cursor, err := client.Database("NoteTraders").Collection("users").Find(context.TODO(), bson.M{})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	var users []bson.M
	if err = cursor.All(context.TODO(), &users); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode users"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

func CreateListing(c *gin.Context) {
	client := initializers.GetDB()
	var listing models.Listing
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing data"})
		return
	}

	_, err := client.Database("NoteTraders").Collection("listings").InsertOne(context.TODO(), listing)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create listing"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Listing created successfully"})
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