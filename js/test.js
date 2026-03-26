const T = {
  assert: (test, msg) => {
    if (!test) {
      T.failures.push([msg, T.results.length]);
      T.results.push(false);
      return false;
    }
    T.results.push(true);
    return true;
  },
  results: [],
  failures: [],
};

T.TestSameShape = function() {
  const assert = T.assert;
  const zero = [0, '', false, 0.0, [], {}, () => {}];
  for (const a of zero) {
    assert(sameShape(a, a), `sameShape(${JSON.stringify(a)}, ${JSON.stringify(a)})`);
    for (const b of zero) {
      if (a !== b) {
        assert(!sameShape(a, b), `!sameShape(${JSON.stringify(a)}, ${JSON.stringify(b)})`);
      }
    }
  }

  assert(!sameShape({}, { a: 0 }), 'should be missing a');
  assert(!sameShape({}, { a: '*'}), 'wildcard should not match nil');
  assert(sameShape({}, { a: null }), 'null should match undefined');
  assert(sameShape({ a: 5, b: 4, c: 3 }, { b: 0, c: 7 }), '`one` having extras should be fine');
  assert(sameShape([1, 2, 3], [4, 5, 6]), 'matching triples');
  assert(!sameShape([1,2,3], [1,false,3]), 'mismatched triples');
  assert(!sameShape([1,3], [1,2,3]), 'array too short');
  assert(!sameShape([1,3,4,5], [1,2,3]), 'array too long');
  assert(sameShape([1,2,3], { every: x => x > 0 }), 'every condition true');
  assert(!sameShape([1,2,3], { every: x => x > 2 }), 'every condition false');
  assert(sameShape([1,2,3], { some: x => x > 2 }), 'some condition true');
  assert(!sameShape([1,2,3], { some: x => x > 4 }), 'some condition false');
  assert(sameShape(
    { a: [1, 2, 3], b: { c: 'hi', d: {} }},
    { a: [4, 5, 6], b: { c: 'no', d: {} }},
  ), 'deep');
  assert(!sameShape(
    { a: [1, 2, 3], b: { c: 'hi', d: {} }},
    { a: [4, 5, 6], b: { c: 2, d: {} }},
  ), '!deep 1');
  assert(!sameShape(
    { a: [1, 2, 3], b: { c: 'hi', d: {} }},
    { a: [4, 5, ''], b: { c: 'hi', d: {} }},
  ), '!deep 2');
  assert(!sameShape(
    { a: [1, 2, 3], b: { c: 'hi', d: {} }},
    { a: [4, 5, ''], b: { c: 'hi', d: { x: 4 } }},
  ), '!deep 3');
  assert(!sameShape(
    { a: [1, 2, 3], b: { c: 'hi', d: {} }},
    7,
  ), '!deep 4');
}

T.TestPoint = async function() {
  const check = (expect, arg, msg, not) => {
    try {
      const pt = Geom.point(arg);
      T.assert(
        (pt.x === expect.x && pt.y === expect.y) === !not,
        `${msg}: expected ${JSON.stringify(expect)} ${!!not ? '!=' : '=='} ${JSON.stringify(pt)}`,
      );
    } catch (e) {
      T.assert(false, `${msg}: ${e}`);
    }
  };
  const checkNot = (expect, arg, msg) => check(expect, arg, msg, true);

  check({ x: 1, y: 2}, {x: 1, y: 2}, 'simple identity');
  checkNot({ x: 1, y: 2}, {x: 2, y: 1}, 'transpose');
  check(
    {x: 2, y: 5},
    [ {x: 1, y: 2}, 0.5, { x: 3, y: 8 }],
    'lerp',
  );

  check(
    {x: 2, y: 5},
    { left: 2, top: 5 },
    'left top',
  );

  check(
    {x: 2, y: 5},
    [2, 5],
    'array',
  );

  check(
    {x: 2, y: 5},
    ['nw', { left: 2, top: 5, right: 4, bottom: 7 }],
    'nw',
  );

  check(
    {x: 2, y: 7},
    ['sw', { left: 2, top: 5, right: 4, bottom: 7 }],
    'sw',
  );

  check(
    {x: 4, y: 5},
    ['ne', { left: 2, top: 5, right: 4, bottom: 7 }],
    'ne',
  );

  check(
    {x: 4, y: 7},
    ['se', { left: 2, top: 5, right: 4, bottom: 7 }],
    'se',
  );

  check(
    {x: 3, y: 5},
    ['n', { left: 2, top: 5, right: 4, bottom: 7 }],
    'n',
  );

  check(
    {x: 3, y: 7},
    ['s', { left: 2, top: 5, right: 4, bottom: 7 }],
    's',
  );

  check(
    {x: 4, y: 6},
    ['e', { left: 2, top: 5, right: 4, bottom: 7 }],
    'e',
  );

  check(
    {x: 2, y: 6},
    ['w', { left: 2, top: 5, right: 4, bottom: 7 }],
    'w',
  );

  check(
    {x: 3, y: 9},
    {
      rel: [1, 3],
      to: ['w', { left: 2, top: 5, right: 4, bottom: 7 }],
    },
    'rel',
  );

  const rect = document.createElement('div');
  rect.dataset.testElement = "true";
  rect.style.opacity = '0';
  rect.style.position = 'absolute';
  rect.style.width = '10px';
  rect.style.height = '20px';
  rect.style.left = '5px';
  rect.style.top = '15px';

  document.body.appendChild(rect);
  const p = new Promise(resolve => setTimeout(() => {
    check(
      {x: 15, y: 35},
      ['se', rect],
      'dom',
    );
    rect.remove();
    resolve();
  }, 10));
  await p;
}

T.TestAll = async function() {
  const obj = T;
  for (const name of Object.keys(obj)) {
    if (name === 'TestAll') {
      continue;
    }
    if (!name.startsWith('Test') || typeof obj[name] !== 'function') {
      continue;
    }
    const test = obj[name];
    const p = test();
    if (p instanceof Promise) {
      await p;
    }
    console.log(`${name}:`, T.results.map(b => b ? '.' : 'x').join(''))
    for (const [ e, i ] of T.failures) {
      console.error(`FAIL ${name}-${i}:`, e);
    }
    T.results = [];
    T.failures = [];
  }
  console.log('all tests run');
}

setTimeout(T.TestAll, 1);
