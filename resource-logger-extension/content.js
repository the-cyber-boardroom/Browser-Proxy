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
