package storeutil

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

var DefaultStorePath string = filepath.Join(".appdata", "store")
var ClobberDefaultFiles bool = false

func HumanBytes(size uint64) string {
	thousands := []string{
		"B",
		"KiB",
		"MiB",
		"GiB",
		"TiB",
	}
	fsize := float64(size)
	var i int
	for i = 0; i < len(thousands)-1 && fsize >= 1024.0; i += 1 {
		fsize = fsize / 1024.0
	}
	if i == 0 {
		return fmt.Sprintf("%v %v", size, thousands[i])
	}
	return fmt.Sprintf("%v %v", float64(int(fsize*100))/100.0, thousands[i])
}

func Powerwrite(path string, data []byte) error {
	path, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	parent := filepath.Dir(path)
	err = os.MkdirAll(parent, 0775)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func MustRead(path string) []byte {
  data, err := os.ReadFile(path)
  if err != nil {
    panic(err)
  }
  return data
}


func Exists(path string) bool {
	_, err := os.Stat(path)
	if err != nil && os.IsNotExist(err) {
		return false
	}
	return true
}

func IsFile(path string) bool {
	info, err := os.Stat(path)
	if err != nil && os.IsNotExist(err) {
		return false
	}
	return !info.IsDir()
}

func IsDir(path string) bool {
	info, err := os.Stat(path)
	if err != nil && os.IsNotExist(err) {
		return false
	}
	return info.IsDir()
}

func LegalFilename(name string) bool {
	if strings.Trim(name, " .") == "" {
		return false
	}
	return !strings.ContainsAny(name, "\t\r\n<>:\"|?*/\\")
}

func IterFiles(
	folder string,
	filter func(entry os.DirEntry) bool,
) func(yield func(string) bool) {
	entries, err := os.ReadDir(folder)
	return func(yield func(string) bool) {
		if err != nil {
			return
		}
		for _, e := range entries {
			name := e.Name()
			if filter != nil && !filter(e) {
				continue
			}
			if !yield(name) {
				return
			}
		}
	}
}

func CountIndent(line string, tts int) int {
	if strings.TrimSpace(line) == "" {
		return -1
	}
	count := 0
	for _, c := range line {
		if c == ' ' {
			count += 1
		} else if c == '\t' {
			count += tts
		} else {
			break
		}
	}
	return count
}

func Dedent(text string) string {
	lines := strings.Split(text, "\n")
	indent := -1
	for _, line := range lines {
		count := CountIndent(line, 2)
		if count < 0 {
			continue
		}
		if indent < 0 || count < indent {
			indent = count
		}
	}
	if indent <= 0 {
		return text
	}
	trailingNewline := false
	for i, _ := range lines {
		blank := lines[i] == strings.TrimSpace(lines[i])
		trailingNewline = blank
		if blank {
			lines[i] = ""
			continue
		}
		if len(lines[i]) >= indent {
			lines[i] = lines[i][indent:]
		}
	}
	text = strings.TrimSpace(strings.Join(lines, "\n"))
	if trailingNewline {
		text = fmt.Sprintf("%v\n", text)
	}
	return text
}

func ReplyJson(v any, w http.ResponseWriter) {
	data, err := json.Marshal(v)
	if err != nil {
		http.Error(w, fmt.Sprintf("failed to marshal response: %q", err), 500)
		return
	}
	w.Header().Add("Content-Type", "application/json")
	w.WriteHeader(200)
	w.Write(data)
}

func ReplyErr(code int, err any, w http.ResponseWriter) {
	w.Header().Add("Content-Type", "text/plain")
	w.WriteHeader(code)
	w.Write([]byte(fmt.Sprintf("%v", err)))
}

