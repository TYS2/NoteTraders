package utils

import ("golang.org/x/crypto/bcrypt"
 "fmt"
 "math/rand")

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)
	return string(bytes), err
}

func CheckPassword(password, hashedPassword string) error {
	return bcrypt.CompareHashAndPassword(
		[]byte(hashedPassword),
		[]byte(password),
	)
}

func GenerateOTP() (string, string) {
	otp := fmt.Sprintf("%06d", rand.Intn(1000000))
	hash, _ := HashPassword(otp)
	return otp, hash
}