const path = require('path');

// capture console.log output
let logs = [];
const origConsoleLog = console.log;
console.log = (...args) => {
  logs.push(args.join(' '));
};

// stub performance API
const performance = {
  entries: [],
  observers: [],
  getEntriesByType(type) {
    if (type === 'resource') return this.entries;
    return [];
  },
  addEntry(name) {
    const entry = { name };
    this.entries.push(entry);
    for (const obs of this.observers) {
      obs.callback({ getEntries: () => [entry] });
    }
  }
};

global.performance = performance;

global.PerformanceObserver = class {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    performance.observers.push(this);
  }
};

const loadExtension = () => {
  const extPath = path.join(__dirname, '..', 'content.js');
  delete require.cache[require.resolve(extPath)];
  require(extPath);
};

QUnit.module('content.js', hooks => {
  hooks.beforeEach(() => {
    logs = [];
    performance.entries = [];
    performance.observers = [];
  });

  QUnit.test('logs existing resources on load', assert => {
    performance.entries = [{ name: 'a.js' }, { name: 'b.css' }];
    loadExtension();

    assert.ok(logs.includes('Resource loaded: a.js'), 'logs initial a.js');
    assert.ok(logs.includes('Resource loaded: b.css'), 'logs initial b.css');
  });

  QUnit.test('logs future resource loads', assert => {
    loadExtension();
    performance.addEntry('c.js');

    assert.ok(logs.includes('Resource loaded: c.js'), 'logs new resource');
  });
});

// cleanup
delete global.performance;
delete global.PerformanceObserver;
console.log = origConsoleLog;
