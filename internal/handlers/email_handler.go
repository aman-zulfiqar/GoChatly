// internal/handlers/email_handler.go
package handlers

import (
    "gochat-server/internal/models"
    "gochat-server/internal/queue"
    "net/http"

    "github.com/labstack/echo/v4"
)

type EmailHandler struct {
    queueManager *queue.Manager
}

func NewEmailHandler(queueManager *queue.Manager) *EmailHandler {
    return &EmailHandler{
        queueManager: queueManager,
    }
}

func (h *EmailHandler) QueueEmail(c echo.Context) error {
    var payload models.EmailPayload
    if err := c.Bind(&payload); err != nil {
        return c.JSON(http.StatusBadRequest, map[string]string{
            "error": "Invalid request payload",
        })
    }

    if payload.To == "" || payload.Subject == "" || payload.Body == "" {
        return c.JSON(http.StatusBadRequest, map[string]string{
            "error": "Missing required fields: to, subject, body",
        })
    }

    if err := h.queueManager.QueueEmail(&payload); err != nil {
        return c.JSON(http.StatusInternalServerError, map[string]string{
            "error": "Failed to queue email",
        })
    }

    return c.JSON(http.StatusOK, map[string]string{
        "message": "Email queued successfully",
    })
}
