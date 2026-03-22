package main

import (
  "domthieves/api"
  "domthieves/thief"
  "domthieves/names"

  "fmt"
  "log"
)

func main() {
  fmt.Println("⎽⎼⎻⎽⎼⎻⎽⎼⎻ DOM THIEVES ⎽⎼⎻⎽⎼⎻⎽⎼⎻")

  hostname := ":7007"

  namegen := names.New()
  if err := namegen.LoadAll(); err != nil {
    log.Fatal(err)
  }

  directory := thief.NewDirectory(namegen)

  api := api.New()
  api.NameGen = namegen
  api.Guilds = directory

  fmt.Printf("serving api on: %v\n", hostname)
  api.Serve(hostname)
}

