package api

import (
  "domthieves/config"
  "domthieves/loot"
  "domthieves/names"
  "domthieves/netutil"
  "domthieves/storeutil"
  "domthieves/thief"

  "fmt"
  "net/http"
  "os"
  "path/filepath"
  "strconv"
  "strings"
)

const Version string = "0.0.1"

var MaxGenBatchSize int = 100

type Api struct {
  Mux *netutil.Mux
  Health Health
  Guilds *thief.Directory
  NameGen *names.NameGen
}

type Health struct {
  Ok bool `json:"ok"`
  Status string `json:"status"`
}

func New() *Api {
  api := &Api{
    Mux: netutil.NuMux(),
    Health: Health{
      Status: "initializing",
    },
  }
  api.Setup()
  return api
}

func (api *Api) Setup() {
  type Nu = *netutil.Nu
  mux := api.Mux
  mux.AllowAllCors = true

  mux.StandardHeader.Add("X-Api-Version", Version)
  mux.AlwaysExposeHeaders(
    "X-Api-Version",
  )

  bundle := []byte(JsBundle())

  mux.Handle("GET /health", func(nu Nu) {
    nu.ReplyJson(api.Health)
  })

  mux.Handle("GET /domthieves.js", func(nu Nu) {
    blob := bundle
    if config.Debug {
      blob = []byte(JsBundle())
    }
    w, _ := nu.Unwrap()
    w.Header().Add("Content-Type", "application/javascript; charset=utf-8")
    w.Header().Add("Content-Length", fmt.Sprintf("%v", len(blob)))
    w.Write(blob)
  })

  mux.Handle("GET /api/guild/{gid}/thief/{tid}", func(nu Nu) {
    _, r := nu.Unwrap()
    gid := thief.GuildID(r.PathValue("gid"))
    tid := thief.ThiefID(r.PathValue("tid"))
    
    guild, ok := api.Guilds.Guild(gid)
    if !ok {
      nu.ReplyErr(404, "No guild is chartered as '%v'", gid)
      return
    }

    thief, ok := guild.Thief(tid)
    if !ok {
      nu.ReplyErr(404, "No thief with ID '%v' is a member of the '%v' guild (%v).", tid, guild.Name, guild.ID)
      return
    }

    nu.ReplyJson(thief)
  })

  mux.Handle("GET /api/guild/{gid}/active", func(nu Nu) {
    _, r := nu.Unwrap()
    gid := thief.GuildID(r.PathValue("gid"))
    
    guild, ok := api.Guilds.Guild(gid)
    if !ok {
      nu.ReplyErr(404, "No guild is chartered as '%v'", gid)
      return
    }

    active := guild.ListActive()
    nu.ReplyJson(active)
  })

  mux.Handle("GET /api/guild/{gid}/recruit", func(nu Nu) {
    _, r := nu.Unwrap()
    gid := thief.GuildID(r.PathValue("gid"))
    
    guild, ok := api.Guilds.Guild(gid)
    if !ok {
      nu.ReplyErr(404, "No guild is chartered as '%v'", gid)
      return
    }

    origin := r.Header.Get("Origin")
    if origin == "" {
      origin = "Anonymous"
    }

    q := r.URL.Query()

    offer := thief.JobOffer{
      Origin: origin,
      JobDescription: q.Get("job"),
      Spritesheet: q.Get("spritesheet"),
    }

    thief := guild.Recruit(offer)

    nu.ReplyJson(thief)
  })

  mux.Handle("GET /api/allowhtml/tags", func(nu Nu) {
    nu.ReplyJson(loot.AllowTags)
  })

  mux.Handle("GET /api/denyhtml/attrs", func(nu Nu) {
    nu.ReplyJson(loot.DenyAttributes)
  })

  mux.Handle("GET /api/denyhtml/attr-prefixes", func(nu Nu) {
    nu.ReplyJson(loot.DenyAttrPrefixes)
  })

  mux.Handle("GET /api/name", func(nu Nu) {
    w, r := nu.Unwrap()
    q := r.URL.Query()

    c := q.Get("culture")
    if c == "" {
      c = q.Get("lang")
    }
    if c == "" {
      c = config.Conf.DefaultCulture
    }

    culture, ok := api.NameGen.Culture(c)
    if !ok {
      nu.ReplyErr(404, "no such culture '%v'", c)
      return
    }
    
    scount := q.Get("count")
    count, err := strconv.Atoi(scount)
    if err != nil {
      count = 1
    }
    if count > MaxGenBatchSize {
      count = MaxGenBatchSize
    }

    w.Header().Add("Content-Type", "text/plain; charset=utf-8")

    newline := []byte("\n")
    for i := 0; i < count; i++ {
      if i > 0 {
        w.Write(newline)
      }
      w.Write([]byte(culture.Generate()))
    }
  })

  fs := http.FileServer(http.Dir("./www"))
  mux.Handle("/", func(nu Nu) {
    w, r := nu.Unwrap()
    fs.ServeHTTP(w, r)
  })

  api.Health = Ready()
}

func (api *Api) Serve(host string) {
  http.ListenAndServe(host, api.Mux)
}

func Ready() Health {
  return Health{ Ok: true, Status: "ready" }
}

func JsBundle() string {
  var b strings.Builder
  for f := range storeutil.IterFiles("js", func(e os.DirEntry) bool {
    return filepath.Ext(e.Name()) == ".js"
  }) {
    data, err := os.ReadFile(filepath.Join("js", f))
    if err != nil {
      b.WriteString(fmt.Sprintf("\n\n/* IO ERROR: %v */\n\n", err))
    }
    b.Write(data)
    b.WriteRune('\n')
  }
  return b.String()
}

