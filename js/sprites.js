const Sprites = {
  sheets: {},
};

Sprites.FetchSheet = async (url, args) => {
  if (Sprites.sheets[url]) {
    return Sprites.inflate(Sprites.sheets[url]);
  }
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`couldn't load spritesheet at ${url}`);
    return null;
  }
  const spritesheet = await resp.json();

  if (!spritesheet.url.startsWith('http:')
    && !spritesheet.url.startsWith('https:')) {
    if (spritesheet.url.startsWith('/')) {
      spritesheet.url = spritesheet.url.substring(1);
    }
    if (url.endsWith('/')) {
      spritesheet.url = `${url}${spritesheet.url}`;
    } else {
      const slash = url.lastIndexOf('/');
      spritesheet.url = `${url.substring(0, slash)}/${spritesheet.url}`;
    }
  }

  if (isEmpty(spritesheet.sprite_map)) {
    return null;
  }

  const reversed = (arr) => {
    if (isNone(arr)) {
      return arr;
    }
    const rev = new Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
      rev[arr.length - i - 1] = arr[i];
    }
    return rev;
  };

  spritesheet.kinds = {};

  for (const sprite of Object.values(spritesheet.sprite_map)) {
    // default to scanning sprites left to right
    if (isNone(sprite.play_direction)) {
      sprite.play_direction = 1;
    }

    // if a kind isn't specified, just use the name (basically
    // creates a unique kind)
    if (isEmpty(sprite.kinds)) {
      sprite.kinds = [ sprite.name ];
    }
    if (!sprite.kinds.some(k => k === sprite.name)) {
      sprite.kinds.push(sprite.name);
    }
    for (const kind of sprite.kinds) {
      let arr = spritesheet.kinds[kind];
      if (isEmpty(arr)) {
        arr = [];
      }
      arr.push(sprite.name);
      spritesheet.kinds[kind] = arr;
    }
  }

  if (isNone(spritesheet.sprite_map['abscond'])) {
    // default to abscond being equal to the reverse of appear
    const appear = spritesheet.sprite_map['appear'];
    const abscond = {
      ...appear,
      name: 'abscond',
      delay_milli: reversed(appear.delay_milli),
      distance_moved_per_frame: reversed(appear.distance_moved_per_frame),
      first_frame_x: appear.first_frame_x + appear.frame_width * (appear.frame_count - 1),
      play_direction: -appear.play_direction,
    };
    spritesheet.sprite_map['abscond'] = abscond;
  }

  // calculate movement
  Sprites.calcMovement(spritesheet);

  Sprites.sheets[url] = spritesheet;
  return Sprites.inflate(Sprites.sheets[url]);
}

/**
 * Canonicalizes metadata which specifies how a character should move to match
 * the sprite animation.
 *
 * We are broadly permissive with how we allow this information to be
 * specified in the raw spritesheet JSON, both for convenience and space
 * efficiency, but we need to convert it to a canonical form to be used
 * by the actual animation system running in the browser. Namely, we
 * populate an array of velocity vectors (`[{x, y}]`) which indicate how
 * far the character should move, and in what directions, on each frame.
 *
 * We additionally calculate the average velocity, stored in:
 *  - movement.avg.velocity `{x,y}`
 *  - movement.avg.speed `0`
 *
 * For maximal control, the raw incoming sprite JSON *can* specify the
 * velocity array directly, but most animations will have simpler values
 * (movement is often constant across an animation, and is usually in a
 * single direction).
 *
 * Velocity information may be specified in the raw JSON in the following
 * ways:
 *
 *  - movement.velocities `[{x,y}]`
 *  - movement.velocity `{x,y}`
 *  - movement.speeds `[s]`
 *  - movement.speed `s`
 *  - movement.direction `{x,y}` or cardinal N/S/E/W
 */
Sprites.calcMovement = sprite => {
  if (isNone(sprite.movement)) {
    sprite.movement = {};
  }

  // populate velocities array
  Sprites.calcVelocities(sprite);

  // derive averages
  const move = sprite.movement;
  move.avg = {
    velocity: { x: 0, y: 0 },
    speed: 0,
  };

  if (move.velocities.length === 0) {
    return;
  }

  let totalv = { x: 0, y: 0 };
  let totals = { x: 0, y: 0 };
  for (const v of move.velocities) {
    totalv.x += v.x;
    totalv.y += v.y;
    totals += Math.sqrt(v.x*v.x + v.y*v.y);
  }

  move.avg.speed = totals / move.velocities.length;
  move.avg.velocity = {
    x: totalv.x / move.velocities.length,
    y: totalv.y / move.velocities.length,
  };
}

Sprites.calcVelocities = sprite => {
  const move = sprite.movement;
  if (!isEmpty(move.velocities)) {
    return;
  }

  move.velocities = new Array(sprite.frame_count);
  move.velocities.fill({x: 0, y: 0});

  if (!isEmpty(move.velocity)) {
    move.velocities = new Array(sprite.frame_count).map(_ => move.velocity);
    return;
  }

  const dir = Sprites.parseDirection(firstNotEmpty(move.direction, move.dir));
  if (isNone(dir)) {
    // speed is meaningless without direction, so...
    return;
  }

  const mag = Math.sqrt(dir.x*dir.x + dir.y*dir.y);
  if (mag < 0.0001) {
    return; // zero dir means zero velocity.
  }

  // normalize
  dir.x /= mag;
  dir.y /= mag;

  if (!isEmpty(move.speeds)) {
    move.velocities = speeds.map(s => ({ x: dir.x * s, y: dir.y * s }));
    return;
  }

  if (isSome(move.speed)) {
    move.velocities.fill({ x: dir.x * move.speed, y: dir.y * move.speed });
    return
  }
};

