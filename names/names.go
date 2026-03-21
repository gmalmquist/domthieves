package names

import (
  "domthieves/storeutil"
  "domthieves/jsv"
  "domthieves/config"

  "math/rand"
  "os"
  "strings"
)

type Culture struct {
  // Name of the culture
  Name string `json:"culture"`
  // Miss, Sir, Dr., etc
  Honorifics *NameGroup `json:"honorific"`
  // Charles, Mary Anne, Archibald, etc
  Givens *NameGroup `json:"given"`
  // This is often the same set as the Givens, and can be dropped entirely in favor of allowing multiple given names
  Middles *NameGroup `json:"middle"`
  // Family names. Brown, Stevenson, of Rivendell, daughter of Kevin
  Surnames *NameGroup `json:"family"`
  // Esquire, M.D., Thief, Plumber
  Postnominal *NameGroup `json:"postnominal"`
}

type NameGroup struct {
  // Possible names in this group
  Names []string `json:"names"`
  // Minimum number of names to pull
  Min int `json:"min"`
  // Maximum number of names to pull
  Max int `json:"max"`
  // Allow repeated names?
  AllowRepeats bool `json:"repeats"`
}

type NameGen struct {
  Cultures map[string]*Culture
}

func New() *NameGen {
  gen := &NameGen{
    Cultures: map[string]*Culture{},
  }
  return gen
}

func (g *NameGen) Register(c *Culture) {
  g.Cultures[c.Name] = c
}

func (g *NameGen) LoadAll() error {
  for path := range storeutil.IterPaths(
    config.Conf.NameRoot(), "json",
  ) {
    data, err := os.ReadFile(path)
    if err != nil {
      return err
    }
    var c Culture
    err = jsv.JsonValue(data).Unmarshal(&c)
    if err != nil {
      return err
    }
    g.Register(&c)
  }
  return nil
}

func (g *NameGen) Generate(culture string) string {
  c, ok := g.Cultures[culture]
  if !ok {
    return "[no culture: " + culture + "]"
  }
  return c.Generate()
}

func (c *Culture) Generate() string {
  var b strings.Builder
  for _, group := range c.Groups() {
    name := group.Pull()
    if name == "" {
      continue
    }
    if b.Len() > 0 {
      if group == c.Postnominal {
        b.WriteRune(',')
      }
      b.WriteRune(' ')
    }
    b.WriteString(name)
  }
  return b.String()
}

func (group *NameGroup) Empty() bool {
  if group == nil {
    return true
  }
  if len(group.Names) == 0 {
    return true
  }
  return false
}

func (group *NameGroup) Pull() string {
  if group.Empty() {
    return ""
  }
  target := group.Min
  if group.Max > group.Min {
    target += rand.Intn(1 + group.Max - group.Min)
  }
  if group.Min == 0 && group.Max == 0 {
    target = 1
  }
  if target == 0 {
    return ""
  }
  if target == 1 {
    return group.PullOne()
  }
  chosen := map[string]bool{}
  var b strings.Builder
  for i := 0; i < target; i++ {
    n := group.PullOne()
    if !group.AllowRepeats && chosen[n] {
      break
    }
    chosen[n] = true
    if i > 0 {
      b.WriteRune(' ')
    }
    b.WriteString(n)
  }
  return b.String()
}

func (group *NameGroup) PullOne() string {
  if len(group.Names) == 0 {
    return ""
  }
  return group.Names[rand.Intn(len(group.Names))]
}

func (c *Culture) Groups() []*NameGroup {
  return []*NameGroup{
    c.Honorifics,
    c.Givens,
    c.Middles,
    c.Surnames,
    c.Postnominal,
  }
}

