package spritemaker

import (
  "domthieves/sprite"
  "domthieves/jsv"

  "errors"
  "fmt"
  "image"
  "image/color"
  "image/draw"
  "image/gif"
  "image/png"
  "os"
  "path/filepath"
  "strings"
)

type ChromaKeyMode string
const (
  ChromeKeyNone ChromaKeyMode = ""
  ChromaKeyOutsideIn = "outside-in"
  ChromaKeyAll = "all"
)

type SpriteMaker struct {
  ChromaKeyMode ChromaKeyMode
  ChromakeyColor color.RGBA
}


func GifToSpritesheet(args ...string) error {
  outpath := ""
  paths := []string{}

  last := ""
  for _, a := range args {
    if a == "-o" {
      last = a
      continue
    }
    if last == "-o" {
      outpath = a
    } else {
      paths = append(paths, a)
    }
    last = a
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

  out, err := os.Create(outpath)
  if err != nil {
    return err
  }
  defer out.Close()

  err = png.Encode(out, sheet)
  if err != nil {
    return err
  }

  blob, err := jsv.Marshal(sprites)
  if err != nil {
    return err
  }

  fmt.Print(blob.String())

  return nil
}

func loadGIF(path string) (*gif.GIF, error) {
  f, err := os.Open(path)
  if err != nil {
    return nil, err
  }
  defer f.Close()
  return gif.DecodeAll(f)
}
