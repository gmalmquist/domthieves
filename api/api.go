package api

import (
  "net/http"
  "os"
  "path/filepath"
  "strings"
  "fmt"

  "domthieves/config"
  "domthieves/netutil"
  "domthieves/storeutil"
)

const Version string = "0.0.1"

type Api struct {
  Mux *netutil.Mux
  Health Health
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

