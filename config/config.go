package config

import (
  "path/filepath"
)

var Debug bool = true
var Conf = Default()

type Config struct {
  DataRoot string
  DefaultCulture string
}

func Default() *Config {
  return &Config{
    DataRoot: "data",
    DefaultCulture: "en_us",
  }
}

func (c *Config) NameRoot() string {
  return filepath.Join("config", "names")
}

