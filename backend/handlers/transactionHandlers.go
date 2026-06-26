package handlers

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
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
		if errors.As(err, &pgErr) && pgErr.Code == "23514" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient balance"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decrease balance"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Balance decreased successfully"})
}

func PurchaseListing(c *gin.Context) {
	client := initializers.GetDB()
	ctx := c.Request.Context()

	var purchase models.Purchase
	if err := c.ShouldBindJSON(&purchase); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid purchase data"})
		return
	}

	tx, err := client.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start purchase"})
		return
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	var title string
	var price float64
	var sellerID int

	err = tx.QueryRowContext(
		ctx,
		`SELECT title, price, seller_id
		 FROM listings
		 WHERE id = $1
		 FOR UPDATE`,
		purchase.ListingID,
	).Scan(&title, &price, &sellerID)

	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Listing not found"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch listing"})
		return
	}

	if sellerID == purchase.BuyerID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "You cannot buy your own listing"})
		return
	}

	var buyerBalance float64
	err = tx.QueryRowContext(
		ctx,
		`UPDATE users
		 SET balance = balance - $1
		 WHERE id = $2 AND balance >= $1
		 RETURNING balance`,
		price,
		purchase.BuyerID,
	).Scan(&buyerBalance)

	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Insufficient balance"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to deduct buyer balance"})
		return
	}

	var sellerBalance float64
	err = tx.QueryRowContext(
		ctx,
		`UPDATE users
		 SET balance = balance + $1
		 WHERE id = $2
		 RETURNING balance`,
		price,
		sellerID,
	).Scan(&sellerBalance)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add seller balance"})
		return
	}

	var transactionID int
	err = tx.QueryRowContext(
		ctx,
		`INSERT INTO purchases (listing_id, title, price, buyer_id, seller_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id`,
		purchase.ListingID,
		title,
		price,
		purchase.BuyerID,
		sellerID,
	).Scan(&transactionID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save purchase history"})
		return
	}

	_, err = tx.ExecContext(
		ctx,
		`DELETE FROM listings WHERE id = $1`,
		purchase.ListingID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete listing"})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete purchase"})
		return
	}

	committed = true

	c.JSON(http.StatusOK, gin.H{
		"message":       "Purchase successful",
		"transactionID": transactionID,
		"buyerBalance":  buyerBalance,
		"sellerBalance": sellerBalance,
	})
}

func GetUserTransactions(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	itemsSold, err := getTransactionItems(c.Request.Context(), userID, "seller_id")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sold items"})
		return
	}

	itemsPurchased, err := getTransactionItems(c.Request.Context(), userID, "buyer_id")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch purchased items"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"itemsSold":      itemsSold,
		"itemsPurchased": itemsPurchased,
	})
}

func getTransactionItems(ctx context.Context, userID int, columnName string) ([]models.TransactionHistoryItem, error) {
	if columnName != "buyer_id" && columnName != "seller_id" {
		return nil, errors.New("invalid transaction column")
	}

	client := initializers.GetDB()

	query := `
		SELECT
			p.id,
			p.listing_id,
			p.title,
			p.price,
			buyer.username,
			seller.username,
			p.purchased_at
		FROM purchases p
		JOIN users buyer ON p.buyer_id = buyer.id
		JOIN users seller ON p.seller_id = seller.id
		WHERE p.` + columnName + ` = $1
		ORDER BY p.purchased_at DESC
	`

	rows, err := client.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []models.TransactionHistoryItem{}

	for rows.Next() {
		var item models.TransactionHistoryItem

		if err := rows.Scan(
			&item.ID,
			&item.ListingID,
			&item.Title,
			&item.Price,
			&item.BuyerUsername,
			&item.SellerUsername,
			&item.PurchasedAt,
		); err != nil {
			return nil, err
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return items, nil
}
