package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func isValidPassword(password string) bool {
	if len(password) < 8 {
		return false
	}

	hasUppercase := false
	hasLowercase := false
	hasNumber := false
	hasSpecialChar := false

	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUppercase = true
		case char >= 'a' && char <= 'z':
			hasLowercase = true
		case char >= '0' && char <= '9':
			hasNumber = true
		default:
			hasSpecialChar = true
		}
	}

	return hasUppercase && hasLowercase && hasNumber && hasSpecialChar
}

func Signup(c *gin.Context) {
	client := initializers.GetDB()

	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please fill in all required fields correctly"})
		return
	}

	user.Username = strings.TrimSpace(user.Username)
	user.Email = strings.TrimSpace(user.Email)
	user.PhoneNumber = strings.TrimSpace(user.PhoneNumber)

	if !isValidPassword(user.Password) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
		})
		return
	}

	var existingUser models.User
	err := client.Database("NoteTraders").Collection("users").FindOne(
		context.TODO(),
		bson.M{"username": user.Username},
	).Decode(&existingUser)

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	accountID, err := getNextAccountID(client)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate account ID"})
		return
	}

	user.AccountID = accountID

	_, err = client.Database("NoteTraders").Collection("users").InsertOne(
		context.TODO(),
		user,
	)

	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		log.Println("Error creating account:", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Signup successful",
		"user":    user,
	})
}

func getNextAccountID(client *mongo.Client) (int64, error) {
	countersCollection := client.Database("NoteTraders").Collection("counters")

	filter := bson.M{"_id": "accountId"}

	update := bson.M{
		"$inc": bson.M{
			"seq": 1,
		},
	}

	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	var counter struct {
		Seq int64 `bson:"seq"`
	}

	err := countersCollection.FindOneAndUpdate(
		context.TODO(),
		filter,
		update,
		opts,
	).Decode(&counter)

	if err != nil {
		return 0, err
	}

	return counter.Seq, nil
}

func Login(c *gin.Context) {
	client := initializers.GetDB()

	var user models.LoginUser
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid login data"})
		return
	}

	var result models.User
	err := client.Database("NoteTraders").Collection("users").FindOne(
		context.TODO(),
		bson.M{
			"username": user.Username,
			"password": user.Password,
		},
	).Decode(&result)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    result,
	})
}

func UpdateUser(c *gin.Context) {
	client := initializers.GetDB()

	var user models.UpdateUser
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user data"})
		return
	}

	user.Username = strings.TrimSpace(user.Username)
	user.Email = strings.TrimSpace(user.Email)
	user.PhoneNumber = strings.TrimSpace(user.PhoneNumber)

	if user.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username cannot be empty"})
		return
	}

	if user.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email cannot be empty"})
		return
	}

	if !strings.Contains(user.Email, "@") || !strings.Contains(user.Email, ".") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid email format"})
		return
	}

	if user.PhoneNumber == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number cannot be empty"})
		return
	}

	collection := client.Database("NoteTraders").Collection("users")

	var existingUser models.User

	// Check username already used by another account
	err := collection.FindOne(
		context.TODO(),
		bson.M{
			"username":  user.Username,
			"accountId": bson.M{"$ne": user.AccountID},
		},
	).Decode(&existingUser)

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
		return
	}

	// Check email already used by another account
	err = collection.FindOne(
		context.TODO(),
		bson.M{
			"email":     user.Email,
			"accountId": bson.M{"$ne": user.AccountID},
		},
	).Decode(&existingUser)

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already exists"})
		return
	}

	// Check phone number already used by another account
	err = collection.FindOne(
		context.TODO(),
		bson.M{
			"phoneNumber": user.PhoneNumber,
			"accountId":   bson.M{"$ne": user.AccountID},
		},
	).Decode(&existingUser)

	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Phone number already exists"})
		return
	}

	var updatedUser models.User

	err = collection.FindOneAndUpdate(
		context.TODO(),
		bson.M{"accountId": user.AccountID},
		bson.M{
			"$set": bson.M{
				"username":    user.Username,
				"email":       user.Email,
				"phoneNumber": user.PhoneNumber,
			},
		},
		options.FindOneAndUpdate().SetReturnDocument(options.After),
	).Decode(&updatedUser)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		log.Println("Error updating user:", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User updated successfully",
		"user":    updatedUser,
	})
}
