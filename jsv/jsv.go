package jsv

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

type JsonValue []byte

type Validate func(JsonValue) error

var falsies map[string]bool = func() map[string]bool {
  arr := []string{"false", "", "[]", "{}", "0", "''", `""`, "null"}
  m := map[string]bool{}
  for _, x := range arr {
    m[x] = true
  }
  return m
}()

func Marshal(ref any) (JsonValue, error) {
  bytes, err := json.Marshal(ref)
  if err != nil {
    return nil, err
  }
  return JsonValue(bytes), err
}

func (v JsonValue) Unmarshal(ref any) error {
	return json.Unmarshal(v, ref)
}

func MarshalMap(m map[string]any) (map[string]JsonValue, error) {
  blob, err := Marshal(m)
  if err != nil {
    return nil, err
  }
  return blob.Map()
}

func (v JsonValue) nota(kind string) error {
	return fmt.Errorf(
		"%v is not a %v", v.JSON(), kind,
	)
}

func (v JsonValue) String() string {
	var parsed string
	if err := v.Unmarshal(&parsed); err != nil {
		return v.JSON()
	}
	return strings.TrimSpace(parsed)
}

func (v JsonValue) JSON() string {
	return string(v)
}

func (v JsonValue) Falsey() bool {
  return falsies[v.String()]
}

func (v JsonValue) Truthy() bool {
  return !falsies[v.String()]
}

func (v JsonValue) Integer() (int64, error) {
	var parsed int64
	err := v.Unmarshal(&parsed)
	if err == nil {
		return parsed, nil
	}
	parsed, err = strconv.ParseInt(v.String(), 10, 64)
	if err != nil {
		return parsed, v.nota("integer")
	}
	return parsed, err
}

func (v JsonValue) Float() (float64, error) {
	var parsed float64
	err := v.Unmarshal(&parsed)
	if err == nil {
		return parsed, nil
	}
	parsed, err = strconv.ParseFloat(v.String(), 10)
	if err != nil {
		return parsed, v.nota("integer")
	}
	return parsed, err
}

func (v JsonValue) StringArray() ([]string, error) {
	var parsed []string
	if err := v.Unmarshal(&parsed); err != nil {
		return parsed, v.nota("string array")
	}
	return parsed, nil
}

func (v JsonValue) Array() ([]JsonValue, error) {
	var results []JsonValue
	var parsed []any
	if err := v.Unmarshal(&parsed); err != nil {
		return results, v.nota("array")
	}
	for _, a := range parsed {
		m, err := json.Marshal(a)
		if err != nil {
			return results, err
		}
		results = append(results, m)
	}
	return results, nil
}

func (v JsonValue) MapOrEmpty() map[string]JsonValue {
	m, err := v.Map()
	if err != nil {
		return map[string]JsonValue{}
	}
	return m
}

func (v JsonValue) Map() (map[string]JsonValue, error) {
	results := map[string]JsonValue{}
	var parsed map[string]any
	if err := v.Unmarshal(&parsed); err != nil {
		return results, v.nota("map")
	}
	for key, a := range parsed {
		m, err := json.Marshal(a)
		if err != nil {
			return results, err
		}
		results[key] = m
	}
	return results, nil
}

func (a Validate) And(b Validate) Validate {
	return func(value JsonValue) error {
		aerr := a(value)
		berr := b(value)
		if aerr == nil && berr == nil {
			return nil
		}
		if aerr == nil {
			return berr
		}
		if berr == nil {
			return aerr
		}
		return fmt.Errorf(
			"%v, %v", aerr, berr,
		)
	}
}

func (a Validate) Or(b Validate) Validate {
	return func(value JsonValue) error {
		aerr := a(value)
		berr := b(value)
		if aerr == nil || berr == nil {
			return nil
		}
		return fmt.Errorf(
			"%v, %v", aerr, berr,
		)
	}
}

func (v JsonValue) IsBlank() bool {
	txt := strings.TrimSpace(string(v))
	return txt == "" || txt == "[]" || txt == "{}" || txt == "\"\""
}

func (v JsonValue) Resolve(path string) (JsonValue, error) {
  node := v
  parts := strings.Split(path, ".")
  sofar := ""
  for _, part := range parts {
    if part == "" {
      continue
    }
    m, err := node.Map()
    if err != nil {
      return nil, fmt.Errorf("%v is not a map", sofar)
    }
    var ok bool
    node, ok = m[part]
    if !ok {
      return nil, fmt.Errorf("%v.%v is nil", sofar, part)
    }
    sofar = fmt.Sprintf("%v.%v", sofar, part)
  }
  return node, nil
}

func (v JsonValue) ResolveOr(path string, defaultValue JsonValue) JsonValue {
  r, e := v.Resolve(path)
  if e != nil || r.IsBlank() {
    return defaultValue
  }
  return r
}

func (v JsonValue) NotBlankOr(defaultValue JsonValue) JsonValue {
  if v.IsBlank() {
    return defaultValue
  }
  return v
}

