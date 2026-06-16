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
	Title         string  `json:"title" binding:"required"`
	Description   string  `json:"description" binding:"required"`
	Price         float64 `json:"price" binding:"required"`
	Seller      string  `json:"seller" binding:"required"`
	AcademicLevel string  `json:"academicLevel" binding:"required"`
	Subject       string  `json:"subject" binding:"required"`
}

type Listing struct {
	ListingID     int `json:"id" binding:"required"`
	Title         string        `json:"title" `
	Description   string        `json:"description"`
	Price         float64       `json:"price" `
	Seller      string  `json:"seller"`
	AcademicLevel string  `json:"academicLevel" `
	Subject       string  `json:"subject" `
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

