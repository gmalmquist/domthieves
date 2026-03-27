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

  // handle copies
  for (const [name, sprite] of Object.entries(spritesheet.sprite_map)) {
    if (isEmpty(sprite.copy)) {
      continue
    }
    if (isEmpty(sprite.copy.src)) {
      console.warn(`sprite ${spritesheet.url}:${name} specified 'copy' without a 'src'.`)
      delete(spritesheet.sprite_map, name);
      continue;
    }
    const src = spritesheet.sprite_map[sprite.copy.src];
    if (isNone(src)) {
      console.warn(`sprite ${spritesheet.url}:${name} could not locate src '${sprite.copy.src}'`)
      delete(spritesheet.sprite_map, name);
      continue;
    }
    let spr = { ...src, };
    if (sprite.copy.reverse) {
      spr.delay_milli = reversed(src.delay_milli);
      spr.distance_moved_per_frame = reversed(src.distance_moved_per_frame);
      spr.first_frame_x = src.first_frame_x + src.frame_width * (src.frame_count - 1);
      spr.play_direction = isSome(src.play_direction) ? -src.play_direction : -1;
    }
    spritesheet.sprite_map[name] = {
      ...spr,
      name,
      ...sprite,
    };
  }

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

    Sprites.calcMovement(sprite);
  }

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
  let totals = 0;
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
    move.velocities.fill(move.velocity);
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

  anim.speedOf = (name) => {
    const sprite = anim.spritesheet.sprite_map[name];
    if (isNone(sprite)) {
      return 0;
    }
    return sprite.movement.avg.speed;
  };

  anim.playKind = (kind, interrupt, resolve) => {
    if (isNone(resolve)) {
      resolve = () => {};
    }
    if (!isEmpty(anim.playing)) {
      if (!interrupt) {
        resolve(false);
        return false;
      }
      const sprite = anim.spritesheet.sprite_map[anim.playing];
      if (isSome(sprite) && sprite.kinds.some(k => k === kind)) {
        resolve(false);
        return false;
      }
      anim.stop();
    }
    const options = anim.spritesheet.kinds[kind];
    if (isEmpty(options)) {
      resolve(false);
      return false;
    }
    const animation = options[Math.floor(Math.random() * options.length)];
    anim.play(animation, resolve);
  };

  anim.play = (name, resolve) => {
    if (isNone(resolve)) {
      resolve = () => {};
    }
    const first = !isEmpty(name) && name !== anim.playing;
    const sprite = !isEmpty(name) ? spritesheet.sprite_map[name] : spritesheet.sprite_map[anim.playing];
    if (isNone(sprite)) {
      if (!isEmpty(anim.playing)) {
        anim.stop();
        resolve(false);
        return;
      }
      anim._finish(name);
      resolve(false);
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
    anim.spriteview.style.opacity = '0';
    anim.spriteview.style.backgroundPosition = `${offsetX}px ${-sprite.first_frame_y}px`;

    const tick = {
      animation: sprite.name,
      movement: sprite.movement,
      velocity: sprite.movement.velocities[anim.frameIndex],
      frameIndex: anim.frameIndex,
      frameCount: sprite.frame_count,
      delay: sprite.delay_milli[anim.frameIndex],
      iteration: anim.iter,
      loopCount: sprite.loop_count,
    };

    const tickers = [...anim.tickers];
    anim.tickers = [];
    for (const ticker of tickers) {
      if (ticker(tick)) {
        anim.tickers.push(ticker);
      }
    }

    anim.spriteview.style.opacity = '1';

    if (anim.frameIndex === sprite.frame_count - 1 && sprite.loop_count !== 0) {
      if (isSome(anim.stopRequest)) {
        if (typeof anim.stopRequest === 'function') {
          anim.stopRequest();
        }
        anim.stopRequest = null;
        anim.playing = '';
        anim._finish(sprite.name);
        resolve(true);
        return
      }
      if (sprite.loop_count < 0 || anim.iter >= sprite.loop_count) {
        anim.playing = '';
        anim._finish(sprite.name);
        resolve(true);
        return;
      }
    }

    setTimeout(() => {
      if (sprite.name !== anim.playing) {
        resolve(true);
        return;
      }
      anim.frameIndex += 1;
      anim.play(sprite.name, resolve);
    }, sprite.delay_milli[anim.frameIndex]);
  };

  anim.playBestSprite = (scoreFunc) => {
    const sprite = anim.getBestSprite(scoreFunc);
    if (isSome(sprite)) {
      anim.play(sprite.name);
    }
  };

  anim.getBestSprite = (scoreFunc) => {
    let best = null;
    let highScore = 0;
    for (const sprite of Object.values(anim.spritesheet.sprite_map)) {
      let score = scoreFunc(sprite);
      if (isNone(best) || score > highScore) {
        best = sprite;
        highScore = score;
      }
    }
    if (isSome(highScore) && highScore <= 0) {
      return null;
    }
    return best;
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
    if (isEmpty(anim.playing)) {
      resolve();
      return;
    }
    anim.stopRequest = resolve;
  });

  return anim;
};

Sprites.BestVelocity = targetVelocity => sprite => {
  const v = Geom.point(targetVelocity);
  // rather than the fastest animation we have in the given direction,
  // we actually prefer the one 
  const svel = sprite.movement.avg.velocity;
  // f is essentially the multiples of the target velocity that the sprites's
  // average velocity goes in. e.g., for `<2,0>` and `<-10, *>`, this value will
  // be `-5.0`.
  const f = Vec.dot(v, svel) / Vec.mag2(v);
  if (f <= 0) {
    return f;
  }
  // we actually *don't* want the greatest f, we want the f closest to 1.
  if (f === 1.0) {
    // prevent divide by zero
    return Number.MAX_VALUE;
  }
  return 1.0 / Math.abs(f - 1.0);
}

