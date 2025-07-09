package queue

import (
	"context"
	"encoding/json"
	"time"

	"gochat-server/internal/models"
	"gochat-server/internal/services"

	"github.com/hibiken/asynq"
	"github.com/sirupsen/logrus"
)

const (
	TypeEmailNotification = "email:notification"
)

type Manager struct {
	client       *asynq.Client
	server       *asynq.Server
	emailService *services.EmailService
}

func NewManager(redisAddr string, emailService *services.EmailService) *Manager {
	client := asynq.NewClient(asynq.RedisClientOpt{Addr: redisAddr})

	server := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
			RetryDelayFunc: asynq.DefaultRetryDelayFunc,
		},
	)

	return &Manager{
		client:       client,
		server:       server,
		emailService: emailService,
	}
}

func (m *Manager) QueueEmail(payload *models.EmailPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	task := asynq.NewTask(TypeEmailNotification, data)

	_, err = m.client.Enqueue(
		task,
		asynq.MaxRetry(3),
		asynq.Queue("default"),
		asynq.Timeout(30*time.Second),
	)

	if err != nil {
		logrus.Error("Failed to enqueue email task: ", err)
		return err
	}

	logrus.WithFields(logrus.Fields{
		"to":      payload.To,
		"subject": payload.Subject,
	}).Info("Email queued successfully")

	return nil
}

func (m *Manager) StartWorker() {
	mux := asynq.NewServeMux()
	mux.HandleFunc(TypeEmailNotification, m.handleEmailNotification)

	if err := m.server.Run(mux); err != nil {
		logrus.Fatal("Failed to start worker: ", err)
	}
}

func (m *Manager) handleEmailNotification(ctx context.Context, t *asynq.Task) error {
	var payload models.EmailPayload
	if err := json.Unmarshal(t.Payload(), &payload); err != nil {
		return err
	}

	return (*m.emailService).SendEmail(&payload)
}

func (m *Manager) Shutdown() {
	m.client.Close()
	m.server.Shutdown()
}
