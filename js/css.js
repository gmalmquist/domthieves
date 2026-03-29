// insane filename btw

const CSS = {};

// CSS Properties we always include
CSS.Allowlist = new Set([
  'color',
  'font-family',
  'font-weight',
  'font-size',
]);

CSS.Denylist = new Set([
  'z-index',
  'perspective-origin',
  'transform-origin',
]);

// https://www.w3schools.com/csSref/css_default_values.php
CSS.DefaultValues = {
  'A': {
    _if: e => !isEmpty(e.getAttribute('href')),
    'cursor': 'auto',
    'text-decoration': 'underline',
  },
  'ADDRESS': {
    'display': 'block',
    'font-style': 'italic',
  },
  'AREA': {
    'display': 'none',
  },
  'ASIDE': {
    'display': 'block',
  },
  'B': {
    'font-weight': 'bold',
  },
  'BDO': {
    'unicode-bidi': 'bidi-override',
  },
  'BLOCKQUOTE': {
    'display': 'block',
    'margin-top': '1em',
    'margin-bottom': '1em',
    'margin-left': '40px',
    'margin-right': '40px',
  },
  'BODY': {
    'display': 'block',
    'margin': '8px',
  },
  'CAPTION': {
    'display': 'table-caption',
    'text-align': 'center',
  },
  'CITE': {
    'font-style': 'italic',
  },
  'CODE': {
    'font-family': 'monospace',
  },
  'COL': {
    'display': 'table-column',
  },
  'COLGROUP': {
    'display': 'table-column-group',
  },
  'DATALIST': {
    'display': 'none',
  },
  'DD': {
    'display': 'block',
    'margin-left': '40px',
  },
  'DEL': {
    'text-decoration': 'line-through',
  },
  'DETAILS': {
    'display': 'block',
  },
  'DFN': {
    'font-style': 'italic',
  },
  'DIV': {
    'display': 'block',
  },
  'DL': {
    'display': 'block',
    'margin-top': '1em',
    'margin-bottom': '1em',
    'margin-left': '0',
    'margin-right': '0',
  },
  'DT': {
    'display': 'block',
  },
  'EM': {
    'font-style': 'italic',
    'embed': 'focus',
    'outline': 'none',
  },
  'FIELDSET': {
    'display': 'block',
    'margin-left': '2px',
    'margin-right': '2px',
    'padding-top': '0.35em',
    'padding-bottom': '0.625em',
    'padding-left': '0.75em',
    'padding-right': '0.75em',
    'border': '2px groove (internal value)',
  },
  'FIGCAPTION': {
    'display': 'block',
  },
  'FIGURE': {
    'display': 'block',
    'margin-top': '1em',
    'margin-bottom': '1em',
    'margin-left': '40px',
    'margin-right': '40px',
  },
  'FOOTER': {
    'display': 'block',
  },
  'FORM': {
    'display': 'block',
    'margin-top': '0em',
  },
  'h1': {
    'display': 'block',
    'font-size': '2em',
    'margin-top': '0.67em',
    'margin-bottom': '0.67em',
    'margin-left': '0',
    'margin-right': '0',
    'font-weight': 'bold',
  },
  'h2': {
    'display': 'block',
    'font-size': '1.5em',
    'margin-top': '0.83em',
    'margin-bottom': '0.83em',
    'margin-left': '0',
    'margin-right': '0',
    'font-weight': 'bold',
  },
  'h3': {
    'display': 'block',
    'font-size': '1.17em',
    'margin-top': '1em',
    'margin-bottom': '1em',
    'margin-left': '0',
    'margin-right': '0',
    'font-weight': 'bold',
  },
  'h4': {
    'display': 'block',
    'margin-top': '1.33em',
    'margin-bottom': '1.33em',
    'margin-left': '0',
    'margin-right': '0',
    'font-weight': 'bold',
  },
  'h5': {
    'display': 'block',
    'font-size': '.83em',
    'margin-top': '1.67em',
    'margin-bottom': '1.67em',
    'margin-left': '0',
    'margin-right': '0',
    'font-weight': 'bold',
  },
  'h6': {
    'display': 'block',
    'font-size': '.67em',
    'margin-top': '2.33em',
    'margin-bottom': '2.33em',
    'margin-left': '0',
    'margin-right': '0',
    'font-weight': 'bold',
  },
  'HEAD': {
    'display': 'none',
  },
  'HEADER': {
    'display': 'block',
  },
  'HR': {
    'display': 'block',
    'margin-top': '0.5em',
    'margin-bottom': '0.5em',
    'margin-left': 'auto',
    'margin-right': 'auto',
    'border-style': 'inset',
    'border-width': '1px',
  },
  'HTML': {
    'display': 'block',
    'html': 'focus',
    'outline': 'none',
  },
  'I': {
    'font-style': 'italic',
    'iframe': 'focus',
    'outline': 'none',
  },
  'iframe': {
    _if: e => e.hasAttribute('seamless'),
    'display': 'block',
  },
  'IMG': {
    'display': 'inline-block',
  },
  'INS': {
    'text-decoration': 'underline',
  },
  'KBD': {
    'font-family': 'monospace',
  },
  'LABEL': {
    'cursor': 'default',
  },
  'LEGEND': {
    'display': 'block',
    'padding-left': '2px',
    'padding-right': '2px',
    'border': 'none',
  },
  'LI': {
    'display': 'list-item',
  },
  'LINK': {
    'display': 'none',
  },
  'MAP': {
    'display': 'inline',
  },
  'MARK': {
    'background-color': 'yellow',
    'color': 'black',
  },
  'MENU': {
    'display': 'block',
    'list-style-type': 'disc',
    'margin-top': '1em',
    'margin-bottom': '1em',
    'margin-left': '0',
    'margin-right': '0',
    'padding-left': '40px',
  },
  'NAV': {
    'display': 'block',
    'object': 'focus',
    'outline': 'none',
  },
  'OL': {
    'display': 'block',
    'list-style-type': 'decimal',
    'margin-top': '1em',
    'margin-bottom': '1em',
    'margin-left': '0',
    'margin-right': '0',
    'padding-left': '40px',
  },
  'OUTPUT': {
    'display': 'inline',
  },
  'P': {
    'display': 'block',
    'margin-top': '1em',
    'margin-bottom': '1em',
    'margin-left': '0',
    'margin-right': '0',
  },
  'PARAM': {
    'display': 'none',
  },
  'PRE': {
    'display': 'block',
    'font-family': 'monospace',
    'white-space': 'pre',
    'margin': '1em 0',
  },
  'Q': {
    'display': 'inline',
  },
  'RT': {
    'line-height': 'normal',
  },
  'S': {
    'text-decoration': 'line-through',
  },
  'SAMP': {
    'font-family': 'monospace',
  },
  'SCRIPT': {
    'display': 'none',
  },
  'SECTION': {
    'display': 'block',
  },
  'SMALL': {
    'font-size': 'smaller',
  },
  'SPAN': {
    'display': 'inline',
  },
  'STRIKE': {
    'text-decoration': 'line-through',
  },
  'STRONG': {
    'font-weight': 'bold',
  },
  'STYLE': {
    'display': 'none',
  },
  'SUB': {
    'vertical-align': 'sub',
    'font-size': 'smaller',
  },
  'SUMMARY': {
    'display': 'block',
  },
  'SUP': {
    'vertical-align': 'super',
    'font-size': 'smaller',
  },
  'TABLE': {
    'display': 'table',
    'border-collapse': 'separate',
    'border-spacing': '2px',
    'border-color': 'gray',
  },
  'TBODY': {
    'display': 'table-row-group',
    'vertical-align': 'middle',
    'border-color': 'inherit',
  },
  'TD': {
    'display': 'table-cell',
    'vertical-align': 'inherit',
  },
  'TFOOT': {
    'display': 'table-footer-group',
    'vertical-align': 'middle',
    'border-color': 'inherit',
  },
  'TH': {
    'display': 'table-cell',
    'vertical-align': 'inherit',
    'font-weight': 'bold',
    'text-align': 'center',
  },
  'THEAD': {
    'display': 'table-header-group',
    'vertical-align': 'middle',
    'border-color': 'inherit',
  },
  'TITLE': {
    'display': 'none',
  },
  'TR': {
    'display': 'table-row',
    'vertical-align': 'inherit',
    'border-color': 'inherit',
  },
  'U': {
    'text-decoration': 'underline',
  },
  'UL': {
    'display': 'block',
    'list-style-type': 'disc',
    'margin-top': '1em',
    'margin-bottom': '1em',
    'margin-left': '0',
    'margin-right': '0',
    'padding-left': '40px',
  },
  'VAR': {
    'font-style': 'italic',
  },
};

