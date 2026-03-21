package thief

type ThiefID string

type Thief struct {
  ID ThiefID `json:"id"` Unique ID of the thief
  // Display of an individual thief
  Name string `json:"name"`
  // Website (hostname) the thief is from
  Origin string `json:"origin"`
  // URL of spritesheet
  Spritesheet string `json:"spritesheet"`
}

