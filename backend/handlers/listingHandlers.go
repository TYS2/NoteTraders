package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"

	"backend/initializers"
	"backend/models"
	"backend/services"

	"github.com/gin-gonic/gin"
)

func CreateListing(c *gin.Context) {
	client := initializers.GetDB()
	var listing models.CreateListing
	var listingID int
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing data"})
		return
	}
	SubjectID, err := getSubjectIDByName(listing.Subject)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subject"})
		return
	}
	SellerID, err := getUserIDByName(listing.Seller)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid seller"})
		return
	}
	AcademicLevelID, err := getLevelIDByName(listing.AcademicLevel)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid academic level"})
		return
	}

	err = client.QueryRowContext(
		context.Background(),
		`INSERT INTO listings (title, description, price, seller_id, level_id, subject_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		listing.Title,
		listing.Description,
		listing.Price,
		SellerID,
		AcademicLevelID,
		SubjectID,
	).Scan(&listingID)

	if err != nil {
		log.Println("Error creating listing:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create listing"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Listing created successfully", "id": listingID})
}

func UpdateListing(c *gin.Context) {
	client := initializers.GetDB()
	var listing models.Listing
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing data"})
		return
	}
	sellerID, err := getUserIDByName(listing.Seller)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid seller"})
		return
	}
	subjectID, err := getSubjectIDByName(listing.Subject)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subject"})
		return
	}
	levelID, err := getLevelIDByName(listing.AcademicLevel)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid academic level"})
		return
	}

	err = client.QueryRowContext(
		context.Background(),
		`UPDATE listings SET title=$1, description=$2, price=$3, level_id=$4, subject_id=$5 WHERE id=$6 AND seller_id=$7 RETURNING id`,
		listing.Title,
		listing.Description,
		listing.Price,
		levelID,
		subjectID,
		listing.ListingID,
		sellerID,
	).Scan(&listing.ListingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update listing"})
		log.Println("Error updating listing:", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Listing updated successfully", "listing": listing})
}

func DeleteListing(c *gin.Context) {
	client := initializers.GetDB()
	var listing models.DeleteListing
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing data"})
		return
	}
	sellerID, err := getUserIDByName(c.Query("seller"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid seller"})
		return
	}

	err = client.QueryRowContext(
		context.Background(),
		`DELETE FROM listings WHERE id=$1 AND seller_id=$2 RETURNING id`,
		listing.ListingID,
		sellerID,
	).Scan(&listing.ListingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete listing"})
		log.Println("Error deleting listing:", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Listing deleted successfully"})
}

func GetListings(c *gin.Context) {
	client := initializers.GetDB()

	var listings []models.Listing
	var sellerID, levelID, subjectID int
	var minPrice, maxPrice float64
	var stringLevelID, stringSubjectID, stringMinPrice, stringMaxPrice string
	stringLevelID = c.Query("level_id")
	stringSubjectID = c.Query("subject_id")
	stringMinPrice = c.Query("min_price")
	stringMaxPrice = c.Query("max_price")

	query :=
		`SELECT id, title, description, price, seller_id, level_id, subject_id, COALESCE(photo_url, '') FROM listings WHERE 1=1`
	var args []interface{}
	argNum := 1

	// Add filters only if provided
	if stringSubjectID != "" {
		subjectID, err := getSubjectIDByName(stringSubjectID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subject filter"})
			return
		}
		query += fmt.Sprintf(" AND subject_id = $%d", argNum)
		args = append(args, subjectID)
		argNum++
	}

	if stringLevelID != "" {
		levelID, err := getLevelIDByName(stringLevelID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid academic level filter"})
			return
		}
		query += fmt.Sprintf(" AND level_id = $%d", argNum)
		args = append(args, levelID)
		argNum++
	}

	if stringMinPrice != "" {
		if _, err := fmt.Sscanf(stringMinPrice, "%f", &minPrice); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid minimum price filter"})
			return
		}
		query += fmt.Sprintf(" AND price >= $%d", argNum)
		args = append(args, minPrice)
		argNum++
	}

	if stringMaxPrice != "" {
		if _, err := fmt.Sscanf(stringMaxPrice, "%f", &maxPrice); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid maximum price filter"})
			return
		}
		query += fmt.Sprintf(" AND price <= $%d", argNum)
		args = append(args, maxPrice)
		argNum++
	}

	rows, err := client.QueryContext(
		context.Background(),
		query,
		args...,
	)
	if err != nil {
		log.Println("Error fetching listings:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch listings"})
		return
	}
	defer rows.Close()

	for rows.Next() {
		var listing models.Listing
		if err := rows.Scan(
			&listing.ListingID,
			&listing.Title,
			&listing.Description,
			&listing.Price,
			&sellerID,
			&levelID,
			&subjectID,
			&listing.PhotoUrl,
		); err != nil {
			log.Println("Error scanning listing:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode listings"})
			return
		}
		listing.Seller, _ = getUserbyID(sellerID)
		listing.AcademicLevel, _ = getLevelByID(levelID)
		listing.Subject, _ = getSubjectByID(subjectID)
		listings = append(listings, listing)
	}

	if err := rows.Err(); err != nil {
		log.Println("Row iteration error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch listings"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"listings": listings})
}

func UploadListingPicture(c *gin.Context) {
	db := initializers.GetDB()
	r2Client := services.NewR2Client()

	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err})
		return
	}

	fileHeader, err := c.FormFile("listing_picture")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "listing_picture is required"})
		return
	}

	key, url, err := services.UploadFileToR2(
		c.Request.Context(),
		r2Client,
		os.Getenv("R2_BUCKET"),
		"listings",
		fileHeader,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload image"})
		return
	}

	_, err = db.ExecContext(
		context.Background(),
		`UPDATE listings
		 SET photo_key = $1, photo_url=$2
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
func SearchListings(c *gin.Context) {
	client := initializers.GetDB()
	search := c.Query("searchTerm")

	rows, err := client.QueryContext(
		context.Background(),
		`SELECT id, title, description, price
         FROM listings
         WHERE title ILIKE $1 OR description ILIKE $1`,
		"%"+search+"%",
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	var listings []models.Listing
	for rows.Next() {
		var listing models.Listing
		if err := rows.Scan(&listing.ListingID, &listing.Title, &listing.Description, &listing.Price); err != nil {
			continue
		}
		listings = append(listings, listing)
	}

	c.JSON(http.StatusOK, listings)
}
