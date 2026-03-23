package validate

import (
  "gwen/blag/jsv"

  "errors"
  "fmt"
)

type JsonValue = jsv.JsonValue
type Validate = jsv.Validate

func named(name string, msg string, err error) error {
  if err == nil {
    return nil
  }
  return errors.New(join(" ", name, msg, err))
}

func namedStr(name string, msg string, args ...any) error {
  if len(args) > 0 {
    return fmt.Errorf(msg, args...)
  }
  return errors.New(join(" ", name, msg))
}

func NotBlank(name string) Validate {
  return func(v JsonValue) error {
    if v.IsBlank() {
      return namedStr(name, "cannot be blank")
    }
    return nil
  }
}

func Map(name string) Validate {
  return func(v JsonValue) error {
    _, err := v.Map()
    return named(name, "must be a map", err)
  }
}

func Integer(name string) Validate {
  return func(v JsonValue) error {
    _, err := v.Integer()
    return named(name, "must be an integer", err)
  }
}

func Float(name string) Validate {
  return func(v JsonValue) error {
    _, err := v.Float()
    return named(name, "must be a float", err)
  }
}

func MaxLength(name string, max int) Validate {
  return func(v JsonValue) error {
    s := v.String()
    if len(s) > max {
      return namedStr(name, "max length exceeded: %v / %v", len(s), max)
    }
    return nil
  }
}

func Child(name string, child string, check Validate) Validate {
  return func(v JsonValue) error {
    c, err := v.Resolve(child)
    if err == nil {
      err = check(c)
    }
    return named(join(name, child), "", err)
  }
}

func HasChild(name string, child string) Validate {
  return Child(name, child, NotBlank(join(".", name, child)))
}

func All(exitEarly bool, validations ... Validate) Validate {
  return func(v JsonValue) error {
    errs := []any{}
    for _, sub := range validations {
      err := sub(v)
      if err != nil {
        errs = append(errs, err)
        if exitEarly {
          break
        }
      }
    }
    if len(errs) == 0 {
      return nil
    }
    return errors.New(join(", ", errs...))
  }
}

func join(chr string, parts ...any) string {
  msg := ""
  for _, p := range parts {
    if p == nil {
      continue
    }
    s := fmt.Sprintf("%v", p)
    if s == "" {
      continue
    }
    if len(msg) > 0 {
      msg = fmt.Sprintf("%v%v%v", msg, chr, s)
    } else {
      msg = s
    }
  }
  return msg
}

