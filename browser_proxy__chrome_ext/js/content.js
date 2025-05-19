(function() {
  //console.log('Content script loaded');
  
  // Function to log a resource using Python formatting
  function logResource(url) {
    //console.log('here')
    // Send message to background script to format the message with Python
    chrome.runtime.sendMessage(
        { type: 'FORMAT_RESOURCE', url: url },
        function(result) {
          if (result && result.success) {
            console.log(result.response);
          }}
     );
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
  
  console.log('Resource monitoring started');
})();