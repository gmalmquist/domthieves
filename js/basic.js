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

/** out of place reverse */
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

function dedup(arr, keyfunc) {
  const set = new Set();
  const res = [];
  for (const a of arr) {
    let k = isSome(keyfunc) ? keyfunc(a) : a;
    if (set.has(k)) {
      continue;
    }
    set.add(k);
    res.push(a);
  }
  return res;
}

function sameShape(one, two) {
  if (isNone(two)) { return true; }
  if (isNone(one)) { return false; }
  if (two === '*') { return true; }
  if (typeof one !== typeof two) {
    return false;
  }
  if (typeof one !== 'object') {
    return true;
  }
  if (Array.isArray(two) && !Array.isArray(one)) {
    return false;
  }
  if (Array.isArray(one)) {
    if (Array.isArray(two)) {
      if (one.length !== two.length) {
        return false;
      }
      return one.every((x, i) => sameShape(x, two[i]));
    }
    if (typeof two.every === 'function') {
      return one.every(two.every);
    }
    if (typeof two.some === 'function') {
      return one.some(two.some);
    }
    return false;
  }
  for (const key of Object.keys(two)) {
    if (!sameShape(one[key], two[key])) {
      return false;
    }
  }
  return true;
}

