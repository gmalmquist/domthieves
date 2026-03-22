var DT = {};

const ALREADY_STOLEN = 'already_stolen';
const USELESS = 'useless';
const ILLEGAL_TAG = 'illegal_tag';

const A_APPEAR = 'appear';

DT.ApiRoot = 'https://domthieves.gwen.run/api';

DT.Fetch = async (path, args) => {
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  return await fetch(`${DT.ApiRoot}${path}`, args);
};

DT.AssessAllLoot = () => {
  DT.AssessLoot(document.querySelectorAll('[data-loot]'));
  DT.AssessLoot(document.querySelectorAll('[data-loot-use]'));
  DT.AssessLoot(document.querySelectorAll('[data-loot-uses]'));
};

DT.AssessLoot = (loot) => {
  for (const dom of loot) {
    const item = DT.AssessLootItem(dom);
    if (typeof item === 'string') {
      dom.dataset.lootAssessment = item;
      continue;
    }
    DT.inventory.push(item);
  }
};

DT.AssessLootItem = dom => {
  if (!!dom.dataset.lootStolen) {
    return ALREADY_STOLEN;
  }

  if (isSome(dom.dataset.lootAssessment)) {
    return dom.dataset.lootAssessment;
  }

  const tagName = dom.tagName.toLocaleLowerCase();
  const uses = new Set([tagName]);

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
  for (const item of DT.inventory) {
    if (item.uses.has(use)) {
      return item;
    }
  }
};

DT.Steal = (item) => {
  const wrap = document.createElement('div');
  wrap.innerHTML = item.item.dom;
  const copy = wrap.children[0];

  copy.style.position = 'absolute';
  if (copy.style.display === 'inline') {
    copy.style.display = 'inline-block';
  }

  const place = item.dom.getBoundingClientRect();
  copy.style.left = `${place.left}px`;
  copy.style.top = `${place.top}px`;
  copy.style.width = `${place.width}px`;
  copy.style.height = `${place.height}px`;

  copy.setAttribute('title', `${item.item.name} is being stolen`);

  document.body.appendChild(copy);
  item.dom.style.display = 'none';

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

  node.classList.add('dt-thief');
  node.style.display = 'block';
  node.style.position = 'absolute';
  node.style.userSelect = 'none';
  node.style.width = `${size}px`;
  node.style.height = `${size}px`;

  thief.node = node;

  thief.setStatus = (text) => {
    if (text === '') {
      thief.node.setAttribute('title', thief.meta.name);
      return;
    }
    thief.node.setAttribute('title', `${thief.meta.name} is ${text}`);
  };

  thief.setStatus('');

  const newTask = (name, action) => {
    const task = {
      name,
      active: false,
      action,
      queue: [],
      _int: -1,
    };

    task.start = () => {
      if (task.active) { return; }
      task.active = true;
      thief.setStatus(task.name);
      task._int = setInterval(() => {
        if (!task.action(0.02)) {
          task.finish();
        }
      }, 20);
    };

    task.cancel = () => {
      if (!task.active) {
        return;
      }
      clearInterval(task._int);
      task.active = false;
      task.queue = [];
      thief.setStatus('idle');
      task.name = 'idle';
      task.action = () => {};
    };

    task.finish = () => {
      if (!task.active) {
        return;
      }
      const queue = task.queue;
      task.cancel();
      if (queue.length === 0) {
        return;
      }
      const [next, ...then] = queue;
      then.forEach(x => next.queue.push(x));
      thief.task = next;
      next.start();
    };

    return task;
  };

  const idle = () => newTask('idle', () => {
    return false;
  });

  thief.task = idle();

  thief.addTask = task => {
    if (!thief.task.active) {
      console.log('no active task, overwriting', thief.task.name);
      thief.task = task;
      thief.task.start();
      return;
    }
    thief.task.queue.push(task);
  };

  thief.bounds = () => thief.node.getBoundingClientRect();

  thief.moveTo = (x, y) => {
    const bounds = thief.bounds();
    thief.node.style.left = `${x - bounds.width/2}px`;
    thief.node.style.top = `${y - bounds.height/2}px`;
  };

  thief.moveBy = (dx, dy) => {
    const bounds = thief.bounds();
    thief.node.style.left = `${bounds.left + dx}px`;
    thief.node.style.top = `${bounds.top + dy}px`;
  };

  thief.moveToward = (el, delta) => {
    const src = thief.node.getBoundingClientRect();
    const dst = el.getBoundingClientRect();
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

  thief.walkTo = el => {
    const task = newTask('walk', (dt) => {
      if (!thief.moveToward(el, dt * thief.speed)) {
        return false;
      }
      return true;
    });
    thief.addTask(task);
  };

  thief.moveTo(window.innerWidth/2, window.innerHeight/2);

  document.body.appendChild(thief.node);
  DT.thieves.push(thief);
  return thief;
};

DT.Offer = async (item) => {
  for (const thief of DT.thieves) {
    thief.walkTo(item.dom);
    return;
  }
  const thief = await DT.Recruit();
  thief.walkTo(item.dom);
};

DT.Initialize = async () => {
  DT.illegalTags = await DT.Fetch('/illegal-tags').then(r => r.json());
  DT.guild = 'global';
  DT.inventory = [];
  DT.thieves = [];

  DT.AssessAllLoot();
};

setTimeout(DT.Initialize, 500);

