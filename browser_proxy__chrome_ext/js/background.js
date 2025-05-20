// js/background.js

// Import Pyodide the service worker way
importScripts('/pyodide/pyodide.js');

// Network interceptor code - integrated directly
// ==============================================

// Store for captured resources
let capturedResources = {};
let filterMap = {};

// Initialize the network interceptor
function initNetworkInterceptor() {
  // Setup listeners for network requests
  chrome.webRequest.onBeforeRequest.addListener(
    handleBeforeRequest,
    { urls: ["https://docs.diniscruz.ai/*"] },
    ["requestBody"]
  );
  
  chrome.webRequest.onBeforeSendHeaders.addListener(
    handleBeforeSendHeaders,
    { urls: ["https://docs.diniscruz.ai/*"] },
    ["requestHeaders"]
  );
  
  chrome.webRequest.onHeadersReceived.addListener(
    handleHeadersReceived,
    { urls: ["https://docs.diniscruz.ai/*"] },
    ["responseHeaders"]
  );
  
  chrome.webRequest.onCompleted.addListener(
    handleCompletedRequest,
    { urls: ["https://docs.diniscruz.ai/*"] },
    ["responseHeaders"]
  );
  
  console.log("Network interceptor initialized with response filtering");
}

// Handler for before a request is sent
function handleBeforeRequest(details) {
  // Initialize record for this request
  capturedResources[details.requestId] = {
    requestId: details.requestId,
    url: details.url,
    type: details.type,
    method: details.method,
    timestamp: new Date().toISOString(),
    requestBody: details.requestBody ? 
                 JSON.stringify(details.requestBody) : 
                 null
  };
  
  //return { cancel: false };
}

// Handler for when request headers are about to be sent
function handleBeforeSendHeaders(details) {
  if (capturedResources[details.requestId]) {
    capturedResources[details.requestId].requestHeaders = 
      details.requestHeaders.map(h => `${h.name}: ${h.value}`).join('\n');
  }
  
  //return { requestHeaders: details.requestHeaders };
}

// Handler for when response headers are received
function handleHeadersReceived(details) {
  if (capturedResources[details.requestId]) {
    const resource = capturedResources[details.requestId];
    resource.statusCode = details.statusCode;
    resource.responseHeaders = details.responseHeaders ?
      details.responseHeaders.map(h => `${h.name}: ${h.value}`).join('\n') : null;
    
    // Get content type from headers
    const contentTypeHeader = details.responseHeaders ?
      details.responseHeaders.find(h => h.name.toLowerCase() === 'content-type') : null;
    resource.contentType = contentTypeHeader ? contentTypeHeader.value : null;
    
    // Only filter for specific content types we care about
    if (shouldCaptureContent(details)) {
      try {
        // Create a filter to capture the response body
        const filter = chrome.webRequest.filterResponseData(details.requestId);
        let data = [];
        
        // Store the filter reference
        filterMap[details.requestId] = filter;
        
        // Event listener for data chunks
        filter.ondata = event => {
          // Capture the chunk
          data.push(new Uint8Array(event.data));
          // Pass the data through to the page
          filter.write(event.data);
        };
        
        // Event listener for when the stream ends
        filter.onstop = () => {
          // Close the filter
          filter.close();
          
          // Combine all chunks into one array
          let combinedLength = 0;
          for (const chunk of data) {
            combinedLength += chunk.length;
          }
          
          const combinedArray = new Uint8Array(combinedLength);
          let offset = 0;
          for (const chunk of data) {
            combinedArray.set(chunk, offset);
            offset += chunk.length;
          }
          
          // Handle different content types
          if (resource.contentType && (
              resource.contentType.includes('text') || 
              resource.contentType.includes('javascript') ||
              resource.contentType.includes('json') || 
              resource.contentType.includes('xml') ||
              resource.contentType.includes('css') ||
              resource.contentType.includes('html'))) {
            // Text content
            const decoder = new TextDecoder('utf-8');
            resource.content = decoder.decode(combinedArray);
            resource.contentFormat = 'text';
          } else {
            // Binary content (encode as base64)
            resource.content = btoa(
              Array.from(combinedArray)
                .map(byte => String.fromCharCode(byte))
                .join('')
            );
            resource.contentFormat = 'base64';
          }
          
          // Process this resource
          processResourceWithPython(resource);
          
          // Clean up
          delete filterMap[details.requestId];
        };
        
        // Handle errors
        filter.onerror = error => {
          console.error(`Filter error for ${details.url}:`, error);
          filter.disconnect();
          delete filterMap[details.requestId];
        };
      } catch (error) {
        console.error(`Error setting up filter for ${details.url}:`, error);
      }
    }
  }
  
  //return { responseHeaders: details.responseHeaders };
}

