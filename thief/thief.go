package thief

import (
  "github.com/google/uuid"
)

type ThiefID string

type Thief struct {
  // Unique ID of the thief
  ID ThiefID `json:"id"` 
  // Unique ID of the thieves guild
  GuildID GuildID `json:"guild"`
  // Display of an individual thief
  Name string `json:"name"`
  // Website (hostname) the thief is from
  Origin string `json:"origin"`
  // Website (hostname) the thief is working for
  Employer string `json:"employer"`
  // Human readable name of the thief's job
  JobDescription string `json:"job"`
  // When the job was assigned in RFC3339
  RecruitedAt string `json:"recruited_at"`
  // When the thief's employer last issued a query
  LastTaskAt string `json:"last_task_at"`
  // URL of spritesheet
  Spritesheet string `json:"spritesheet"`
}

func NewID() ThiefID {
  return ThiefID(uuid.NewString())
}

type JobOffer struct {
  Origin string `json:"origin"`
  Spritesheet string `json:"spritesheet"`
  JobDescription string `json:"job_description"`
}

