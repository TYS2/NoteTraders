package initializers

import (
	"context"
	"log"
	"os"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var DB *mongo.Client

func ConnectDB() {
	er := godotenv.Load()
	if er != nil {
		log.Fatal("Error loading .env file:", er)
	}
	uri := os.Getenv("MONGODB_URI")
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
