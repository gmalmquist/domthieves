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

Geom.viewport = function() {
  const v = {
    x: window.scrollX,
    y: window.scrollY,
    width: window.innerWidth,
    height: window.innerHeight,
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
Geom.visibleBoundingRect = function(element) {
  return Geom.intersectRects(Geom.getDocumentBoundingRect(element), Geom.viewport());
}

