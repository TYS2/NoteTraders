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

func Signup(c *gin.Context) {
	client := initializers.GetDB()
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user data"})
		return
	}

	result, err := client.Database("NoteTraders").Collection("users").InsertOne(context.TODO(), user)
	insertedID := result.InsertedID.(bson.ObjectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "User created successfully", "id": insertedID})
}

func Login(c *gin.Context) {
	client := initializers.GetDB()
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid login data"})
		return
	}

	var result models.User
	err := client.Database("NoteTraders").Collection("users").FindOne(context.TODO(), user).Decode(&result)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Login successful", "user": result})
}

func UpdateUser(c *gin.Context) {
	client := initializers.GetDB()
	var user models.UpdateUser
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user data"})
		return
	}
	
	var updatedUser models.User
	err := client.Database("NoteTraders").Collection("users").FindOneAndUpdate(
		context.TODO(),
		bson.M{"_id": user.ID},
		bson.M{"$set": user},
	).Decode(&updatedUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		log.Println("Error updating user:", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User updated successfully", "user": updatedUser})
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