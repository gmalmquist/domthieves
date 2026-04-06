package api

import (
  "domthieves/config"
  "domthieves/loot"
  "domthieves/names"
  "domthieves/thief"

  "github.com/gmalmquist/flowershop/iot"
  "github.com/gmalmquist/flowershop/jsv"
  "github.com/gmalmquist/flowershop/numux"
  "github.com/google/uuid"

  "fmt"
  "net/http"
  "os"
  "path/filepath"
  "strconv"
  "strings"
  "io/ioutil"
)

const Version string = "0.0.1"

var MaxGenBatchSize int = 100

type Api struct {
  Mux *numux.NuMux
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
    Mux: numux.New(),
    Health: Health{
      Status: "initializing",
    },
  }
  api.Setup()
  return api
}

func (api *Api) Setup() {
  type Nu = *numux.Nu
  mux := api.Mux
  mux.AllowAllCors = true

  mux.StandardHeader.Add("X-Api-Version", Version)
  mux.AlwaysExposeHeaders(
    "X-Api-Version",
    "X-Origin",
  )

  bundle := []byte(JsBundle())

  mux.HandleFunc("GET /health", func(nu Nu) {
    nu.ReplyJson(api.Health)
  })

  mux.HandleFunc("GET /domthieves.js", func(nu Nu) {
    w, _ := nu.Unwrap()

    blob := bundle
    if config.Debug {
      // in debug mode, live-update the js model with changes on disk
      // instead of using the version loaded into memory for speed.
      blob = []byte(JsBundle())
    }

    w.Header().Add("Content-Type", "application/javascript; charset=utf-8")

    fmt.Fprint(w, "window.DOMThieves = (function() {\n");
    fmt.Fprint(w, "function ldebug(...args) { if (DT.Debug) { console.log('D:', ...args); } }\n")
    w.Write(blob);
    fmt.Fprint(w, "\n")
    fmt.Fprintf(w, "DT.ApiVersion = '%v';\n", Version);
    fmt.Fprintf(w, "DT.Debug = %v;\n", config.Debug);
    fmt.Fprint(w, "return DT;\n");
    fmt.Fprint(w, "})();\n")
  })

  mux.HandleFunc("GET /api/server/maxrequestsize", func(nu Nu) {
    nu.ReplyJson(config.Conf.MaxRequestSize)
  })

  mux.HandleFunc("GET /api/server/uuid", func(nu Nu) {
    nu.ReplyPlaintext(uuid.NewString())
  })

  mux.HandleFunc("GET /api/guild/{gid}/thief/{tid}", func(nu Nu) {
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

  mux.HandleFunc("GET /api/guild/{gid}", func(nu Nu) {
    w, r := nu.Unwrap()
    gid := thief.GuildID(r.PathValue("gid"))
    
    guild, ok := api.Guilds.Guild(gid)
    if !ok {
      nu.ReplyErr(404, "No guild is chartered as '%v'", gid)
      return
    }

    blob := guild.Json()
    w.Header().Add("Content-Type", "application/json")
    w.Write(blob)
  })

  mux.HandleFunc("GET /api/guild/{gid}/active", func(nu Nu) {
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

  mux.HandleFunc("GET /api/guild/{gid}/recruit", func(nu Nu) {
    _, r := nu.Unwrap()
    gid := thief.GuildID(r.PathValue("gid"))
    
    guild, ok := api.Guilds.Guild(gid)
    if !ok {
      nu.ReplyErr(404, "No guild is chartered as '%v'", gid)
      return
    }

    origin := r.Header.Get("Origin")
    if origin == "" {
      origin = r.Header.Get("X-Origin")
    }
    if origin == "" {
      origin = "Anonymous"
    }

    q := r.URL.Query()
    budget, _ := strconv.ParseInt(q.Get("budget"), 10, 64)
    offer := thief.JobOffer{
      Origin: origin,
      JobDescription: q.Get("job"),
      ShoppingList: q["buy"],
      Budget: budget,
    }

    thief := guild.Recruit(offer)
    nu.ReplyJson(thief)
  })

  mux.HandleFunc("OPTIONS /api/guild/{gid}/return/{tid}", func(nu Nu) {
    w, _ := nu.Unwrap()
    w.WriteHeader(200)
  })

  mux.HandleFunc("POST /api/guild/{gid}/return/{tid}", func(nu Nu) {
    _, r := nu.Unwrap()
    gid := thief.GuildID(r.PathValue("gid"))
    tid := thief.ThiefID(r.PathValue("tid"))
    
    guild, ok := api.Guilds.Guild(gid)
    if !ok {
      nu.ReplyErr(404, "No guild is chartered as '%v'", gid)
      return
    }

    guild.Return(tid)
    nu.ReplyPlaintext("welcome home! :)")
  })

  mux.HandleFunc("OPTIONS /api/guild/{gid}/deposit", func(nu Nu) {
    w, _ := nu.Unwrap()
    w.WriteHeader(200)
  })
  mux.HandleFunc("POST /api/guild/{gid}/deposit", func(nu Nu) {
    w, r := nu.Unwrap()

    gid := thief.GuildID(r.PathValue("gid"))
    guild, ok := api.Guilds.Guild(gid)
    if !ok {
      nu.ReplyErr(404, "No guild is chartered as '%v'", gid)
      return
    }

    body, err := ioutil.ReadAll(http.MaxBytesReader(w, r.Body, config.Conf.MaxRequestSize))
    if err != nil {
      nu.ReplyErr(413, "too big (%v)", err)
      return
    }

    var item loot.Loot
    err = jsv.JsonValue(body).Unmarshal(&item)
    if err != nil {
      nu.ReplyErr(400, err, "couldn't parse request body json: %v", err)
      return
    }

    if (item.Name == "") {
      nu.ReplyErr(400, "missing name")
      return
    }

    if (item.DOM == "") {
      nu.ReplyErr(400, "missing dom")
      return
    }

    if (item.StolenBy == "") {
      nu.ReplyErr(400, "missing stolen by")
      return
    }

    if (item.Uses == nil || len(item.Uses) == 0) {
      nu.ReplyErr(400, "missing uses")
    }

    if (item.ID == loot.LootID("")) {
      item.ID = loot.NewID()
    }

    if err = item.Validate(); err != nil {
      nu.ReplyErr(400, err)
      return
    }

    if err = guild.Deposit(&item); err != nil {
      nu.ReplyErr(400, err)
      return
    }
    nu.ReplyPlaintext("ok");
  })

  mux.HandleFunc("GET /api/allowhtml/tags", func(nu Nu) {
    nu.ReplyJson(loot.AllowTags)
  })

  mux.HandleFunc("GET /api/denyhtml/attrs", func(nu Nu) {
    nu.ReplyJson(loot.DenyAttributes)
  })

  mux.HandleFunc("GET /api/denyhtml/attr-prefixes", func(nu Nu) {
    nu.ReplyJson(loot.DenyAttrPrefixes)
  })

  mux.HandleFunc("GET /api/name", func(nu Nu) {
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
  mux.HandleFunc("/", func(nu Nu) {
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
  for f := range iot.IterFiles("js", func(e os.DirEntry) bool {
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

