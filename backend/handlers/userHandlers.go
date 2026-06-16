package handlers

import (
	"context"
	"log"
	"net/http"
	"strings"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
	"errors"
	"github.com/jackc/pgx/v5/pgconn"
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

	err := client.QueryRowContext(
		context.Background(),
		`INSERT INTO users (username, password, email, phone_number) VALUES ($1, $2, $3, $4) RETURNING id`,
		user.Username,
		user.Password,
		user.Email,
		user.PhoneNumber,
	).Scan(&user.AccountID)
	if err!= nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // Unique violation
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

// func getNextAccountID(client *mongo.Client) (int64, error) {
// 	countersCollection := client.Database("NoteTraders").Collection("counters")

// 	filter := bson.M{"_id": "accountId"}

// 	update := bson.M{
// 		"$inc": bson.M{
// 			"seq": 1,
// 		},
// 	}

// 	opts := options.FindOneAndUpdate().
// 		SetUpsert(true).
// 		SetReturnDocument(options.After)

// 	var counter struct {
// 		Seq int64 `bson:"seq"`
// 	}

// 	err := countersCollection.FindOneAndUpdate(
// 		context.TODO(),
// 		filter,
// 		update,
// 		opts,
// 	).Decode(&counter)

// 	if err != nil {
// 		return 0, err
// 	}

// 	return counter.Seq, nil
// }

func Login(c *gin.Context) {
	client := initializers.GetDB()

	var user models.LoginUser
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid login data"})
		return
	}

	var result models.User
	err := client.QueryRowContext(
		context.Background(),
		`SELECT id, username, email, phone_number FROM users WHERE username = $1 AND password = $2`,
		user.Username,
		user.Password,
	).Scan(&result.AccountID, &result.Username, &result.Email, &result.PhoneNumber)

	if err != nil {
		log.Println("Error occurred while fetching user:", err)
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


	_, err := client.ExecContext(
		context.Background(),
		`UPDATE users SET username = $1, email = $2, phone_number = $3 WHERE id = $4`,
		user.Username,
		user.Email,
		user.PhoneNumber,
		user.AccountID)
	if err!= nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // Unique violation
			c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		log.Println("Error creating account:", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "User updated successfully",
		"user":    user,
	})
}

func getUserIDByName(username string) (int, error) {
	client := initializers.GetDB()

	var userID int
	err := client.QueryRowContext(
		context.Background(),
		`SELECT id FROM users WHERE username = $1`,
		username,
	).Scan(&userID)

	if err != nil {
		return 0, err
	}
	return userID, nil
}

func getUserbyID(accountID int) (string, error) {
	client := initializers.GetDB()
	
	var username string
	err := client.QueryRowContext(
		context.Background(),
		`SELECT username FROM users WHERE id = $1`,
		accountID,
	).Scan(&username)

	if err != nil {
		return "", err
	}
	return username, nil
}