package handlers

import (
	"database/sql"
	"errors"
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
				message
			)
			VALUES ($1, $2, $3)
			RETURNING
				id,
				conversation_id,
				sender_id,
				message,
				created_at`,
			conversationID,
			senderID,
			messageText,
		).Scan(
			&savedMessage.ID,
			&savedMessage.ConversationID,
			&savedMessage.SenderID,
			&savedMessage.Message,
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
