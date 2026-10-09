package config

import (
	"fmt"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

const DefaultSeederConfigPath = "configs/seeder.yaml"

type SeederConfig struct {
	Admin SeederAdmin `yaml:"admin"`
}

type SeederAdmin struct {
	Email    string `yaml:"email"`
	Password string `yaml:"password"`
	Name     string `yaml:"name"`
}

func LoadSeederConfig(path string) (*SeederConfig, error) {
	if path == "" {
		path = DefaultSeederConfigPath
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read seeder config %q: %w", path, err)
	}

	var cfg SeederConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse seeder config %q: %w", path, err)
	}
	if strings.TrimSpace(cfg.Admin.Email) == "" {
		return nil, fmt.Errorf("seeder config %q: admin.email is required", path)
	}
	if strings.TrimSpace(cfg.Admin.Password) == "" {
		return nil, fmt.Errorf("seeder config %q: admin.password is required", path)
	}
	if strings.TrimSpace(cfg.Admin.Name) == "" {
		cfg.Admin.Name = "Ugatan Admin"
	}

	return &cfg, nil
}
