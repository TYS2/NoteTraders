package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"database/sql"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func AddLevel(c *gin.Context) {
	client := initializers.GetDB()

	var level models.Level
	if err := c.ShouldBindJSON(&level); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please fill in all required fields correctly"})
		return
	}

	level.Name = strings.TrimSpace(level.Name)

	err := client.QueryRowContext(
		context.Background(),
		`INSERT INTO academic_levels (level_name) VALUES ($1) RETURNING id`,
		level.Name,
	).Scan(&level.ID)
	
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "Level already exists"})
		}else{
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add level"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Level added successfully", "level": level})
}

func GetLevelsID(c *gin.Context) {
	levelName := strings.TrimSpace(c.Param("levelName"))

	level, err := getLevelIDByName(levelName)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Level not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve level ID"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"level": level})
}

func getLevelIDByName(levelName string) (int, error) {
	client := initializers.GetDB()

	var levelID int
	err := client.QueryRowContext(
		context.Background(),
		`SELECT id FROM academic_levels WHERE level_name = $1`,
		levelName,
	).Scan(&levelID)

	if err == nil {
		return levelID, nil
	}

	if errors.Is(err, sql.ErrNoRows) {
		err = client.QueryRowContext(
			context.Background(),
			`INSERT INTO academic_levels (level_name)
			 VALUES ($1)
			 RETURNING id`,
			levelName,
		).Scan(&levelID)

		if err != nil {
			return 0, err
		}

		return levelID, nil
	}
	return 0, err
}

func getLevelByID(levelID int) (string, error) {
	client := initializers.GetDB()

	var levelName string
	err := client.QueryRowContext(
		context.Background(),
		`SELECT level_name FROM academic_levels WHERE id = $1`,
		levelID,
	).Scan(&levelName)

	if err != nil {
		return "", err
	}
	return levelName, nil
}