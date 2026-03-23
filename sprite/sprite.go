package sprite

type Sprite struct {
	Name string `json:"name"`

	// Width of an individual frame in pixels
	FrameWidth int `json:"frame_width"`

	// Height of an individual frame in pixels
	FrameHeight int `json:"frame_height"`

  // Top-left corner of first frame in spritesheet
	FirstFrameX int    `json:"first_frame_x"`

  // Top-left corner of first frame in spritesheet
	FirstFrameY int    `json:"first_frame_y"`

  // How many frames are in the spirte
	FrameCount  int    `json:"frame_count"`

	// Inset (padding) of the figure of the sprite,
	// if it is smaller than the size of the frame.
	//
	// This is useful for specifying "descent" /
	// parts of the image that may fall below the
	// semantic "feet" of the sprite.
	FigureInset Inset `json:"figure_inset"`

  // Duration of each frame in milliseconds.
	DelayMilli[] int `json:"delay_milli"`

	// Distance moved per frame (in pixels), for walking animations etc.
	//
	// If the array is empty, the speed is assumed to be 0.
	// If the array has one element, the speed is assumed to be constant.
	// If the array has a number of elements equal to the number of frames,
	// the sprite will move the specified amount on each frame.
	DistanceMovedPerFrame []int `json:"distance_moved_per_frame"`

	// -1 equals infinite, 0 equals once, 1+ is n+1
	LoopCount int `json:"loop_count"`
}

type Inset struct {
	Left   int `json:"left"`
	Right  int `json:"right"`
	Top    int `json:"top"`
	Bottom int `json:"bottom"`
}

type Spritesheet struct {
  URL string `json:"url"`
  Sprites map[string]*Sprite
}

