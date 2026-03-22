package loot

import (
  "github.com/google/uuid"
  "golang.org/x/net/html"

  "bytes"
  "errors"
  "fmt"
  "strings"
)

type LootID string

func NewID() LootID {
  return LootID(uuid.NewString())
}


// Represents a stolen DOM node
type Loot struct {
  // Unique id for thie piece of loot
  ID LootID `json:"id"`

  // Human readable name for this piece of loot
  Name string `json:"name"`

  // Raw HTML node that was stolen
  DOM string `json:"dom"`

  // Name of the thief who stole this loot
  StolenBy string `json:"tolen_by"`

  // What can this item be used for?
  Uses []string `json:"uses"`

  // What was this item originally used for?
  OriginalUse string `json:"original_use"`

  // What website did this item come from?
  Home string `json:"home"`

  // Price in gold pieces
  Price int `json:"price"`
}

// A thief's Sack of stolen Loot
type Sack struct {
  Items []*Loot `json:"items"`
}

func NewSack() *Sack {
  return &Sack{
    Items: []*Loot{},
  }
}

// This conservatively validates that the given html is compliant and
// safe, and errors otherwise.
//
// The javascript frontend is responsible for actually doing the stripping
// and cleaning, to reduce load on the server. But we have to check its
// work.
func (loot *Loot) Validate() error {
  is := bytes.NewBuffer([]byte(loot.DOM))
  docs, err := html.ParseFragment(is, nil)
  if err != nil {
    return errors.New(fmt.Sprintf("400 bad HTML: %v", err))
  }

  for _, doc := range docs {
    for node := range doc.Descendants() {
      switch node.Type {
      case html.ElementNode:
        if err = checkElementNode(node); err != nil {
          return err
        }
      }
    }
  }

  return nil
}

var dangerousTags = map[string]bool{
  "body": true,
  "button": true,
  "datalist": true,
  "data": true,
  "fieldset": true,
  "form": true,
  "head": true,
  "html": true,
  "input": true,
  "legend": true,
  "link": true,
  "meta": true,
  "optgroup": true,
  "option": true,
  "output": true,
  "script": true,
  "select": true,
  "style": true,
  "textarea": true,
}
func checkElementNode(node *html.Node) error {
  tag := strings.ToLower(node.Data)
  if dangerousTags[tag] {
    return errors.New(fmt.Sprintf("400 dangerous tag %v", tag))
  }
  if node.Attr != nil {
    for _, a := range node.Attr {
      name := strings.ToLower(a.Key)
      if strings.HasPrefix(name, "on") {
        return errors.New(fmt.Sprintf("400 dangerous event listener %v", name))
      }
    }
  }
  return nil
}

