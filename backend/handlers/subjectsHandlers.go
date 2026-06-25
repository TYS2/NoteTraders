package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"log"
	"database/sql"

	"backend/initializers"
	"backend/models"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

func AddSubject(c *gin.Context) {
	client := initializers.GetDB()

	var subject models.Subject
	if err := c.ShouldBindJSON(&subject); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Please fill in all required fields correctly"})
		return
	}

	subject.Name = strings.TrimSpace(subject.Name)

	err := client.QueryRowContext(
		context.Background(),
		`INSERT INTO subjects (subject_name) VALUES ($1) RETURNING id`,
		subject.Name,
	).Scan(&subject.ID)
	
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "Subject already exists"})
		}else{
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add subject"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subject added successfully", "subject": subject})
}

func GetSubjectsID(c *gin.Context) {
	subjectName := strings.TrimSpace(c.Param("subjectName"))

	subject, err := getSubjectIDByName(subjectName)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Subject not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve subject ID"})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"subject": subject})
}

func getSubjectIDByName(subjectName string) (int, error) {
	client := initializers.GetDB()

	var subjectID int
	err := client.QueryRowContext(
		context.Background(),
		`SELECT id FROM subjects WHERE subject_name = $1`,
		subjectName,
	).Scan(&subjectID)
	log.Println(err)

	if err == nil {
		return subjectID, nil
	}

	if errors.Is(err, sql.ErrNoRows) {
		err = client.QueryRowContext(
			context.Background(),
			`INSERT INTO subjects (subject_name)
			 VALUES ($1)
			 RETURNING id`,
			subjectName,
		).Scan(&subjectID)

		if err != nil {
			return 0, err
		}

		return subjectID, nil
	}

	return 0, err
}

func getSubjectByID(subjectID int) (string, error) {
	client := initializers.GetDB()

	var subjectName string
	err := client.QueryRowContext(
		context.Background(),
		`SELECT subject_name FROM subjects WHERE id = $1`,
		subjectID,
	).Scan(&subjectName)

	if err != nil {
		return "", err
	}
	return subjectName, nil
}
