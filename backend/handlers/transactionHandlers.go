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
)

func IncreaseUserBalance(c *gin.Context) {
	client := initializers.GetDB()
	ctx := c.Request.Context()

	var transaction models.UserTransaction
	if err := c.ShouldBindJSON(&transaction); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction data"})
		return
	}

	if transaction.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be more than 0"})
		return
	}

	dbTx, err := client.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	defer dbTx.Rollback()

	result, err := dbTx.ExecContext(
		ctx,
		`UPDATE users SET balance = balance + $1 WHERE id = $2`,
		transaction.Amount,
		transaction.AccountID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to increase balance"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check updated balance"})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	_, err = dbTx.ExecContext(
		ctx,
		`INSERT INTO balance_transactions (user_id, transaction_type, amount)
		 VALUES ($1, 'top_up', $2)`,
		transaction.AccountID,
		transaction.Amount,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record top up transaction"})
		return
	}

	if err := dbTx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Balance increased successfully"})
}

func DecreaseUserBalance(c *gin.Context) {
	client := initializers.GetDB()
	ctx := c.Request.Context()

	var transaction models.UserTransaction
	if err := c.ShouldBindJSON(&transaction); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction data"})
		return
	}

	if transaction.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount must be more than 0"})
		return
	}

	dbTx, err := client.BeginTx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	defer dbTx.Rollback()

	var currentBalance float64

	err = dbTx.QueryRowContext(
		ctx,
		`SELECT balance
		FROM users
		WHERE id = $1
		FOR UPDATE`,
		transaction.AccountID,
	).Scan(&currentBalance)

	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"error": "Failed to retrieve user balance"},
		)
		return
	}

	if currentBalance < transaction.Amount {
		c.JSON(
			http.StatusBadRequest,
			gin.H{"error": "Insufficient balance"},
		)
		return
	}

	_, err = dbTx.ExecContext(
		ctx,
		`UPDATE users
		SET balance = balance - $1
		WHERE id = $2`,
		transaction.Amount,
		transaction.AccountID,
	)

	if err != nil {
		c.JSON(
			http.StatusInternalServerError,
			gin.H{"error": "Failed to decrease balance"},
		)
		return
	}

	_, err = dbTx.ExecContext(
		ctx,
		`INSERT INTO balance_transactions (user_id, transaction_type, amount)
		 VALUES ($1, 'withdraw', $2)`,
		transaction.AccountID,
		transaction.Amount,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record withdraw transaction"})
		return
	}

	if err := dbTx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save transaction"})
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

	if purchase.OfferMessageID != nil && *purchase.OfferMessageID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid price offer"})
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
	).Scan(
		&title,
		&price,
		&sellerID,
	)

	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Listing not found",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch listing",
		})
		return
	}

	if sellerID == purchase.BuyerID {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "You cannot buy your own listing",
		})
		return
	}

	if purchase.OfferMessageID != nil {
		var offerPrice float64
		var offerStatus string
		var offerSenderID int
		var conversationListingID int
		var conversationBuyerID int
		var conversationSellerID int

		err = tx.QueryRowContext(
			ctx,
			`SELECT
				messages.offer_price,
				messages.offer_status,
				messages.sender_id,
				conversations.listing_id,
				conversations.buyer_id,
				conversations.seller_id
			 FROM messages
			 JOIN conversations
				ON conversations.id = messages.conversation_id
			 WHERE messages.id = $1
			   AND messages.message_type = 'price_offer'
			 FOR UPDATE OF messages`,
			*purchase.OfferMessageID,
		).Scan(
			&offerPrice,
			&offerStatus,
			&offerSenderID,
			&conversationListingID,
			&conversationBuyerID,
			&conversationSellerID,
		)

		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Price offer not found",
			})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to verify price offer",
			})
			return
		}

		if offerStatus != "active" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "This price offer is no longer active",
			})
			return
		}

		if conversationListingID != purchase.ListingID ||
			conversationBuyerID != purchase.BuyerID ||
			conversationSellerID != sellerID ||
			offerSenderID != sellerID {

			c.JSON(http.StatusForbidden, gin.H{
				"error": "This price offer does not belong to you",
			})
			return
		}

		if offerPrice <= 0 || offerPrice > price {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid price offer",
			})
			return
		}

		price = offerPrice
	}

	var buyerBalance float64

	err = tx.QueryRowContext(
		ctx,
		`UPDATE users
		 SET balance = balance - $1
		 WHERE id = $2
		   AND balance >= $1
		 RETURNING balance`,
		price,
		purchase.BuyerID,
	).Scan(&buyerBalance)

	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Insufficient balance",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to deduct buyer balance",
		})
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
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to add seller balance",
		})
		return
	}

	var transactionID int

	err = tx.QueryRowContext(
		ctx,
		`INSERT INTO purchases (
			listing_id,
			title,
			price,
			buyer_id,
			seller_id
		)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id`,
		purchase.ListingID,
		title,
		price,
		purchase.BuyerID,
		sellerID,
	).Scan(&transactionID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to save purchase history",
		})
		return
	}

	var acceptedOffer *models.OutgoingMessage

	if purchase.OfferMessageID != nil {
		var message models.OutgoingMessage

		err = tx.QueryRowContext(
			ctx,
			`UPDATE messages
			 SET offer_status = 'accepted'
			 WHERE id = $1
			 RETURNING
				id,
				conversation_id,
				sender_id,
				message,
				message_type,
				offer_price,
				offer_status,
				created_at`,
			*purchase.OfferMessageID,
		).Scan(
			&message.ID,
			&message.ConversationID,
			&message.SenderID,
			&message.Message,
			&message.MessageType,
			&message.OfferPrice,
			&message.OfferStatus,
			&message.CreatedAt,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to accept price offer",
			})
			return
		}

		acceptedOffer = &message
	}

	_, err = tx.ExecContext(
		ctx,
		`DELETE FROM listings
		 WHERE id = $1`,
		purchase.ListingID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete listing",
		})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to complete purchase",
		})
		return
	}

	committed = true

	if acceptedOffer != nil {
		broadcastToRoom(
			acceptedOffer.ConversationID,
			*acceptedOffer,
		)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Purchase successful",
		"transactionID": transactionID,
		"price":         price,
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

func GetTransactionHistory(c *gin.Context) {
	userID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	client := initializers.GetDB()

	rows, err := client.QueryContext(
		c.Request.Context(),
		`
		SELECT id, transaction_type, title, amount, created_at
		FROM (
			SELECT
				p.id,
				'Purchased'::text AS transaction_type,
				p.title,
				-p.price AS amount,
				p.purchased_at AS created_at
			FROM purchases p
			WHERE p.buyer_id = $1

			UNION ALL

			SELECT
				p.id,
				'Sold'::text AS transaction_type,
				p.title,
				p.price AS amount,
				p.purchased_at AS created_at
			FROM purchases p
			WHERE p.seller_id = $1

			UNION ALL

			SELECT
				b.id,
				CASE
					WHEN b.transaction_type = 'top_up' THEN 'Top Up'
					ELSE 'Withdraw'
				END AS transaction_type,
				''::text AS title,
				CASE
					WHEN b.transaction_type = 'top_up' THEN b.amount
					ELSE -b.amount
				END AS amount,
				b.created_at AS created_at
			FROM balance_transactions b
			WHERE b.user_id = $1
		) history
		ORDER BY created_at DESC
		`,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transaction history"})
		return
	}
	defer rows.Close()

	transactions := []models.TransactionHistoryEntry{}

	for rows.Next() {
		var transaction models.TransactionHistoryEntry

		if err := rows.Scan(
			&transaction.ID,
			&transaction.TransactionType,
			&transaction.Title,
			&transaction.Amount,
			&transaction.CreatedAt,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode transaction history"})
			return
		}

		transactions = append(transactions, transaction)
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactions,
	})
}
