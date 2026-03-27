const Geom = {};

Geom.isRectEmpty = function(rect) {
  return rect.width <= 0 || rect.height <= 0;
}

Geom.rectArea = function(rect) {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

Geom.intersectRects = function(one, two) {
  const n = Geom.cloneRect(one);
  n.left = Math.max(one.left, two.left);
  n.top = Math.max(one.top, two.top);
  n.right = Math.min(one.right, two.right);
  n.bottom = Math.min(one.bottom, two.bottom);

  n.x = n.left;
  n.y = n.right;
  n.width = n.right - n.left;
  n.height = n.bottom - n.top;
}

Geom.isRect = function(r) {
  return isSome(r.left) && isSome(r.top) && isSome(r.width) && isSome(r.height);
}

Geom.closestPoint = function(point, obj) {
  point = Geom.point(point);
  while (typeof obj === 'function') {
    obj = obj();
  }

  if (obj instanceof HTMLElement) {
    obj = Geom.getDocumentBoundingRect(obj);
  }

  if (Geom.isRect(obj)) {
    const { left, top, width, height } = obj;
    const right = left + width;
    const bottom = top + height;
    let { x, y } = point;
    if (x < left) {
      x = left;
    } else if (x > right) {
      x = right;
    }
    if (y < top) {
      y = top;
    } else if (y > bottom) {
      y = bottom;
    }
    return { x, y };
  }

  if (isSome(obj.x) && isSome(obj.y)) {
    // closest point to a point is that point
    const { x, y } = obj;
    return { x, y };
  }

  if (isSome(obj.origin) && isSome(obj.normal)) {
    // we have a line
    return Vec.project(point, Geom.point(obj.origin), Geom.point(obj.normal));
  }

  if (isSome(obj.src) && isSome(obj.dst)) {
    const src = Geom.point(obj.src);
    const dst = Geom.point(obj.dst);
    const normal = Vec.r90(Vec.sadd(src, -1, dst));
    // we have a line, defined with endpoints
    return Vec.project(point, src, normal);
  }

  throw new Error(`don't know how to calculate point closest to ${JSON.stringify(point)} on ${JSON.stringify(obj)}`);
}

Geom.cloneRect = function(rect) {
  const clone = {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
  clone.x = clone.left;
  clone.y = clone.right;
  return clone;
}

Geom.min = function(...args) {
  let min = null;
  for (const a of args) {
    if (isNone(a)) {
      continue;
    }
    if (isNone(min) || a < min) {
      min = a;
    }
  }
  return min;
}

Geom.max = function(...args) {
  let max = null;
  for (const a of args) {
    if (isNone(a)) {
      continue;
    }
    if (isNone(max) || a > max) {
      max = a;
    }
  }
  return max;
}

Geom.viewport = function() {
  const v = {
    x: window.scrollX,
    y: window.scrollY,
    width: Geom.min(document.body.clientWidth, window.innerWidth),
    height: Geom.min(document.body.clientHeight, window.innerHeight),
  };
  v.left = v.x;
  v.right = v.x + v.width;
  v.top = v.y;
  v.bottom = v.y + v.height;
  return v;
}

Geom.getDocumentBoundingRect = function(element) {
  const crect = element.getBoundingClientRect();
  const view = Geom.viewport();
  const bounds = {
    left: crect.left + view.x,
    right: crect.right + view.x,
    top: crect.top + view.y,
    bottom: crect.bottom + view.y,
    width: crect.width,
    height: crect.height,
  };
  return bounds;
}

/* Clips the bounding rect to the viewport */
Geom.getVisibleBoundingRect = function(element) {
  return Geom.intersectRects(Geom.getDocumentBoundingRect(element), Geom.viewport());
}

Geom.Pt = (x, y) => ({ x, y });

Geom.point = (spec, ...unwanted) => {
  if (!isEmpty(unwanted)) {
    throw new Error(`${unwanted.length} unexpected argument${unwanted.length === 1 ? '' : 's'} to Geom.point(${JSON.stringify(spec)}): ${JSON.stringify(unwanted)}`);
  }
  const ANGLE = /^(?<num>\d+([.]\d*)?)(?<unit>rad|deg|°)$/i;
  let pt = spec;
  while (typeof pt === 'function') {
    pt = pt();
  }
  if (Array.isArray(pt)) {
    if (sameShape(pt, [0, 0])) {
      const [ x, y ] = pt;
      return { x, y };
    }
    if (sameShape(pt, ['*', 0, '*'])) {
      const [ a, t, b ] = pt;
      const pa = Geom.point(a);
      const pb = Geom.point(b);
      return {
        x: lerp(pa.x, pb.x, t),
        y: lerp(pa.y, pb.y, t),
      };
    } else if (sameShape(pt, ['*', '+', '*'])) {
      const [ ap, op, bp ] = pt;
      const a = Geom.point(ap);
      const b = Geom.point(bp);
      switch (op) {
        case '+': return Geom.Pt(a.x + b.x, a.y + b.y);
        case '-': return Geom.Pt(a.x - b.x, a.y - b.y);
        case '*': return Geom.Pt(a.x * b.x, a.y * b.y);
        case '/': return Geom.Pt(a.x / b.x, a.y / b.y);
      }
      throw new Error(`Unknown binary operation '${op}'`);
    } else if (sameShape(pt, ['30deg', 1])) {
      const [a, d] = pt;
      const m = ANGLE.exec(a);
      if (isSome(m)) {
        const val = Number.parseFloat(m.groups.num);
        const unit = m.groups.unit.toLocaleLowerCase();
        let angle = val;
        if (unit === 'deg' || unit === '°') {
          angle *= Math.PI / 180;
        }
        return {
          x: d * Math.cos(angle),
          y: -d * Math.sin(angle), // flip y to account for web y=down coordinate system
        };
      }
    } else if (sameShape(pt, ['east', {}])) {
      const [str, obj] = pt;
      let rect = null;
      if (sameShape(obj, { left: 0, right: 0, top: 0, bottom: 0})) {
        rect = obj;
      } else if (obj instanceof Node) {
        rect = Geom.getDocumentBoundingRect(obj);
      } else if (sameShape(obj, { x: 0, y: 0, width: 0, height: 0})) {
        rect = {
          left: obj.x,
          right: obj.x + obj.width,
          top: obj.y,
          bottom: obj.y + obj.height,
        };
      } else if (sameShape(obj, { x: 0, y: 0 })) {
        return obj;
      } else {
        throw new Error(`directional expression with non-rectable righthand arg ${JSON.stringify(pt)}`);
      }
      const cx = rect.left/2.0 + rect.right/2.0;
      const cy = rect.top/2.0 + rect.bottom/2.0;
      switch(str) {
        case "center":
        case "centroid":
          return { x: cx, y: cy };
        case "n":
        case "north":
          return { x: cx, y: rect.top };
        case "s":
        case "south":
          return { x: cx, y: rect.bottom };
        case "e":
        case "east":
          return { x: rect.right, y: cy };
        case "w":
        case "west":
          return { x: rect.left, y: cy };
        case "ne":
        case "northeast":
          return { x: rect.right, y: rect.top };
        case "nw":
        case "northwest":
          return { x: rect.left, y: rect.top };
        case "se":
        case "southeast":
          return { x: rect.right, y: rect.bottom };
        case "sw":
        case "southwest":
          return { x: rect.left, y: rect.bottom };
        default:
          throw new Error(`Unrecognized direction '${direction}'`, str);
      }
    }
    throw new Error(`Unrecognized array point expression ${JSON.stringify(pt)}`);
  } else if (typeof pt === 'object') {
    if (sameShape(pt, { x: 0, y: 1})) {
      return pt;
    } else if (sameShape(pt, { rel: '*', to: '*'})) {
      const a = Geom.point(pt.rel);
      const b = Geom.point(pt.to);
      return { x: a.x + b.x, y: a.y + b.y };
    } if (sameShape(pt, { left: 0, top: 0 })) {
      return { x: pt.left, y: pt.top };
    }
  }
  throw new Error(`Unrecognized point expression ${JSON.stringify(pt)}`);
};

const Vec = {};

Vec.point = Geom.point;

Vec.dot = (a, b) => {
  return a.x * b.x + a.y * b.y;
};

Vec.det = (a, b) => {
  return a.x * -b.y + a.y * b.x;
};

Vec.unit = p => {
  const mag2 = p.x*p.x + p.y*p.y;
  if (mag2 < 0.0001) {
    return p;
  }
  const m = Math.sqrt(mag2);
  return { x: p.x / mag, y: p.y / mag };
};

Vec.scale = (s, p) => {
  v = Vec.point(p);
  return { x: v.x * s, y: v.y * s };
};

Vec.add = (a, b) => {
  return { x: a.x + b.x, y: a.y + b.y };
};

Vec.sadd = (a, s, b) => {
  return { x: a.x + s * b.x, y: a.y + s * b.y };
};

Vec.r90 = ({x, y}) => ({x: -y, y: x});

/** projects point onto the line defined by the origin and normal */
Vec.project = (point, origin, normal) => {
  // P + (PO * N)/(N*N) * N
  return Vec.sadd(
    point, 
    Vec.dot(Vec.sadd(origin, -1, point), normal) / Vec.dot(normal, normal),
    normal,
  );
};

