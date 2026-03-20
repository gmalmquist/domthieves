package netutil

import (
  "domthieves/storeutil"
  "domthieves/rutil"

  "bytes"
  "fmt"
  "io"
  "net/http"
  "regexp"
)


var reRoute = regexp.MustCompile(`^((?<method>[a-zA-Z]+)\s+)?(?<path>/[^ ]+)$`)

type Nu struct {
  mux *http.ServeMux
  w http.ResponseWriter
  r *http.Request
}

type Mux struct {
  *http.ServeMux
  StandardHeader http.Header
  AllowAllCors bool
}

func (mux *Mux) ServeHTTP(w http.ResponseWriter, r *http.Request) {
  mux.ServeMux.ServeHTTP(w, r)
}

func (mux *Mux) Handle(route string, f func(*Nu)) {
  Handle(mux.ServeMux, route, func(nu *Nu) {
    for key, vals := range mux.StandardHeader {
      for _, val := range vals {
        nu.AddHeader(key, val)
      }
    }
    if mux.AllowAllCors {
      origin := nu.r.Header.Get("Origin")
      if origin == "" {
        origin = "*"
      }
      nu.w.Header().Add("Access-Control-Allow-Origin", origin)
    }
    f(nu)
  })
}

func Wrap(mux *http.ServeMux) *Mux {
  return &Mux{
    ServeMux: mux,
    StandardHeader: http.Header(
        map[string][]string{},
    ),
  }
}

func NuMux() *Mux {
  return Wrap(http.NewServeMux())
}

func ForRequest(
  mux *http.ServeMux,
  w http.ResponseWriter,
  r *http.Request,
) *Nu {
  return &Nu{
    mux: mux,
    w: w,
    r: r,
  }
}

func Handle(
  mux *http.ServeMux,
  route string,
  f func(*Nu),
) {
  mux.HandleFunc(route, func(w http.ResponseWriter, r *http.Request) {
    f(ForRequest(mux, w, r))
  })
}

func (u *Nu) ReplyErr(code int, err any) {
  pcode := rutil.ParseErrCode(err)
  if pcode > 0 && pcode < code {
    code = pcode
  }
  storeutil.ReplyErr(code, err, u.w)
}

func (u *Nu) ReplyJson(blob any) {
  storeutil.ReplyJson(blob, u.w)
}

func (u *Nu) ReplyHTMLErr(code int, err any) {
  u.w.Header().Add("Content-Type", "text/html; charset=utf-8")
  u.w.Write([]byte(fmt.Sprintf(`
    <div class="error-message">
      <div class="error-code">%v</div>
      <pre class="error-body">%v</pre>
    </div>
  `, code, err)))
}

func (u *Nu) CookieOr(key string, defaultValue string) string {
  value := defaultValue
  for _, c := range u.r.CookiesNamed(key) {
    if c.Value != "" {
      value = c.Value
    }
  }
  return value
}

func (u *Nu) SetErrHeader(err any, args ...any) string {
  msg := fmt.Sprintf("%v", err)
  if len(args) > 0 {
    msg = fmt.Sprintf(msg, args...)
  }
  u.SetHeader("X-Error-Message", msg)
  return msg
}

func (u *Nu) AddHeader(key string, val string) {
  u.r.Header.Add(key, val)
  u.w.Header().Add(key, val)
}

func (u *Nu) SetHeader(key string, val string) {
  u.r.Header.Set(key, val)
  u.w.Header().Set(key, val)
}

func (u *Nu) SetCookie(cookie *http.Cookie) {
  u.r.AddCookie(cookie)
  http.SetCookie(u.w, cookie)
}

func (u *Nu) GetErrHeader() string {
  return u.r.Header.Get("X-Error-Message")
}

func (u *Nu) Forwarder(method string, route string, args ...any) func() {
  return func() {
    u.Forward(method, route, args...)
  }
}

func (u *Nu) Forward(method string, path string, args ...any) {
  if len(args) > 0 {
    path = fmt.Sprintf(path, args...)
  }
  if method != "" {
    u.r.Method = method
  }
  if path != "" {
    u.r.URL.Path = path
  }
  switch method {
  case "HEAD": fallthrough
  case "OPTIONS": fallthrough
  case "GET": fallthrough
  case "DELETE":
    var b bytes.Buffer
    u.r.Body = io.NopCloser(&b)
    u.r.Header.Set("Content-Length", string(0))
  }
  u.mux.ServeHTTP(u.w, u.r)
}

func (u *Nu) Unwrap() (w http.ResponseWriter, r *http.Request) {
  return u.w, u.r
}
