console.log("Image Accessibility Analyzer: Content script loaded.");

const ALT_DISPLAY_CLASS = '__image-analyzer-alt-overlay__';
let altDisplayOverlayStyle = null;

// Function to find all relevant images on the page
function findImages() {
    const images = [];
    const pageUrl = window.location.href;

    // 1. Find <img> elements
    document.querySelectorAll('img').forEach(img => {
        const alt = img.getAttribute('alt');
        let altStatus;
        if (alt === null) {
            altStatus = 'missing';
        } else if (alt.trim() === '') {
            altStatus = 'empty';
        } else {
            altStatus = 'present';
        }
        images.push({
            type: 'img',
            src: img.currentSrc || img.src, // Use currentSrc for responsive images
            altValue: alt,
            altStatus: altStatus,
            element: img // Keep a reference for highlighting/overlay
        });
    });

    // 2. Find <svg> elements (basic check - might need refinement)
    // We'll treat SVGs that might be icons/images. A simple check for aria-label or title.
    document.querySelectorAll('svg').forEach(svg => {
        const label = svg.getAttribute('aria-label');
        const title = svg.querySelector('title');
        const alt = label || (title ? title.textContent : null);

        let altStatus;
         if (alt === null || alt.trim() === '') { // Consider unlabeled SVGs as missing/empty
             // Check role="img" as well
             const role = svg.getAttribute('role');
             if (role === 'img' && !alt) {
                 altStatus = 'missing'; // Explicitly an image but no label
             } else if (!role && !alt) {
                 // Potentially decorative, but let's flag if it doesn't have role=presentation/none
                 const decorativeRole = svg.getAttribute('role');
                 if (decorativeRole !== 'presentation' && decorativeRole !== 'none' && !svg.getAttribute('aria-hidden')) {
                      // It's not explicitly decorative, flag as potentially needing alt
                      // Let's classify as missing for simplicity here, though debatable
                      altStatus = 'missing';
                 } else {
                     // Decorative or hidden, skip for now? Or mark differently?
                     return; // Skip explicitly decorative/hidden SVGs for now
                 }
             } else if (alt && alt.trim() === '') {
                 altStatus = 'empty';
             } else {
                 // Has some label, consider present
                 altStatus = 'present';
             }
         } else {
             altStatus = 'present';
         }

        if (altStatus) { // Only add if we determined a relevant status
             images.push({
                type: 'svg',
                src: `SVG (approx. ${svg.getBoundingClientRect().width.toFixed(0)}x${svg.getBoundingClientRect().height.toFixed(0)}px)`, // Placeholder src
                altValue: alt,
                altStatus: altStatus,
                element: svg
             });
        }
    });

    // 3. Find elements with background images
    // This is more complex and potentially performance-intensive.
    // We look for elements with style.backgroundImage set to a url().
    // Note: This won't find background images set in external CSS without more work (e.g., computed styles).
    document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;

        if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
            // Basic check: Does this element have text content or accessible name?
            // If not, the background image might be conveying information.
            const accessibleName = el.getAttribute('aria-label') || el.innerText.trim();

            if (!accessibleName) {
                 // It has a background image and no obvious text/label.
                 // Treat as potentially missing alt text.
                 // Extract URL from url("...")
                 const urlMatch = bgImage.match(/url\("(.*?)"\)/) || bgImage.match(/url\((.*?)\)/);
                 const imageUrl = urlMatch ? urlMatch[1] : bgImage; // Fallback

                 images.push({
                     type: 'background',
                     src: imageUrl,
                     altValue: null,
                     altStatus: 'missing', // Background images inherently lack 'alt'
                     element: el
                 });
             }
        }
    });

    // Add unique IDs to elements for easier reference if they don't have one
    images.forEach((img, index) => {
        if (!img.element.id) {
            img.element.dataset.imageAnalyzerId = `ia-${index}`;
        }
        // We only need serializable data to send back
        // Remove direct element reference before sending
        img.elementId = img.element.id || img.element.dataset.imageAnalyzerId;
        delete img.element;
    });

    console.log("Found images:", images.length);
    return images;
}

// Function to toggle the display of alt text overlays
function toggleAltTextOverlay(show) {
    // Remove existing overlays first
    document.querySelectorAll(`.${ALT_DISPLAY_CLASS}`).forEach(overlay => overlay.remove());

    if (show) {
        // Inject CSS for the overlay if not already done
        if (!altDisplayOverlayStyle) {
            altDisplayOverlayStyle = document.createElement('style');
            altDisplayOverlayStyle.textContent = `
                .${ALT_DISPLAY_CLASS} {
                    position: absolute;
                    background-color: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 3px 6px;
                    font-size: 12px;
                    border-radius: 3px;
                    z-index: 99999; /* High z-index */
                    pointer-events: none; /* Allow clicking through */
                    font-family: sans-serif;
                    max-width: 200px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                [data-image-analyzer-id] {
                    position: relative; /* Needed for absolute positioning of child overlay */
                     outline: 1px dashed red; /* Optional: Highlight element */
                }
                img[data-image-analyzer-id] {
                     display: inline-block; /* Ensure position relative works well */
                }
            `;
            document.head.appendChild(altDisplayOverlayStyle);
        }

        // Get current image data again (or use cached if available and reliable)
        const images = findImages(); // Re-scan might be needed if DOM changed

        images.forEach(imgData => {
            const element = imgData.elementId.startsWith('ia-')
                ? document.querySelector(`[data-image-analyzer-id="${imgData.elementId}"]`)
                : document.getElementById(imgData.elementId);

            if (element) {
                 if (!element.style.position || element.style.position === 'static') {
                     // Avoid setting position relative if it's already something else?
                     // This might break layout slightly, but is needed for positioning.
                     // Consider checking existing position first if this causes issues.
                      element.style.position = 'relative';
                 }

                const overlay = document.createElement('div');
                overlay.classList.add(ALT_DISPLAY_CLASS);
                let overlayText = '';
                switch (imgData.altStatus) {
                    case 'present':
                        overlayText = `Alt: "${imgData.altValue}"`;
                        break;
                    case 'empty':
                        overlayText = 'Alt: "" (Empty)';
                        break;
                    case 'missing':
                        overlayText = 'Alt: Missing';
                        break;
                }
                overlay.textContent = overlayText;

                // Position the overlay (e.g., top-left corner)
                overlay.style.top = '0';
                overlay.style.left = '0';

                element.appendChild(overlay);
            }
        });
    }
     else {
         // Optionally remove the outline if added
          // document.querySelectorAll('[data-image-analyzer-id]').forEach(el => el.style.outline = '');
          // Remove position relative? Might be risky if original wasn't static.
     }
}

// Listen for messages from the DevTools panel or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);

    if (request.type === 'GET_IMAGE_DATA' || request.type === 'GET_IMAGE_DATA_DIRECT') {
        try {
            const imageData = findImages();
            sendResponse({ images: imageData });
        } catch (error) {
            console.error("Error finding images:", error);
            sendResponse({ error: error.message });
        }
        return true; // Indicates response will be sent asynchronously (though it's synchronous here)
    }
    else if (request.type === 'TOGGLE_ALT_DISPLAY') {
        try {
            toggleAltTextOverlay(request.show);
            sendResponse({ success: true });
        } catch (error) {
            console.error("Error toggling alt display:", error);
            sendResponse({ success: false, error: error.message });
        }
        return true; // Async response
    }

    // Handle other message types if needed
});

console.log("Image Accessibility Analyzer: Content script ready."); 