CSS.MeasureUnits = async () => {
  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.left = 'calc(1vw * 1.0)';
  el.style.top = 'calc(1vh * 1.0)';
  el.style.width = 'calc(1rem * 1.0)';
  el.style.height = '1ex';
  el.style.userSelect = 'none';
  el.style.pointerEvents = 'none';
  el.style.backgroundColor = 'white';
  el.style.opacity = '0';

  document.body.appendChild(el);
  await new Promise(r => setTimeout(r, 10));

  const calc = window.getComputedStyle(el);
  
  function parsePx(x) {
    if (typeof x === 'string' && x.endsWith('px')) {
      return parseFloat(x.substring(0, x.length - 2));
    }
    return x;
  }

  const units = {
    'vw': calc.left,
    'vh': calc.top,
    'rem': calc.width,
    'em': calc.width,
    'ex': calc.height,
    'black': calc.color,
    'white': calc.backgroundColor,
  };
  for (const [key, val] of Object.entries(units)) {
    units[key] = parsePx(val);
  }
  el.remove();

  CSS.units = units;
  return units;
};
setTimeout(CSS.MeasureUnits, 10);

CSS.toAbsoluteUnits = value => {
  if (isEmpty(value)) {
    return value;
  }
  if (typeof value === 'number') {
    return number;
  }
  value = typeof value === 'string' ? value : `${value}`;
  const known = ['vw', 'vh', 'rem', 'em', 'ex'];
  for (const unit of known) {
    if (value.ensdWith(unit)) {
      const s = value.substring(0, value.length - unit.length);
      const pixels = parseFloat(s) * CSS.units[unit];
      return `${pixels}px`;
    }
  }
  return value;
};

