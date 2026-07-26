package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"os"

	"backend/initializers"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func setupRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.POST("/listings", CreateListing)
	r.GET("/listings", GetListings)

	return r
}

func TestMain(m *testing.M) {
	initializers.ConnectDB()
	code := m.Run()
	os.Exit(code)
}

func TestCreateListing_InvalidJSON(t *testing.T) {
	r := setupRouter()

	req := httptest.NewRequest(http.MethodPost, "/listings", strings.NewReader("{invalid json"))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid listing data")
}

func TestGetListings_NegativeMinPrice(t *testing.T) {
	r := setupRouter()

	req := httptest.NewRequest(http.MethodGet, "/listings?min_price=-1", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid minimum price filter")
}


func TestGetListings_NoFilters(t *testing.T) {
	r := setupRouter()

	req := httptest.NewRequest(http.MethodGet, "/listings", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}