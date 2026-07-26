package handlers

import (
	"context"
	"log"
	"net/http"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
)

func GetFavourites(c *gin.Context) {
	userID := c.Param("userId")
	listings := make([]models.Listing, 0)

	client := initializers.GetDB()

	rows, err := client.QueryContext(
		context.Background(),
		`SELECT
			l.id,
			l.title,
			l.description,
			l.price,
			u.username,
			a.level_name,
			s.subject_name,
			COALESCE(l.photo_url, '')
		 FROM favourites f
		 JOIN listings l ON l.id = f.listing_id
		 JOIN users u ON u.id = l.seller_id
		 JOIN academic_levels a ON a.id = l.level_id
		 JOIN subjects s ON s.id = l.subject_id
		 WHERE f.user_id = $1`,
		userID,
	)

	if err != nil {
		log.Println("Error getting favourites:", err)
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"error": "Failed to get favourites"},
		)
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
			log.Println("Error scanning favourite listing:", err)
			c.JSON(
				http.StatusInternalServerError,
				gin.H{"error": "Failed to decode favourites"},
			)
			return
		}

		listings = append(listings, listing)
	}

	if err := rows.Err(); err != nil {
		log.Println("Favourite row iteration error:", err)
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"error": "Failed to fetch favourites"},
		)
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

	_, err := client.ExecContext(
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
