package config

import (
  "path/filepath"
)

var Debug bool = true
var Conf = Default()

type Config struct {
  DataRoot string
  DefaultCulture string
  DefaultThiefSpritesheets []string
}

func Default() *Config {
  return &Config{
    DataRoot: "data",
    DefaultCulture: "en_us",
    DefaultThiefSpritesheets: []string{
      "https://domthieves.gwen.run/img/sprites/thief-pirate01.json",
    },
  }
}

func (c *Config) NameRoot() string {
  return filepath.Join("names", "data")
}

