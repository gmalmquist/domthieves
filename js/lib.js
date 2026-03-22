var DT = {};

const ALREADY_STOLEN = 'already_stolen';
const ALREADY_ASSESSED = 'already_stolen';
const USELESS = 'useless';
const ILLEGAL_TAG = 'illegal_tag';
const HIDDEN = 'hidden';

const A_APPEAR = 'appear';

DT.ApiRoot = 'https://domthieves.gwen.run/api';

DT.Fetch = async (path, args) => {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return await fetch(`${DT.ApiRoot}${path}`, args);
};

DT.FindLoot = () => {
  DT.AssessLoot(document.querySelectorAll('[data-loot]'));
  DT.AssessLoot(document.querySelectorAll('[data-loot-use]'));
  DT.AssessLoot(document.querySelectorAll('[data-loot-uses]'));
};

DT.AssessLoot = (loot) => {
  for (const dom of loot) {
    const item = DT.AssessLootItem(dom);
    if (typeof item === 'string') {
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
  const uses = new Set([tagName]);

  if (isSome(dom.dataset.loot)) {
    uses.add(dom.dataset.loot);
  }

  if (isSome(dom.dataset.lootUse)) {
    uses.add(dom.dataset.lootUse);
  }

  if (isSome(dom.dataset.lootUses)) {
    dom.dataset.lootUses.trim().split(/\s+/)
      .filter(u => u.length > 0)
      .map(u => u.toLocaleLowerCase())
      .forEach(u => uses.add(u));
  }

  const uft = DT.UsesFromTag(tagName);
  if (typeof uft === 'string') {
    uses.add(uft);
  } else if (Array.isArray(uft)) {
    uft.forEach(u => uses.add(u));
  }

  if (uses.size === 0) {
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
      dom.dataset.lootName,
      tagName,
    ),
    dom: wrap.innerHTML,
    stolen_by: '',
    uses: Array.from(uses),
    original_use: firstNotEmpty(
      dom.dataset.lootUses,
      tagName,
    ),
    home: window.location.origin,
    price: 0,
  };

  return {
    item,
    dom,
    uses,
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

  if (DT.illegalTags[original.tagName.toLocaleLowerCase()]) {
    return null;
  }

  const dom = original.cloneNode(false);

  for (const a of original.getAttributeNames()) {
    const name = a.toLocaleLowerCase();
    if (name.startsWith("on")) {
      dom.removeAttribute(name);
      continue;
    }
    if (name.startsWith("data-")) {
      dom.removeAttribute(name);
      continue;
    }
    if (name === 'href') {
      dom.setAttribute('href', '#');
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

DT.Steal = (item) => {
  const copy = DT.PhantomClone(item);

  copy.setAttribute('title', `${item.item.name} is being stolen`);

  document.body.appendChild(copy);

  // we turn down the opacity, but do not set display to none, because we
  // want to preserve the page layout.
  item.dom.style.opacity = 0;
  item.dom.style.userSelect = 'none';
  item.dom.style.pointerEvents = 'none';

  item.dom.dataset.lootStolen = 'true';

  return copy;
};

DT.Recruit = async () => {
  const meta = await DT.Fetch(`/guild/${DT.guild}/recruit`).then(r => r.json());
  const thief = {
    meta,
    task: null,
    node: null,
    anim: A_APPEAR,
    speed: 64.0,
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

  thief.moveToward = (el, delta) => {
    const src = Geom.getDocumentBoundingRect(spriteblock);
    const dst = Geom.getDocumentBoundingRect(el);
    let dx = 0;
    let dy = 0;
    if (dst.right < src.left - reach) {
      dx = -1;
    } else if (dst.left > src.right + reach) {
      dx = 1;
    }

    if (dst.bottom < src.top - reach) {
      dy = -1;
    } else if (dst.top > src.bottom + reach) {
      dy = 1;
    }

    if (dx === 0 && dy === 0) {
      return false;
    }

    thief.moveBy(dx * delta, dy * delta);
    return true;
  };

  thief.walkTo = item => {
    const el = DT.PhantomClone(item);
    el.style.opacity = '0';
    document.body.appendChild(el);
    const task = thief.newTask(`walking to ${item.item.name}`, (dt) => {
      if (!thief.moveToward(el, dt * thief.speed)) {
        el.remove();
        return false;
      }
      return true;
    });
    thief.addTask(task);
  };

  thief.take = item => {
    thief.flashNametag();
    thief.walkTo(item);
    thief.addTask(thief.hideNametag());
    thief.addTask(thief.newTask('taking', (dt) => {
      const el = DT.Steal(item);
      el.style.transitionProperty = 'transform';
      el.style.transitionDuration = '0.5s';
      el.style.transformOrigin = "center";
      
      const rect = Geom.getDocumentBoundingRect(el);
      const elcx = rect.left/2 + rect.right/2;
      const elcy = rect.top/2 + rect.bottom/2;

      const thiefr = Geom.getDocumentBoundingRect(spriteblock);
      const handx = thiefr.left/2 + thiefr.right/2;
      const handy = thiefr.top/2 + thiefr.bottom/2;
      
      const dx = handx - elcx;
      const dy = handy - elcy;

      el.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg) scale(1.0) translate(${-dx}px, ${dy}px)`;
      setTimeout(() => {
        el.style.transform = `translate(${dx}px, ${dy}px) rotate(135deg) scale(0.01) translate(${-dx}px, ${dy}px)`;
        setTimeout(() => {
          el.style.display = 'none';
          el.remove();
          // TODO: send to server! we got it!
        }, 500);
      }, 10);
    }));
    thief.addTask(thief.showNametag());
  };

  const delay = 20;
  const dt = (delay / 1000.0);
  thief.taskLoop = setInterval(() => {
    const task = thief.task;
    if (!isSome(task) || task.state !== 'running') {
      const queue = thief.taskQueue;
      if (queue.length > 0) {
        const [ next ] = queue.splice(0, 1);
        thief.task = next;
        console.log('start', thief.task.name);
        next.start();
      }
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

  thief.moveTo(window.innerWidth/2, window.innerHeight/2);
  thief.asyncTask(thief.showNametag());

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
    thief.take(item);
    return;
  }
  const thief = await DT.Recruit();
  thief.take(item);
};

DT.Initialize = async () => {
  DT.illegalTags = await DT.Fetch('/illegal-tags').then(r => r.json());
  DT.guild = 'global';
  DT.inventory = [];
  DT.thieves = [];
};

setTimeout(DT.Initialize, 500);

