package thief

import (
  "github.com/gammazero/deque"
  "github.com/google/uuid"

  "hash/maphash"
)

import (
  "sync"
)

const GlobalGuildID = GuildID("global")

type GuildID string

// Basically a webring that has shared thieves
type Guild struct {
  ID GuildID
  Name string
  Websites map[string]bool
  Spritesheets []string
  thieves map[ThiefID]*Thief
  idle deque.Deque[*Thief]
  lock *sync.RWMutex
}

func NewGuild() *Guild {
  return &Guild{
    ID: NewGuildID(),
    Websites: map[string]bool{},
    Spritesheets: []string{},
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

func (g *Guild) Thief(tid ThiefID) (*Thief, bool) {
  g.lock.RLock()
  defer g.lock.RUnlock()
  thief, ok := g.thieves[tid]
  return thief, ok
}

func (g *Guild) Recruit(offer RecruitOffer) *Thief {
  g.lock.Lock()
  defer g.lock.Unlock()
  if g.idle.Len() > 0 {
    thief := g.idle.PopFront()
    thief.Employer = offer.Origin
    thief.JobDescription = offer.JobDescription
    return thief
  }
  thief := &Thief{
    ID: NewID(),
    GuildID: g.ID,
    Name: "Charles",
    Origin: offer.Origin,
    Employer: offer.Origin,
    Spritesheet: offer.Spritesheet,
    JobDescription: offer.JobDescription,
  }

  if thief.Spritesheet == "" {
    if g.Spritesheets != nil && len(g.Spritesheets) > 0 {
      var h maphash.Hash
      h.WriteString(string(thief.ID))
      idx := int(h.Sum64() % uint64(len(g.Spritesheets)))
      thief.Spritesheet = g.Spritesheets[idx]
    }
  }

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
  g.idle.PushBack(thief)
}

type Directory struct {
  guilds map[GuildID]*Guild
  lock *sync.RWMutex
}

func NewDirectory() *Directory {
  global := NewGuild()
  global.ID = GlobalGuildID
  global.Name = "Global"
  return &Directory{
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

