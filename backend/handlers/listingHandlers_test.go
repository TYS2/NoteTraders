package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"backend/initializers"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	initializers.ConnectDB()

	code := m.Run()
	os.Exit(code)
}

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.POST("/listings", CreateListing)
	r.GET("/listings", GetListings)
	r.POST("/listings/:id/photo", UploadListingPicture)
	r.GET("/search", SearchListings)

	return r
}

// No DB needed.

func TestCreateListing_InvalidJSON(t *testing.T) {
	r := setupRouter()

	req := httptest.NewRequest(http.MethodPost, "/listings", strings.NewReader("{invalid json"))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid listing data")
}

func TestGetListings_InvalidMinPrice(t *testing.T) {
	r := setupRouter()

	req := httptest.NewRequest(http.MethodGet, "/listings?min_price=abc", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid minimum price filter")
}

func TestUploadListingPicture_InvalidID(t *testing.T) {
	r := setupRouter()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/listings/abc/photo", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid listing ID")
}

// DB needed.

func TestGetListings_NoFilters_DB(t *testing.T) {
	if initializers.GetDB() == nil {
		t.Skip("DATABASE_URL not set or DB not connected")
	}

	r := setupRouter()

	req := httptest.NewRequest(http.MethodGet, "/listings", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "listings")
}
