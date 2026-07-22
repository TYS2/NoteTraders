package handlers

import (
	"context"
	"net/http"
	"log"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
)

func GetFavourites(c *gin.Context) {
	userId := c.Param("userId")
	var listings []models.Listing

	client := initializers.GetDB()

	rows, err := client.QueryContext(
		context.Background(),
		`SELECT id, title, description, price, seller_id, level_id, subject_id, COALESCE(photo_url, '') FROM listings WHERE id IN (SELECT listing_id FROM favourites WHERE user_id = $1)`,
		userId,
	)

	if err != nil {
		log.Println("Error getting favourites:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get favourites"})
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
			&listing.Seller,
			&listing.AcademicLevel,
			&listing.Subject,
			&listing.PhotoUrl,
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

func AddFavourite(c *gin.Context) {
	var favourite models.Favourite
	if err := c.ShouldBindJSON(&favourite); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid favourite data"})
		return
	}

	client := initializers.GetDB()

	_,err := client.ExecContext(
		context.Background(),
		`INSERT INTO favourites (user_id, listing_id) VALUES ($1, $2) ON CONFLICT (user_id, listing_id) DO NOTHING`,
		favourite.UserID,
		favourite.ListingID,
	)

	if err != nil {
		log.Println("Error adding favourite:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add favourite"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Favourite added successfully"})
}

func RemoveFavourite(c *gin.Context) {
	var favourite models.Favourite
	if err := c.ShouldBindJSON(&favourite); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid favourite data"})
		return
	}

	client := initializers.GetDB()

	_, err := client.ExecContext(
		context.Background(),
		`DELETE FROM favourites WHERE user_id = $1 AND listing_id = $2`,
		favourite.UserID,
		favourite.ListingID,
	)

	if err != nil {
		log.Println("Error removing favourite:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove favourite"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Favourite removed successfully"})
}	