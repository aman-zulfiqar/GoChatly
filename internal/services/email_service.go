package services

import (
    "gochat-server/internal/config"
    "gochat-server/internal/models"
    "fmt"
    "net/smtp"

    "github.com/sirupsen/logrus"
)

type EmailService struct {
    config *config.Config
}

func NewEmailService(cfg *config.Config) *EmailService {
    return &EmailService{
        config: cfg,
    }
}

func (s *EmailService) SendEmail(payload *models.EmailPayload) error {
    // Mock SMTP implementation for MailHog
    auth := smtp.PlainAuth("", s.config.SMTPUser, s.config.SMTPPass, s.config.SMTPHost)

    to := []string{payload.To}
    msg := []byte("To: " + payload.To + "\r\n" +
        "Subject: " + payload.Subject + "\r\n" +
        "\r\n" +
        payload.Body + "\r\n")

    addr := fmt.Sprintf("%s:%s", s.config.SMTPHost, s.config.SMTPPort)
    err := smtp.SendMail(addr, auth, "noreply@chatserver.com", to, msg)

    if err != nil {
        logrus.WithFields(logrus.Fields{
            "to":    payload.To,
            "error": err.Error(),
        }).Error("Failed to send email")
        return err
    }

    logrus.WithFields(logrus.Fields{
        "to":      payload.To,
        "subject": payload.Subject,
    }).Info("Email sent successfully")

    return nil
}
