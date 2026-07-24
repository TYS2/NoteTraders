package handlers

import (
	"context"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"fmt"

	"backend/initializers"
	"backend/models"
	"backend/services"
	"backend/utils"

	"errors"

	"github.com/gin-gonic/gin"
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

	hashedPassword, err := utils.HashPassword(user.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	err = client.QueryRowContext(
		context.Background(),
		`INSERT INTO users (username, password, email, phone_number) VALUES ($1, $2, $3, $4) RETURNING id`,
		user.Username,
		hashedPassword,
		user.Email,
		user.PhoneNumber,
	).Scan(&user.AccountID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // Unique violation
			c.JSON(http.StatusConflict, gin.H{"error": "Username already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		log.Println("Error creating account:", err)
		return
	}

	err = sendOTP(user.AccountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Signup successful",
		"user":    user.AccountID,
	})
}

func sendOTP(userID int) error {
	otp,hash := utils.GenerateOTP()
	client := initializers.GetDB()

	userEmail := ""
	err := client.QueryRowContext(
		context.Background(),
		`SELECT email FROM users WHERE id = $1`,
		userID,
	).Scan(&userEmail)

	if err != nil {
		log.Println("Error occurred while fetching user email:", err)
		return err
	}

	err= services.SendEmail(
		userEmail,
		"OTP Verification",
		fmt.Sprintf("<h2>Your OTP is: %s</h2><p>Please use this OTP to verify your account.</p>", otp),
	)

	if err != nil {
		log.Println("Error sending email:", err)
		return err
	}

	_,err= client.ExecContext(
		context.Background(),
		`INSERT INTO otps (user_id, hash) VALUES ($1, $2)
		ON CONFLICT (user_id) DO UPDATE SET hash = EXCLUDED.hash`,
		userID,
		hash,
	)

	if err != nil {
		log.Println("Error storing OTP:", err)
		return err
	}
	return nil
}

func GetOTP(c *gin.Context) {

	var request models.OTPrequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	err := sendOTP(request.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP generated and sent successfully",
	})
	return
}




func UploadProfilePicture(c *gin.Context) {
	db := initializers.GetDB()
	r2Client := services.NewR2Client()

	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err})
		return
	}

	fileHeader, err := c.FormFile("profile_picture")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "profile_picture is required"})
		return
	}

	key, url, err := services.UploadFileToR2(
		c.Request.Context(),
		r2Client,
		os.Getenv("R2_BUCKET"),
		"profiles",
		fileHeader,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload image"})
		return
	}

	_, err = db.ExecContext(
		context.Background(),
		`UPDATE users
		 SET pfp_key = $1, pfp_url=$2
		 WHERE id = $3`,
		key,
		url,
		userID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":             "profile picture updated",
		"profile_picture_url": url,
		"profile_picture_key": key,
	})
}

func Login(c *gin.Context) {
	client := initializers.GetDB()

	var user models.LoginUser
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid login data"})
		return
	}

	var result models.User
	var storedHash string
	err := client.QueryRowContext(
		context.Background(),
		`SELECT id, username, email, phone_number, balance, password FROM users WHERE username = $1`,
		user.Username,
	).Scan(&result.AccountID, &result.Username, &result.Email, &result.PhoneNumber, &result.Balance, &storedHash)

	if err != nil {
		log.Println("Error occurred while fetching user:", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	err = utils.CheckPassword(user.Password, storedHash)

	if err !=nil{
		log.Println("Error occurred while fetching user:", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	err = sendOTP(result.AccountID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Password correct, please enter the OTP sent to your email",
		"user":    result,
	})
}

func VerifyOTP(c *gin.Context) {
	var request models.VerifyOTPRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	client := initializers.GetDB()

	var UserID int
	err := client.QueryRowContext(
		context.Background(),
		`SELECT id FROM users WHERE username = $1`,
		request.Username,
	).Scan(&UserID)

	if err != nil {
		log.Println("Error occurred while fetching user ID:", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}
	var otpHash string
	err = client.QueryRowContext(
		context.Background(),
		`SELECT hash FROM otps WHERE user_id = $1`,
		UserID,
	).Scan(&otpHash)

	if err != nil {
		log.Println("Error occurred while fetching OTP:", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "OTP not found"})
		return
	}

	err = utils.CheckPassword(request.OTP, otpHash)
	if err != nil {
		log.Println("Error occurred while verifying OTP:", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid OTP"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "OTP verified successfully",
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
	if err != nil {
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

