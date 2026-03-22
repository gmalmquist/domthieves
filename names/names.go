package names

import (
  "domthieves/storeutil"
  "domthieves/config"
  "domthieves/rutil"

  "bufio"
  "errors"
  "fmt"
  "log"
  "math/rand"
  "os"
  "regexp"
  "strconv"
  "strings"
)

type Culture struct {
  // Name of the culture
  CultureName string `json:"culture"`
  // Parts of a name
  NameParts []*NameSet `json:"names"`
}

type NameSet struct {
  // What part of a name does this set represent
  Part string `json:"part"`
  // Possible names in this group
  Names []string `json:"names"`
  // Minimum number of names to pull
  Min int `json:"min"`
  // Maximum number of names to pull
  Max int `json:"max"`
  // Separator
  Separator string `json:"separator"`
  // Probability of inclusion, 0-1, default 1.0.
  RNG float64 `json:"rng"`
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
  g.Cultures[c.CultureName] = c
}

func (g *NameGen) LoadAll() error {
  for path := range storeutil.IterPaths(
    config.Conf.NameRoot(), "culture",
  ) {
    c, err := LoadCulture(path)
    if err != nil {
      return err
    }
    if config.Debug {
      log.Printf("Loaded culture:\n%v", c.Summary())
    }
    g.Register(c)
  }
  return nil
}

var reNameSetHeader = regexp.MustCompile(`^\[(?<name>\w+)(\s+(?<min>\d+)?([-]+(?<max>\d+)?)?)?\]`)
var reProperty = regexp.MustCompile(`^(?<name>\w+):\s*(?<value>.*)$`)
func LoadCulture(path string) (*Culture, error) {
  f, err := os.Open(path)
  if err != nil {
    return nil, err
  }
  defer f.Close()

  c := &Culture{
    NameParts: []*NameSet{},
  }
  var currSet *NameSet

  lineno := -1
  sc := bufio.NewScanner(f)
  for sc.Scan() {
    line := strings.TrimSpace(sc.Text())
    lineno += 1

    if line == "" || line[0] == '#' {
      continue
    }

    mkerr := func(msg string, args ...any) error {
      if len(args) > 0 {
        msg = fmt.Sprintf(msg, args...)
      }
      return errors.New(fmt.Sprintf("%v:%v: %v:\n%v", path, lineno, msg, line))
    }

    if currSet == nil {
      m := rutil.RegMatch(reProperty, line)
      if m != nil {
        key := strings.ToUpper(m["name"])
        switch key {
        case "CULTURE":
          c.CultureName = m["value"]
          continue
        }
        return nil, mkerr("unknown property name '%v'", key)
      }
    }

    if line[0] == '[' {
      m := rutil.RegMatch(reNameSetHeader, line)
      if m == nil {
        return nil, mkerr("invalid header syntax")
      }
      name := strings.ToUpper(m["name"])
      smin := m["min"]
      smax := m["max"]
      var min, max int

      if smin != "" {
        min, err = strconv.Atoi(smin)
        if err != nil {
          return nil, mkerr("min name count not an int")
        }
      }

      if smax != "" {
        max, err = strconv.Atoi(smax)
        if err != nil {
          return nil, mkerr("max name count not an int")
        }
      }

      if smin == "" && smax == "" {
        min = 1
        max = 1
      } else if smax == "" && min > 0 {
        max = min
      }

      if min > max {
        return nil, mkerr("min cannot be greater than max (%v - %v)", min, max)
      }

      if currSet != nil && len(currSet.Names) > 0 {
        c.NameParts = append(c.NameParts, currSet)
      }

      currSet = &NameSet{
        Part: name,
        Min: min,
        Max: max,
        Names: []string{},
        RNG: 1.0,
      }

      continue
    }

    if currSet == nil {
      return nil, mkerr("name outside set")
    }

    if len(currSet.Names) == 0 {
      // if we have a current set but haven't
      // yet added any names to it, there are
      // possibly properties set for it
      m := rutil.RegMatch(reProperty, line)
      if m != nil {
        key := strings.ToUpper(m["name"])
        val := strings.TrimSpace(m["value"])
        switch key {
        case "SEPARATOR":
          currSet.Separator = val
          continue
        case "P": fallthrough
        case "PROBABILITY": fallthrough
        case "CHANCE": fallthrough
        case "RNG":
          rng, err := strconv.ParseFloat(val, 64)
          if err != nil {
            return nil, mkerr("illegal floating-point value", err)
          }
          if rng < 0 || rng > 1 {
            return nil, mkerr("rng must be between 0 and 1")
          }
          currSet.RNG = rng 
          continue

        }
        return nil, mkerr("unknown property for name part %v", currSet.Part)
      }
    }

    currSet.Names = append(currSet.Names, line)
  }

  if currSet != nil && len(currSet.Names) > 0 {
    c.NameParts = append(c.NameParts, currSet)
  }

  return c, nil
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
  for set := range c.PickNameSets() {
    name := set.Pull()
    if name == "" {
      continue
    }
    if b.Len() > 0 {
      if set.Separator != "" {
        b.WriteString(set.Separator)
      }
      b.WriteRune(' ')
    }
    b.WriteString(name)
  }
  return b.String()
}

