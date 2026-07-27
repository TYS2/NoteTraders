package handlers

import (
	"database/sql"
	"errors"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var rooms = make(map[int]map[*websocket.Conn]bool)
var roomsMutex = sync.Mutex{}

var chatUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// For development only.
		// In production, restrict this to your frontend domain.
		return true
	},
}

func HandleChatWebSocket(c *gin.Context) {
	db := initializers.GetDB()
	ctx := c.Request.Context()

	conversationID, err := strconv.Atoi(c.Param("conversationId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid conversation id",
		})
		return
	}

	senderID, err := strconv.Atoi(c.Query("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	var isParticipant bool

	err = db.QueryRowContext(
		ctx,
		`SELECT EXISTS (
			SELECT 1
			FROM conversations
			WHERE id = $1
			  AND (buyer_id = $2 OR seller_id = $2)
		)`,
		conversationID,
		senderID,
	).Scan(&isParticipant)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to verify chat access",
		})
		return
	}

	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "you do not have access to this chat",
		})
		return
	}

	conn, err := chatUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	addClientToRoom(conversationID, conn)
	defer removeClientFromRoom(conversationID, conn)

	for {
		var incoming models.IncomingMessage

		if err := conn.ReadJSON(&incoming); err != nil {
			break
		}

		messageText := strings.TrimSpace(incoming.Message)

		if messageText == "" {
			continue
		}

		if len([]rune(messageText)) > 1000 {
			_ = conn.WriteJSON(gin.H{
				"error": "message is too long",
			})
			continue
		}

		var savedMessage models.OutgoingMessage

		err = db.QueryRowContext(
			ctx,
			`INSERT INTO messages (
				conversation_id,
				sender_id,
				message,
				message_type
			)
			VALUES ($1, $2, $3, 'text')
			RETURNING
				id,
				conversation_id,
				sender_id,
				message,
				message_type,
				offer_price,
				offer_status,
				created_at`,
			conversationID,
			senderID,
			messageText,
		).Scan(
			&savedMessage.ID,
			&savedMessage.ConversationID,
			&savedMessage.SenderID,
			&savedMessage.Message,
			&savedMessage.MessageType,
			&savedMessage.OfferPrice,
			&savedMessage.OfferStatus,
			&savedMessage.CreatedAt,
		)

		if err != nil {
			_ = conn.WriteJSON(gin.H{
				"error": "failed to save message",
			})
			continue
		}

		broadcastToRoom(conversationID, savedMessage)
	}
}

func addClientToRoom(conversationID int, conn *websocket.Conn) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	if rooms[conversationID] == nil {
		rooms[conversationID] = make(map[*websocket.Conn]bool)
	}

	rooms[conversationID][conn] = true
}

func removeClientFromRoom(conversationID int, conn *websocket.Conn) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	delete(rooms[conversationID], conn)

	if len(rooms[conversationID]) == 0 {
		delete(rooms, conversationID)
	}
}

func broadcastToRoom(conversationID int, message models.OutgoingMessage) {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	for client := range rooms[conversationID] {
		err := client.WriteJSON(message)
		if err != nil {
			client.Close()
			delete(rooms[conversationID], client)
		}
	}
}

func GetConversationMessages(c *gin.Context) {
	db := initializers.GetDB()
	ctx := c.Request.Context()

	conversationID, err := strconv.Atoi(
		c.Param("conversationId"),
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid conversation id",
		})
		return
	}

	userID, err := strconv.Atoi(c.Query("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	var conversation models.Conversation

	err = db.QueryRowContext(
		ctx,
		`SELECT
			conversations.id,
			conversations.listing_id,
			COALESCE(conversations.item_title, ''),
			COALESCE(listings.price, 0),
			conversations.buyer_id,
			conversations.seller_id,
			CASE
				WHEN conversations.buyer_id = $2
				THEN conversations.seller_id
				ELSE conversations.buyer_id
			END,
			users.username,
			conversations.created_at
		FROM conversations
		LEFT JOIN listings
			ON listings.id = conversations.listing_id
		JOIN users
			ON users.id = CASE
				WHEN conversations.buyer_id = $2
				THEN conversations.seller_id
				ELSE conversations.buyer_id
			END
		WHERE conversations.id = $1
		  AND (
			conversations.buyer_id = $2
			OR conversations.seller_id = $2
		  )`,
		conversationID,
		userID,
	).Scan(
		&conversation.ID,
		&conversation.ListingID,
		&conversation.ItemTitle,
		&conversation.ItemPrice,
		&conversation.BuyerID,
		&conversation.SellerID,
		&conversation.OtherUserID,
		&conversation.OtherUsername,
		&conversation.CreatedAt,
	)

	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "chat not found or access denied",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to get chat",
		})
		return
	}

	rows, err := db.QueryContext(
		ctx,
		`SELECT
			id,
			conversation_id,
			sender_id,
			message,
			message_type,
			offer_price,
			offer_status,
			created_at,
			read_at
		FROM messages
		WHERE conversation_id = $1
		ORDER BY created_at ASC, id ASC`,
		conversationID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to get messages",
		})
		return
	}
	defer rows.Close()

	messages := []models.OutgoingMessage{}

	for rows.Next() {
		var message models.OutgoingMessage
		var readAt sql.NullTime

		err := rows.Scan(
			&message.ID,
			&message.ConversationID,
			&message.SenderID,
			&message.Message,
			&message.MessageType,
			&message.OfferPrice,
			&message.OfferStatus,
			&message.CreatedAt,
			&readAt,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to read messages",
			})
			return
		}

		if readAt.Valid {
			value := readAt.Time
			message.ReadAt = &value
		}

		messages = append(messages, message)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to read messages",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"conversation": conversation,
		"messages":     messages,
	})
}

