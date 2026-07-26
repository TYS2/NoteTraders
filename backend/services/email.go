package services

import (
	"os"

	"github.com/resend/resend-go/v2"
)

func SendEmail(to string, subject string, body string) error {
	client := resend.NewClient(os.Getenv("RESEND_API_KEY"))

	params := &resend.SendEmailRequest{
		From:    "onboarding@resend.dev",
		To:      []string{to},
		Subject: subject,
		Html:    body,
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		return err
	}
	return nil
}