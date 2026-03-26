var DT = {};

const ALREADY_STOLEN = 'already_stolen';
const ALREADY_ASSESSED = 'already_stolen';
const USELESS = 'useless';
const ILLEGAL_TAG = 'illegal_tag';
const HIDDEN = 'hidden';
const SACK_FULL = 'sack is full';

DT.ApiRoot = 'https://domthieves.gwen.run/api';

DT.Fetch = async (path, args) => {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return await fetch(`${DT.ApiRoot}${path}`, args);
};

DT.Anim = {};

DT.Anim.TakeElement = async (element, target, args) => {
  args = firstNotNone(args, {});
  const durationMilli = firstNotNone(args.durationMilli, 500);
  const scaleDown = firstNotNone(args.scale, 0.01);
  const angle = firstNotNone(args.angle, '135deg');
  const reverse = firstNotNone(args.reverse, false);
  const remove = firstNotNone(args.remove, true);

  const centroid = Geom.point(['centroid', element]);

  const setTransform = (angle, scale) => {
    const d = Geom.point([ target, '-', centroid ]);
    element.style.transform = `
      translate(${d.x}px, ${d.y}px)
      rotate(${angle})
      scale(${scale})
      translate(${-d.x}px, ${d.y}px)
    `;
    console.log(element.style.transform, target, centroid, d);
  };
  
  setTransform(reverse ? angle : '0deg', reverse ? scaleDown : 1.0);
  if (Number.parseFloat(element.style.opacity) === 0.0) {
    element.style.opacity = '1.0';
  }

  element.style.transitionProperty = 'transform';
  element.style.transitionDuration = `${durationMilli / 1000.0}s`;
  element.style.transformOrigin = "center";
  
  await new Promise(resolve => setTimeout(() => {
    setTransform(reverse ? '0deg' : angle, reverse ? 1.0 : scaleDown);
    resolve();
  }, 10));

  await new Promise(resolve => setTimeout(() => {
    if (!remove) {
      element.style.display = 'none';
      element.remove();
    }
    resolve();
  }, durationMilli));

  return element;
};

DT.Anim.PlaceElement = async (element, target, args) => {
  if (isSome(args.over)) {
    // place element on top of existing element
    element.style.opacity = '0';
    element.style.position = 'absolute';
    if (element.style.display === 'inline') {
      element.style.display = 'block';
    }
    
    if (isNone(element.parentNode)) {
      document.body.appendChild(element);
      await new Promise(r => setTimeout(r, 10));
    }

    const ebounds = Geom.getDocumentBoundingRect(element);
    const tcenter = Geom.point(['centroid', Geom.getDocumentBoundingRect(args.over)]);
    element.style.left = tcenter.x - ebounds.width / 2;
    element.style.top = tcenter.y - ebounds.height / 2;
  }
  return await DT.Anim.TakeElement({ ...args, reverse: true });
};

DT.ForEachLootItem = async (callback) => {
  const selectors = [
    '[data-loot]',
    '[data-loot-kind]',
  ];
  for (const sel of selectors) {
    for (const dom of document.querySelectorAll(sel)) {
      if (dom.dataset.lootStolen) {
        continue;
      }
      if (dom.dataset.lootPhantom) {
        continue;
      }
      const item = DT.AssessLootItem(dom);
      if (isNone(item)) {
        continue;
      }
      if (typeof item === 'string') {
        continue;
      }
      if (isNone(item.dom.dataset.lootId)) {
        const id = await DT.Fetch('/server/uuid').then(r => r.text());
        item.dom.dataset.lootId = id;
      }
      callback(item);
    }
  }
};

DT.FindLoot = () => {
  DT.AssessLoot(document.querySelectorAll('[data-loot]'));
  DT.AssessLoot(document.querySelectorAll('[data-loot-kind]'));
};

