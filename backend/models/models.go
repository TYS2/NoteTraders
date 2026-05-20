package models

type User struct {
	Username string `json:"username" bson:"username"`
	Password string `json:"password" bson:"password"`1
}

type Listing struct {
	Title       string  `json:"title" bson:"title"`
	Description string  `json:"description" bson:"description"`
	Price       float64 `json:"price" bson:"price"`
	Seller      string  `json:"seller" bson:"seller"`
	AcademicLevel string  `json:"academicLevel" bson:"academicLevel"`
	Subject 	  string  `json:"subject" bson:"subject"`
	CreatedAt time.Time
}