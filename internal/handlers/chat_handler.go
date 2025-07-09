// internal/handlers/chat_handler.go
package handlers

import (
    "gochat-server/internal/hub"
    "gochat-server/internal/models"
    "gochat-server/internal/services"
    "net/http"
    "strconv"
    "time"

    "github.com/gorilla/websocket"
    "github.com/labstack/echo/v4"
    "github.com/sirupsen/logrus"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        // Allow connections from localhost:3000 (frontend)
        origin := r.Header.Get("Origin")
        return origin == "http://localhost:3000" || 
               origin == "http://127.0.0.1:3000" || 
               origin == "https://localhost:3000" ||
               origin == "" // Allow connections without origin (for testing)
    },
}

type ChatHandler struct {
    hub            *hub.Hub
    messageService *services.MessageService
}

func NewChatHandler(h *hub.Hub, messageService *services.MessageService) *ChatHandler {
    return &ChatHandler{
        hub:            h,
        messageService: messageService,
    }
}

func (h *ChatHandler) HandleWebSocket(c echo.Context) error {
    roomID := c.Param("roomID")
    userID := c.Param("userID")
    username := c.QueryParam("username")

    if username == "" {
        username = "Anonymous"
    }

    logrus.WithFields(logrus.Fields{
        "roomID":   roomID,
        "userID":   userID,
        "username": username,
    }).Info("WebSocket connection attempt")

    conn, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
    if err != nil {
        logrus.Error("WebSocket upgrade failed: ", err)
        return err
    }

    client := &hub.Client{
        Hub:      h.hub,
        Conn:     conn,
        Send:     make(chan []byte, 256),
        RoomID:   roomID,
        UserID:   userID,
        Username: username,
    }

    h.hub.Register <- client

    // Start goroutines for reading and writing
    go h.writePump(client)
    go h.readPump(client)

    return nil
}

func (h *ChatHandler) readPump(client *hub.Client) {
    defer func() {
        h.hub.Unregister <- client
        client.Conn.Close()
    }()

    client.Conn.SetReadLimit(512)
    client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    client.Conn.SetPongHandler(func(string) error {
        client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        return nil
    })

    for {
        var message models.WSMessage
        err := client.Conn.ReadJSON(&message)
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                logrus.Error("WebSocket error: ", err)
            }
            break
        }

        // Validate message content
        if len(message.Content) > 1000 {
            logrus.Warn("Message too long, rejecting")
            continue
        }

        message.RoomID = client.RoomID
        message.UserID = client.UserID
        message.Username = client.Username

        logrus.WithFields(logrus.Fields{
            "roomID":   client.RoomID,
            "userID":   client.UserID,
            "username": client.Username,
            "content":  message.Content,
        }).Info("Message received")

        h.hub.Broadcast <- &message
    }
}

func (h *ChatHandler) writePump(client *hub.Client) {
    ticker := time.NewTicker(54 * time.Second)
    defer func() {
        ticker.Stop()
        client.Conn.Close()
    }()

    for {
        select {
        case message, ok := <-client.Send:
            client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if !ok {
                client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            w, err := client.Conn.NextWriter(websocket.TextMessage)
            if err != nil {
                return
            }
            w.Write(message)

            // Add queued messages
            n := len(client.Send)
            for i := 0; i < n; i++ {
                w.Write([]byte{'\n'})
                w.Write(<-client.Send)
            }

            if err := w.Close(); err != nil {
                return
            }

        case <-ticker.C:
            client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

func (h *ChatHandler) GetRoomMessages(c echo.Context) error {
    roomID := c.Param("roomID")
    limitStr := c.QueryParam("limit")
    
    limit := 50 // default
    if limitStr != "" {
        if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
            limit = l
        }
    }

    logrus.WithFields(logrus.Fields{
        "roomID": roomID,
        "limit":  limit,
    }).Info("Fetching room messages")

    messages, err := h.messageService.GetRoomMessages(roomID, limit)
    if err != nil {
        logrus.Error("Failed to fetch messages: ", err)
        return c.JSON(http.StatusInternalServerError, map[string]string{
            "error": "Failed to fetch messages",
        })
    }

    return c.JSON(http.StatusOK, messages)
}

func (h *ChatHandler) GetRoomUsers(c echo.Context) error {
    roomID := c.Param("roomID")
    
    logrus.WithFields(logrus.Fields{
        "roomID": roomID,
    }).Info("Fetching room users")
    
    room := h.hub.GetRoom(roomID)
    if room == nil {
        return c.JSON(http.StatusOK, map[string]interface{}{
            "room_id": roomID,
            "users":   []interface{}{},
            "count":   0,
        })
    }

    users := make([]*models.User, 0, len(room.Users))
    for _, user := range room.Users {
        users = append(users, user)
    }

    return c.JSON(http.StatusOK, map[string]interface{}{
        "room_id": roomID,
        "users":   users,
        "count":   len(users),
    })
}
