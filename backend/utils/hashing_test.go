package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestHashPassword(t *testing.T) {
	password := "Password123!"

	hash, err := HashPassword(password)

	require.NoError(t, err)
	assert.NotEmpty(t, hash)

	assert.NotEqual(t, password, hash) //hash should not be equal to the original password
}