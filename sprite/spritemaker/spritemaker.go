package spritemaker

import (
  "domthieves/jsv"
  "domthieves/rutil"
  "domthieves/sprite"

  "errors"
  "fmt"
  "image"
  "image/color"
  "image/draw"
  "image/gif"
  "image/png"
  "io"
  "os"
  "path/filepath"
  "regexp"
  "strconv"
  "strings"
)

type ChromaKeyMode string
const (
  ChromaKeyNone ChromaKeyMode = ""
  ChromaKeyOutsideIn = "outside-in"
  ChromaKeyAll = "all"
)

type OutputFormat string
const (
  FormatPNG OutputFormat = "png"
  FormatGIF = "gif"
)

type SpriteMaker struct {
  ChromaKeyMode ChromaKeyMode
  ChromaKeyColor color.RGBA
  OutputFormat OutputFormat
  InputPaths []string
}

func Cli(args ...string) {
  mkr := SpriteMaker{}
  paths := []string{}
  var outpath, flag string

  fatal := func(code int, err any, args ...any) {
    if len(args) > 0 {
      err = fmt.Sprintf(fmt.Sprintf("%v", err), args...)
    }
    fmt.Fprintf(os.Stderr, "%v\n", err)
    os.Exit(code)
  }

  for _, a := range args {
    if strings.HasPrefix(a, "-") {
      flag = strings.TrimPrefix(a, "-")
      switch flag {
      case "o":
        // output path
        continue
      case "ka": fallthrough
      case "k":        
        mkr.ChromaKeyMode = ChromaKeyAll
        flag = "k"
        continue
      case "kb":        
        mkr.ChromaKeyMode = ChromaKeyOutsideIn
        flag = "k"
        continue
      }
      continue
    }
    f := flag
    flag = ""
    switch f {
    case "o":
      outpath = a
      continue
    case "k":
      c, err := parseColor(a)
      if err != nil {
        fatal(1, "couldn't parse color %v proceeding %v: %v", a, flag, err)
      }
      mkr.ChromaKeyColor = c
      continue
    }
    paths = append(paths, a)
  }
  if outpath == "" {
    fatal(1, "missing output path")
  }
  mkr.InputPaths = paths

  switch filepath.Ext(strings.ToLower(outpath)) {
  case ".png":
    mkr.OutputFormat = FormatPNG
  case ".gif":
    mkr.OutputFormat = FormatGIF
  }
  
  mkr.WriteToFile(outpath)
}


func (mkr *SpriteMaker) WriteToFile(outpath string) error {
  f, err := os.Create(outpath)
  if err != nil {
    return err
  }
  defer f.Close()
  return mkr.Write(f)
}

func (mkr *SpriteMaker) Write(w io.Writer) error {
  fmt.Fprintf(os.Stderr, "Writing Spritesheet\n")
  fmt.Fprintf(os.Stderr, "  chroma-key-mode = %v\n", mkr.ChromaKeyMode)
  fmt.Fprintf(os.Stderr, "  chroma-key-color = %v,%v,%v\n",
    mkr.ChromaKeyColor.R, mkr.ChromaKeyColor.G, mkr.ChromaKeyColor.B)
  fmt.Fprintf(os.Stderr, "  input sprites:\n")
  for i, p := range mkr.InputPaths {
    fmt.Fprintf(os.Stderr, "    %v. %v\n", i + 1, filepath.Base(p))
  }

  paths := mkr.InputPaths

  if mkr.InputPaths == nil || len(mkr.InputPaths) == 0 {
    return errors.New("no input paths given")
  }

  if mkr.OutputFormat == "" {
    mkr.OutputFormat = "png"
  }


  sheetsize := image.Rectangle{
    Min: image.Pt(0, 0),
    Max: image.Pt(0, 0),
  }
  gifs := []*gif.GIF{}
  sprites := []*sprite.Sprite{}
  for _, path := range paths {
    img, err := loadGIF(path)
    if err != nil {
      return fmt.Errorf("Couldn't load %v: %v", path, err)
    }

    s := &sprite.Sprite{
      Name: filepath.Base(path),
      FirstFrameX: 0,
      FirstFrameY: sheetsize.Max.Y,
      FrameWidth: img.Config.Width,
      FrameHeight: img.Config.Height,
      FrameCount: len(img.Image),
      LoopCount: img.LoopCount,
      DelayMilli: make([]int, len(img.Image)),
    }

    for i, d := range img.Delay {
      // img.Delay is in centiseconds
      s.DelayMilli[i] = d * 10
    }

    if ext := filepath.Ext(s.Name); ext != "" {
      s.Name = strings.TrimPrefix(s.Name, ext)
    }

    seqwidth := s.FrameWidth * s.FrameCount
    if seqwidth > sheetsize.Max.X {
      sheetsize.Max.X = seqwidth
    }
    sheetsize.Max.Y += s.FrameHeight

    gifs = append(gifs, img)
    sprites = append(sprites, s)
  }

  if sheetsize.Max.X == 0 || sheetsize.Max.Y == 0 {
    return errors.New("No image data (empty sheet)")
  }

  sheet := image.NewRGBA(sheetsize)
  for i, sprite := range sprites {
    g := gifs[i]
    for j, frame := range g.Image {
      mkr.ChromaKey(frame)
      bounds := frame.Bounds()
      bounds.Min.X = sprite.FirstFrameX + j * g.Config.Width
      bounds.Min.Y = sprite.FirstFrameY
      bounds.Max.X += bounds.Min.X
      bounds.Max.Y += bounds.Min.Y
      draw.Draw(
        sheet,
        bounds,
        frame,
        image.Pt(0,0),
        draw.Src,
      )
    }
  }

  switch mkr.OutputFormat {
  case FormatPNG:
    err := png.Encode(w, sheet)
    if err != nil {
      return err
    }
  case FormatGIF:
    return errors.New("GIF output is unimplemented.")
  default:
    return fmt.Errorf("Unknown output format %v", mkr.OutputFormat)
  }

  blob, err := jsv.Marshal(sprites)
  if err != nil {
    return fmt.Errorf("failed to marshal json metadata for spritesheet: %v", err)
  }

  fmt.Print(blob.String())
  return nil
}

