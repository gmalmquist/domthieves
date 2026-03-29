async function popconfirm(opt) {
  opt = firstNotNone(opt, {});
  opt.title = firstNotEmpty(opt.title, '');
  opt.message = firstNotEmpty(opt.message, 'Are you sure?');
  opt.confirmLabel = firstNotEmpty(opt.confirmLabel, 'Yes');
  opt.cancelLabel = firstNotEmpty(opt.cancelLabel, 'Cancel');
  opt.onConfirm = firstNotNone(opt.onConfirm, () => {});
  opt.onCancel = firstNotNone(opt.onCancel, () => {});
  opt.primaryColor = firstNotEmpty(opt.primaryColor, 'darkslateblue');
  opt.mutedColor = firstNotEmpty(opt.mutedColor, 'slategrey');
  opt.accentColor = firstNotEmpty(opt.accentColor, 'mediumslateblue');
  opt.shadowColor = firstNotEmpty(opt.shadowColor, 'black');
  opt.textColor = firstNotEmpty(opt.textColor, 'white');

  const blackout = document.createElement('div');
  blackout.style.position = 'fixed';
  blackout.style.top = '0px';
  blackout.style.left = '0px';
  blackout.style.width = '100vw';
  blackout.style.height = '100vh';
  blackout.style.backgroundColor = rgba(0,0,0,0.4);

  const wrap = document.createElement('div');
  wrap.style.position = 'absolute';
  wrap.style.left = '0px';
  wrap.style.top = '0px';
  wrap.style.width = '100vw';
  wrap.style.height = '100vh';
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'center';
  wrap.style.justifyContent = 'center';
  wrap.style.backdropFilter = 'blur(0px)';
  wrap.style.transitionProperty = 'backdrop-filter';
  wrap.style.transitionDuration = '0.25s';

  const popup = document.createElement('div');
  popup.style.minWidth = '50vw';
  popup.style.maxWidth = 'calc(100vw - 1rem)';
  popup.style.userSelect = 'none';
  popup.style.padding = '1rem';
  popup.style.overflow = 'hidden';
  popup.style.borderRadius = '0.25rem';
  popup.style.color = 'white';
  popup.style.backgroundColor = opt.primaryColor;
  popup.style.boxShadow = `0.5rem 0.5rem 0rem ${opt.shadowColor}`;
  popup.style.border = `thin solid ${opt.shadowColor}`;
  popup.style.borderLeftColor = opt.mutedColor;
  popup.style.borderTopColor = opt.mutedColor;
  popup.style.display = 'grid';
  popup.style.flexDirection = 'row';
  popup.style.alignItems = 'stretch';
  popup.style.opacity = '0';
  popup.style.transitionProperty = 'opacity';
  popup.style.transitionDuration = '0.25s';
  wrap.appendChild(popup);

  const title = document.createElement('div');
  title.style.fontWeight = 'bold';
  title.innerHTML = opt.title;
  popup.appendChild(title);

  const message = document.createElement('div');
  message.innerHTML = opt.message;
  message.marginBottom = '1rem';
  message.marginTop = '1rem';
  popup.appendChild(message);

  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.flexDirection = 'row';
  controls.style.alignItems = 'stretch';
  controls.style.justifyContent = 'flex-end';
  controls.style.marginTop = '1rem';
  popup.appendChild(controls);

  const mkbtn = (label) => {
    const btn = document.createElement('a');
    btn.style.cursor = 'pointer';
    btn.style.backgroundColor = opt.accentColor;
    btn.style.padding = '0.5rem';
    btn.style.borderRadius = '0.125rem';
    btn.style.marginLeft = '1rem';
    btn.style.color = 'white';
    btn.style.textDecoration = 'none';
    btn.style.boxShadow = `1px 1px 0px ${opt.shadowColor}`;
    btn.innerHTML = label;
    controls.appendChild(btn);
    return btn;
  };

  const confirmBtn = mkbtn(opt.confirmLabel);
  const cancelBtn = mkbtn(opt.cancelLabel);
  cancelBtn.style.backgroundColor = opt.mutedColor;

  const resolver = [];

  const popClose = (result) => {
    CSS.SetStyle(document.body, bodyStyle);
    wrap.style.backdropFilter = 'blur(0px)';
    popup.style.opacity = '0';
    resolver.forEach(r => setTimeout(() => r(result), 100));
    setTimeout(() => {
      blackout.remove();
      wrap.remove();
    }, 250);
  };

  const popConfirm = () => {
    popClose(true);
    setTimeout(opt.onConfirm, 1);
  };

  const popCancel = () => {
    popClose(false);
    setTimeout(opt.onCancel, 1);
  };

  const bodyStyle = CSS.PushStyle(document.body, {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  });

  document.body.appendChild(blackout);
  document.body.appendChild(wrap);
  await new Promise(r => setTimeout(r, 10));
  return await new Promise(resolve => {
    resolver.push(resolve);
    blackout.addEventListener('click', popCancel);
    confirmBtn.addEventListener('click', popConfirm);
    cancelBtn.addEventListener('click', popCancel);
    wrap.style.backdropFilter = 'blur(5px)';
    popup.style.opacity = '1';
  });
}

