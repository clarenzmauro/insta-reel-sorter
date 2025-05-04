document.getElementById("sortButton").addEventListener("click", () => {
    // Send a message to the background script to trigger the sort
    chrome.runtime.sendMessage({ action: "sortReels" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Popup Error:",
          chrome.runtime.lastError.message || chrome.runtime.lastError
        );
        // Optional: Display error to user in the popup
      } else {
        console.log(response?.status || "Sort message sent.");
        // Optional: Close popup after click
        // window.close();
      }
    });
  });
  