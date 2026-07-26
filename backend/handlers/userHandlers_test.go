package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupUserRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.POST("/signup", Signup)
	r.POST("/login", Login)
	r.PUT("/user", UpdateUser)
	r.GET("/users/:id", GetUser)
	r.POST("/users/:id/photo", UploadProfilePicture)

	return r
}

func TestSignup_InvalidJSON(t *testing.T) {
	r := setupUserRouter()

	req := httptest.NewRequest(http.MethodPost, "/signup", strings.NewReader("{invalid json"))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Please fill in all required fields correctly")
}

func TestSignup_WeakPassword(t *testing.T) {
	r := setupUserRouter()

	body := `{
		"username": "john",
		"email": "john@example.com",
		"phoneNumber": "12345678",
		"password": "weakpass"
	}`

	req := httptest.NewRequest(http.MethodPost, "/signup", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Password must be at least 8 characters")
}

func TestLogin_InvalidJSON(t *testing.T) {
	r := setupUserRouter()

	req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader("{invalid json"))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid login data")
}

func TestUpdateUser_EmptyUsername(t *testing.T) {
	r := setupUserRouter()

	body := `{
		"id": 1,
		"username": "   ",
		"email": "john@example.com",
		"phoneNumber": "12345678"
	}`

	req := httptest.NewRequest(http.MethodPut, "/user", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Username cannot be empty")
}

func TestUpdateUser_InvalidEmail(t *testing.T) {
	r := setupUserRouter()

	body := `{
		"id": 1,
		"username": "john",
		"email": "not-an-email",
		"phoneNumber": "12345678"
	}`

	req := httptest.NewRequest(http.MethodPut, "/user", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid email format")
}

func TestGetUser_InvalidID(t *testing.T) {
	r := setupUserRouter()

	req := httptest.NewRequest(http.MethodGet, "/users/abc", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid user ID")
}

func TestUploadProfilePicture_InvalidID(t *testing.T) {
	r := setupUserRouter()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/users/abc/photo", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUploadProfilePicture_MissingFile(t *testing.T) {
	r := setupUserRouter()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/users/1/photo", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "profile_picture is required")
}