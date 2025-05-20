// js/content.js
(function() {
  console.log('Content script loaded');

  // Tell the background script to start monitoring network
  chrome.runtime.sendMessage(
    { type: 'START_NETWORK_MONITORING' },
    function(result) {
      if (result && result.success) {
        console.log('Network monitoring started:', result.message);
      } else {
        console.warn('Failed to start network monitoring');
      }
    }
  );


  // Function to capture the main page content
  function capturePageContent() {
    const pageUrl = window.location.href;
    const pageTitle = document.title;
    const fullHtml = document.documentElement.outerHTML;

    // Create a page content object
    const pageContent = {
      url: pageUrl,
      title: pageTitle,
      html: fullHtml,
      timestamp: new Date().toISOString(),
      type: 'main_page'
    };

    // Send to background script for Python processing
    chrome.runtime.sendMessage(
      { type: 'PROCESS_PAGE_CONTENT', content: pageContent },
      function(result) {
        if (result && result.success) {
          console.log('Page content processed:', result.response);
        } else if (result) {
          console.error('Error processing page content:', result.error);
        }
      }
    );
  }

  // Capture page content when the page is fully loaded
  if (document.readyState === 'complete') {
    capturePageContent();
  } else {
    window.addEventListener('load', capturePageContent);
  }

  // Monitor resource loads
  performance.getEntriesByType('resource').forEach(entry => {
    chrome.runtime.sendMessage({
      type: 'PROCESS_RESOURCE',
      resource: {
        url: entry.name,
        type: entry.initiatorType,
        timestamp: new Date().toISOString()
      }
    });
  });

  // Set up observer for future resource loads
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      chrome.runtime.sendMessage({
        type: 'PROCESS_RESOURCE',
        resource: {
          url: entry.name,
          type: entry.initiatorType,
          timestamp: new Date().toISOString()
        }
      });
    });
  });

  observer.observe({ entryTypes: ['resource'] });

  console.log('Page monitoring started');
})();