DT.AssessLoot = (loot) => {
  for (const dom of loot) {
    const item = DT.AssessLootItem(dom);
    if (typeof item === 'string') {
      continue;
    }
    if (item.size > DT.maxRequestSize) {
      dom.dataset.lootTooBig = "true";
      continue;
    }
    DT.inventory.push(item);
    item.dom.dataset.lootAssessed = "true";
  }
};

DT.AssessLootItem = dom => {
  if (!!dom.dataset.lootStolen) {
    return ALREADY_STOLEN;
  }

  const style = window.getComputedStyle(dom);
  if (style.display === 'none' || style.opacity === 0.0) {
    return HIDDEN;
  }

  if (isSome(dom.dataset.lootAssessed)) {
    return ALREADY_ASSESSED;
  }

  const tagName = dom.tagName.toLocaleLowerCase();

  const allKinds = [];
  if (isSome(dom.dataset.lootKind)) {
    dom.dataset.lootKind.trim().split(/\s+/)
      .filter(u => u.length > 0)
      .map(u => u.toLocaleLowerCase())
      .forEach(kind => allKinds.push(kind));
  }
  if (!isEmpty(dom.dataset.loot)) {
    allKinds.push(dom.dataset.loot);
  }
  allKinds.push(tagName);

  const uft = DT.UsesFromTag(tagName);
  if (typeof uft === 'string') {
    allKinds.push(uft);
  } else if (Array.isArray(uft)) {
    uft.forEach(u => allKinds.push(u));
  }

  const uses = dedup(allKinds);

  if (uses.length === 0) {
    return USELESS;
  }

  const copy = DT.CleanCopyDOM(dom);
  if (isNone(copy)) {
    return ILLEGAL_TAG;
  }

  const wrap = document.createElement('div');
  wrap.appendChild(copy);

  const item = {
    id: '',
    name: firstNotEmpty(
      dom.dataset.loot,
      ...uses,
    ),
    dom: wrap.innerHTML,
    stolen_by: '',
    uses,
    original_use: firstNotEmpty(
      ...uses,
    ),
    home: window.location.origin,
    price: 0,
  };

  const size = JSON.stringify(item).length;
  return {
    item,
    dom,
    uses: new Set(uses),
    size,
  };
};

DT.UsesFromTag = tagName => {
  switch (tagName) {
    case "hr":
      return ["ruler"];
  }
};

function* walkTree(dom) {
  yield dom;
  if (isSome(dom.childNodes)) {
    for (const child of dom.childNodes) {
      for (const kid of walkTree(child)) {
        yield kid;
      }
    }
  }
};

function* walkTreePair(aroot, broot) {
  iterA = walkTree(aroot);
  iterB = walkTree(broot);

  let nextA = iterA.next();
  let nextB = iterB.next();

  while (!nextA.done && !nextB.done) {
    yield [nextA.value, nextB.value];

    nextA = iterA.next();
    nextB = iterB.next();
  }
};


DT.CleanCopyDOM = original => {
  switch (original.nodeType) {
    case Node.ELEMENT_NODE:
      break
    case Node.TEXT_NODE:
      return original.cloneNode(true);
    case Node.ATTRIBUTE_NODE:
      return original.cloneNode(true);
    default:
      return null;
  }

  if (!DT.allowedTags[original.tagName.toLocaleLowerCase()]) {
    return null;
  }

  const dom = original.cloneNode(false);

  for (const a of original.getAttributeNames()) {
    const name = a.toLocaleLowerCase();
    if (DT.deniedAttrs[name]) {
      dom.removeAttribute(name);
      continue;
    }
    for (const prefix of DT.deniedAttrPrefixes) {
      if (name.startsWith(prefix)) {
        dom.removeAttribute(name);
        continue;
      }
    }
  }

  if (!isNone(original.childNodes)) {
    for (const child of original.childNodes) {
      const copy = DT.CleanCopyDOM(child);
      if (isNone(copy)) {
        continue;
      }
      dom.appendChild(copy);
    }
  }

  DT.BakeStyle(original, dom);
  return dom;
};

