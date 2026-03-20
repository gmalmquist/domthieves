package main

import (
  "domthieves/api"

  "fmt"
)

func main() {
  fmt.Println("⎽⎼⎻⎽⎼⎻⎽⎼⎻ DOM THIEVES ⎽⎼⎻⎽⎼⎻⎽⎼⎻")

  hostname := ":7007"

  fmt.Printf("serving api on: %v\n", hostname)

  api := api.New()
  api.Serve(hostname)
}

