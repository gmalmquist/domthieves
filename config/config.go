package config

import (
  "path/filepath"
)

var Debug bool = true
var Conf = Default()

type Config struct {
  DataRoot string

}

func Default() *Config {
  return &Config{
    DataRoot: "data",
  }
}

func (c *Config) NameRoot() string {
  return filepath.Join(c.DataRoot, "names")
}