func CreateConversation(c *gin.Context) {
	db := initializers.GetDB()
	ctx := c.Request.Context()

	var request models.CreateConversationRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid conversation data",
		})
		return
	}

	if request.UserID <= 0 || request.ListingID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "user_id and listing_id are required",
		})
		return
	}

	var title string
	var buyerID int
	var sellerID int

	err := db.QueryRowContext(
		ctx,
		`SELECT title, seller_id
		 FROM listings
		 WHERE id = $1`,
		request.ListingID,
	).Scan(
		&title,
		&sellerID,
	)

	if err == nil {
		if request.UserID == sellerID {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "you cannot chat with yourself",
			})
			return
		}

		buyerID = request.UserID
	} else if errors.Is(err, sql.ErrNoRows) {
		err = db.QueryRowContext(
			ctx,
			`SELECT title, buyer_id, seller_id
			 FROM purchases
			 WHERE listing_id = $1
			 ORDER BY purchased_at DESC
			 LIMIT 1`,
			request.ListingID,
		).Scan(
			&title,
			&buyerID,
			&sellerID,
		)

		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "listing or purchase not found",
			})
			return
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to find purchase",
			})
			return
		}

		if request.UserID != buyerID && request.UserID != sellerID {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "you do not have access to this transaction",
			})
			return
		}
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to find listing",
		})
		return
	}

	var conversation models.Conversation

	err = db.QueryRowContext(
		ctx,
		`INSERT INTO conversations (
			listing_id,
			item_title,
			buyer_id,
			seller_id
		)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (listing_id, buyer_id, seller_id)
		DO UPDATE SET item_title = EXCLUDED.item_title
		RETURNING
			id,
			listing_id,
			item_title,
			buyer_id,
			seller_id,
			created_at`,
		request.ListingID,
		title,
		buyerID,
		sellerID,
	).Scan(
		&conversation.ID,
		&conversation.ListingID,
		&conversation.ItemTitle,
		&conversation.BuyerID,
		&conversation.SellerID,
		&conversation.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to create chat",
		})
		return
	}

	conversation.OtherUserID = sellerID

	if request.UserID == sellerID {
		conversation.OtherUserID = buyerID
	}

	err = db.QueryRowContext(
		ctx,
		`SELECT username
		 FROM users
		 WHERE id = $1`,
		conversation.OtherUserID,
	).Scan(&conversation.OtherUsername)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to get chat user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"conversation": conversation,
	})
}

func GetUserConversations(c *gin.Context) {
	db := initializers.GetDB()

	userID, err := strconv.Atoi(c.Query("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	rows, err := db.QueryContext(
		c.Request.Context(),
		`SELECT
			conversations.id,
			conversations.listing_id,
			COALESCE(conversations.item_title, ''),
			CASE
				WHEN conversations.buyer_id = $1
				THEN conversations.seller_id
				ELSE conversations.buyer_id
			END,
			users.username,
			last_message.message,
			last_message.created_at,
			CASE
				WHEN last_message.id IS NOT NULL
				 AND last_message.sender_id <> $1
				 AND last_message.read_at IS NULL
				THEN TRUE
				ELSE FALSE
			END
		FROM conversations
		JOIN users
			ON users.id = CASE
				WHEN conversations.buyer_id = $1
				THEN conversations.seller_id
				ELSE conversations.buyer_id
			END
		LEFT JOIN LATERAL (
			SELECT
				id,
				sender_id,
				message,
				created_at,
				read_at
			FROM messages
			WHERE messages.conversation_id = conversations.id
			ORDER BY created_at DESC, id DESC
			LIMIT 1
		) AS last_message ON TRUE
		WHERE conversations.buyer_id = $1
		   OR conversations.seller_id = $1
		ORDER BY COALESCE(
			last_message.created_at,
			conversations.created_at
		) DESC`,
		userID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to get chats",
		})
		return
	}
	defer rows.Close()

	conversations := []models.ChatSummary{}

	for rows.Next() {
		var conversation models.ChatSummary
		var lastMessage sql.NullString
		var lastMessageAt sql.NullTime

		err := rows.Scan(
			&conversation.ID,
			&conversation.ListingID,
			&conversation.ItemTitle,
			&conversation.OtherUserID,
			&conversation.OtherUsername,
			&lastMessage,
			&lastMessageAt,
			&conversation.Unread,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to read chats",
			})
			return
		}

		if lastMessage.Valid {
			value := lastMessage.String
			conversation.LastMessage = &value
		}

		if lastMessageAt.Valid {
			value := lastMessageAt.Time
			conversation.LastMessageAt = &value
		}

		conversations = append(conversations, conversation)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to read chats",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"conversations": conversations,
	})
}

