package services

import (
	"sync"
)

type UserService struct {
	// Map of userID -> roomID -> []interface{}
	userClients map[string]map[string][]interface{}
	mu          sync.RWMutex
}

func NewUserService() *UserService {
	return &UserService{
		userClients: make(map[string]map[string][]interface{}),
	}
}

func (s *UserService) AddClient(userID, roomID string, client interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.userClients[userID] == nil {
		s.userClients[userID] = make(map[string][]interface{})
	}

	s.userClients[userID][roomID] = append(s.userClients[userID][roomID], client)
}

func (s *UserService) RemoveClient(userID, roomID string, client interface{}) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if rooms := s.userClients[userID]; rooms != nil {
		if clients := rooms[roomID]; clients != nil {
			for i, c := range clients {
				if c == client {
					rooms[roomID] = append(clients[:i], clients[i+1:]...)
					break
				}
			}

			if len(rooms[roomID]) == 0 {
				delete(rooms, roomID)
			}

			if len(rooms) == 0 {
				delete(s.userClients, userID)
			}
		}
	}
}

func (s *UserService) GetUserClients(userID, roomID string) []interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if rooms := s.userClients[userID]; rooms != nil {
		return rooms[roomID]
	}
	return nil
}

func (s *UserService) IsUserOnline(userID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rooms := s.userClients[userID]
	return rooms != nil && len(rooms) > 0
}
