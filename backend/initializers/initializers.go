package initializers

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var DB *mongo.Client

func ConnectDB() {
	uri := "mongodb://localhost:27017/?directConnection=true"
	if uri == "" {
		log.Fatal("Set your 'MONGODB_URI' environment variable.")
	}
	serverAPI := options.ServerAPI(options.ServerAPIVersion1)
	opts := options.Client().ApplyURI(uri).SetServerAPIOptions(serverAPI)
	var err error
	DB, err = mongo.Connect(opts)
	if err != nil {
		log.Fatal("Could not connect to MongoDB:", err)
	}

	// Pings the database to verify connection
	if err := DB.Ping(context.TODO(), nil); err != nil {
		log.Fatal("Could not ping MongoDB:", err)
	}
}

func GetDB() *mongo.Client {
	return DB
}
