package sprite

type Sprite struct {
	Name string `json:"name"`

	// Width of an individual frame in pixels
	Width int `json:"width"`

	// Height of an individual frame in pixels
	Height int `json:"height"`

	// Inset (padding) of the figure of the sprite,
	// if it is smaller than the size of the frame.
	//
	// This is useful for specifying "descent" /
	// parts of the image that may fall below the
	// semantic "feet" of the sprite.
	FigureInset Inset `json:"figure_inset"`

	// For animated gifs. Mutually exclusive with FrameURLs and SheetFrames.
	GIFUrl string `json:"gif_url"`

	// URLs of individual frames. Mutually exclusive with GIFUrl and SheetFrames.
	FrameURLs []string `json:"frame_urls"`

	// Instead get frames from a sprite sheet. Mutually exclusive with FrameURLs and GIFUrl.
	SheetFrames *SheetFrames `json:"sheet_frames"`

	// 0 means the sprite is not animated
	FPS int `json:"fps"`

	// Distance moved per frame (in pixels), for walking animations etc.
	//
	// If the array is empty, the speed is assumed to be 0.
	// If the array has one element, the speed is assumed to be constant.
	// If the array has a number of elements equal to the number of frames,
	// the sprite will move the specified amount on each frame.
	DistanceMovedPerFrame []int `json:"distance_moved_per_frame"`

	// How many times the sprite animation loops
	LoopCount Loop `json:"loop"`
}

type Inset struct {
	Left   int `json:"left"`
	Right  int `json:"right"`
	Top    int `json:"top"`
	Bottom int `json:"bottom"`
}

type SheetFrames struct {
	URL         string `json:"url"`
	FirstFrameX int    `json:"first_frame_x"`
	FirstFrameY int    `json:"first_frame_y"`
	FrameWidth  int    `json:"frame_width"`
	FrameHeight int    `json:"frame_height"`
	FrameCount  int    `json:"frame_count"`
}

type LoopCount string

const (
	LoopForever LoopCount = "loop_forever"
	LoopOnce              = "loop_once"
)
