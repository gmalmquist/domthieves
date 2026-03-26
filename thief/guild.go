package thief

import (
  "domthieves/config"
  "domthieves/jsv"
  "domthieves/loot"
  "domthieves/names"

  "github.com/gammazero/deque"
  "github.com/google/uuid"

  "hash/maphash"
  "math/rand"
  "slices"
  "time"
)

import (
  "errors"
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
  Thieves map[ThiefID]*Thief `json:"thieves"`
  Loot *LootTable `json:"loot"`
  namegen *names.NameGen `json:"-"`
  idle deque.Deque[*Thief] `json:"-"`
  lock *sync.RWMutex `json:"-"`
}

type LootTable struct {
  Items map[loot.LootID]*loot.Loot `json:"loot"`
  uses map[loot.Use][]loot.LootID `json:"loot_by_use"`
}

func NewGuild(namegen *names.NameGen) *Guild {
  return &Guild{
    ID: NewGuildID(),
    Websites: map[string]bool{},
    Spritesheets: []string{},
    Thieves: map[ThiefID]*Thief{},
    Loot: NewLootTable(),
    namegen: namegen,
    lock: &sync.RWMutex{},
  }
}

func NewLootTable() *LootTable {
  return &LootTable{
    Items: map[loot.LootID]*loot.Loot{},
    uses: map[loot.Use][]loot.LootID{},
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
  for _, thief := range g.Thieves {
    if thief.Employer != "" {
      arr = append(arr, thief)
    }
  }
  return arr
}

func (g *Guild) Thief(tid ThiefID) (*Thief, bool) {
  g.lock.RLock()
  defer g.lock.RUnlock()
  thief, ok := g.Thieves[tid]
  return thief, ok
}

func (g *Guild) Recruit(offer JobOffer) *Thief {
  g.lock.Lock()
  defer g.lock.Unlock()

  var thief *Thief

  if g.idle.Len() > 0 && (len(g.Thieves) >= config.Conf.MaxGuildSize || rand.Intn(100) < 10){
    thief = g.idle.PopFront()
    thief.Employer = offer.Origin
    thief.JobDescription = offer.JobDescription
  } else {
    thief = &Thief{
      ID: NewID(),
      GuildID: g.ID,
      Name: g.namegen.Generate(g.Culture),
      Origin: offer.Origin,
    }
  }

  thief.Employer = offer.Origin
  thief.JobDescription = offer.JobDescription

  if thief.Spritesheet == "" {
    spritesheets := g.Spritesheets
    if spritesheets == nil || len(spritesheets) == 0 {
      spritesheets = config.Conf.DefaultThiefSpritesheets
    }
    var h maphash.Hash
    h.WriteString(string(thief.ID))
    idx := int(h.Sum64() % uint64(len(spritesheets)))
    thief.Spritesheet = spritesheets[idx]
  }

  thief.LootSack.Items = g.shopFor(&offer, thief)

  now := time.Now()
  thief.RecruitedAt = now.Format(time.RFC3339)
  thief.LastTaskAt = now.Format(time.RFC3339)

  g.Thieves[thief.ID] = thief
  return thief
}

func (g *Guild) shopFor(offer *JobOffer, thief *Thief) []*loot.Loot {
  if offer.ShoppingList == nil || len(offer.ShoppingList) == 0 {
    return nil
  }
  cart := []*loot.Loot{}
  found := make([]bool, len(offer.ShoppingList))
  passedUp := -1
  for attempt := 0; attempt < 6 && passedUp != 0 && len(cart) < len(offer.ShoppingList); attempt++ {
    allowSameOrigin := attempt >= 3
    allowSameOriginAndThief := attempt == 5
    passedUp = 0
    for i, kind := range offer.ShoppingList {
      if found[i] || i > config.Conf.MaxShoppingList {
        continue
      }
      arr, ok := g.Loot.uses[loot.Use(kind)]
      if !ok || len(arr) == 0 {
        continue
      }
      idx := rand.Intn(len(arr))
      id := arr[idx]
      pick, ok := g.Loot.Items[id]
      if !ok {
        // shouldn't have been in the list in the first place
        slices.Delete(arr, idx, idx + 1)
        continue
      }
      if pick.Home == offer.Origin {
        if !allowSameOrigin {
          passedUp += 1
          continue
        }
        if pick.StolenBy == thief.Name && !allowSameOriginAndThief {
          passedUp += 1
          continue
        }
      }
      cart = append(cart, pick)
      slices.Delete(arr, idx, idx + 1)
      delete(g.Loot.Items, id)
      found[i] = true
    }
  }
  return cart
}

func (g *Guild) Return(tid ThiefID) {
  g.lock.Lock()
  defer g.lock.Unlock()
  thief, ok := g.Thieves[tid]
  if !ok {
    return
  }
  thief.Employer = ""
  thief.JobDescription = ""
  thief.RecruitedAt = ""
  thief.LastTaskAt = ""
  g.idle.PushBack(thief)
}

func (g *Guild) Deposit(item *loot.Loot) error {
  if (item.ID == loot.LootID("")) {
    item.ID = loot.NewID()
  }
  if item.Price <= 0 {
    item.Price = 1
  }

  uses := map[loot.Use]bool{}
  if item.OriginalUse != loot.Use("") {
    uses[item.OriginalUse] = true
  }
  if item.Uses != nil {
    for _, u := range item.Uses {
      uses[u] = true
    }
  }

  if len(uses) == 0 {
    // useless item
    return errors.New("useless")
  }

  g.lock.Lock()
  defer g.lock.Unlock()

  table := g.Loot
  table.Items[item.ID] = item

  for use, _ := range uses {
    arr, ok := table.uses[use]
    if !ok {
      table.uses[use] = []loot.LootID{ item.ID }
    } else {
      table.uses[use] = append(arr, item.ID)
    }
  }
  return nil
}

func (g *Guild) Json() []byte {
  g.lock.RLock()
  defer g.lock.RUnlock()
  b, _ := jsv.Marshal(g)
  return b
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
