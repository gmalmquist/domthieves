package api

import (
  "net/http"

  "domthieves/netutil"
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

  mux.Handle("GET /health", func(nu Nu) {
    nu.ReplyJson(api.Health)
  })

  api.Health = Ready()
}

func (api *Api) Serve(host string) {
  http.ListenAndServe(host, api.Mux)
}

func Ready() Health {
  return Health{ Ok: true, Status: "ready" }
}

