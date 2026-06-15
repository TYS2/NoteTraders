package handlers

import (
	"context"
	"log"
	"net/http"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
)

func CreateListing(c *gin.Context) {
	client := initializers.GetDB()
	var listing models.CreateListing
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing data"})
		return
	}

	err := client.QueryRowContext(
		context.Background(),
		`INSERT INTO listings (title, description, price, seller_id, level_id, subject_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		listing.Title,
		listing.Description,
		listing.Price,
		listing.SellerID,
		listing.AcademicLevelID,
		listing.SubjectID,
	).Scan(&listing.ListingID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create listing"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Listing created successfully", "id": listing.ListingID})
}

func UpdateListing(c *gin.Context) {
	client := initializers.GetDB()
	var listing models.Listing
	if err := c.ShouldBindJSON(&listing); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing data"})
		return
	}

	 err := client.QueryRowContext(
		context.Background(),
		`UPDATE listings SET title=$1, description=$2, price=$3, level_id=$4, subject_id=$5 WHERE id=$6 AND seller_id=$7 RETURNING id`,
		listing.Title,
		listing.Description,
		listing.Price,
		listing.AcademicLevelID,
		listing.SubjectID,
		listing.ListingID,
		listing.SellerID,
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

	 err := client.QueryRowContext(
		context.Background(),
		`DELETE FROM listings WHERE id=$1`,
		listing.ListingID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete listing"})
		log.Println("Error deleting listing:", err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Listing deleted successfully"})
}

func GetAllListings(c *gin.Context) {
	client := initializers.GetDB()
	rows, err := client.QueryContext(context.Background(), `SELECT id, title, description, price, seller_id, level_id, subject_id FROM listings`)
	if err != nil {
		log.Println("Error fetching listings:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch listings"})
		return
	}
	defer rows.Close()

	var listings []models.Listing

	for rows.Next() {
		var listing models.Listing
		if err := rows.Scan(
			&listing.ListingID,
			&listing.Title,
			&listing.Description,
			&listing.Price,
			&listing.SellerID,
			&listing.AcademicLevelID,
			&listing.SubjectID,
		); err != nil {
			log.Println("Error scanning listing:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode listings"})
			return
		}
		listings = append(listings, listing)
	}

	if err := rows.Err(); err != nil {
		log.Println("Row iteration error:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch listings"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"listings": listings})
}