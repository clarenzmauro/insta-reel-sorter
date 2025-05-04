chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "sortReels") {
      console.log("Background: Received sortReels message.");
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Check for errors during tab query
        if (chrome.runtime.lastError) {
          console.error("Background: Tab query error:", chrome.runtime.lastError);
          sendResponse({ status: "Error: Tab query failed" });
          return true; // Keep message channel open for async response
        }
        if (!tabs || tabs.length === 0) {
          console.error("Background: No active tab found.");
          sendResponse({ status: "Error: No active tab" });
          return true;
        }
        const activeTab = tabs[0];
  
        // Check if the tab has a URL and it's an Instagram page
        if (activeTab.url && activeTab.url.includes("instagram.com")) {
          console.log("Background: Active tab is Instagram:", activeTab.id);
  
          // 1. Inject content.js. executeScript is smart enough not to re-inject if already present.
          chrome.scripting
            .executeScript({
              target: { tabId: activeTab.id },
              files: ["content.js"],
            })
            .then(() => {
              console.log(
                "Background: content.js successfully injected or already present."
              );
              // 2. Execute the sortReelsByViews function defined within content.js
              return chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => sortReelsByViews(), // <-- Execute the main sort function directly
              });
            })
            .then((results) => {
              // Check results for errors from the executed function
              if (chrome.runtime.lastError) {
                console.error(
                  "Background: Error during function execution:",
                  chrome.runtime.lastError
                );
                sendResponse({
                  status: `Execution Error: ${chrome.runtime.lastError.message}`,
                });
              } else if (results && results[0] && results[0].error) {
                console.error(
                  "Background: Error reported from sortReelsByViews execution:",
                  results[0].error
                );
                sendResponse({
                  status: `Function Execution Error: ${results[0].error}`,
                });
              } else {
                console.log(
                  "Background: sortReelsByViews function executed successfully."
                );
                sendResponse({ status: "Sort initiated successfully!" });
              }
            })
            .catch((error) => {
              console.error(
                "Background: Failed to inject script or execute function:",
                error
              );
              sendResponse({ status: `Injection/Execution Error: ${error.message || error}` });
            });
        } else {
          console.log(
            "Background: Active tab is not an Instagram page:",
            activeTab.url
          );
          sendResponse({ status: "Error: Not an Instagram page" });
        }
      });
      // Return true crucial for indicating asynchronous response handling
      return true;
    }
    return false;
  });
  