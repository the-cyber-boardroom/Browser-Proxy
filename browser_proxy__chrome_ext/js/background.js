
importScripts('/pyodide/pyodide.js');               // Use local copy of Pyodide-core

let pyodideInstance = null;
let exec_python = null;


async function initPyodide() {                  // Initialize Pyodide
  try {
    pyodideInstance = await loadPyodide({
      indexURL: chrome.runtime.getURL('/pyodide/')
    });
    
    //console.log('Pyodide-core loaded successfully, loading Python module...');
    
    // Load Python helper module
    const response = await fetch(chrome.runtime.getURL('python/message.py'));
    const pythonCode = await response.text();
    await pyodideInstance.runPythonAsync(pythonCode);
    
    exec_python = pyodideInstance.globals.get('exec_python');
    console.log('Python module loaded successfully');
    
    return true;
  } catch (error) {
    console.error('Failed to initialize Pyodide:', error);
    console.error('Error details:', error.stack);
    return false;
  }
}

initPyodide()           // Start initialization

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message.type === 'FORMAT_RESOURCE') {
      const response = exec_python(message.url);
      if (response) {
        sendResponse({success: true,  response: response });
      }
   }

  return true; // Keep the message channel open for async response
});

console.log('Background service worker setup and ready to receive messages.');