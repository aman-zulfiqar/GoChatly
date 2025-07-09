package services

import (
    "gochat-server/internal/models"
    "context"
    "time"

    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

type MessageService struct {
    collection *mongo.Collection
}

func NewMessageService(db *mongo.Database) *MessageService {
    return &MessageService{
        collection: db.Collection("messages"),
    }
}

func (s *MessageService) SaveMessage(message *models.Message) error {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    _, err := s.collection.InsertOne(ctx, message)
    return err
}

func (s *MessageService) GetRoomMessages(roomID string, limit int) ([]*models.Message, error) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    opts := options.Find().
    SetSort(bson.M{"timestamp": -1}).
    SetLimit(int64(limit))

    cursor, err := s.collection.Find(ctx, bson.M{"room_id": roomID}, opts)
    if err != nil {
        return nil, err
    }
    defer cursor.Close(ctx)

    var messages []*models.Message
    if err := cursor.All(ctx, &messages); err != nil {
        return nil, err
    }

    // Reverse to get chronological order
    for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
        messages[i], messages[j] = messages[j], messages[i]
    }

    return messages, nil
}
