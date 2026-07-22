package models

import "time"

type User struct {
	AccountID         int     `json:"id"`
	Username          string  `json:"username"`
	Password          string  `json:"password"`
	Email             string  `json:"email" binding:"required,email"`
	PhoneNumber       string  `json:"phoneNumber" binding:"required"`
	Balance           float64 `json:"balance"`
	ProfilePictureUrl string  `json:"profilePictureUrl"`
}

type UserTransaction struct {
	AccountID int     `json:"id"`
	Amount    float64 `json:"amount"`
}

type LoginUser struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UpdateUser struct {
	AccountID   int    `json:"id" binding:"required"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	Email       string `json:"email" `
	PhoneNumber string `json:"phoneNumber"`
}

type CreateListing struct {
	Title         string  `json:"title" binding:"required"`
	Description   string  `json:"description" binding:"required"`
	Price         float64 `json:"price" binding:"required"`
	Seller        string  `json:"seller" binding:"required"`
	AcademicLevel string  `json:"academicLevel" binding:"required"`
	Subject       string  `json:"subject" binding:"required"`
}

type Listing struct {
	ListingID     int     `json:"id" binding:"required"`
	Title         string  `json:"title"`
	Description   string  `json:"description"`
	Price         float64 `json:"price"`
	Seller        string  `json:"seller"`
	AcademicLevel string  `json:"academicLevel"`
	Subject       string  `json:"subject"`
	PhotoUrl      string  `json:"photoUrl"`
}

type DeleteListing struct {
	ListingID int `json:"id" binding:"required"`
}

type Subject struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Level struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Purchase struct {
	BuyerID   int `json:"buyerID" binding:"required"`
	ListingID int `json:"listingID" binding:"required"`
}

type TransactionHistoryItem struct {
	ID             int       `json:"id"`
	ListingID      int       `json:"listingID"`
	Title          string    `json:"title"`
	Price          float64   `json:"price"`
	BuyerUsername  string    `json:"buyerUsername"`
	SellerUsername string    `json:"sellerUsername"`
	PurchasedAt    time.Time `json:"purchasedAt"`
}

type TransactionHistoryEntry struct {
	ID              int       `json:"id"`
	TransactionType string    `json:"transactionType"`
	Title           string    `json:"title"`
	Amount          float64   `json:"amount"`
	CreatedAt       time.Time `json:"createdAt"`
}

type IncomingMessage struct {
	ConversationID int    `json:"conversation_id"`
	Message string `json:"message"`
}

type OutgoingMessage struct {
	ID             int       `json:"id"`
	ConversationID int      `json:"conversation_id"`
	SenderID       int      `json:"sender_id"`
	Message        string   `json:"message"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreateConversationRequest struct {
	BuyerID   int `json:"buyer_id"`
	SellerID  int `json:"seller_id"`
}

type Conversation struct {
	ID        int       `json:"id"`
	BuyerID   int      `json:"buyer_id"`
	SellerID  int      `json:"seller_id"`
	CreatedAt time.Time `json:"created_at"`
}

type Favourite struct {
	UserID    int `json:"user_id"`
	ListingID int `json:"listing_id"`
}