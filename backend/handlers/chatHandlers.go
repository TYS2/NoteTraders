package handlers

import (
	"context"
	"net/http"
	"strconv"
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

	conversationID, err := strconv.Atoi(c.Param("conversationId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation id"})
		return
	}

	// Temporary for testing.
	// Better approach: get this from JWT instead.
	senderID, err := strconv.Atoi(c.Query("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
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

		err := conn.ReadJSON(&incoming)
		if err != nil {
			break
		}

		if incoming.Message == "" {
			continue
		}

		var savedMessage models.OutgoingMessage

		err = db.QueryRowContext(
			context.Background(),
			`INSERT INTO messages (conversation_id, sender_id, message)
			 VALUES ($1, $2, $3)
			 RETURNING id, conversation_id, sender_id, message, created_at`,
			conversationID,
			senderID,
			incoming.Message,
		).Scan(
			&savedMessage.ID,
			&savedMessage.ConversationID,
			&savedMessage.SenderID,
			&savedMessage.Message,
			&savedMessage.CreatedAt,
		)

		if err != nil {
			conn.WriteJSON(gin.H{"error": "failed to save message"})
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

	conversationID, err := strconv.Atoi(c.Param("conversationId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid conversation id"})
		return
	}

	rows, err := db.QueryContext(
		context.Background(),
		`SELECT id, conversation_id, sender_id, message, created_at
		 FROM messages
		 WHERE conversation_id = $1
		 ORDER BY created_at ASC`,
		conversationID,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get messages"})
		return
	}

	defer rows.Close()

	messages := []models.OutgoingMessage{}

	for rows.Next() {
		var message models.OutgoingMessage

		err := rows.Scan(
			&message.ID,
			&message.ConversationID,
			&message.SenderID,
			&message.Message,
			&message.CreatedAt,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read messages"})
			return
		}

		messages = append(messages, message)
	}

	c.JSON(http.StatusOK, messages)
}

func CreateConversation(c *gin.Context) {
	db := initializers.GetDB()

	var request models.CreateConversationRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid conversation data",
		})
		return
	}

	if request.BuyerID == 0 || request.SellerID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "buyer_id and seller_id are required",
		})
		return
	}

	if request.BuyerID == request.SellerID {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "buyer and seller cannot be the same user",
		})
		return
	}

	var conversation models.Conversation

	err := db.QueryRowContext(
		context.Background(),
		`INSERT INTO conversations (buyer_id, seller_id)
		 VALUES ($1, $2)
		 ON CONFLICT (buyer_id, seller_id)
		 DO UPDATE SET buyer_id = EXCLUDED.buyer_id
		 RETURNING id, buyer_id, seller_id, created_at`,
		request.BuyerID,
		request.SellerID,
	).Scan(
		&conversation.ID,
		&conversation.BuyerID,
		&conversation.SellerID,
		&conversation.CreatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err,
		})
		return
	}

	c.JSON(http.StatusOK, conversation)
}