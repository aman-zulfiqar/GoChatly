package config

import (
    "os"
)

type Config struct {
    Port         string
    MongoURI     string
    DatabaseName string
    RedisAddr    string
    SMTPHost     string
    SMTPPort     string
    SMTPUser     string
    SMTPPass     string
}

func Load() *Config {
    return &Config{
        Port:         getEnv("PORT", "8080"),
        MongoURI:     getEnv("MONGO_URI", "mongodb://localhost:27017"),
        DatabaseName: getEnv("DATABASE_NAME", "chatdb"),
        RedisAddr:    getEnv("REDIS_ADDR", "localhost:6379"),
        SMTPHost:     getEnv("SMTP_HOST", "localhost"),
        SMTPPort:     getEnv("SMTP_PORT", "1025"),
        SMTPUser:     getEnv("SMTP_USER", ""),
        SMTPPass:     getEnv("SMTP_PASS", ""),
    }
}

func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}
