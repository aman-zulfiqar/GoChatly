// internal/hub/hub.go
package hub

import (
    "gochat-server/internal/models"
    "gochat-server/internal/queue"
    "gochat-server/internal/services"
    "encoding/json"
    "sync"
    "time"

    "github.com/gorilla/websocket"
    "github.com/sirupsen/logrus"
)

type Client struct {
    Hub      *Hub
    Conn     *websocket.Conn
    Send     chan []byte
    RoomID   string
    UserID   string
    Username string
}

type Hub struct {
    Rooms          map[string]*models.Room
    Register       chan *Client
    Unregister     chan *Client
    Broadcast      chan *models.WSMessage
    MessageService *services.MessageService
    QueueManager   *queue.Manager
    UserService    *services.UserService
    mu             sync.RWMutex
}

func NewHub(msgService *services.MessageService, queueMgr *queue.Manager, userService *services.UserService) *Hub {
    return &Hub{
        Rooms:          make(map[string]*models.Room),
        Register:       make(chan *Client),
        Unregister:     make(chan *Client),
        Broadcast:      make(chan *models.WSMessage),
        MessageService: msgService,
        QueueManager:   queueMgr,
        UserService:    userService,
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.Register:
            h.registerClient(client)

        case client := <-h.Unregister:
            h.unregisterClient(client)

        case message := <-h.Broadcast:
            h.broadcastMessage(message)
        }
    }
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.Rooms[client.RoomID] == nil {
		h.Rooms[client.RoomID] = &models.Room{
			ID:    client.RoomID,
			Name:  client.RoomID,
			Users: make(map[string]*models.User),
		}
	}

	room := h.Rooms[client.RoomID]
	user := &models.User{
		ID:       client.UserID,
		Username: client.Username,
		RoomID:   client.RoomID,
		Online:   true,
	}

	room.Users[client.UserID] = user
	room.ActiveUsers = len(room.Users)

	// Register client in UserService
	h.UserService.AddClient(client.UserID, client.RoomID, client)

	// Notify room about new user
	h.broadcastToRoom(client.RoomID, &models.WSMessage{
		Type:     "user_joined",
		RoomID:   client.RoomID,
		UserID:   client.UserID,
		Username: client.Username,
		Data:     h.getRoomUsers(client.RoomID),
	})

	logrus.WithFields(logrus.Fields{
		"user_id": client.UserID,
		"room_id": client.RoomID,
	}).Info("User joined room")
}

func (h *Hub) unregisterClient(client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()

    if room := h.Rooms[client.RoomID]; room != nil {
        if _, exists := room.Users[client.UserID]; exists {
            delete(room.Users, client.UserID)
            room.ActiveUsers = len(room.Users)
            close(client.Send)

            // Remove client from UserService
            h.UserService.RemoveClient(client.UserID, client.RoomID, client)

            // Clean up empty rooms
            if len(room.Users) == 0 {
                delete(h.Rooms, client.RoomID)
            } else {
                // Notify room about user leaving
                h.broadcastToRoom(client.RoomID, &models.WSMessage{
                    Type:     "user_left",
                    RoomID:   client.RoomID,
                    UserID:   client.UserID,
                    Username: client.Username,
                    Data:     h.getRoomUsers(client.RoomID),
                })
            }

            logrus.WithFields(logrus.Fields{
                "user_id": client.UserID,
                "room_id": client.RoomID,
            }).Info("User left room")
        }
    }
}

func (h *Hub) broadcastMessage(message *models.WSMessage) {
    h.mu.RLock()
    room := h.Rooms[message.RoomID]
    h.mu.RUnlock()

    if room == nil {
        return
    }

    // Save message to database
    if message.Type == "message" {
        msg := &models.Message{
            RoomID:    message.RoomID,
            UserID:    message.UserID,
            Username:  message.Username,
            Content:   message.Content,
            Timestamp: time.Now(),
        }

        if err := h.MessageService.SaveMessage(msg); err != nil {
            logrus.Error("Failed to save message: ", err)
        }

        // Queue email notifications for offline users
        h.queueEmailNotifications(message, room)
    }

    // Broadcast to all users in room
    h.broadcastToRoom(message.RoomID, message)
}

func (h *Hub) broadcastToRoom(roomID string, message *models.WSMessage) {
	h.mu.RLock()
	room := h.Rooms[roomID]
	h.mu.RUnlock()

	if room == nil {
		return
	}

	data, err := json.Marshal(message)
	if err != nil {
		logrus.Error("Failed to marshal message: ", err)
		return
	}

	for userID := range room.Users {
		// Get clients as []interface{}
		if clients := h.UserService.GetUserClients(userID, roomID); clients != nil {
			for _, clientInterface := range clients {
				client, ok := clientInterface.(*Client) // Type assertion
				if !ok {
					logrus.Warn("Invalid client type in user service")
					continue
				}

				select {
				case client.Send <- data:
				default:
					close(client.Send)
					h.UserService.RemoveClient(userID, roomID, client)
				}
			}
		}
	}
}

func (h *Hub) queueEmailNotifications(message *models.WSMessage, room *models.Room) {
    // In a real implementation, you'd check which users are actually offline
    // For now, we'll simulate some offline users
    offlineUsers := []string{"offline_user1@example.com", "offline_user2@example.com"}

    for _, email := range offlineUsers {
        payload := &models.EmailPayload{
            To:      email,
            Subject: "New message in " + room.Name,
            Body:    message.Username + ": " + message.Content,
        }

        if err := h.QueueManager.QueueEmail(payload); err != nil {
            logrus.Error("Failed to queue email: ", err)
        }
    }
}

func (h *Hub) getRoomUsers(roomID string) []*models.User {
    room := h.Rooms[roomID]
    if room == nil {
        return []*models.User{}
    }

    users := make([]*models.User, 0, len(room.Users))
    for _, user := range room.Users {
        users = append(users, user)
    }
    return users
}

func (h *Hub) GetRoom(roomID string) *models.Room {
    h.mu.RLock()
    defer h.mu.RUnlock()
    return h.Rooms[roomID]
}
