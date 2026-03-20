package rutil

import (
  "fmt"
  "log"
  "regexp"
  "strconv"
  "strings"
)

var reErrCode = regexp.MustCompile(`^(?P<code>\d+)(([:]\s*)|(\s+)).*`)

func RegMatch(p *regexp.Regexp, text string) map[string]string {
	return RegMatchNoTrim(p, strings.TrimSpace(text))
}

func RegMatchNoTrim(p *regexp.Regexp, text string) map[string]string {
	m := p.FindStringSubmatch(text)
	if m == nil {
		return nil
	}
	res := map[string]string{
    "0": m[0],
  }
	for i, name := range p.SubexpNames() {
		res[name] = m[i]
	}
	return res
}

func ParseErrCode(err any) int {
  m := RegMatch(reErrCode, fmt.Sprintf("%v", err))
  if m == nil {
    return 0
  }
  code, e := strconv.Atoi(m["code"])
  if e != nil {
    log.Printf("Failed to parse err code from %v: %v", err, e)
    return 0
  }
  return code
}