function getDefaultCSS(element, property) {
  const def = CSS.DefaultValues[property];
  if (isNone(def) || (isSome(def._if) && !def._if(element))) {
    return null;
  }
  const value = def[property];
  if (isEmpty(value)) {
    return value;
  }
  if (property === 'color' || property.endsWith('-color')) {
    if (isSome(CSS.units[value])) {
      return CSS.units[value];
    }
  }
  return value;
}

function isDefaultCSS(element, property, value) {
  const prop = getDefaultCSS(element, property);
  if (!isSome(prop)) {
    return false;
  }
  if (property === 'color' || property.endsWith('-color')) {
    try {
      const a = parseColor(prop).toHex();
      const b = parseColor(value).toHex();
      return a.toHex() === b.toHex();
    } catch (_) {
      return false;
    }
  }
  return CSS.toAbsoluteUnits(prop) === CSS.toAbsoluteUnits(value);
}

CSS.AllowFunc = (() => {
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
    if (CSS.Denylist.has(name)) {
      return false;
    }
    if (isDefaultCSS(el, name, value)) {
      return false;
    }
    if (empty) {
      if (name.startsWith("font")) { return false; }
      if (name === 'color') { return false; }
    }
    if (defaults[name] !== value) {
      return true;
    }
    if (CSS.Allowlist.has(name)) {
      return true;
    }
    const allowFuncs = [
      CSS.AllowFunc[name],
      CSS.AllowFunc[`${el.tagName}.${name}`],
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

