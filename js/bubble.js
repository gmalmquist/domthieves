function Bubble(message, title) {
  const bubble = {
    closeOnClick: true,
    tetherPoint: null,
    tetherInt: null,
  };

  const bg = 'light-dark(#ffffff, #000000)';
  const fg = 'light-dark(#000000, #ffffff)';

  const wrap = document.createElement('div');
  wrap.dataset.dtBubbleWrap = "";
  wrap.style.position = 'fixed';
  wrap.style.left = '0px';
  wrap.style.top = '0px';
  wrap.style.width = '100vw';
  wrap.style.height = '100vh';
  wrap.style.pointerEvents = 'none';
  wrap.style.transitionDuration = '0.25s';
  wrap.style.transitionProperty = 'opacity';
  wrap.style.opacity = '0';

  const dom = document.createElement('div');
  wrap.appendChild(dom);

  dom.style.background = bg;
  dom.style.color = fg;
  dom.style.position = 'absolute';
  dom.style.display = 'flex';
  dom.style.flexDirection = 'column';
  dom.style.alignItems = 'flex-start';
  dom.style.padding = '0.5rem';
  dom.style.overflow = 'hidden';
  dom.style.border = `thick double ${fg}`;

  dom.style.userSelect = 'none';

  dom.style.fontSize = '0.9rem';
  dom.style.fontFamily = 'monospace';

  dom.style.left = '0px';
  dom.style.top = '0px';
  dom.style.maxWidth = '240px'; // gba

  dom.style.transitionDuration = '0.25s';
  dom.style.transitionProperty = 'transform';

  const head = document.createElement('div');
  head.style.marginBottom = '4px';

  const msg = document.createElement('div');
  dom.appendChild(msg);

  bubble.setMessage = (message) => {
    msg.innerHTML = `${message}`;
  };

  bubble.setTitle = (title) => {
    title = isSome(title) ? `${title}`.toLocaleUpperCase() : '';
    if (isEmpty(title)) {
      if (isSome(head.parentNode)) {
        head.remove();
      }
      return;
    }
    if (isNone(head.parentNode)) {
      dom.prepend(head);
    }
  };

  bubble.show = (duration) => {
    if (isNone(wrap.parentNode)) {
      document.body.appendChild(wrap);
      setTimeout(() => bubble.show(duration), 10);
      return;
    }
    wrap.style.opacity = '1.0';
    dom.style.pointerEvents = 'unset';
    if (isSome(duration) && duration > 0) {
      setTimeout(bubble.hide, duration);
    }
  };

  bubble.hide = () => {
    wrap.style.opacity = '0.0';
    dom.style.pointerEvents = 'none';
    setTimeout(() => {
      if (parseFloat(wrap.style.opacity) === 0.0) {
        wrap.remove();
      }
    }, 1000);
  };

  bubble.move = (x, y, animate) => {
    if (animate) {
      dom.style.transitionProperty = 'transform';
    } else {
      dom.style.transitionProperty = 'unset';
    }
    dom.style.transform = `translate(${x}px, ${y}px)`;
  };

  bubble.tetherTo = (getPoint) => {
    if (bubble.tetherInt > 0) {
      clearInterval(bubble.tetherInt);
      bubble.tetherInt = -1;
    }
    if (isNone(getPoint)) {
      return;
    }
    bubble.tetherPoint = getPoint;
    bubble.tetherInt = setInterval(() => {
      const pt = getPoint();
      if (isNone(pt)) {
        if (bubble.tetherInt > 0) {
          clearInterval(bubble.tetherInt);
          bubble.tetherInt = -1;
        }
        return;
      }
      // TODO later if I need to
    }, 50);
  };

  bubble.setTitle(title);
  bubble.setMessage(message);

  dom.addEventListener('click', () => {
    if (bubble.closeOnClick) {
      bubble.hide();
    }
  });
  return bubble;
}