func MarkConversationRead(c *gin.Context) {
	db := initializers.GetDB()
	ctx := c.Request.Context()

	conversationID, err := strconv.Atoi(
		c.Param("conversationId"),
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid conversation id",
		})
		return
	}

	var request models.MarkConversationReadRequest

	if err := c.ShouldBindJSON(&request); err != nil ||
		request.UserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid user id",
		})
		return
	}

	var isParticipant bool

	err = db.QueryRowContext(
		ctx,
		`SELECT EXISTS (
			SELECT 1
			FROM conversations
			WHERE id = $1
			  AND (buyer_id = $2 OR seller_id = $2)
		)`,
		conversationID,
		request.UserID,
	).Scan(&isParticipant)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to verify chat access",
		})
		return
	}

	if !isParticipant {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "you do not have access to this chat",
		})
		return
	}

	_, err = db.ExecContext(
		ctx,
		`UPDATE messages
		 SET read_at = NOW()
		 WHERE conversation_id = $1
		   AND sender_id <> $2
		   AND read_at IS NULL`,
		conversationID,
		request.UserID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to mark messages as read",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "chat marked as read",
	})
}

func SetConversationPriceOffer(c *gin.Context) {
	db := initializers.GetDB()
	ctx := c.Request.Context()

	conversationID, err := strconv.Atoi(
		c.Param("conversationId"),
	)

	if err != nil || conversationID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid conversation id",
		})
		return
	}

	var request models.PriceOfferRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid price offer data",
		})
		return
	}

	if request.SellerID <= 0 ||
		math.IsNaN(request.Price) ||
		math.IsInf(request.Price, 0) ||
		request.Price <= 0 {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "price must be more than 0",
		})
		return
	}

	request.Price = math.Round(request.Price*100) / 100

	tx, err := db.BeginTx(ctx, nil)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to start price offer",
		})
		return
	}

	committed := false

	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	var listingID int
	var sellerID int
	var originalPrice float64

	err = tx.QueryRowContext(
		ctx,
		`SELECT
			conversations.listing_id,
			conversations.seller_id,
			listings.price
		FROM conversations
		JOIN listings
			ON listings.id = conversations.listing_id
		WHERE conversations.id = $1
		FOR UPDATE`,
		conversationID,
	).Scan(
		&listingID,
		&sellerID,
		&originalPrice,
	)

	if errors.Is(err, sql.ErrNoRows) {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "listing is no longer available",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to load listing price",
		})
		return
	}

	if request.SellerID != sellerID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "only the seller can set a special price",
		})
		return
	}

	if request.Price > originalPrice {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "special price cannot be higher than the listing price",
		})
		return
	}

	var offerMessage models.OutgoingMessage
	var activeOfferID int

	err = tx.QueryRowContext(
		ctx,
		`SELECT id
		FROM messages
		WHERE conversation_id = $1
		  AND message_type = 'price_offer'
		  AND offer_status = 'active'
		ORDER BY id DESC
		LIMIT 1
		FOR UPDATE`,
		conversationID,
	).Scan(&activeOfferID)

	if err == nil {
		err = tx.QueryRowContext(
			ctx,
			`UPDATE messages
			SET offer_price = $1,
				message = 'Price Offered',
				created_at = NOW(),
				read_at = NULL
			WHERE id = $2
			RETURNING
				id,
				conversation_id,
				sender_id,
				message,
				message_type,
				offer_price,
				offer_status,
				created_at`,
			request.Price,
			activeOfferID,
		).Scan(
			&offerMessage.ID,
			&offerMessage.ConversationID,
			&offerMessage.SenderID,
			&offerMessage.Message,
			&offerMessage.MessageType,
			&offerMessage.OfferPrice,
			&offerMessage.OfferStatus,
			&offerMessage.CreatedAt,
		)
	} else if errors.Is(err, sql.ErrNoRows) {
		err = tx.QueryRowContext(
			ctx,
			`INSERT INTO messages (
				conversation_id,
				sender_id,
				message,
				message_type,
				offer_price,
				offer_status
			)
			VALUES (
				$1,
				$2,
				'Price Offered',
				'price_offer',
				$3,
				'active'
			)
			RETURNING
				id,
				conversation_id,
				sender_id,
				message,
				message_type,
				offer_price,
				offer_status,
				created_at`,
			conversationID,
			sellerID,
			request.Price,
		).Scan(
			&offerMessage.ID,
			&offerMessage.ConversationID,
			&offerMessage.SenderID,
			&offerMessage.Message,
			&offerMessage.MessageType,
			&offerMessage.OfferPrice,
			&offerMessage.OfferStatus,
			&offerMessage.CreatedAt,
		)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to save price offer",
		})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to complete price offer",
		})
		return
	}

	committed = true

	broadcastToRoom(
		conversationID,
		offerMessage,
	)

	c.JSON(http.StatusOK, gin.H{
		"message": offerMessage,
	})
}
