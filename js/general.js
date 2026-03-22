function isNone(x) {
  return typeof x === 'undefined' || x === null;
}

function isSome(x) {
  return !isNone(x);
}

function isEmpty(x) {
  return isNone(x)
    || (typeof x === 'string' && x.trim().length === 0)
    || (x instanceof Array && x.length === 0)
    || (typeof x === 'object' && Object.keys(x).length === 0)
  ;
}

function firstNotNone(...args) {
  for (const a of args) {
    if (isSome(a)) {
      return a;
    }
  }
  return null;
}

function firstNotEmpty(...args) {
  for (const a of args) {
    if (!isEmpty(a)) {
      return a;
    }
  }
  return '';
}

function lerp(a, b, s) {
  return (1.0 - s) * a + s * b;
}

function setCookie(key, val, path) {
  if (isNone(path)) {
    path = "/";
  }
  document.cookie = `${key}=${val}; path=${path}`;
  return val;
}

function parseCookies() {
  const map = new Map();
  for (const cook of document.cookie.split(";")) {
    const eq = cook.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = cook.substring(0, eq).trim();
    if (eq === cook.length - 1) {
      map.set(key, "");
      continue;
    }
    map.set(key, cook.substring(eq + 1));
  }
  return map;
}
