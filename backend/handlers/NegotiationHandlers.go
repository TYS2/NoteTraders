package handlers

import (
	"context"
	"log"
	"net/http"
	"strconv"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
)


func SetListingNegotiation(c *gin.Context) {
	client := initializers.GetDB()

	listingID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing ID"})
		return
	}

	var req models.NegotiationRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Price <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid negotiation data"})
		return
	}

	buyerID, err := getUserIDByName(req.Buyer)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid buyer"})
		return
	}

	_, err = client.ExecContext(
		context.Background(),
		`UPDATE listings
		 SET negotiated_price = $1,
		     negotiated_buyer_id = $2
		 WHERE id = $3`,
		req.Price, buyerID, listingID,
	)
	if err != nil {
		log.Println("Error setting negotiation:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set negotiation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Negotiation set successfully",
	})
}

func UndoListingNegotiation(c *gin.Context) {
	client := initializers.GetDB()

	listingID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid listing ID"})
		return
	}

	_, err = client.ExecContext(
		context.Background(),
		`UPDATE listings
		 SET negotiated_price = NULL,
		     negotiated_buyer_id = NULL
		 WHERE id = $1`,
		listingID,
	)
	if err != nil {
		log.Println("Error undoing negotiation:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to undo negotiation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Negotiation undone successfully"})
}