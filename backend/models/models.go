package models


type User struct {
	AccountID   int			 `json:"id"`
	Username    string        `json:"username"`
	Password    string        `json:"password"`
	Email       string        `json:"email" binding:"required,email"`
	PhoneNumber string        `json:"phoneNumber" binding:"required"`
}

type LoginUser struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UpdateUser struct {
	AccountID   int			 `json:"id" binding:"required"`
	Username    string        `json:"username"`
	Password    string        `json:"password"`
	Email       string        `json:"email" `
	PhoneNumber string        `json:"phoneNumber"`
}

type CreateListing struct {
	ListingID     int  `json:"id"`
	Title         string  `json:"title" binding:"required"`
	Description   string  `json:"description" binding:"required"`
	Price         float64 `json:"price" binding:"required"`
	SellerID      int  `json:"seller" binding:"required"`
	AcademicLevelID int  `json:"academicLevel" binding:"required"`
	SubjectID       int  `json:"subject" binding:"required"`
}

type Listing struct {
	ListingID     int `json:"id" binding:"required"`
	Title         string        `json:"title" `
	Description   string        `json:"description"`
	Price         float64       `json:"price" `
	SellerID      int        `json:"seller" binding:"required"`
	AcademicLevelID int        `json:"academicLevel" `
	SubjectID       int        `json:"subject" `
}

type DeleteListing struct {
	ListingID int `json:"id" binding:"required"`
}

type Subject struct {
	ID int `json:"id"`
	Name      string `json:"name"`
}

type Level struct {
	ID int `json:"id"`
	Name    string `json:"name"`
}