Sprites.parseDirection = dir => {
  if (isNone(dir)) {
    return null;
  }
  const p = (x,y) => ({x,y});
  if (sameShape(dir, {x: 0, y: 0})) {
    return dir;
  }
  if (sameShape(dir, [0,0])) {
    return p(...dir);
  }
  switch (dir.toLocaleLowerCase()) {
    case "east":
    case "e":
    case "+x":
      return p(1,0);
    case "west":
    case "w":
    case "-x":
      return p(-1, 0);
    case "north":
    case "n":
    case "-y":
      return p(0, -1);
    case "south":
    case "s":
    case "+y":
      return p(0, 1);
    case "southeast":
    case "se":
    case "+x+y":
      return p(1, 1);
    case "northeast":
    case "ne":
    case "+x-y":
      return p(1, -1);
    case "northwest":
    case "nw":
    case "-x-y":
      return p(-1, -1);
    case "southwest":
    case "sw":
    case "-x+y":
      return p(-1, 1);
  }
  return null;
}

Sprites.inflate = blob => {
  const spritesheet = JSON.parse(JSON.stringify(blob));
  const spriteview = document.createElement('div');
  spriteview.style.position = 'absolute';
  spriteview.style.display = 'block';
  spriteview.style.overflow = 'hidden';
  spriteview.style.userSelect = 'none';
  spriteview.style.backgroundRepeat = 'no-repeat';
  spriteview.style.backgroundPosition = '0px 0px';
  spriteview.style.backgroundImage = `url("${spritesheet.url}")`;
  spriteview.style.width = '1px';
  spriteview.style.height = '1px';

  const anim = {
    spritesheet,
    spriteview,
    playing: '',
    frameIndex: 0,
    stopRequest: null,
    tickers: [],
    finishCallbacks: [],
  };

  anim.playKind = (kind, interrupt) => {
    if (isSome(anim.playing)) {
      if (!interrupt) {
        return false;
      }
      const sprite = anim.spritesheet.sprite_map[anim.playing];
      if (isSome(sprite) && sprite.kinds.some(k => k === kind)) {
        return false;
      }
      anim.stop();
    }
    const options = anim.spritesheet.kinds[kind];
    if (isEmpty(options)) {
      return false;
    }
    const animation = options[Math.floor(Math.random() * options.length)];
    anim.play(animation);
    return true;
  };

  anim.play = (name) => {
    const first = !isEmpty(name) && name !== anim.playing;
    const sprite = !isEmpty(name) ? spritesheet.sprite_map[name] : spritesheet.sprite_map[anim.playing];
    if (isNone(sprite)) {
      if (!isEmpty(anim.playing)) {
        anim.stop();
        return;
      }
      anim._finish(name);
      return;
    }
    anim.playing = sprite.name;
    anim.lastPlayed = sprite.name;
    if (first) {
      anim.spriteview.style.width = `${sprite.frame_width}px`;
      anim.spriteview.style.height = `${sprite.frame_height}px`;
      anim.iter = 0;
      anim.frameIndex = 0;
    }
    if (anim.frameIndex >= sprite.frame_count) {
      anim.frameIndex = 0;
    }
    const offsetX = -sprite.first_frame_x - (sprite.frame_width * anim.frameIndex * sprite.play_direction);
    anim.spriteview.style.backgroundPosition = `${offsetX}px ${-sprite.first_frame_y}px`;

    const tick = {
      animation: sprite.name,
      movement: sprite.movement,
      frameIndex: anim.frameIndex,
      frameCount: sprite.frame_count,
      delay: sprite.delay_milli[anim.frameIndex],
      iteration: anim.iter,
      loopCount: sprite.loop_count,
      distance: isEmpty(sprite.distance_moved_per_frame)
        ? null : sprite.distance_moved_per_frame[anim.frameIndex],
    };

    const tickers = [...anim.tickers];
    anim.tickers = [];
    for (const ticker of tickers) {
      if (ticker(tick)) {
        anim.tickers.push(ticker);
      }
    }

    if (anim.frameIndex === sprite.frame_count - 1 && sprite.loop_count !== 0) {
      if (isSome(anim.stopRequest)) {
        if (typeof anim.stopRequest === 'function') {
          anim.stopRequest();
        }
        anim.stopRequest = null;
        anim.playing = '';
        anim._finish(sprite.name);
        return
      }
      if (sprite.loop_count < 0 || anim.iter >= sprite.loop_count) {
        anim.playing = '';
        anim._finish(sprite.name);
        return;
      }
    }

    setTimeout(() => {
      if (sprite.name !== anim.playing) {
        return;
      }
      anim.frameIndex += 1;
      anim.play(sprite.name);
    }, sprite.delay_milli[anim.frameIndex]);
  };

  anim.onFinish = () => new Promise(resolve => {
    if (isEmpty(anim.playing)) {
      resolve();
      return;
    }
    anim.finishCallbacks.push(resolve);
  });

  anim._finish = (animation) => {
    anim.finishCallbacks.forEach(c => c(animation));
    anim.finishCallbacks = [];
  };

  anim.stop = () => new Promise(resolve => {
    anim.stopRequest = resolve;
  });

  return anim;
};
