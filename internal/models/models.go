package models

import (
    "time"

    "go.mongodb.org/mongo-driver/bson/primitive"
)

type Message struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    RoomID    string             `bson:"room_id" json:"room_id"`
    UserID    string             `bson:"user_id" json:"user_id"`
    Username  string             `bson:"username" json:"username"`
    Content   string             `bson:"content" json:"content"`
    Timestamp time.Time          `bson:"timestamp" json:"timestamp"`
}

type User struct {
    ID       string `json:"id"`
    Username string `json:"username"`
    RoomID   string `json:"room_id"`
    Online   bool   `json:"online"`
}

type Room struct {
    ID           string            `json:"id"`
    Name         string            `json:"name"`
    Users        map[string]*User  `json:"users"`
    ActiveUsers  int               `json:"active_users"`
}

type WSMessage struct {
    Type     string      `json:"type"`
    RoomID   string      `json:"room_id,omitempty"`
    UserID   string      `json:"user_id,omitempty"`
    Username string      `json:"username,omitempty"`
    Content  string      `json:"content,omitempty"`
    Data     interface{} `json:"data,omitempty"`
}

type EmailPayload struct {
    To      string `json:"to"`
    Subject string `json:"subject"`
    Body    string `json:"body"`
}
