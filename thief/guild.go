package thief

import (
  "domthieves/names"

  "github.com/gammazero/deque"
  "github.com/google/uuid"

  "hash/maphash"
  "time"
)

import (
  "sync"
)

const GlobalGuildID = GuildID("global")

type GuildID string

// Basically a webring that has shared thieves
type Guild struct {
  ID GuildID `json:"id"`
  Name string `json:"name"`
  Websites map[string]bool `json:"websites"`
  Spritesheets []string `json:"spritesheets"`
  Culture string `json:"culture"`
  namegen *names.NameGen `json:"-"`
  thieves map[ThiefID]*Thief `json:"thieves"`
  idle deque.Deque[*Thief] `json:"-"`
  lock *sync.RWMutex `json:"-"`
}

func NewGuild(namegen *names.NameGen) *Guild {
  return &Guild{
    ID: NewGuildID(),
    Websites: map[string]bool{},
    Spritesheets: []string{},
    namegen: namegen,
    thieves: map[ThiefID]*Thief{},
    lock: &sync.RWMutex{},
  }
}

func NewGuildID() GuildID {
  return GuildID(uuid.NewString())
}

func (g *Guild) IsMember(website string) bool {
  if g.ID == GlobalGuildID {
    return true
  }
  return g.Websites[website]
}

func (g *Guild) ListActive() ([]*Thief) {
  arr := []*Thief{}
  g.lock.RLock()
  defer g.lock.RUnlock()
  for _, thief := range g.thieves {
    if thief.Employer != "" {
      arr = append(arr, thief)
    }
  }
  return arr
}

func (g *Guild) Thief(tid ThiefID) (*Thief, bool) {
  g.lock.RLock()
  defer g.lock.RUnlock()
  thief, ok := g.thieves[tid]
  return thief, ok
}

func (g *Guild) Recruit(offer JobOffer) *Thief {
  g.lock.Lock()
  defer g.lock.Unlock()

  var thief *Thief

  if g.idle.Len() > 0 {
    thief = g.idle.PopFront()
    thief.Employer = offer.Origin
    thief.JobDescription = offer.JobDescription
  } else {
    thief = &Thief{
      ID: NewID(),
      GuildID: g.ID,
      Name: g.namegen.Generate(g.Culture),
      Origin: offer.Origin,
      Spritesheet: offer.Spritesheet,
    }
  }

  thief.Employer = offer.Origin
  thief.JobDescription = offer.JobDescription

  if thief.Spritesheet == "" {
    if g.Spritesheets != nil && len(g.Spritesheets) > 0 {
      var h maphash.Hash
      h.WriteString(string(thief.ID))
      idx := int(h.Sum64() % uint64(len(g.Spritesheets)))
      thief.Spritesheet = g.Spritesheets[idx]
    }
  }

  now := time.Now()
  thief.RecruitedAt = now.Format(time.RFC3339)
  thief.LastTaskAt = now.Format(time.RFC3339)

  g.thieves[thief.ID] = thief
  return thief
}

func (g *Guild) Return(tid ThiefID) {
  g.lock.Lock()
  defer g.lock.Unlock()
  thief, ok := g.thieves[tid]
  if !ok {
    return
  }
  thief.Employer = ""
  thief.JobDescription = ""
  thief.RecruitedAt = ""
  thief.LastTaskAt = ""
  g.idle.PushBack(thief)
}

type Directory struct {
  namegen *names.NameGen
  guilds map[GuildID]*Guild
  lock *sync.RWMutex
}

func NewDirectory(namegen *names.NameGen) *Directory {
  global := NewGuild(namegen)
  global.ID = GlobalGuildID
  global.Name = "Global"
  return &Directory{
    namegen: namegen,
    guilds: map[GuildID]*Guild{
      GlobalGuildID: global,
    },
    lock: &sync.RWMutex{},
  }
}

func (d *Directory) Guild(id GuildID) (*Guild, bool) {
  d.lock.RLock()
  defer d.lock.RUnlock()
  g, ok := d.guilds[id]
  return g, ok
}