func (mkr SpriteMaker) ChromaKey(img *image.Paletted) {
  if mkr.ChromaKeyMode == ChromaKeyNone {
    return
  }
  key := mkr.ChromaKeyColor
  transparent := uint8(len(img.Palette))
  keyout := []uint8{}
  for i, paletted := range img.Palette {
    r, g, b, a := paletted.RGBA()
    if a == 0 {
      transparent = uint8(i)
      continue
    }
    if uint8(r) == key.R && uint8(g) == key.G && uint8(b) == key.B {
      keyout = append(keyout, uint8(i))
    }
  }
  if len(keyout) == 0 {
    return
  }
  if transparent == uint8(len(img.Palette)) {
    img.Palette = append(img.Palette, color.RGBA{})
  }
  switch mkr.ChromaKeyMode {
  case ChromaKeyNone:
    return
  case ChromaKeyAll:
    for i, c := range img.Pix {
      for _, k := range keyout {
        if c == k {
          img.Pix[i] = transparent
        }
        break
      }
    }
  }
}

func loadGIF(path string) (*gif.GIF, error) {
  f, err := os.Open(path)
  if err != nil {
    return nil, err
  }
  defer f.Close()
  return gif.DecodeAll(f)
}

var reHexColor = regexp.MustCompile(`(?i)^([#]?)(?<num>[A-F0-9]{3,6})$`)
var reDecTriple = regexp.MustCompile(`^(?<r>\d{1,3}),\s*(?<g>\d{1,3}),\s*(?<b>\d{1,3})$`)
func parseColor(s string) (color.RGBA, error) {
  c := func(r, g, b, a uint8) (color.RGBA, error) {
    return color.RGBA{ R: r, G: g, B: b, A: a }, nil
  }
  switch strings.ToLower(s) {
  case "w": fallthrough
  case "white":
    return c(255, 255, 255, 255)
  case "0": fallthrough
  case "b": fallthrough
  case "black":
    return c(0, 0, 0, 255)
  case "red":
    return c(255, 0, 0, 255)
  case "green":
    return c(0, 255, 0, 255)
  case "blue":
    return c(0, 0, 255, 255)
  case "yellow":
    return c(255, 255, 0, 255)
  case "magenta":
    return c(255, 0, 255, 255)
  case "cyan":
    return c(0, 255, 255, 255)
  case "gray":
    return c(0, 128, 128, 128)
  }
  transparent := color.RGBA{}
  if m := rutil.RegMatch(reHexColor, s); m != nil {
    snum := m["num"]
    var sr, sg, sb string
    if len(snum) == 3{
      sr = snum[0:1]
      sg = snum[1:2]
      sb = snum[2:3]
    } else if len(snum) == 6 {
      sr = snum[0:2]
      sg = snum[2:4]
      sb = snum[4:6]
    } else {
      return transparent, fmt.Errorf(
        "hex string must be 3 or 6 hexits, but len(%v) = %v",
        snum, len(snum),
      )
    }
    var r, g, b uint64
    var err error
    if r, err = strconv.ParseUint(sr, 16, 8); err != nil { return transparent, err }
    if g, err = strconv.ParseUint(sg, 16, 8); err != nil { return transparent, err }
    if b, err = strconv.ParseUint(sb, 16, 8); err != nil { return transparent, err }
    return c(uint8(r), uint8(g), uint8(b), 255)
  }
  if m := rutil.RegMatch(reDecTriple, s); m != nil {
    sr, sg, sb := m["r"], m["g"], m["b"]
    var r, g, b uint64
    var err error
    if r, err = strconv.ParseUint(sr, 10, 8); err != nil { return transparent, err }
    if g, err = strconv.ParseUint(sg, 10, 8); err != nil { return transparent, err }
    if b, err = strconv.ParseUint(sb, 10, 8); err != nil { return transparent, err }
    return c(uint8(r), uint8(g), uint8(b), 255)
  }
  return transparent, fmt.Errorf("invalid color `%v`", s)
}
