package services

import (
	"context"
	"fmt"
	"mime/multipart"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func sanitizeFileName(name string) string {
	name = filepath.Base(name)
	name = strings.ReplaceAll(name, " ", "_")

	re := regexp.MustCompile(`[^a-zA-Z0-9._-]`)
	return re.ReplaceAllString(name, "")
}

func buildPublicURL(baseURL, key string) string {
	parts := strings.Split(key, "/")
	for i, part := range parts {
		parts[i] = url.PathEscape(part)
	}
	return strings.TrimRight(baseURL, "/") + "/" + strings.Join(parts, "/")
}

func UploadFileToR2(
	ctx context.Context,
	client *s3.Client,
	bucket string,
	prefix string,
	fileHeader *multipart.FileHeader,
) (string, string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", "", err
	}
	defer file.Close()

	safeName := sanitizeFileName(fileHeader.Filename)
	key := fmt.Sprintf("%s/%d-%s", prefix, time.Now().UnixNano(), safeName)

	contentType := fileHeader.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	_, err = client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(bucket),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", "", err
	}

	baseURL := os.Getenv("R2_PUBLIC_BASE_URL")
	publicURL := ""
	if baseURL != "" {
		publicURL = buildPublicURL(baseURL, key)
	}

	return key, publicURL, nil
}