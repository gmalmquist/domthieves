const DOM = {
  allowedTags: {},
  deniedAttrs: {},
  deniedAttrPrefixes: {},
};

DOM.CleanClone = async original => {
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

  if (!DOM.allowedTags[original.tagName.toLocaleLowerCase()]) {
    return null;
  }

  const dom = original.cloneNode(false);

  for (const a of original.getAttributeNames()) {
    const name = a.toLocaleLowerCase();
    if (DOM.deniedAttrs[name]) {
      dom.removeAttribute(name);
      continue;
    }
    for (const prefix of DOM.deniedAttrPrefixes) {
      if (name.startsWith(prefix)) {
        dom.removeAttribute(name);
        continue;
      }
    }
  }

  if (!isNone(original.childNodes)) {
    for (const child of original.childNodes) {
      const copy = await DOM.CleanClone(child);
      if (isNone(copy)) {
        continue;
      }
      dom.appendChild(copy);
    }
  }

  await DOM.BakeStyle(original, dom);
  return dom;
};

DOM.BakeStyle = async (dom, copy) => {
  const style = await MinimalCSSFromElement(dom);
  for (const [ name, value ] of Object.entries(style)) {
    copy.style[name] = value;
  }
};

DOM.getMinimumBoundingRect = async function(element) {
  if (isEmpty(element.innerHTML)) {
    return Geom.getDocumentBoundingRect(element);
  }
  let display = window.getComputedStyle(element).display;
  if (isEmpty(display)) {
    display = firstNotNone(getDefaultCSS(element, 'display'), 'inline');
  }

  const hypothetical = async (display) => {
    const wrap = document.createElement('div');
    wrap.style.position = 'absolute';
    wrap.style.display = 'block';
    wrap.style.left = '-500vw';
    wrap.style.top = '1px';

    const clone = await DOM.CleanClone(element);
    clone.style.display = display;
    for (const a of clone.getAttributeNames()) {
      if (a.startsWith('data-')) {
        clone.removeAttribute(a);
      }
      if (a.startsWith('on')) {
        clone.removeAttribute(a);
      }
    }
    wrap.appendChild(clone);

    document.body.appendChild(wrap);
    const size = Geom.getDocumentBoundingRect(clone);
    wrap.remove();
    const pos = Geom.getDocumentBoundingRect(element);
    return Geom.rectOf({
      left: pos.left,
      top: pos.top,
      width: size.width,
      height: size.height,
    });
  };

  switch (display) {
    case "inline":
    case "inline-block":
    case "inline-flex":
    case "inline-grid":
    case "inline list-item":
    case "inline-table":
      return Geom.getDocumentBoundingRect(element);
    case "contents":
    case "none":
    case "flow-root":
    case "block":
      return await hypothetical("inline-block");
    case "list-item":
      return await hypothetical("inline list-item");
    case "flex":
      return await hypothetical("inline-flex")
    case "grid":
      return await hypothetical("inline-grid")
    case "table":
      return await hypothetical("inline-table")
    default:
      console.warn(`Unknown display type ${display}, assuming it's normal.`)
      return Geom.getDocumentBoundingRect(element)
  }
};
