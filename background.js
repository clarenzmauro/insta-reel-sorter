// Initialize storage if it doesn't exist
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["trackedReels"], (result) => {
    if (!result.trackedReels) {
      chrome.storage.local.set({ trackedReels: [] });
      console.log("Background: Initialized trackedReels storage.");
    }
  });
});

// Listener for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // --- Handle Tracking Request from Content Script ---
  if (request.action === "trackReel" && request.data) {
    const newReel = request.data;
    console.log("Background: Received trackReel:", newReel.link);

    chrome.storage.local.get(["trackedReels"], (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Background: Error getting storage:",
          chrome.runtime.lastError
        );
        sendResponse({ status: "Error getting storage" });
        return true;
      }

      let reels = result.trackedReels || [];
      // Check if link already exists
      const exists = reels.some((reel) => reel.link === newReel.link);

      if (!exists) {
        reels.push(newReel);
        chrome.storage.local.set({ trackedReels: reels }, () => {
          if (chrome.runtime.lastError) {
            console.error(
              "Background: Error setting storage:",
              chrome.runtime.lastError
            );
            sendResponse({ status: "Error saving reel" });
          } else {
            console.log("Background: Reel added/updated:", newReel.link);
            sendResponse({ status: "Reel tracked" });
          }
        });
      } else {
        // Optional: Update view count if already exists? For now, just ignore duplicates.
        console.log("Background: Reel link already exists, ignoring.");
        sendResponse({ status: "Reel already tracked" });
      }
    });
    return true; // Indicate asynchronous response
  }

  // --- Handle Download Request from Popup ---
  if (request.action === "downloadData") {
    console.log("Background: Received downloadData request.");
    chrome.storage.local.get(["trackedReels"], (result) => {
      if (chrome.runtime.lastError) {
        console.error(
          "Background: Error getting storage for download:",
          chrome.runtime.lastError
        );
        sendResponse({ status: "Error getting data for download" });
        return true;
      }

      let reels = result.trackedReels || [];
      if (reels.length === 0) {
        console.log("Background: No reels tracked to download.");
        sendResponse({ status: "No data to download" });
        return true;
      }

      // Sort by views descending
      reels.sort((a, b) => b.views - a.views);

      // Format data as text
      let fileContent = `Total Reels Tracked: ${reels.length}\n\n`;
      reels.forEach((reel) => {
        fileContent += `Views: ${reel.views} - Link: ${reel.link}\n`;
      });

      // Create Blob and Download URL
      const blob = new Blob([fileContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);

      // Trigger download
      chrome.downloads.download(
        {
          url: url,
          filename: "instagram_reels_sorted.txt",
          saveAs: true, // Optional: Let user choose filename/location
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Background: Download failed:",
              chrome.runtime.lastError
            );
            sendResponse({ status: "Download failed" });
          } else {
            console.log("Background: Download initiated with ID:", downloadId);
            sendResponse({ status: "Download started" });
          }
          // Clean up the object URL after a short delay
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
      );
    });
    return true; // Indicate asynchronous response
  }

  // --- Handle Clear Data Request from Popup ---
  if (request.action === "clearData") {
    console.log("Background: Received clearData request.");
    chrome.storage.local.remove("trackedReels", () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Background: Error clearing storage:",
          chrome.runtime.lastError
        );
        sendResponse({ status: "Error clearing data" });
      } else {
        // Re-initialize empty array after removing
        chrome.storage.local.set({ trackedReels: [] }, () => {
          console.log("Background: Tracked Reels data cleared.");
          sendResponse({ status: "Data cleared successfully" });
        });
      }
    });
    return true; // Indicate asynchronous response
  }

  // Default response if action not recognized
  // sendResponse({ status: "Unknown action" });
  return false; // No async response needed if action isn't handled
});
