package handlers

import (
	"context"
	"net/http"

	"backend/initializers"
	"backend/models"	

	"github.com/gin-gonic/gin"
	"errors"
	"github.com/jackc/pgx/v5/pgconn"
)

func IncreaseUserBalance(c *gin.Context) {
	client := initializers.GetDB()

	var transaction models.UserTransaction
	if err := c.ShouldBindJSON(&transaction); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction data"})
		return
	}

	_, err := client.ExecContext(
		context.Background(),
		`UPDATE users SET balance = balance + $1 WHERE id = $2`,
		transaction.Amount,
		transaction.AccountID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to increase balance"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Balance increased successfully"})
	return
}

func DecreaseUserBalance(c *gin.Context) {
	client := initializers.GetDB()

	var transaction models.UserTransaction
	if err := c.ShouldBindJSON(&transaction); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction data"})
		return
	}

	_, err := client.ExecContext(
		context.Background(),
		`UPDATE users SET balance = balance - $1 WHERE id = $2`,
		transaction.Amount,
		transaction.AccountID,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23514" { // Check violation (e.g., balance cannot be negative)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient balance"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decrease balance"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Balance decreased successfully"})
	return
}

func PurchaseListing(c *gin.Context){
	client := initializers.GetDB()

	var purchase models.Purchase
	if err := c.ShouldBindJSON(&purchase); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase data"})
		return
	}

	var price float64
	err := client.QueryRowContext(
		c.Request.Context(),
		`SELECT price FROM listings WHERE id = $1`,
		purchase.ListingID,
	).Scan(&price)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "listing not found"})
		return
	}

	_, err = client.ExecContext(
		context.Background(),
		`UPDATE users SET balance = balance - $1 WHERE id = $2`,
		price,
		purchase.BuyerID,
	)

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23514" { // Check violation (e.g., balance cannot be negative)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient balance"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decrease balance"})
		}
		return
	}

	_, err = client.ExecContext(
		context.Background(),
		`UPDATE users SET balance = balance + $1 WHERE id = $2`,
		price,
		purchase.SellerID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to increase balance"})
		return
	}

	_,err = client.ExecContext(
		c.Request.Context(),
		`DELETE FROM listings where id=$1`,
		purchase.ListingID,
	)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "listing not deleted"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Purchase successful"})
	return

}