// Handler for when a request completes
function handleCompletedRequest(details) {
  // If we're tracking this request but didn't capture content 
  // (e.g., not a content type we're interested in)
  if (capturedResources[details.requestId] && !filterMap[details.requestId]) {
    const resource = capturedResources[details.requestId];
    resource.complete = true;
    resource.content = null; // No content captured
    
    // Process this resource
    processResourceWithPython(resource);
  }
  
  // Note: for resources where we set up filtering, 
  // processing happens in the filter.onstop handler
}

// Helper function to determine if we should capture content
function shouldCaptureContent(details) {
  // Capture for these resource types
  const captureTypes = ['script', 'stylesheet', 'xmlhttprequest', 'main_frame', 'sub_frame'];
  
  if (!captureTypes.includes(details.type)) {
    return false;
  }
  
  // Check content type (if available)
  const contentTypeHeader = details.responseHeaders ?
    details.responseHeaders.find(h => h.name.toLowerCase() === 'content-type') : null;
  
  if (!contentTypeHeader) {
    // If no content type, capture based on resource type
    return true;
  }
  
  const contentType = contentTypeHeader.value.toLowerCase();
  
  // Exclude binary content we're not interested in
  const excludeContentTypes = [
    'image/', 'audio/', 'video/', 'font/'
  ];
  
  return !excludeContentTypes.some(type => contentType.includes(type));
}

// Pyodide handling code
// =====================

let pyodideInstance = null;
let exec_python = null;
let process_page_content = null;
let process_resource_content = null;
let networkMonitoringActive = false;

async function initPyodide() {
  try {
    pyodideInstance = await loadPyodide({
      indexURL: chrome.runtime.getURL('/pyodide/')
    });
    
    // Load Python helper module
    const response = await fetch(chrome.runtime.getURL('python/content_processor.py'));
    const pythonCode = await response.text();
    await pyodideInstance.runPythonAsync(pythonCode);
    
    // Get Python function references
    exec_python = pyodideInstance.globals.get('exec_python');
    process_page_content = pyodideInstance.globals.get('process_page_content');
    process_resource_content = pyodideInstance.globals.get('process_resource');
    
    console.log('Python module loaded successfully');
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Pyodide:', error);
    console.error('Error details:', error.stack);
    return false;
  }
}

// Initialize Pyodide
initPyodide();

// Function to process resources with Python
function processResourceWithPython(resource, sendResponseCallback) {
  try {
    if (process_resource_content) {
      const resourceJson = JSON.stringify(resource);
      const response = process_resource_content(resourceJson);
      
      if (response && sendResponseCallback) {
        sendResponseCallback({success: true, response: JSON.parse(response)});
      }
      return true;
    } else {
      console.warn("Python processing not initialized for resource:", resource.url);
      if (sendResponseCallback) {
        sendResponseCallback({success: false, error: "Python processing not initialized"});
      }
      return false;
    }
  } catch (error) {
    console.error("Error processing resource with Python:", error);
    if (sendResponseCallback) {
      sendResponseCallback({success: false, error: error.message});
    }
    return false;
  }
  
  // Clean up to avoid memory leaks
  if (resource.requestId) {
    delete capturedResources[resource.requestId];
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_NETWORK_MONITORING' && !networkMonitoringActive) {
    networkMonitoringActive = true;
    initNetworkInterceptor();
    sendResponse({success: true, message: "Network monitoring started"});
  }
  else if (message.type === 'FORMAT_RESOURCE') {
    const response = exec_python ? exec_python(message.url) : "Python not initialized";
    sendResponse({success: !!exec_python, response: response});
  }
  else if (message.type === 'PROCESS_PAGE_CONTENT') {
    if (process_page_content) {
      const contentJson = JSON.stringify(message.content);
      const response = process_page_content(contentJson);
      
      if (response) {
        sendResponse({success: true, response: JSON.parse(response)});
      } else {
        sendResponse({success: false, error: "Failed to process page content"});
      }
    } else {
      sendResponse({success: false, error: "Python processing not initialized"});
    }
  }
  else if (message.type === 'PROCESS_RESOURCE') {
    processResourceWithPython(message.resource, sendResponse);
    return true; // Keep the message channel open for async response
  }

  return true; // Keep the message channel open for async response
});

console.log('Background service worker setup and ready to receive messages.');