func (group *NameSet) Empty() bool {
  if group == nil {
    return true
  }
  if len(group.Names) == 0 {
    return true
  }
  return false
}

func (group *NameSet) Pull() string {
  if group.Empty() {
    return ""
  }
  target := group.Min
  if group.Max > group.Min {
    target += rand.Intn(1 + group.Max - group.Min)
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
    if n == "" {
      continue
    }
    if chosen[n] {
      break // prevent someone being named Charles Charles Charles Brown
    }
    chosen[n] = true
    if b.Len() > 0 {
      b.WriteRune(' ')
    }
    b.WriteString(n)
  }
  return b.String()
}

func (group *NameSet) PullOne() string {
  if len(group.Names) == 0 {
    return ""
  }
  return group.Names[rand.Intn(len(group.Names))]
}

func (c *Culture) PickNameSets() func(func(*NameSet) bool) {
  return func(yield func(*NameSet) bool) {
    // if multiple name parts have the same Part name, we pick ONE of them to include at random.

    // map of set name to probability distributions of inclusion
    dists := map[string][]float64{}
    for _, set := range c.NameParts {
      dist, ok := dists[set.Part]
      if ok {
        dists[set.Part] = append(dist, set.RNG)
      } else {
        dists[set.Part] = []float64{ set.RNG }
      }
    }

    // map of name part to nth occurance
    chosen := map[string]int{}

    for part, dist := range dists {
      // normalize probabilities if their sum is greater than 1.0
      var sum float64
      for _, p := range dist {
        sum += p
      }
      if sum > 1.0 {
        log.Printf("%v: normalize p sum %v", part, sum)
        for i, p := range dist {
          dist[i] = p / sum
        }
      }

      chosen[part] = -1

      r := rand.Float64()
      for i, p := range dist {
        if p >= r {
          chosen[part] = i
          break
        }
        r -= p
      }
    }

    idx := map[string]int{}
    for _, p := range c.NameParts {
      i := idx[p.Part]
      idx[p.Part] = i + 1

      if chosen[p.Part] != i {
        continue
      }

      if p.Empty() {
        continue
      }
      if !yield(p) {
        return
      }
    }
  }
}

func (c *Culture) Summary() string {
  var b strings.Builder
  b.WriteString("[")
  b.WriteString(c.CultureName)
  b.WriteString("]")
  for i, s := range c.NameParts {
    b.WriteString(fmt.Sprintf("\n%v. %v %v-%v, p=%v: %v names", i+1, s.Part, s.Min, s.Max, s.RNG, len(s.Names)))
  }
  b.WriteString("\n")
  return b.String()
}