DT.BakeStyle = (dom, copy) => {
  const style = window.getComputedStyle(dom);
  for (const prop of Object.values(style)) {
    if (prop.startsWith('--')) {
      if (!prop.startsWith('--moz') && !prop.startsWith('--webkit')) {
        // avoid plugin-generated crud
        continue;
      }
    }
    if (style[prop] === 'auto') {
      // this is almsot always the default
      continue;
    }
    if (prop === 'z-index') {
      continue;
    }
    copy.style[prop] = style[prop];
  }
};

DT.LocateUse = use => {
  DT.FindLoot();
  for (const item of DT.inventory) {
    if (item.dom.dataset.lootStolen) {
      continue;
    }
    if (item.uses.has(use)) {
      return item;
    }
  }
};

DT.Reify = html => {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  if (wrap.children.length === 1) {
    const n = wrap.children[0];
    n.remove();
    return n;
  }
  return wrap;
};

DT.PhantomClone = item => {
  const place = Geom.getDocumentBoundingRect(item.dom);

  const wrap = document.createElement('div');
  wrap.innerHTML = item.item.dom;
  const copy = wrap.children[0];

  copy.dataset.lootPhantom = "true";

  copy.style.position = 'absolute';
  copy.style.transitionProperty = '';
  copy.style.left = `${place.left}px`;
  copy.style.top = `${place.top}px`;
  copy.style.margin = '0px';

  if (copy.style.display === 'inline') {
    copy.style.display = 'inline-block';
  }

  if (copy.innerHTML.trim() !== "") {
    // if this is a container, we need to make sure we use the min-contents
    // bounding rect.
    switch (item.dom.style.display) {
      case 'flex':
        copy.style.display = 'inline-flex';
        break;
      case 'grid':
        copy.style.display = 'inline-grid';
        break;
      case 'table':
        copy.style.display = 'inline-table';
        break;
      default:
        copy.style.display = 'inline-block';
        break;
    }

    // set the max values instead of the direct values, in case the element's inline size is
    // smaller
    copy.style.width = 'unset';
    copy.style.height = 'unset';
    copy.style.maxWidth = `${place.width}px`;
    copy.style.maxHeight = `${place.height}px`;

    copy.style.opacity = '0';
    document.body.appendChild(copy);
    const rect = Geom.getDocumentBoundingRect(copy);
    if (rect.width === 0) {
      copy.style.width = place.width;
    } else {
      copy.style.width = rect.width;
    }
    if (rect.height === 0) {
      copy.style.height = place.height;
    } else {
      copy.style.height = rect.height;
    }
    copy.remove();
    copy.style.opacity = item.dom.style.opacity;
  }
  return copy;
};

// Pirating an item makes a copy of it, and hides the original.
DT.Pirate = (item) => {
  const copy = DT.PhantomClone(item);

  copy.setAttribute('title', `${item.item.name} is being stolen`);

  document.body.appendChild(copy);

  // we turn down the opacity, but do not set display to none, because we
  // want to preserve the page layout.
  item.dom.style.opacity = 0;
  item.dom.style.userSelect = 'none';
  item.dom.style.pointerEvents = 'none';

  item.dom.dataset.lootStolen = 'true';
  item.dom.dataset.lootKind = item.item.original_use;

  return copy;
};

