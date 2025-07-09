// cmd/main.go
package main

import (
    "context"
    "os"
    "os/signal"
    "syscall"
    "time"

    "gochat-server/internal/config"
    "gochat-server/internal/database"
    "gochat-server/internal/handlers"
    "gochat-server/internal/hub"
    "gochat-server/internal/queue"
    "gochat-server/internal/services"

    "github.com/joho/godotenv"
    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
    "github.com/sirupsen/logrus"
)

func main() {
    // Load environment variables
    if err := godotenv.Load(); err != nil {
        logrus.Warn("No .env file found")
    }

    // Initialize config
    cfg := config.Load()

    // Initialize logger
    logrus.SetLevel(logrus.InfoLevel)
    logrus.SetFormatter(&logrus.JSONFormatter{})

    // Initialize database
    db, err := database.Connect(cfg.MongoURI, cfg.DatabaseName)
    if err != nil {
        logrus.Fatal("Failed to connect to database: ", err)
    }
    defer database.Disconnect()

    // Initialize services
    messageService := services.NewMessageService(db)
    userService := services.NewUserService()
    emailService := services.NewEmailService(cfg)

    // Initialize queue system
    queueManager := queue.NewManager(cfg.RedisAddr, emailService)
    go queueManager.StartWorker()

    // Initialize chat hub
    chatHub := hub.NewHub(messageService, queueManager, userService)
    go chatHub.Run()

    // Initialize Echo
    e := echo.New()

    // CORS Configuration - FIXED!
    e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
        AllowOrigins: []string{
            "http://localhost:3000", 
            "http://127.0.0.1:3000",
            "https://localhost:3000",
        },
        AllowMethods: []string{
            echo.GET, 
            echo.POST, 
            echo.PUT, 
            echo.DELETE, 
            echo.OPTIONS,
        },
        AllowHeaders: []string{
            echo.HeaderOrigin,
            echo.HeaderContentType,
            echo.HeaderAccept,
            echo.HeaderAuthorization,
            "X-Requested-With",
            "Access-Control-Allow-Origin",
        },
        AllowCredentials: true,
        ExposeHeaders: []string{
            "Content-Length",
            "Access-Control-Allow-Origin",
        },
    }))

    // Add logging middleware
    e.Use(middleware.LoggerWithConfig(middleware.LoggerConfig{
        Format: "method=${method}, uri=${uri}, status=${status}, latency=${latency_human}\n",
    }))

    // Add recovery middleware
    e.Use(middleware.Recover())

    // Initialize handlers
    chatHandler := handlers.NewChatHandler(chatHub, messageService)
    emailHandler := handlers.NewEmailHandler(queueManager)

    // Routes
    e.GET("/ws/:roomID/:userID", chatHandler.HandleWebSocket)
    e.GET("/rooms/:roomID/messages", chatHandler.GetRoomMessages)
    e.GET("/rooms/:roomID/users", chatHandler.GetRoomUsers)
    e.POST("/queue-email", emailHandler.QueueEmail)

    // Health check endpoint
    e.GET("/health", func(c echo.Context) error {
        return c.JSON(200, map[string]interface{}{
            "status": "ok",
            "message": "GoChat Server is running",
            "timestamp": time.Now().Unix(),
        })
    })

    // Test endpoint for frontend connectivity
    e.GET("/test", func(c echo.Context) error {
        return c.JSON(200, map[string]interface{}{
            "message": "Frontend can connect to backend!",
            "cors": "enabled",
            "websocket": "available at /ws/{roomID}/{userID}",
        })
    })

    logrus.Info("Starting GoChat Server on port ", cfg.Port)
    logrus.Info("CORS enabled for frontend at http://localhost:3000")
    logrus.Info("WebSocket endpoint: ws://localhost:", cfg.Port, "/ws/{roomID}/{userID}")

    // Graceful shutdown
    go func() {
        if err := e.Start(":" + cfg.Port); err != nil {
            logrus.Info("Server stopped")
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    logrus.Info("Shutting down server...")
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := e.Shutdown(ctx); err != nil {
        logrus.Fatal("Server forced to shutdown: ", err)
    }
}
