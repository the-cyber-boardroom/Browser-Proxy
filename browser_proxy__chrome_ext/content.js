(async function() {
  // Load Pyodide from CDN
  const pyodide = await loadPyodide({indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/'});

  // Load Python helper module bundled with the extension
  const response = await fetch(chrome.runtime.getURL('message.py'));
  const pythonCode = await response.text();
  await pyodide.runPythonAsync(pythonCode);
  const formatMessage = pyodide.globals.get('format_message');

  function logResource(name) {
    const msg = formatMessage(name);
    console.log(msg);
  }

  // Log already loaded resources
  performance.getEntriesByType('resource').forEach(entry => {
    logResource(entry.name);
  });

  // Observe future resource loads
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      logResource(entry.name);
    });
  });

  observer.observe({ entryTypes: ['resource'] });
})();
