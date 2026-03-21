package main

import (
  "domthieves/api"
  "domthieves/thief"

  "fmt"
)

func main() {
  fmt.Println("⎽⎼⎻⎽⎼⎻⎽⎼⎻ DOM THIEVES ⎽⎼⎻⎽⎼⎻⎽⎼⎻")

  hostname := ":7007"

  fmt.Printf("serving api on: %v\n", hostname)

  directory := thief.NewDirectory()

  api := api.New()
  api.Guilds = directory

  api.Serve(hostname)
}