DT.Recruit = async () => {
  const meta = await DT.Fetch(`/guild/${DT.guild}/recruit`).then(r => r.json());
  const thief = {
    meta,
    task: null,
    node: null,
    speed: 16.0,
    anim: null,
    sack: [],
    sackSize: 0,
  };

  let size = 32; // ??
  let reach = 8;

  const node = document.createElement('div');
  node.dataset.thief = meta.id;
  node.dataset.thiefName = meta.name;

  node.style.display = 'flex';
  node.style.flexDirection = 'column';
  node.style.alignItems = 'center';
  node.style.justifyContent = 'center';
  node.style.textAlign = 'center';
  node.style.position = 'absolute';
  node.style.userSelect = 'none';

  const spriteblock = document.createElement('div');
  spriteblock.style.display = 'block';
  spriteblock.style.backgroundColor = 'rgba(0,0,0,0.25)';
  spriteblock.style.imageRendering = 'pixelated';
  spriteblock.style.position = 'relative';
  spriteblock.style.overflow = 'hidden';
  spriteblock.style.width = `${size}px`;
  spriteblock.style.height = `${size}px`;
  spriteblock.style.margin = '4px';

  const nametag = document.createElement('div');
  nametag.style.display = 'block';
  nametag.style.fontFamily = 'monospace';
  nametag.style.fontSize = '0.8rem';
  nametag.style.color = 'white';
  nametag.style.backgroundImage = `linear-gradient(
    to bottom, #666666, #222222
  )`;
  nametag.style.padding = '1px';
  nametag.style.border = '1px solid #222222';
  nametag.style.borderRadius = '4px';
  nametag.style.overflow = 'hidden';
  nametag.style.pointerEvents = 'none';
  nametag.style.userSelect = 'none';
  nametag.style.opacity = '0.8';
  nametag.style.transitionProperty = 'opacity';
  nametag.style.transitionDuration = '0.5s';
  nametag.innerHTML = thief.meta.name;

  node.appendChild(nametag);
  node.appendChild(spriteblock);

  thief.node = node;
  thief._nametagAction = '';
  thief.taskQueue = [];

  if (!isEmpty(meta.spritesheet)) {
    thief.anim = await Sprites.FetchSheet(meta.spritesheet);
    if (isSome(thief.anim)) {
      spriteblock.appendChild(thief.anim.spriteview);
    }
  }

  thief.showNametag = () => {
    const task = thief.newTask('showing nametag', (_, task) => {
      if (task.firstFrame) {
        if (parseFloat(nametag.style.opacity) > 0.0) {
          return false;
        }
        if (thief._nametagAction === 'hide') { return false; }
        nametag.style.opacity = '0.8';
        thief._nametagAction = 'show';
      }
      if (task.duration <= 0.5) {
        return true; // let css transition occur
      }
      thief._nametagAction = '';
      return false;
    });
    return task;
  };

  thief.hideNametag = (immediate) => {
    const task = thief.newTask('hiding nametag', (_, task) => {
      if (task.firstFrame) {
        if (parseFloat(nametag.style.opacity) === 0.0) {
          return false;
        }
        if (thief._nametagAction === 'show') { return false; }
        nametag.style.opacity = '0';
        thief._nametagAction = 'hide';
      }
      if (task.duration <= 0.5) {
        return true; // let css transition occur
      }
      thief._nametagAction = '';
      return false;
    });
    return task;
  };

  thief.setStatus = (text) => {
    const last = thief.node.getAttribute('title');
    if (text === '') {
      thief.node.setAttribute('title', thief.meta.name);
    } else {
      thief.node.setAttribute('title', `${thief.meta.name} is ${text}`);
    }
  };

  thief.flashNametag = (duration) => {
    thief.asyncTask(thief.showNametag());
    setTimeout(() => thief.asyncTask(thief.hideNametag()), isSome(duration) ? Math.floor(1000 * duration) : 2500);
  };

  thief.setStatus('');

  thief.newTask = (name, action) => {
    const task = {
      name,
      action,
      duration: 0,
      frame: 0,
      state: 'ready',
    };

    task.start = () => {
      if (task.state !== 'ready') {
        return false;
      }
      task.state = 'running';
      thief.setStatus(task.name);
      return true;
    };

    task.cancel = () => {
      if (task.state !== 'ready' && task.state !== 'running') {
        return false;
      }
      task.state = 'cancelled';
      thief.setStatus('idle');
      task.action = () => {};
      return true;
    };

    task.finish = () => {
      if (!task.cancel()) {
        return false;
      }
      task.state = 'finished';
      return true;
    };

    return task;
  };

  const idle = () => thief.newTask('idle', () => {
    return false;
  });

  thief.task = idle();

  thief.addTask = task => {
    thief.taskQueue.push(task);
  };

  thief.asyncTask = task => {
    const dt = 0.02;
    task.frame = 0;
    task._int = setInterval(() => {
      task.frame++;
      task.duration = task.frame * dt;
      task.firstFrame = task.frame === 1;
      if (!task.action(dt, task)) {
        clearInterval(task._int);
      }
    }, 20);
  };

  const centerOffset = () => {
    const p = node.getBoundingClientRect();
    const s = spriteblock.getBoundingClientRect();

    let cx = s.left/2 + s.right/2;
    let cy = s.top/2 + s.bottom/2;

    return { x: cx - p.x, y: cy - p.y };
  };

  thief.bounds = () => Geom.getDocumentBoundingRect(spriteblock);

  thief.moveTo = (x, y) => {
    const offset = centerOffset();
    node.style.left = `${x - offset.x}px`;
    node.style.top = `${y - offset.y}px`;
  };

  thief.moveBy = (dx, dy) => {
    const bounds = Geom.getDocumentBoundingRect(node);
    node.style.left = `${bounds.left + dx}px`;
    node.style.top = `${bounds.top + dy}px`;
  };

  thief.getCentroidDelta = el => {
    const src = Geom.getDocumentBoundingRect(spriteblock);
    const dst = Geom.getDocumentBoundingRect(el);
    const s = { x: (src.left/2 + src.right/2), y: (src.top/2 + src.bottom/2) };
    const d = { x: (dst.left/2 + dst.right/2), y: (dst.top/2 + dst.bottom/2) };
    return { x: d.x - s.x, y: d.y - s.y };
  };


  thief.getDeltaTo = el => {
    const src = Geom.getDocumentBoundingRect(spriteblock);
    const dst = Geom.getDocumentBoundingRect(el);
    const viewport = Geom.viewport();

    let dx = 0;
    let dy = 0;
    if (dst.right < src.left - reach) {
      dx = dst.right - (src.left - reach);
    } else if (dst.left > src.right + reach) {
      dx = dst.left - (src.right + reach);
    }

    if (dst.bottom < src.top - reach) {
      dy = dst.bottom - (src.top - reach);
    } else if (dst.top > src.bottom + reach) {
      dy = dst.top - (src.bottom + reach);
    }

    if (dst.bottom - src.height >= viewport.top && dst.bottom <= viewport.bottom) {
      // prefer standing on level with the bottom of
      // the thing we want to steal
      dy = Math.round((dst.bottom - src.height) - src.top);
    }

    return { x: dx, y: dy };
  };

  thief.moveToward = (el, delta) => {
    const src = Geom.getDocumentBoundingRect(spriteblock);
    const dst = Geom.getDocumentBoundingRect(el);
    const viewport = Geom.viewport();

    let dx = 0;
    let dy = 0;
    if (dst.right < src.left - reach) {
      dx = dst.right - (src.left - reach);
    } else if (dst.left > src.right + reach) {
      dx = dst.left - (src.right + reach);
    }

    if (dst.bottom < src.top - reach) {
      dy = dst.bottom - (src.top - reach);
    } else if (dst.top > src.bottom + reach) {
      dy = dst.top - (src.bottom + reach);
    }

    if (dst.bottom - src.height >= viewport.top && dst.bottom <= viewport.bottom) {
      // prefer standing on level with the bottom of
      // the thing we want to steal
      dy = Math.round((dst.bottom - src.height) - src.top);
    }

    if (dx === 0 && dy === 0) {
      return false;
    }

    if (Math.abs(dy) > 0) {
      // We prioritize walking up, then horizontally. Just looks better.
      if (dy < 0) {
        thief.play('walk-b');
      } else {
        thief.play('walk-f');
      }
      return true;
    }

    const hypotenuse = Math.sqrt(dx * dx + dy * dy);
    if (hypotenuse < 0.1) {
      return false;
    }

    thief.moveBy(
      dx * delta / hypotenuse,
      dy * delta / hypotenuse
    );
    return true;
  };

  thief.walkTo = item => {
    const el = DT.PhantomClone(item);
    thief.walkToElement(el);
  };
  thief.walkToElement = el => {
    el.style.opacity = '0';
    document.body.appendChild(el);
    const state = {
      dir: '',
      gottenClose: false,
    };
    const march = (dir, dx, dy) => {
      state.dir = dir;
      if (dir === thief.anim.playing) {
        return;
      }
      thief.play(dir, tick => {
        if (dir === tick.animation) {
          const delta = isSome(tick.distance)
            ? tick.distance
            : tick.delay * thief.speed / 1000
            //: 2
          ;
          thief.moveBy(dx * delta, dy * delta);
        }
        return dir === state.dir;
      });
    };
    const task = thief.newTask(`walking`, (dt) => {
      const vector = thief.getDeltaTo(el);
      if (!state.gottenClose && Math.abs(vector.x) + Math.abs(vector.y) < 50) {
        thief.asyncTask(thief.hideNametag());
        state.gottenClose = true;
      }
      if (Math.round(Math.abs(vector.y)) > 1) {
        if (vector.y > 0) {
          march('walk-f', 0, 1);
        } else {
          march('walk-b', 0, -1);
        }
        return true;
      }
      if (Math.round(Math.abs(vector.x)) > 1) {
        if (vector.x > 0) {
          march('walk-r', 1, 0);
        } else {
          march('walk-l', -1, 0);
        }
        return true;
      }
      state.dir = '';

      const cv = thief.getCentroidDelta(el);
      if (cv.x > 0) {
        thief.play('stand-r');
      } else if (cv.x < 0) {
        thief.play('stand-l');
      } else if (cv.y < 0) {
        thief.play('stand-b');
      } else {
        thief.play('stand-f');
      }
     
      return false;
    });
    thief.addTask(task);
  };

  thief.place = (item, target) => {
    if (isNone(target.dataset.lootStolen) || isNone(target.parentNode)) {
      return; // nothing to replace
    }
    thief.addTask(thief.showNametag());
    thief.walkToElement(target);
    thief.addTask(thief.hideNametag());
    thief.addTask(thief.newTask('placing', (dt) => {
      if (isNone(target.dataset.lootStolen) || isNone(target.parentNode)) {
        return; // nothing to replace
      }
      if (thief.anim.lastPlayed === 'stand-l' || thief.anim.lastPlayed === 'walk-l') {
        thief.play('reach-l');
      } else if (thief.anim.lastPlayed === 'stand-r' || thief.anim.lastPlayed === 'walk-r') {
        thief.play('reach-r');
      }
      const el = DT.Reify(item.dom);
      setTimeout(() => DT.Anim.PlaceElement(el, ['centroid', spriteblock], { over: target}).then(el => {
        target.replaceWith(el);
        thief.play('stand-f');
        thief.sack = thief.sack.filter(x => x.id !== item.id);
        thief.sackSize = thief.sack.map(item => item.size).reduce((a, b) => a + b, 0);
      }));
    }));
    thief.addTask(thief.showNametag());
  };

  thief.take = item => {
    if (item.size + thief.sackSize >= DT.maxRequestSize) {
      return 
    }
    thief.addTask(thief.showNametag());
    thief.walkTo(item);
    thief.addTask(thief.hideNametag());
    thief.addTask(thief.newTask('taking', (dt) => {
      if (item.dom.dataset.lootStolen) {
        // already stolen
        console.log(item.item.name, 'was already stolen');
        return
      }
      if (thief.sackSize + item.size > DT.maxRequestSize) {
        console.log('no room for', item.size);
        return;
      }
      if (thief.anim.lastPlayed === 'stand-l' || thief.anim.lastPlayed === 'walk-l') {
        thief.play('reach-l');
      } else if (thief.anim.lastPlayed === 'stand-r' || thief.anim.lastPlayed === 'walk-r') {
        thief.play('reach-r');
      }
      const el = DT.Pirate(item);
      setTimeout(() => DT.Anim.TakeElement(el, ['centroid', spriteblock]).then(() => {
        thief.play('stand-f');
        item.item.stolen_by = thief.meta.name;
        thief.sack.push(item.item);
        thief.sackSize = thief.sack.map(item => item.size).reduce((a, b) => a + b, 0);
      }));
    }));
    thief.addTask(thief.showNametag());
  };

  thief.play = (animation) => {
    if (isNone(thief.anim)) {
      return;
    }
    const playing = thief.anim.spritesheet.sprite_map[thief.anim.playing];
    if (isSome(playing) && playing.kinds.some(k => k === animation)) {
      return;
    }
    thief.anim.playKind(animation, true);
  };

  thief.addAnimTask = (animation) => {
    if (isNone(thief.anim)) {
      return;
    }
    thief.anim.play(animation, true);
    thief.anim.stop();
    thief.addTask(thief.newTask(animation, dt => {
      return isSome(thief.anim) && !isEmpty(thief.anim.playing);
    }));
  };

  const returnToGuild = async () => {
    for (const item of thief.sack) {
      const payload = JSON.stringify(item);
      const r = await DT.Fetch(`/guild/${thief.meta.guild}/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payload,
      });
      if (!r.ok) {
        const reason = await r.text();
        console.error(`failed to deposit ${item.name}: ${r.status} ${r.statusText} ${reason}`);
      }
    }
    const r = await DT.Fetch(`/guild/${thief.meta.guild}/return/${thief.meta.id}`, {
      method: 'POST',
    });
    if (!r.ok) {
      console.error(`unable to return thief ${thief.meta.name} home to guild ${thief.meta.guild}`);
      return;
    }
    console.log(`${thief.meta.name} returned home: ${await r.text()}`);
  };

  thief.abscond = () => {
    thief.addAnimTask('abscond');
    thief.addTask(thief.newTask('absconding', () => {
      DT.thieves = DT.thieves.filter(t => t.meta.id !== thief.meta.id);
      if (isSome(thief.anim)) {
        thief.anim.playing = '';
      }
      clearInterval(thief.taskLoop);
      thief.node.remove();
      setTimeout(() => {
        returnToGuild();
      },1);
      return false;
    }));
  }

  const consideredItems = {};
  thief.survey = async () => {
    if (thief.sack.length > 0) {
      const holes = document.querySelectorAll('[data-loot-stolen]');
      for (const hole of holes) {
        const kind = hole.dataset.lootKind;
        if (isEmpty(kind)) {
          continue;
        }
        for (const item of thief.sack) {
          // TODO: skip if we stole it from here just now lol
          if (item.uses.some(k => k === kind)) {
            thief.place(item, hole);
            return;
          }
        }
      }
    }

    if (thief.sack.length >= 3) {
      // we got enough stuff tbh
      console.log(thief.meta.name, 'absconded with a full sack of loot.');
      thief.abscond();
      return;
    }

    const list = [];
    await DT.ForEachLootItem(item => {
      const id = item.dom.dataset.lootId;
      if (isNone(id) || consideredItems[id]) {
        return;
      }
      list.push(item);
    });

    if (list.length === 0) {
      console.log(thief.meta.name, 'could not find anything more to steal.');
      thief.abscond();
      return;
    }

    const item = list[Math.floor(Math.random() * list.length)];
    consideredItems[item.dom.dataset.lootId] = true;

    console.log(thief.meta.name, 'is taking a look-see at', item.item.name);

    thief.walkTo(item);
    thief.addTask(thief.newTask('appraising', () => {
      if (item.size > DT.maxRequestSize) {
        // too big!
        console.log(item.item.name, 'is too big to steal.');
        return;
      }

      console.log('taking', item.item.name);
      thief.take(item);
    }));
  };

  const freeTime = () => {
    const minDelayMilli = DT.idleDelay;
    const now = performance.now();
    if (isSome(thief.lastFreeAction) && now - thief.lastFreeAction < minDelayMilli) {
      return;
    }
    thief.lastFreeAction = now;

    const choice = Math.random() * 100;
    if (choice < 50) {
      return;
    }

    thief.addTask(thief.showNametag());
    if (choice < 75) {
      thief.addAnimTask('idle');
      return;
    }
    thief.survey();
  };

  //  handle movement
  thief.anim.tickers.push(tick => {
    if (isNone(tick.movement)) {
      return true;
    }

    return true;
  });

  const delay = 20;
  const dt = (delay / 1000.0);
  thief.taskLoop = setInterval(() => {
    // housekeeping
    if (isSome(thief.anim)) {
      const sprite = thief.anim.spritesheet.sprite_map[thief.anim.playing];
      if (isSome(sprite)) {
        spriteblock.style.width = `${sprite.frame_width}px`;
        spriteblock.style.height = `${sprite.frame_height}px`;
        spriteblock.style.backgroundColor = 'unset';
      }
    }

    const task = thief.task;
    if (!isSome(task) || task.state !== 'running') {
      const queue = thief.taskQueue;
      if (queue.length > 0) {
        const [ next ] = queue.splice(0, 1);
        thief.task = next;
        next.start();
        return;
      }
      freeTime();
      return;
    }
    if (isNone(task.frame)) {
      task.frame = 0;
    }
    task.frame++;
    task.firstFrame = task.frame === 1;
    task.duration = task.frame * dt;
    
    if (!task.action(dt, task)) {
      task.finish();
    }
  }, delay);

  const viewport = Geom.viewport();

  thief.moveTo(
    viewport.x + Math.random() * viewport.width,
    viewport.y + Math.random() * viewport.height,
  );
  thief.asyncTask(thief.showNametag());

  thief.addAnimTask('appear');

  document.body.appendChild(thief.node);
  DT.thieves.push(thief);
  return thief;
};

DT.Offer = async (item) => {
  if (isNone(item)) {
    console.error("offered nil item", item);
    return;
  }
  for (const thief of DT.thieves) {
    if (thief.take(item) !== SACK_FULL) {
      return;
    }
  }
  const thief = await DT.Recruit();
  thief.take(item);
};

DT.Initialize = async () => {
  DT.allowedTags = await DT.Fetch('/allowhtml/tags').then(r => r.json());
  DT.deniedAttrs = await DT.Fetch('/denyhtml/attrs').then(r => r.json());
  DT.deniedAttrPrefixes = await DT.Fetch('/denyhtml/attr-prefixes').then(r => r.json());
  DT.maxRequestSize = await DT.Fetch('/server/maxrequestsize').then(r => r.json());
  DT.idleDelay = 500;
  DT.guild = 'global';
  DT.inventory = [];
  DT.thieves = [];

  DT._surveyInt = setInterval(async () => {
    if (DT.thieves.length === 0) {
      const list = [];
      await DT.ForEachLootItem(item => {
        list.push(item);
      });
      if (list.length === 0) {
        clearInterval(DT._surveyInt);
        return;
      }
      DT.Recruit();
    }
  }, 1000);
};

setTimeout(DT.Initialize, 500);

