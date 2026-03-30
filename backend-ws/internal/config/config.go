package config

import (
	"fmt"
	"os"
)

// Config holds backend-ws configuration.
type Config struct {
	RedisURL string
	Port     string
	Env      string
}

// Load reads configuration from environment variables.
func Load() (*Config, error) {
	cfg := &Config{
		RedisURL: os.Getenv("REDIS_URL"),
		Port:     getEnv("PORT", "8081"),
		Env:      getEnv("ENV", "development"),
	}
	if cfg.RedisURL == "" {
		return nil, fmt.Errorf("REDIS_URL is required")
	}
	return cfg, nil
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
