console.log("Insta Reel Tracker: Content script loaded.");

// --- Selectors ---
// !! Verify these selectors if Instagram changes its structure !!
const reelSelector = "div.x1qjc9v5.xw3qccf"; // Each post/reel item wrapper
const linkSelector = "a._a6hd"; // Selector for the link within the reel item
const iconSelector = 'svg[aria-label="View Count Icon"]'; // View count icon
// --- End Selectors ---

// Keep track of links processed in this specific page load to avoid spamming background
const processedLinks = new Set();

/**
 * Parses Instagram view count text (e.g., "1.5M", "250K", "987") into a number.
 */
function parseViewCount(text) {
  // (Keep your existing parseViewCount function here - unchanged)
  if (!text) {
    return 0;
  }
  const cleanedText = text.trim().replace(/,/g, "");
  const value = parseFloat(cleanedText);
  if (isNaN(value)) {
    return 0;
  }
  if (cleanedText.toLowerCase().includes("m")) {
    return Math.round(value * 1000000);
  } else if (cleanedText.toLowerCase().includes("k")) {
    return Math.round(value * 1000);
  } else {
    return Math.round(value);
  }
}

/**
 * Processes a DOM element to check if it's a Reel and extracts data.
 * @param {Element} element The DOM element to process.
 */
function processElement(element) {
  // Check if the element itself is a reel container or contains one
  const reelElement = element.matches(reelSelector)
    ? element
    : element.querySelector(reelSelector);

  if (!reelElement) {
    // Not a reel element or doesn't contain one
    return;
  }

  const linkElement = reelElement.querySelector(linkSelector);
  const iconElement = reelElement.querySelector(iconSelector);

  if (linkElement && linkElement.href) {
    const reelLink = linkElement.href;

    // Only process if we haven't seen this link in this session
    if (!processedLinks.has(reelLink)) {
      processedLinks.add(reelLink); // Mark as processed for this session

      let viewCount = 0;
      if (iconElement) {
        const viewSpan = iconElement.closest("div")?.nextElementSibling;
        if (viewSpan && viewSpan.tagName === "SPAN") {
          viewCount = parseViewCount(viewSpan.textContent);
        }
      }

      // Only send if it looks like a reel (has views) or consider sending all links
      // if (viewCount > 0) { // Optional: Only track items with view counts
      console.log(
        `Insta Reel Tracker: Found Reel - Views: ${viewCount}, Link: ${reelLink}`
      );
      // Send data to background script for storage
      chrome.runtime.sendMessage(
        {
          action: "trackReel",
          data: { link: reelLink, views: viewCount },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Content Script Error sending message:",
              chrome.runtime.lastError.message
            );
          } else {
            // Optional: console.log("Background response:", response?.status);
          }
        }
      );
      // }
    }
  }
}

// --- MutationObserver Setup ---
const observerCallback = (mutationsList, observer) => {
  for (const mutation of mutationsList) {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        // Check if the added node is an Element node
        if (node.nodeType === Node.ELEMENT_NODE) {
          processElement(node);
          // Also check children of the added node, in case reels are nested deeper
          node
            .querySelectorAll(reelSelector)
            .forEach((nestedReel) => processElement(nestedReel));
        }
      });
    }
  }
};

// Start observing the body for additions. We could target a more specific container
// but body is often reliable for catching dynamically added content wrappers.
const observer = new MutationObserver(observerCallback);
observer.observe(document.body, { childList: true, subtree: true });

console.log("Insta Reel Tracker: MutationObserver is watching.");

// Optional: Process elements already on the page when the script loads
document
  .querySelectorAll(reelSelector)
  .forEach((element) => processElement(element));
