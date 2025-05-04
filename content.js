/**
 * Parses Instagram view count text (e.g., "1.5M", "250K", "987") into a number.
 * @param {string} text The text content to parse.
 * @returns {number} The numerical view count, or 0 if parsing fails.
 */
function parseViewCount(text) {
    if (!text) {
      return 0;
    }
    const cleanedText = text.trim().replace(/,/g, ""); // Remove commas and whitespace
    const value = parseFloat(cleanedText);
  
    if (isNaN(value)) {
      return 0; // Not a number
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
   * Finds Reels currently visible on the page, extracts view counts, sorts, and reorders them.
   */
  function sortReelsByViews() {
    console.log("Insta Reel Sorter: Starting sort of visible reels...");
  
    // --- Selectors ---
    // !! Verify these selectors if Instagram changes its structure !!
    const gridContainerSelector = "main > div > div > div:last-child"; // Container for rows
    const reelSelector = "div.x1qjc9v5.xw3qccf"; // Each post/reel item wrapper
    const iconSelector = 'svg[aria-label="View Count Icon"]'; // View count icon
    const rowSelector = "div._ac7v"; // Row container
    // --- End Selectors ---
  
    const gridContainer = document.querySelector(gridContainerSelector);
    if (!gridContainer) {
      console.error("Insta Reel Sorter: Could not find grid container.");
      alert("Insta Reel Sorter Error: Could not find the main content grid."); // User feedback
      return;
    }
  
    const reelElements = gridContainer.querySelectorAll(reelSelector);
    if (reelElements.length === 0) {
      console.log("Insta Reel Sorter: No reel elements found in the grid.");
      alert("Insta Reel Sorter: No Reels/posts found to sort."); // User feedback
      return;
    }
  
    console.log(
      `Insta Reel Sorter: Found ${reelElements.length} potential reels to sort.`
    );
    let reelsData = [];
  
    reelElements.forEach((reelElement) => {
      let viewCount = 0;
      const icon = reelElement.querySelector(iconSelector);
  
      if (icon) {
        const viewSpan = icon.closest("div")?.nextElementSibling;
        if (viewSpan && viewSpan.tagName === "SPAN") {
          const viewText = viewSpan.textContent;
          viewCount = parseViewCount(viewText);
        }
      }
      // Store the element and its view count (even if 0 for non-reels/no icon)
      reelsData.push({ element: reelElement, views: viewCount });
    });
  
    // Sort by views descending
    reelsData.sort((a, b) => b.views - a.views);
  
    console.log("Insta Reel Sorter: Sorting complete. Reordering elements...");
  
    // Get all the row container elements
    const rowElements = gridContainer.querySelectorAll(rowSelector);
    if (!rowElements || rowElements.length === 0) {
      console.error("Insta Reel Sorter: Could not find row elements.");
      // Fallback: If rows aren't found, just append to grid (might break style)
      reelsData.forEach((reel) => {
        gridContainer.appendChild(reel.element);
      });
      return;
    }
  
    // Clear existing content from all rows first
    rowElements.forEach((row) => {
      while (row.firstChild) {
        row.removeChild(row.firstChild);
      }
    });
  
    // Distribute the sorted reel elements back into the rows
    let currentRowIndex = 0;
    const itemsPerRow = 4; // Assuming 4 items per row based on your previous comment
  
    reelsData.forEach((reel, index) => {
      if (rowElements[currentRowIndex]) {
        rowElements[currentRowIndex].appendChild(reel.element);
        // Move to the next row after adding the required number of items
        if ((index + 1) % itemsPerRow === 0) {
          currentRowIndex++;
        }
      } else {
        // If we run out of original rows (e.g., user scrolled partially)
        // Append remaining items directly to the grid container.
        // This might create a less neat layout for the last few items if
        // the total number isn't a multiple of itemsPerRow.
        console.warn(
          "Insta Reel Sorter: Ran out of original row containers, appending to main grid."
        );
        gridContainer.appendChild(reel.element);
      }
    });
  
    console.log("Insta Reel Sorter: Reordering finished.");
  }
  
  // NO automatic trigger here anymore. It's called by background.js.
  