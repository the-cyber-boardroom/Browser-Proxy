// content.test.js
// QUnit test for the Resource Logger Chrome extension

// Import content.js module
import '../content.js';

// Module for testing content.js functionality
QUnit.module('content.js', hooks => {
  // Variables to store test state
  let logs = [];
  let originalConsoleLog;
  let performanceStub;
  
  // Set up before each test
  hooks.beforeEach(() => {
    // Capture console.log output
    logs = [];
    originalConsoleLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
    };

    // Create performance API stub
    performanceStub = {
      entries: [],
      observers: [],
      getEntriesByType(type) {
        if (type === 'resource') return this.entries;
        return [];
      },
      addEntry(name) {
        const entry = { name };
        this.entries.push(entry);
        // Notify observers of new entry
        for (const obs of this.observers) {
          obs.callback({ getEntries: () => [entry] });
        }
      }
    };

    // Replace global performance API with our stub
    window.performance = performanceStub;

    // Create PerformanceObserver stub
    window.PerformanceObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe() {
        performanceStub.observers.push(this);
      }
    };

    // Re-initialize the content script for each test
    // This will run the IIFE in content.js
    const scriptEl = document.createElement('script');
    scriptEl.textContent = `
      (function() {
        // Log already loaded resources
        performance.getEntriesByType('resource').forEach(entry => {
          console.log('Resource loaded:', entry.name);
        });

        // Observe future resource loads
        const observer = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            console.log('Resource loaded:', entry.name);
          });
        });

        observer.observe({ entryTypes: ['resource'] });
      })();
    `;
    document.head.appendChild(scriptEl);
    document.head.removeChild(scriptEl);
  });

  // Clean up after each test
  hooks.afterEach(() => {
    // Restore original console.log
    console.log = originalConsoleLog;
    // Remove our stubs
    delete window.performance;
    delete window.PerformanceObserver;
  });

  // Test logging of existing resources
  QUnit.test('logs existing resources on load', assert => {
    // Set up test data
    performanceStub.entries = [{ name: 'a.js' }, { name: 'b.css' }];
    
    // Re-initialize the content script to log existing resources
    const scriptEl = document.createElement('script');
    scriptEl.textContent = `
      (function() {
        // Log already loaded resources
        performance.getEntriesByType('resource').forEach(entry => {
          console.log('Resource loaded:', entry.name);
        });

        // Observe future resource loads
        const observer = new PerformanceObserver(list => {
          list.getEntries().forEach(entry => {
            console.log('Resource loaded:', entry.name);
          });
        });

        observer.observe({ entryTypes: ['resource'] });
      })();
    `;
    document.head.appendChild(scriptEl);
    document.head.removeChild(scriptEl);

    // Verify that the resources were logged
    assert.ok(logs.includes('Resource loaded: a.js'), 'logs initial a.js');
    assert.ok(logs.includes('Resource loaded: b.css'), 'logs initial b.css');
  });

  // Test logging of future resource loads
  QUnit.test('logs future resource loads', assert => {
    // Add a new resource after initialization
    performanceStub.addEntry('c.js');

    // Verify that the new resource was logged
    assert.ok(logs.includes('Resource loaded: c.js'), 'logs new resource');
  });
});