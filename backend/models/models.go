package models

import "go.mongodb.org/mongo-driver/v2/bson"

type User struct {
	Username string `json:"username" bson:"username"`
	Password string `json:"password" bson:"password"`
	Email   string `json:"email" bson:"email" binding:"required,email"`
}

type UpdateUser struct {
	ID       bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Username string        `json:"username" bson:"username"`
	Password string        `json:"password" bson:"password"`
	Email    string        `json:"email" bson:"email"`
}

type CreateListing struct {
	Title       string  `json:"title" bson:"title"`
	Description string  `json:"description" bson:"description"`
	Price       float64 `json:"price" bson:"price"`
	Seller      string  `json:"seller" bson:"seller"`
	AcademicLevel string  `json:"academicLevel" bson:"academicLevel"`
	Subject 	  string  `json:"subject" bson:"subject"`
}

type Listing struct {
	ID          bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Title       string  `json:"title" bson:"title"`
	Description string  `json:"description" bson:"description"`
	Price       float64 `json:"price" bson:"price"`
	Seller      string  `json:"seller" bson:"seller"`
	AcademicLevel string  `json:"academicLevel" bson:"academicLevel"`
	Subject 	  string  `json:"subject" bson:"subject"`
}

type DeleteListing struct {
	ID bson.ObjectID `json:"id" bson:"_id,omitempty"`
}
