// insane filename btw

// CSS Properties we always include
const CSSAllowlist = new Set([
  'color',
  'font-family',
  'font-weight',
  'font-size',
]);

const CSSDenylist = new Set([
  'z-index',
  'perspective-origin',
  'transform-origin',
]);

const CSSAllowFunc = (() => {
  const test = (val, x) => typeof x === 'function' ? x(val) : x === val;
  const not = (...deny) => (val) => deny.every(deny => !test(val, deny));
  const is = (...allow) => (val) => allow.some(a => test(val, a));
  const rgb = (r, g, b, a) => {
    if (isNone(a)) {
      a = 1;
    }
    const rgba = `rgba(${r}, ${g}, ${b}, ${a})`;
    if (a === 1) {
      return is(rgba, `rgb(${r}, ${g}, ${b})`);
    }
    return is(rgba);
  };
  const cblack = rgb(0,0,0);
  const cwhite = rgb(255,255,255);
  const cclear = rgb(0,0,0,0);
  return {
    'opacity': not('1'),
    'color': not(cblack),
    'background-color': not(cclear),
    'background-image': not('none'),
    'ul.list-style-type': is('none'),
    'li.list-style-type': is('none'),
  };
})();

async function MinimalCSSFromElement(el) {
  const empty = isEmpty(el.innerHTML.trim());

  const inline = {};
  for (const [name, value] of Object.entries(el.style)) {
    inline[name] = value;
  }

  // always keep inline styles. they're obviously intentional.
  const style = { ...inline };

  // as a heuristic, we create an empty element of the same type,
  // no classes, add it to the document, and treat all its values as "defaults."
  // this is imprecise and overly aggressive, so we later add some
  // back in on an allowlist.
  const wrap = isSome(el.parent) && el.parent.tagName !== 'BODY'
    ? document.createElement(el.parent.tagName) : document.createElement('div');
  const plain = document.createElement(el.tagName);
  wrap.appendChild(plain);
  document.body.appendChild(wrap);

  await new Promise(r => setTimeout(r, 10));

  const defaults = window.getComputedStyle(plain);

  const accept = (name, value) => {
    if (CSSDenylist.has(name)) {
      return false;
    }
    if (empty) {
      if (name.startsWith("font")) { return false; }
      if (name === 'color') { return false; }
    }
    if (defaults[name] !== value) {
      return true;
    }
    if (CSSAllowlist.has(name)) {
      return true;
    }
    const allowFuncs = [
      CSSAllowFunc[name],
      CSSAllowFunc[`${el.tagName}.${name}`],
    ];
    if (allowFuncs.some(func => isSome(func) && func(value))) {
      return true;
    }
    return false;
  };

  const computed = window.getComputedStyle(el);
  for (const name of Object.values(computed)) {
    const value = computed[name];
    if (accept(name, value)) {
      style[name] = value;
    }
  }

  wrap.remove(); // wish js had go's defer
  return style;
}

