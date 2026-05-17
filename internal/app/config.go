// config.go - 設定管理
package app

import (
	"encoding/json"
	"os"
	"path/filepath"
)

type Config struct {
	MusicDirectory string `json:"musicDirectory"`
	LastArtist     string `json:"lastArtist"`
	LastAlbum      string `json:"lastAlbum"`
	LastAlbumYear  string `json:"lastAlbumYear"`
}

func getConfigPath() (string, error) {
	configBase, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	configDir := filepath.Join(configBase, "music-player")
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return "", err
	}
	return filepath.Join(configDir, "config.json"), nil
}

func loadConfig() (*Config, error) {
	configPath, err := getConfigPath()
	if err != nil {
		return &Config{}, err
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return &Config{}, nil
		}
		return nil, err
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return nil, err
	}

	return &config, nil
}

func saveConfig(config *Config) error {
	configPath, err := getConfigPath()
	if err != nil {
		return err
	}

	data, err := json.Marshal(config)
	if err != nil {
		return err
	}

	return os.WriteFile(configPath, data, 0644)
}
