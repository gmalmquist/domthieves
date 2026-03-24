package loot

import (
  "github.com/google/uuid"
  "golang.org/x/net/html"

  "bytes"
  "fmt"
  "strings"
)

var DenyAttrPrefixes = []string{ "on", "data-", "hx-" }

var DenyAttributes = mkset( 
  "class",
  "href",
  "id",
  "name",
)

var AllowTags = mkset(
  "a",
  "abbr",
  "acronym",
  "area",
  "aside",
  "audio",
  "b",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "br",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "em",
  "figcaption",
  "figure",
  "font",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hgroup",
  "hr",
  "i",
  "img",
  "ins",
  "label",
  "legend",
  "li",
  "map",
  "mark",
  "marquee",
  "math",
  "menu",
  "meter",
  "nobr",
  "ol",
  "p",
  "plaintext",
  "pre",
  "progress",
  "q",
  "rb",
  "rp",
  "rtc",
  "ruby",
  "s",
  "samp",
  "span",
  "strike",
  "strong",
  "sub",
  "summary",
  "sup",
  "svg",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "track",
  "tt",
  "u",
  "ul",
  "video",
  "wbr",
  "xmp",
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
    return fmt.Errorf("400 bad HTML: %v", err)
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

func checkElementNode(node *html.Node) error {
  tag := strings.ToLower(node.Data)
  if !AllowTags[tag] {
    return fmt.Errorf("400 dangerous tag %v", tag)
  }
  if node.Attr != nil {
    for _, a := range node.Attr {
      name := strings.ToLower(a.Key)
      if DenyAttributes[name] {
        return fmt.Errorf("400 dangerous attribute %v", name)
      }
      for _, p := range DenyAttrPrefixes {
        if strings.HasPrefix(name, p) {
          return fmt.Errorf("400 dangerous event listener %v", name)
        }
      }
    }
  }
  return nil
}

func mkset(arr ...string) map[string]bool {
  m := map[string]bool{}
  for _, s := range arr {
    m[s] = true
  }
  return m
}
