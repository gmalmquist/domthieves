function rgba(r,g,b,a) {
  if (isNone(a)) {
    a = 255;
  }
  const c = { r, g, b, a: isSome(a) ? a : 255};
  c.toArray = () => [ c.r, c.g, c.b, isSome(c.a) ? c.a : 255 ];
  c.toHex = () => (
    c.toArray().map(x => (
      isSome(x) ? x.toString(16).padStart(2, '0') : '!!'
    )).join('')
  );
  c.toCSS = () => `#${c.toHex()}`;
  c.scale = s => rgba(r * s, g * s, b * s, a * s);
  c.mul = o => rgba(r * o.r, g * o.g, b * o.b, a * o.a);
  c.add = o => rgba(r + o.r, g + o.g, b + o.b, a + o.a);
  return c;
}

function rgb(r,g,b) {
  return rgba(r,g,b,255);
}

var reHexColor = /^([#]?)(?<num>[A-F0-9]{3,8})$/i;
var reRGBAColor = /^rgb([a]?)[(](?<r>\d{1,3}),\s*(?<g>\d{1,3}),\s*(?<b>\d{1,3})(,\s*(?<a>\d{1,3}))?[)]$/i;


function parseHexColor(s) {
  let m = reHexColor.exec(s);
  if (isSome(m)) {
    const num = m.groups['num'];
    const x = (i,j,ct) => {
      const x = num.substring(i, isSome(j) ? j : i + 1);
      const arr = new Array(isSome(ct) ? ct : 1);
      arr.fill(x);
      return parseInt(arr.join(''), 16);
    };
    const xx = (i,j) => x(i,j,2);
    switch (num.length) {
      case 3:
        return rgb(xx(0), xx(1), xx(2));
      case 4:
        return rgba(xx(0), xx(1), xx(2), xx(3));
      case 6:
        return rgb(x(0,2), x(2,4), x(4,6));
      case 8:
        return rgba(x(0,2), x(2,4), x(4,6), x(6,8));
      default:
        throw new Error(`invalid hex color length ${num.length}: '${num}'`);
    }
  }
  m = reRGBAColor.exec(s);
  if (isSome(m)) {
    const r = parseInt(m.groups['r'], 10);
    const g = parseInt(m.groups['g'], 10);
    const b = parseInt(m.groups['b'], 10);
    const a = isSome(m.groups['a']) ? parseInt(m.groups['a'], 10) : 255;
    return rgba(r, g, b, a);
  }
  throw new Error(`cannot parse color from ${JSON.stringify(s)}`);
}

const NamedColors = (() => {
  const colors = {
    "aliceblue": "#F0F8FF",
    "antiquewhite": "#FAEBD7",
    "aqua": "#00FFFF",
    "aquamarine": "#7FFFD4",
    "azure": "#F0FFFF",
    "beige": "#F5F5DC",
    "bisque": "#FFE4C4",
    "black": "#000000",
    "blanchedalmond": "#FFEBCD",
    "blue": "#0000FF",
    "blueviolet": "#8A2BE2",
    "brown": "#A52A2A",
    "burlywood": "#DEB887",
    "cadetblue": "#5F9EA0",
    "chartreuse": "#7FFF00",
    "chocolate": "#D2691E",
    "coral": "#FF7F50",
    "cornflowerblue": "#6495ED",
    "cornsilk": "#FFF8DC",
    "crimson": "#DC143C",
    "cyan": "#00FFFF",
    "darkblue": "#00008B",
    "darkcyan": "#008B8B",
    "darkgoldenrod": "#B8860B",
    "darkgray": "#A9A9A9",
    "darkgrey": "#A9A9A9",
    "darkgreen": "#006400",
    "darkkhaki": "#BDB76B",
    "darkmagenta": "#8B008B",
    "darkolivegreen": "#556B2F",
    "darkorange": "#FF8C00",
    "darkorchid": "#9932CC",
    "darkred": "#8B0000",
    "darksalmon": "#E9967A",
    "darkseagreen": "#8FBC8F",
    "darkslateblue": "#483D8B",
    "darkslategray": "#2F4F4F",
    "darkslategrey": "#2F4F4F",
    "darkturquoise": "#00CED1",
    "darkviolet": "#9400D3",
    "deeppink": "#FF1493",
    "deepskyblue": "#00BFFF",
    "dimgray": "#696969",
    "dimgrey": "#696969",
    "dodgerblue": "#1E90FF",
    "firebrick": "#B22222",
    "floralwhite": "#FFFAF0",
    "forestgreen": "#228B22",
    "fuchsia": "#FF00FF",
    "gainsboro": "#DCDCDC",
    "ghostwhite": "#F8F8FF",
    "gold": "#FFD700",
    "goldenrod": "#DAA520",
    "gray": "#808080",
    "grey": "#808080",
    "green": "#008000",
    "greenyellow": "#ADFF2F",
    "honeydew": "#F0FFF0",
    "hotpink": "#FF69B4",
    "IndianRed ": "#CD5C5C",
    "Indigo  ": "#4B0082",
    "ivory": "#FFFFF0",
    "khaki": "#F0E68C",
    "lavender": "#E6E6FA",
    "lavenderblush": "#FFF0F5",
    "lawngreen": "#7CFC00",
    "lemonchiffon": "#FFFACD",
    "lightblue": "#ADD8E6",
    "lightcoral": "#F08080",
    "lightcyan": "#E0FFFF",
    "lightgoldenrodyellow": "#FAFAD2",
    "lightgray": "#D3D3D3",
    "lightgrey": "#D3D3D3",
    "lightgreen": "#90EE90",
    "lightpink": "#FFB6C1",
    "lightsalmon": "#FFA07A",
    "lightseagreen": "#20B2AA",
    "lightskyblue": "#87CEFA",
    "lightslategray": "#778899",
    "lightslategrey": "#778899",
    "lightsteelblue": "#B0C4DE",
    "lightyellow": "#FFFFE0",
    "lime": "#00FF00",
    "limegreen": "#32CD32",
    "linen": "#FAF0E6",
    "magenta": "#FF00FF",
    "maroon": "#800000",
    "mediumaquamarine": "#66CDAA",
    "mediumblue": "#0000CD",
    "mediumorchid": "#BA55D3",
    "mediumpurple": "#9370DB",
    "mediumseagreen": "#3CB371",
    "mediumslateblue": "#7B68EE",
    "mediumspringgreen": "#00FA9A",
    "mediumturquoise": "#48D1CC",
    "mediumvioletred": "#C71585",
    "midnightblue": "#191970",
    "mintcream": "#F5FFFA",
    "mistyrose": "#FFE4E1",
    "moccasin": "#FFE4B5",
    "navajowhite": "#FFDEAD",
    "navy": "#000080",
    "oldlace": "#FDF5E6",
    "olive": "#808000",
    "olivedrab": "#6B8E23",
    "orange": "#FFA500",
    "orangered": "#FF4500",
    "orchid": "#DA70D6",
    "palegoldenrod": "#EEE8AA",
    "palegreen": "#98FB98",
    "paleturquoise": "#AFEEEE",
    "palevioletred": "#DB7093",
    "papayawhip": "#FFEFD5",
    "peachpuff": "#FFDAB9",
    "peru": "#CD853F",
    "pink": "#FFC0CB",
    "plum": "#DDA0DD",
    "powderblue": "#B0E0E6",
    "purple": "#800080",
    "rebeccapurple": "#663399",
    "red": "#FF0000",
    "rosybrown": "#BC8F8F",
    "royalblue": "#4169E1",
    "saddlebrown": "#8B4513",
    "salmon": "#FA8072",
    "sandybrown": "#F4A460",
    "seagreen": "#2E8B57",
    "seashell": "#FFF5EE",
    "sienna": "#A0522D",
    "silver": "#C0C0C0",
    "skyblue": "#87CEEB",
    "slateblue": "#6A5ACD",
    "slategray": "#708090",
    "slategrey": "#708090",
    "snow": "#FFFAFA",
    "springgreen": "#00FF7F",
    "steelblue": "#4682B4",
    "tan": "#D2B48C",
    "teal": "#008080",
    "thistle": "#D8BFD8",
    "tomato": "#FF6347",
    "turquoise": "#40E0D0",
    "violet": "#EE82EE",
    "wheat": "#F5DEB3",
    "white": "#FFFFFF",
    "whitesmoke": "#F5F5F5",
    "yellow": "#FFFF00",
    "yellowgreen": "#9ACD32"
  };
  for (const [key, value] of Object.entries(colors)) {
    colors[key] = parseHexColor(value).toArray();
  }
  return colors;
})();

function parseColor(s) {
  if (Array.isArray(s)) {
    return rgba(...s);
  }
  if (typeof s === 'object' && isSome(s.r)) {
    return rgba(s.r, r.g, s.b, s.a);
  }
  if (typeof s !== 'string') {
    throw new Error(`cannot parse color from type ${typeof s} ${JSON.stringify(s)}`);
  }
  const named = NamedColors[s.toLocaleLowerCase()];
  if (isSome(named)) {
    return rgb(...named);
  }
  return parseHexColor(s);
}
