// Store the tab ID for the current panel context
let currentTabId = null;

// Function to update the current tab ID
function updateCurrentTabId(callback) {
  chrome.runtime.sendMessage({
    action: 'getPanelTabId'
  }, function(response) {
    if (chrome.runtime.lastError || !response || !response.success || !response.tabId) {
      console.error("Error getting fresh tab ID:", chrome.runtime.lastError?.message || response?.error || "Invalid response");
      if (callback) callback(false);
      return;
    }
    
    // Update with the fresh tab ID
    currentTabId = response.tabId;
    console.log(`[Panel] Updated current tab ID to: ${currentTabId}`);
    
    if (callback) callback(true);
  });
}

// Function to safely send messages via runtime, ensuring tab ID is set
function sendMessageToContentScript(message, callback) {
  if (!currentTabId) {
    // If we don't have a tab ID, get one first, then send the message
    updateCurrentTabId(function(success) {
      if (!success) {
        if (callback) callback({ success: false, error: "Could not determine current tab ID" });
        return;
      }
      
      // Now we have a tab ID, so send the message
      const messageWithTabId = { ...message, tabId: currentTabId };
      chrome.runtime.sendMessage(messageWithTabId, callback);
    });
  } else {
    // We already have a tab ID, so add it to the message and send
    const messageWithTabId = { ...message, tabId: currentTabId };
    chrome.runtime.sendMessage(messageWithTabId, callback);
  }
}

// Function to update the headings list
// *** REMOVE entire function updateHeadingsList ***
/*
function updateHeadingsList(headings) {
  // ... function content removed ...
}
*/

// Keep scroll handler (global is fine if it doesn't need local state)
function handleScrollButtonClick(event) {
     const imageId = event.target.getAttribute('data-id');
     try {
         // Use the new helper function
         sendMessageToContentScript({
             action: 'scrollToImage',
             imageId: imageId
         });
     } catch (error) { console.error('Failed to send scroll message:', error); }
}

// Initialize the panel
document.addEventListener('DOMContentLoaded', function() {
  // Request the Tab ID from the background script upon loading
  chrome.runtime.sendMessage({ action: 'getPanelTabId' }, (response) => {
    if (response && response.success && response.tabId) {
      currentTabId = response.tabId;
      console.log('Side Panel initialized for tab:', currentTabId);
      // Now that we have the tab ID, perform the initial data fetch
      initialFetch();
    } else {
      console.error('Could not get Tab ID for Side Panel:', response?.error);
      // Display an error message in the panel UI
      document.body.innerHTML = '<div class="error-message">Failed to initialize side panel. Please reload the extension or the page.</div>';
    }
  });

  // *** REMOVE heading-related buttons ***
  // const toggleButton = document.getElementById('toggleHighlighting');
  // const exportButton = document.getElementById('exportHeadings');
  const toggleImageButton = document.getElementById('toggleImageHighlighting');
  const exportImagesButton = document.getElementById('exportImagesData');
  const saveButton = document.getElementById('saveAsPNG');
  const toggleTabOrderButton = document.getElementById('toggleTabOrder');
  const toggleHighContrastButton = document.getElementById('toggleHighContrast');

  // *** Updated check to only look for remaining buttons ***
  if (/*!toggleButton || !exportButton ||*/ !toggleImageButton || !exportImagesButton || !saveButton || !toggleTabOrderButton || !toggleHighContrastButton) {
    console.error('Required buttons not found');
    return;
  }

  // *** REMOVE heading highlighting state ***
  // let isHighlightingEnabled = false;
  let isImageHighlightingEnabled = false;
  let isTabOrderVisualizationEnabled = false;
  
  // Define SVG icons
  const eyeOpenSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="button-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  const eyeClosedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="button-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
  const refreshSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="button-icon"><path d="M21 12a9 9 0 0 1-9 9c-4.97 0-9-4.03-9-9s4.03-9 9-9"></path><polyline points="21 3 21 9 15 9"></polyline><path d="M21 9C21 9 21 9 21 9"></path></svg>`;
  
  // Initialize button texts with icons
  toggleImageButton.innerHTML = `${eyeClosedSvg} Enable Alt Text Display`;
  exportImagesButton.innerHTML = `${refreshSvg} Reload Page & Data`;

  // Toggle image alt text display
  toggleImageButton.addEventListener('click', function() {
    isImageHighlightingEnabled = !isImageHighlightingEnabled;
    
    // Update button with text and icon
    toggleImageButton.innerHTML = isImageHighlightingEnabled 
      ? `${eyeOpenSvg} Disable Alt Text Display` 
      : `${eyeClosedSvg} Enable Alt Text Display`;
    
    toggleImageButton.classList.toggle('active');
    
    // Use the new helper function
    sendMessageToContentScript({
      action: 'toggleImageHighlighting',
      enabled: isImageHighlightingEnabled
    }, function(response) {
      if (chrome.runtime.lastError || (response && !response.success)) {
        console.error('Error toggling image highlighting:', chrome.runtime.lastError?.message || response?.error);
        // Revert the button state if there was an error
        isImageHighlightingEnabled = !isImageHighlightingEnabled;
        
        // Update button with text and icon
        toggleImageButton.innerHTML = isImageHighlightingEnabled 
          ? `${eyeOpenSvg} Disable Alt Text Display` 
          : `${eyeClosedSvg} Enable Alt Text Display`;
          
        toggleImageButton.classList.toggle('active');
      }
    });
  });
  
  // Toggle tab order visualization
  toggleTabOrderButton.addEventListener('click', function() {
    console.log('Tab order toggle button clicked');
    isTabOrderVisualizationEnabled = !isTabOrderVisualizationEnabled;
    toggleTabOrderButton.textContent = isTabOrderVisualizationEnabled ? 'Hide Tab Order' : 'Toggle Tab Order';
    toggleTabOrderButton.classList.toggle('active');
    
    // Use the new helper function
    sendMessageToContentScript({
      action: 'toggleTabOrder'
    }, function(response) {
      console.log('Tab order toggle response:', response);
      if (chrome.runtime.lastError || (response && !response.success)) {
        console.error('Error toggling tab order visualization:', chrome.runtime.lastError?.message || response?.error);
        // Revert the button state if there was an error
        isTabOrderVisualizationEnabled = !isTabOrderVisualizationEnabled;
        toggleTabOrderButton.textContent = isTabOrderVisualizationEnabled ? 'Hide Tab Order' : 'Toggle Tab Order';
        toggleTabOrderButton.classList.toggle('active');
      }
    });
  });
  
  // Toggle high contrast mode
  toggleHighContrastButton.addEventListener('click', function() {
    console.log('High contrast toggle button clicked');
    
    // Use the new helper function (sends to background, which needs tabId)
    sendMessageToContentScript({
      action: 'toggleHighContrast'
      // Background script will use the tabId included by sendMessageToContentScript
    }, function(response) {
      // Note: Background detach might close port, leading to lastError.
      // We might need more robust state checking or rely on optimistic update.
      if (chrome.runtime.lastError) {
         console.warn('Error/port closed toggling high contrast:', chrome.runtime.lastError.message);
         // Assuming toggle worked despite closed port - keep UI state
         toggleHighContrastButton.classList.toggle('active'); // Toggle based on optimistic assumption
      } else if (response && response.success) {
        console.log('High contrast toggled successfully');
        toggleHighContrastButton.classList.toggle('active', response.enabled); // Set based on actual response
      } else {
        console.error('Failed to toggle high contrast:', response?.error);
        alert('Failed to toggle high contrast: ' + (response?.error || 'Unknown error'));
        // Don't toggle UI state if it failed explicitly
      }
    });
     // Optimistic UI update immediately
     // toggleHighContrastButton.classList.toggle('active'); // Consider if optimistic update is desired
  });
  
  // Export headings
  // *** REMOVE exportButton event listener ***
  /*
  exportButton.addEventListener('click', function() {
    // ... listener content removed ...
  });
  */

  // Export images data  exportImagesButton
  exportImagesButton.addEventListener('click', function() {
    // Update button text to show loading state
    exportImagesButton.innerHTML = `${refreshSvg} Reloading...`;
    exportImagesButton.disabled = true;
    
    // Always get a fresh tab ID before reloading
    updateCurrentTabId(function(success) {
      if (!success) {
        exportImagesButton.innerHTML = `${refreshSvg} Reload Failed - Retry`;
        exportImagesButton.disabled = false;
        alert('Failed to identify current tab. Please try again.');
        return;
      }
      
      // Send reload command to background script with the fresh tab ID
      chrome.runtime.sendMessage({
        action: 'reloadTab',
        tabId: currentTabId
      }, function(response) {
        // --- Restore button state immediately on confirmation ---
        exportImagesButton.innerHTML = `${refreshSvg} Reload Page & Data`;
        exportImagesButton.disabled = false;
        // --- End Restore ---

        if (chrome.runtime.lastError || (response && !response.success)) {
          console.error('[Panel] Error reloading tab:', chrome.runtime.lastError?.message || response?.error);
          // Keep button enabled, maybe show error briefly or rely on alert
          alert('Failed to reload page: ' + (chrome.runtime.lastError?.message || response?.error || 'Unknown error'));
          return;
        }

        console.log('[Panel] Page reload initiated successfully by background.');

        
        // Wait for the page to finish loading before refreshing panel data
        // setTimeout(() => {
        //   // Reset button state
        //   exportImagesButton.innerHTML = `${refreshSvg} Reload Page & Data`;
        //   exportImagesButton.disabled = false;
          
        //   // Clear any cached original images data to force a complete refresh
        //   const imagesList = document.getElementById('imagesList');
        //   if (imagesList && imagesList.dataset.originalImages) {
        //     delete imagesList.dataset.originalImages;
        //   }
          
        //   // Refresh the panel data
        //   console.log('[Panel] Page reloaded, refreshing panel data...');
        //   fetchAndUpdateData();
        // }, 1500); // Wait 1.5 seconds for page to load

		  // --- Optionally show a temporary message ---
		  const imagesList = document.getElementById('imagesList');
		  if (imagesList) {
			  imagesList.innerHTML = '<div class="loading-message">Page reloading, waiting for panel refresh...</div>';
		  }
		  // --- End Optional Message ---
		  
      });
    });
  });
  
  // Save as PNG
  saveButton.addEventListener('click', function() {
    if (!currentTabId) {
      alert('Error: Side panel not initialized. Cannot save PNG.');
      return;
    }
    try {
      // Show loading indicator
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'message-overlay';
      loadingMsg.textContent = 'Preparing to capture screenshot...';
      document.body.appendChild(loadingMsg);
      
      const tabId = currentTabId;

      // Get original scroll position first to restore it later
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
          return { x: window.scrollX, y: window.scrollY };
        }
      }, function(originalScrollResults) {
        const originalScroll = originalScrollResults && originalScrollResults[0] ? 
                              originalScrollResults[0].result : { x: 0, y: 0 };
        
        // Get the page dimensions
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: getPageDimensions
        }, function(results) {
          if (chrome.runtime.lastError || !results || !results[0] || !results[0].result) {
            document.body.removeChild(loadingMsg);
            alert('Failed to get page dimensions: ' + (chrome.runtime.lastError?.message || 'No result returned'));
            return;
          }
          
          const dims = results[0].result;
          const viewportHeight = dims.viewportHeight;
          const totalHeight = dims.totalHeight;
          const totalWidth = dims.totalWidth;
  
          console.log('Page dimensions:', dims);
          
          // Create a canvas to stitch the screenshots together
          const canvas = document.createElement('canvas');
          canvas.width = totalWidth;
          canvas.height = totalHeight;
          const ctx = canvas.getContext('2d');
          
          // Modify fixed elements first
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: handleFixedElements,
            args: [true] // hide fixed elements
          }, function() {
            // First scroll to top
            chrome.scripting.executeScript({
              target: { tabId: tabId },
              function: () => {
                window.scrollTo(0, 0);
                return true;
              }
            }, function() {
              // Wait for page to stabilize after scroll
              setTimeout(() => {
                // Set up capture parameters - smaller steps for better accuracy
                const sliceHeight = Math.floor(viewportHeight * 0.8); // 80% of viewport - less overlap for less duplication
                const totalSlices = Math.ceil(totalHeight / sliceHeight) + 1; // +1 to ensure we get the bottom
                let currentSlice = 0;
                
                // Array to store all captured images before compositing
                const capturedImages = [];
                
                loadingMsg.textContent = `Starting capture process (0/${totalSlices})...`;
                
                function captureSlice() {
                  if (currentSlice >= totalSlices) {
                    // All slices captured, now composite them
                    composeImage();
                    return;
                  }
                  
                  const scrollPos = currentSlice * sliceHeight;
                  // Don't scroll beyond the page
                  const adjustedScrollPos = Math.min(scrollPos, totalHeight - viewportHeight);
                  
                  // Update loading message
                  loadingMsg.textContent = `Capturing slice ${currentSlice + 1}/${totalSlices}...`;
                  
                  // Scroll to position
                  chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    function: (y) => {
                      window.scrollTo(0, y);
                      // Return actual scroll position and viewport height for accurate placement
                      return {
                        scrollY: window.scrollY,
                        viewportHeight: window.innerHeight
                      };
                    },
                    args: [adjustedScrollPos]
                  }, function(scrollResults) {
                    // Wait for content to render after scroll
                    setTimeout(() => {
                      // Capture the current viewport
                      chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
                        if (chrome.runtime.lastError) {
                          console.error('Error capturing tab:', chrome.runtime.lastError.message);
                          // Skip this slice and continue
                          currentSlice++;
                          captureSlice();
                          return;
                        }
                        
                        // Get the actual scroll position for accurate placement
                        const position = scrollResults && scrollResults[0] && scrollResults[0].result 
                          ? scrollResults[0].result.scrollY 
                          : adjustedScrollPos;
                        
                        // Store the image with its correct position
                        capturedImages.push({
                          dataUrl: dataUrl,
                          position: position
                        });
                        
                        // Move to next slice
                        currentSlice++;
                        captureSlice();
                      });
                    }, 400); // Increased wait time for better rendering
                  });
                }
                
                function composeImage() {
                  loadingMsg.textContent = 'Compositing final image...';
                  
                  // Sort captured images by position (lowest to highest)
                  capturedImages.sort((a, b) => a.position - b.position);
                  
                  // Function to load and draw each image
                  function loadAndDrawImage(index) {
                    if (index >= capturedImages.length) {
                      // All images drawn, finalize and save
                      finalize();
                      return;
                    }
                    
                    const capture = capturedImages[index];
                    const img = new Image();
                    
                    img.onload = function() {
                      // Draw this image at its exact scroll position on the canvas
                      ctx.drawImage(img, 0, capture.position);
                      
                      // Process the next image
                      loadAndDrawImage(index + 1);
                    };
                    
                    img.onerror = function() {
                      console.error('Failed to load captured image at position', capture.position);
                      // Continue with the next image despite the error
                      loadAndDrawImage(index + 1);
                    };
                    
                    img.src = capture.dataUrl;
                  }
                  
                  // Start loading and drawing images
                  loadAndDrawImage(0);
                }
                
                function finalize() {
                  // Restore fixed elements and scroll position
                  chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    function: (originalScroll) => {
                      // Restore fixed/sticky elements
                      document.querySelectorAll('*').forEach(el => {
                        if (el.hasAttribute('data-original-display') || 
                            el.hasAttribute('data-original-position') ||
                            el.hasAttribute('data-original-visibility')) {
                          
                          if (el.hasAttribute('data-original-display')) {
                            el.style.display = el.getAttribute('data-original-display');
                            el.removeAttribute('data-original-display');
                          }
                          
                          if (el.hasAttribute('data-original-position')) {
                            el.style.position = el.getAttribute('data-original-position');
                            el.removeAttribute('data-original-position');
                          }
                          
                          if (el.hasAttribute('data-original-visibility')) {
                            el.style.visibility = el.getAttribute('data-original-visibility');
                            el.removeAttribute('data-original-visibility');
                          }
                        }
                      });
                      
                      // Restore original scroll position
                      window.scrollTo(originalScroll.x, originalScroll.y);
                      return true;
                    },
                    args: [originalScroll]
                  }, function() {
                    // Remove loading indicator
                    document.body.removeChild(loadingMsg);
                    
                    // Save the final image
                    const finalImage = canvas.toDataURL('image/png');
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    
                    chrome.downloads.download({
                      url: finalImage,
                      filename: `page-${timestamp}.png`,
                      saveAs: true
                    });
                  });
                }
                
                // Start the capture process
                captureSlice();
              }, 300); // Wait for initial scroll to stabilize
            });
          });
        });
      });
    } catch (error) {
      console.error('Failed to save as PNG:', error);
      alert('Error: ' + error.message);
      
      // Remove loading indicator if it exists
      const loadingMsg = document.querySelector('.message-overlay');
      if (loadingMsg && document.body.contains(loadingMsg)) {
        document.body.removeChild(loadingMsg);
      }
    }
  });
  
  // Function to get page dimensions
  function getPageDimensions() {
    return {
      totalWidth: Math.max(
        document.documentElement.scrollWidth, 
        document.body.scrollWidth,
        document.documentElement.offsetWidth,
        document.body.offsetWidth,
        window.innerWidth
      ),
      totalHeight: Math.max(
        document.documentElement.scrollHeight, 
        document.body.scrollHeight,
        document.documentElement.offsetHeight,
        document.body.offsetHeight,
        window.innerHeight
      ),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
  }
  
  // Function to fetch and update data
  function fetchAndUpdateData() {
    // Request images data using the helper function
    try {
      const actionName = 'getImagesData';
      console.log(`Panel requesting: ${actionName}`);
      sendMessageToContentScript({ action: actionName }, function(response) {
        if (chrome.runtime.lastError || (response && !response.success)) {
          console.error(`Error fetching ${actionName}:`, chrome.runtime.lastError?.message || response?.error);
          updateImagesList(null, `Error fetching data: ${chrome.runtime.lastError?.message || response?.error || 'Unknown error'}`);
          return;
        }
        console.log(`Panel received response for ${actionName}:`, response);
        if (response.images) {
          updateImagesList(response.images);
        } else {
          console.error(`Invalid response for ${actionName}`, response);
           updateImagesList(null, 'Invalid response received.'); // Show error/empty state
        }
      });
    } catch (error) {
      console.error(`Failed to send fetch ${actionName} message:`, error);
      updateImagesList(null, `Failed to request data: ${error.message}`);
    }
  }
  
  // Check if content script is ready
  function checkContentScriptReady(callback, errorCallback) {
    chrome.tabs.sendMessage(chrome.devtools.inspectedWindow.tabId, { 
      action: 'ping' 
    }, function(response) {
      if (chrome.runtime.lastError || !response || !response.success) {
        if (errorCallback) errorCallback(chrome.runtime.lastError?.message || 'No response from content script');
        return;
      }
      callback();
    });
  }
  
  // Inject content script if needed
  function injectContentScriptIfNeeded(callback) {
    chrome.devtools.inspectedWindow.eval(
      '!!window.__HEADINGS_PLUGIN_INITIALIZED',
      function(result, isException) {
        if (isException || !result) {
          // Content script not initialized, try to execute it
          chrome.scripting.executeScript({
            target: { tabId: chrome.devtools.inspectedWindow.tabId },
            files: ['content.js']
          }, function() {
            if (chrome.runtime.lastError) {
              console.error('Failed to inject content script:', chrome.runtime.lastError.message);
            }
            // Wait a bit for the script to initialize
            setTimeout(callback, 500);
          });
        } else {
          // Script is already there
          callback();
        }
      }
    );
  }
  
  // Initial data fetch - simplified, now called after getting tabId
  function initialFetch() {
    console.log(`Initial fetch running...`);
    // Directly fetch data, assuming content script is loaded via manifest
    fetchAndUpdateData();
  }

  // *** DECLARE the variable HERE, inside DOMContentLoaded ***
  let currentPopover = null;

  // *** DEFINE the helper functions HERE, inside DOMContentLoaded ***
  function closeHtmlPopover() {
      // This function can now see the 'currentPopover' declared above
      if (currentPopover && currentPopover.parentNode) {
          currentPopover.parentNode.removeChild(currentPopover);
      }
      currentPopover = null; // Resets the variable in this scope
      // It can also see handleOutsidePopoverClick defined below
      document.removeEventListener('click', handleOutsidePopoverClick, true);
  }

  function handleOutsidePopoverClick(event) {
      // This function can now see 'currentPopover' and 'closeHtmlPopover'
      if (currentPopover && !currentPopover.contains(event.target) && !event.target.closest('.inspect-btn')) {
           closeHtmlPopover();
      }
  }
  // *** End Popover Helpers Definition ***

  // *** DEFINE Helper functions for image fallback HERE, inside DOMContentLoaded ***
  function initiateImageFallback(imageId, imageUrl) {
      const container = document.querySelector(`.image-item[data-image-id="${imageId}"]`);
      if (!container) return;

      // *** Target thumbContainer directly for potential error messages ***
      const thumbContainer = container.querySelector('.image-thumb');
      if (!thumbContainer) return; // Need this to display errors

      if (!imageUrl) {
           console.error(`Cannot load fallback for ${imageId}: Image URL is missing.`);
           // Display error directly in thumb container
           thumbContainer.innerHTML = `<div class='fallback-error' title='Missing URL'>[No URL]</div>`;
           return;
      }

      // Optional: Indicate loading state directly in the thumb container
      thumbContainer.innerHTML = `<div class='fallback-loading' title='Loading fallback...'>[...]</div>`;

      // Remove any previous error messages within the container
      container.querySelectorAll('.load-error-message').forEach(el => el.remove());
      container.querySelectorAll('.base64-display').forEach(el => el.remove()); // Also clear previous success

      // Send message to content script via background script
      console.log(`Panel requesting fetchImageAsBase64 for ID: ${imageId}, URL: ${imageUrl}`);
      // Use the new helper function
      sendMessageToContentScript({
          action: 'fetchImageAsBase64',
          imageId: imageId,
          imageUrl: imageUrl
      }, response => {
          // Acknowledgement handler (less critical now, but good for debug)
          if (chrome.runtime.lastError) {
              console.error(`Error sending fetchImageAsBase64 message for ${imageId}:`, chrome.runtime.lastError.message);
              // Display error in thumb container if sending fails
              thumbContainer.innerHTML = `<div class='fallback-error' title='${chrome.runtime.lastError.message}'>[Send Err]</div>`;
              return;
          }
          if (!response || !response.success) {
              console.error(`Fetch initiation failed for ${imageId}:`, response?.message);
              // Display error in thumb container if initiation fails
              thumbContainer.innerHTML = `<div class='fallback-error' title='${response?.message || 'Unknown init error'}'>[Init Err]</div>`;
          } else {
              console.log(`Image fetch request acknowledged successfully for ${imageId}. Waiting for data...`);
              // Loading state already set, just wait for the actual data message
          }
      });
  }
  // *** End Image Fallback Trigger Function ***

  // Add this at the top of panel.js to cache successful base64 conversions
  const base64Cache = new Map();

  // Update the message listener to cache successful conversions
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[Panel] Received message:", message.action, message);

    if (message.action === 'fetchedImageBase64' && message.imageId) {
        console.log(`[DEBUG] Received base64 response for ${message.imageId}:`, {
            success: message.success,
            hasData: !!message.base64Data,
            error: message.error || 'none'
        });
        
        const container = document.querySelector(`.image-item[data-image-id="${message.imageId}"]`);
        if (!container) {
            console.warn(`[DEBUG] Container not found for image ${message.imageId}`);
            return;
        }

        const thumbContainer = container.querySelector('.image-thumb');
        if (!thumbContainer) {
            console.warn(`[DEBUG] Thumb container not found for image ${message.imageId}`);
            return;
        }

        if (message.success && message.base64Data) {
            console.log(`[DEBUG] Creating new image preview for ${message.imageId}`);
            
            // Create image element before modifying container
            const imgPreview = document.createElement('img');
            imgPreview.src = message.base64Data;
            imgPreview.alt = "thumbnail (fallback)";
            imgPreview.width = 40;
            imgPreview.height = 40;
            imgPreview.style.objectFit = 'contain';
            
            // Set up error handler before adding to DOM
            imgPreview.onerror = () => {
                console.error(`[DEBUG] Base64 preview failed to load for ${message.imageId}`);
                if (thumbContainer.contains(imgPreview)) {
                    thumbContainer.innerHTML = `<div class='fallback-error' title='Base64 render failed'>[Render Err]</div>`;
                }
            };

            // Set up load handler to confirm success
            imgPreview.onload = () => {
                console.log(`[DEBUG] Base64 preview successfully loaded for ${message.imageId}`);
            };
            
            // Only clear container after creating the new image
            thumbContainer.innerHTML = '';
            thumbContainer.appendChild(imgPreview);

            // Cache the successful conversion
            base64Cache.set(message.imageId, message.base64Data);

        } else {
            // Only show error if we don't already have a successful image
            const existingImage = thumbContainer.querySelector('img');
            if (!existingImage) {
                const errorMessage = message.error || 'Unknown error';
                console.error(`[DEBUG] Failed to load image ${message.imageId}:`, errorMessage);
                thumbContainer.innerHTML = `<div class='fallback-error' title='${errorMessage}'>[Load Err]</div>`;
            } else {
                console.log(`[DEBUG] Keeping existing image for ${message.imageId} despite error`);
            }
        }
    } else if (message.action === 'updateImages') {
      // Handle image data updates pushed from the content script (via background)
      console.log("[Panel] Handling updateImages message");
      if (message.images) {
        updateImagesList(message.images);
      } else {
        console.warn("[Panel] updateImages message received without images data.");
         updateImagesList(null, 'Received empty update.'); // Show empty/error state
      }
    }
    // Add other message handlers if needed

    // Indicate that the listener doesn't send an asynchronous response here
    // unless one of the conditions explicitly needs it.
    return false;
  });

  // Optional: Clear cache when panel is closed
  window.addEventListener('unload', () => {
    base64Cache.clear();
  });

  // *** DEFINE updateImagesList HERE, inside DOMContentLoaded ***
  function updateImagesList(images) {
	console.log(`%c[Panel] updateImagesList called with ${images ? images.length : 0} images.`, 'color: blue; font-weight: bold;');

    const imagesList = document.getElementById('imagesList');
    const panelBody = document.body;
    if (!imagesList || !panelBody) return;

    imagesList.innerHTML = ''; // Clear previous results immediately

    if (!images || !Array.isArray(images) || images.length === 0) {
        imagesList.innerHTML = '<div class="no-images">Reload the page. (Possible error. Or no images at all...)</div>';
        
        // Reset all count statistics to zero
        const totalImages = document.getElementById('totalImages');
        const missingAltCount = document.getElementById('missingAltCount');
        const emptyAltCount = document.getElementById('emptyAltCount');
        const withAltCountElement = document.getElementById('withAltCount');
        
        if (totalImages) totalImages.textContent = '0'; // Will show total count of all images
        if (missingAltCount) missingAltCount.textContent = '0'; // Only counts normal images
        if (emptyAltCount) emptyAltCount.textContent = '0'; // Only counts normal images
        if (withAltCountElement) withAltCountElement.textContent = '0'; // Only counts normal images
        
        return;
    }

    // Update the alt counts immediately when images are loaded
    updateAltCounts(images);

    // Create filter controls if they don't exist
    let filterControls = document.getElementById('imageFilters');
    if (!filterControls) {
        filterControls = document.createElement('div');
        filterControls.id = 'imageFilters';
        filterControls.className = 'filter-controls';
        
        // Define SVG icons for eyes open/closed
        const eyeOpenSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const eyeClosedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

        filterControls.innerHTML = `
            <div class="filter-group">
                <label>Image Type:</label>
                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="regular">${eyeOpenSvg} Regular Images</button>
                    <button class="filter-btn active" data-filter="svg">${eyeOpenSvg} SVGs</button>
                    <button class="filter-btn active" data-filter="background">${eyeOpenSvg} Background Images</button>
                </div>
            </div>
            <div class="filter-group">
                <label>Alt Text:</label>
                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="has-alt">${eyeOpenSvg} Has Alt Text</button>
                    <button class="filter-btn active" data-filter="empty-alt">${eyeOpenSvg} Empty Alt</button>
                    <button class="filter-btn active" data-filter="no-alt">${eyeOpenSvg} No Alt Attribute</button>
                </div>
            </div>
            <div class="filter-group">
                <label>Other:</label>
                <div class="filter-buttons">
                    <button class="filter-btn" data-filter="in-link">${eyeClosedSvg} In Link/Button</button>
                    <button class="filter-btn" data-filter="not-in-link">${eyeClosedSvg} Not in Link/Button</button>
                    <button class="filter-btn" data-filter="aria-hidden">${eyeClosedSvg} ARIA Hidden</button>
                    <button class="filter-btn" data-filter="no-aria-hidden">${eyeClosedSvg} No ARIA Hidden</button>
                    <button class="filter-btn" data-filter="focusable-false">${eyeClosedSvg} Focusable False</button>
                </div>
            </div>
        `;

        // Add filter styles (assuming this is correct)
        if (!document.getElementById('filterStyles')) {
            const style = document.createElement('style');
            style.id = 'filterStyles';
            style.textContent = `
                .filter-controls { padding: 10px; background: #f5f5f5; border-bottom: 1px solid #ddd; margin-bottom: 10px; }
                .filter-group { margin-bottom: 8px; }
                .filter-group:last-child { margin-bottom: 0; }
                .filter-group label { display: block; margin-bottom: 4px; font-weight: bold; color: #666; }
                .filter-buttons { display: flex; flex-wrap: wrap; gap: 4px; }
                .filter-btn { 
                    padding: 4px 8px; 
                    border: 1px solid #ccc; 
                    background: #bf2020; 
                    color: white;
                    border-radius: 4px; 
                    cursor: pointer; 
                    font-size: 12px; 
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                .filter-btn:hover { 
                    background:rgb(152, 25, 25); 
                    box-shadow: 0 0 3px rgba(0,0,0,0.2);
                }
                .filter-btn.active { 
                    background:rgb(21, 107, 25); 
                    color: white; 
                    border-color: #198c1f;
                    box-shadow: 0 0 3px rgba(0,0,0,0.2);
                }
                .eye-icon { 
                    margin-right: 4px; 
                    stroke: white; 
                }
            `;
            document.head.appendChild(style);
        }

        imagesList.parentNode.insertBefore(filterControls, imagesList);

        // Add click handlers to filter buttons
        filterControls.querySelectorAll('.filter-btn').forEach(btn => {
            // Initialize with the correct eye icon
            const isActive = btn.classList.contains('active');
            updateButtonEyeIcon(btn, isActive);
            
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
                // Update the eye icon based on active state
                const isActive = btn.classList.contains('active');
                updateButtonEyeIcon(btn, isActive);
                updateFilteredImages(); // Call the filtering function on click
            });
        });
    }

    // Store the original images for filtering
    // Ensure this happens ONLY ONCE when images are first loaded
    if (!imagesList.dataset.originalImages) {
        imagesList.dataset.originalImages = JSON.stringify(images);
    }

    // Trigger filtering immediately
    updateFilteredImages();
  }

  // *** NEW: Separate function to render the filtered images ***
  function renderFilteredImages(filteredImages) {
	console.log(`%c[Panel] renderFilteredImages called with ${filteredImages.length} images.`, 'color: green; font-weight: bold;');

    const imagesList = document.getElementById('imagesList');
    const panelBody = document.body; // Needed for popover positioning
    const originalImagesFull = JSON.parse(imagesList.dataset.originalImages || '[]'); // Get full list for popover data

    imagesList.innerHTML = ''; // Clear current list content

    if (filteredImages.length === 0) {
        imagesList.innerHTML = '<div class="no-images">No images match the selected filters</div>';
        return;
    }

    const svgErrorPlaceholderHTML = `<div class='svg-placeholder error' title='SVG Preview Failed'>[SVG ERR]</div>`;

    filteredImages.forEach(item => {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.dataset.imageId = item.id;

        // --- Thumbnail Creation ---
        const thumbContainer = document.createElement('div');
        thumbContainer.className = 'image-thumb';

        if (item.isSvg) {
            const previewSvgSrc = item.previewSrc || '';
            if (previewSvgSrc && previewSvgSrc.startsWith('data:image/svg+xml')) {
                thumbContainer.innerHTML = `<img src="${previewSvgSrc}" alt="SVG preview" class="svg-preview">`;
            } else if (previewSvgSrc) {
                try {
                    const svgBase64 = btoa(previewSvgSrc);
                    thumbContainer.innerHTML = `<img src="data:image/svg+xml;base64,${svgBase64}" alt="SVG preview" class="svg-preview">`;
                } catch (error) {
                    console.error('Error creating base64 SVG:', error);
                    thumbContainer.innerHTML = svgErrorPlaceholderHTML;
                }
            } else {
                thumbContainer.innerHTML = svgErrorPlaceholderHTML;
            }
        } else if (item.isImg || item.isBackgroundImage) {
            const img = document.createElement('img');
            const initialSrc = item.previewSrc || '';
            const fallbackUrl = item.originalUrl || '';
            const imageId = item.id;

            img.src = initialSrc;
            img.alt = item.isBackgroundImage ? "Background image thumbnail" : "thumbnail";
            img.width = 40; img.height = 40; img.loading = "lazy"; img.className = "image-thumb-preview";

            img.onerror = () => {
                if (fallbackUrl) {
                    console.log(`[DEBUG] Preview failed (${initialSrc.substring(0,60)}...), attempting fallback: ${fallbackUrl.substring(0,60)}`);
                    thumbContainer.innerHTML = `<div class='fallback-loading' title='Loading fallback: ${fallbackUrl.substring(0,60)}...'>[...]</div>`;
                    initiateImageFallback(imageId, fallbackUrl); // Use the helper function
                } else {
                    console.error(`[DEBUG] Image load failed for ${imageId}, and no fallback URL provided.`);
                    thumbContainer.innerHTML = `<div class='fallback-error' title='Preview & Fallback failed: No Original URL'>[Load Err]</div>`;
                }
            };
            thumbContainer.appendChild(img);
        }

        let finalThumbnailElement = thumbContainer;
        if (item.originalUrl && !item.isSvg) {
             const link = document.createElement('a');
             link.href = item.originalUrl;
             link.target = "_blank";
             link.title = `Open original image in new tab: ${item.originalUrl.substring(0, 100)}...`;
             link.appendChild(thumbContainer);
             finalThumbnailElement = link;
        }
        // --- End Thumbnail Creation ---

        const imageRow = document.createElement('div');
        imageRow.className = 'image-row';
        imageRow.dataset.imageId = item.id;
        imageRow.appendChild(finalThumbnailElement);

        // --- Image Info Creation ---
        const imageInfo = document.createElement('div');
        imageInfo.className = 'image-info';
        let statusClass = 'info';
        if (item.altStatus?.includes('Missing')) statusClass = 'error';
        else if (item.altStatus?.includes('Empty')) statusClass = 'warning';

        let linkDetailsHtml = '';
        if (item.ancestorLinkInfo?.isLink) {
            const info = item.ancestorLinkInfo;
            linkDetailsHtml = `
                <span class="detail-label">In Link/button:</span> <span class="detail-value">Yes</span><br>
                ${info.linkTextContent ? `<span class="detail-label indent"> Link/button text:</span> <span class="detail-value">${info.linkTextContent}</span><br>` : ''}
                ${info.linkTitle ? `<span class="detail-label indent"> Link/button title:</span> <span class="detail-value">${info.linkTitle}</span><br>` : ''}
                ${info.linkAriaLabel ? `<span class="detail-label indent"> Link/button aria-label:</span> <span class="detail-value">${info.linkAriaLabel}</span><br>` : ''}
                ${info.linkLabelledByText ? `<span class="detail-label indent"> Link/button labelledby:</span> <span class="detail-value">${info.linkLabelledByText}</span><br>` : ''}
                ${info.linkDescribedByText ? `<span class="detail-label indent"> Link/button describedby:</span> <span class="detail-value">${info.linkDescribedByText}</span><br>` : ''}
            `;
        }

        let backgroundImagesHtml = '';
        if (item.isBackgroundImage && item.backgroundImageUrls?.length) {
            backgroundImagesHtml = `<span class="detail-label">Background Images:</span><br>`;
            item.backgroundImageUrls.forEach((url, index) => {
                const shortUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;
                backgroundImagesHtml += `<span class="detail-label indent">URL ${index + 1}:</span> <span class="detail-value src" title="${url}">${shortUrl}</span><br>`;
            });
        }

        imageInfo.innerHTML = `
          <div class="image-main-status ${statusClass}" title="${item.alt || item.svgTitleDesc || ''}">
             ${item.altStatus || 'Status N/A'}
          </div>
          <div class="image-details">
             ${item.isInShadowDom ? `<span class="detail-label">In Shadow DOM:</span> <span class="detail-value">Yes</span><br>` : ''}
             ${item.isImg || item.isBackgroundImage ?
                `<span class="detail-label">Original URL:</span>
                 <span class="detail-value src" title="${item.originalUrl || ''}">
                    ${item.originalUrl ? (item.originalUrl.length > 60 ? item.originalUrl.substring(0, 57) + '...' : item.originalUrl) : 'N/A'}
                 </span><br>`
                : ''
             }
             ${item.isSvg && item.hasUseTag && (item.absoluteUseHref || item.useHref) ?
               `<span class="detail-label">Use Href:</span>
                <span class="detail-value" title="${item.absoluteUseHref || item.useHref}">
                  ${(item.absoluteUseHref || item.useHref).length > 60 ?
                    (item.absoluteUseHref || item.useHref).substring(0, 57) + '...' :
                    (item.absoluteUseHref || item.useHref)
                  }
                </span><br>` : ''}
             ${item.title ? `<span class="detail-label">Title:</span> <span class="detail-value">${item.title}</span><br>` : ''}
             ${item.role ? `<span class="detail-label">Role:</span> <span class="detail-value">${item.role}</span><br>` : ''}
             ${item.isAriaHidden ? `<span class="detail-label">ARIA Hidden:</span> <span class="detail-value">true</span><br>` : ''}
             ${item.isFocusableFalse ? `<span class="detail-label">Focusable:</span> <span class="detail-value">false</span><br>` : ''}
             ${item.ariaLabel ? `<span class="detail-label">ARIA Label:</span> <span class="detail-value">${item.ariaLabel}</span><br>` : ''}
             ${item.labelledByText ? `<span class="detail-label">Labelled By Text:</span> <span class="detail-value">${item.labelledByText}</span><br>` : ''}
             ${item.describedByText ? `<span class="detail-label">Described By Text:</span> <span class="detail-value">${item.describedByText}</span><br>` : ''}
             ${item.figureInfo?.inFigureElement ? `<span class="detail-label">In Figure:</span> <span class="detail-value">Yes ${item.figureInfo.hasFigcaption ? `(Figcaption: ${item.figureInfo.figcaptionText})` : '(No Figcaption)'}</span><br>` : ''}
             ${linkDetailsHtml}
             ${backgroundImagesHtml}
          </div>
        `;
        // --- End Image Info Creation ---

        // --- Actions Creation ---
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'heading-actions';
        actionsDiv.innerHTML = `
          <button class="scroll-btn" data-id="${item.id}">Scroll</button>
          <button class="inspect-btn" data-id="${item.id}">Inspect</button>
        `;
        actionsDiv.querySelector('.scroll-btn').addEventListener('click', handleScrollButtonClick);
        actionsDiv.querySelector('.inspect-btn').addEventListener('click', (event) => {
            closeHtmlPopover(); // Close any existing popover
            const button = event.target;
            const imageId = button.getAttribute('data-id');
            const imageData = originalImagesFull.find(img => img.id === imageId);

            if (!imageData) { console.error('No image data found for ID:', imageId); alert('Could not find data for this image.'); return; }

            let htmlToShow = ''; let popoverTitle = '';
            if (imageData.isBackgroundImage) {
                htmlToShow = imageData.outerHTML; popoverTitle = 'Background Image Element HTML';
            } else if (imageData.ancestorLinkInfo?.isLink && imageData.ancestorLinkOuterHTML) {
                htmlToShow = imageData.ancestorLinkOuterHTML; popoverTitle = 'Ancestor Link/Button HTML';
            } else {
                htmlToShow = imageData.outerHTML; popoverTitle = 'Image Element HTML';
            }

            if (!htmlToShow) { console.error('No HTML content available for image ID:', imageId); alert('No HTML content available for this element.'); return; }

            // Create and style the popover
            currentPopover = document.createElement('div');
            currentPopover.id = 'html-popover'; currentPopover.className = 'html-popover';
            currentPopover.style.cssText = `
                visibility: hidden;
                background-color: white; /* Restore background */
                border: 1px solid #ccc; /* Restore border */
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* Restore shadow */
                padding: 10px;
                border-radius: 4px;
                max-width: 430px; /* Reduced slightly */
                max-height: 300px;
                overflow: auto;
                z-index: 1000;
                position: absolute; /* Ensure popover itself is positioned */
            `;

            // Format HTML
            const formattedHtml = htmlToShow
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/(".*?")/g, '<span style="color: #c41a16;">$1</span>') // Attributes
                .replace(/(&lt;\/?[a-zA-Z0-9-]+)/g, '<span style="color: #881280;">$1</span>') // Opening tags
                .replace(/(&gt;)/g, '<span style="color: #881280;">$1</span>'); // Closing angle bracket of tags


            currentPopover.innerHTML = `
                <button class="popover-close-btn" style="position: absolute; top: 2px; right: 5px; background: none; border: none; font-size: 18px; cursor: pointer; padding: 0; line-height: 1; color: #666; z-index: 1001;">&times;</button>
                <div class="popover-title" style="font-weight: bold; margin-bottom: 8px; font-size: 13px; border-bottom: 1px solid #eee; padding-bottom: 8px; padding-right: 20px;">
                    ${popoverTitle}
                </div>
                <div class="popover-content" style="overflow-wrap: break-word;">
                    ${formattedHtml}
                </div>
            `;

            panelBody.appendChild(currentPopover);
            // Position popover logic (ensure window.scrollY/scrollX are used correctly)
            const btnRect = button.getBoundingClientRect();
            const popoverWidth = currentPopover.clientWidth;
            const popoverHeight = currentPopover.clientHeight;
            const buffer = 15; // Keep increased buffer

            // Get panel body bounds relative to its own viewport
            const panelRect = panelBody.getBoundingClientRect();

            // Calculate initial desired position relative to panelBody
            // Position relative to button, then offset by panel's scroll position
            let desiredTop = (btnRect.bottom - panelRect.top) + panelBody.scrollTop + 5;
            let desiredLeft = (btnRect.left - panelRect.left) + panelBody.scrollLeft + 5;

            // Adjust if it would go off-screen (relative to panelBody scroll dimensions)
            const panelScrollWidth = panelBody.scrollWidth;
            const panelScrollHeight = panelBody.scrollHeight;
            const panelClientWidth = panelBody.clientWidth; // Use clientWidth for visible area check
            const panelClientHeight = panelBody.clientHeight;

            // --- Revised Boundary Checks --- 
            // Left edge
            if (desiredLeft < panelBody.scrollLeft + buffer) {
                desiredLeft = panelBody.scrollLeft + buffer;
            }
            // Right edge
            if (desiredLeft + popoverWidth > panelBody.scrollLeft + panelClientWidth - buffer) {
                desiredLeft = panelBody.scrollLeft + panelClientWidth - popoverWidth - buffer;
                // Ensure it doesn't go negative or less than buffer if panel is very narrow
                if (desiredLeft < panelBody.scrollLeft + buffer) desiredLeft = panelBody.scrollLeft + buffer; 
            }

            // Top edge
             if (desiredTop < panelBody.scrollTop + buffer) {
                 desiredTop = panelBody.scrollTop + buffer;
             }
            // Bottom edge
            if (desiredTop + popoverHeight > panelBody.scrollTop + panelClientHeight - buffer) {
                // Try placing it above the button first (relative to panel)
                let topAbove = (btnRect.top - panelRect.top) + panelBody.scrollTop - popoverHeight - 5;
                if (topAbove < panelBody.scrollTop + buffer) { // If placing above also goes off-screen top
                    desiredTop = panelBody.scrollTop + buffer; // Stick to top buffer
                } else {
                    desiredTop = topAbove;
                }
            }
            // --- End Revised Boundary Checks ---

            // Set final position
            currentPopover.style.top = `${desiredTop}px`;
            currentPopover.style.left = `${desiredLeft}px`;
            currentPopover.style.visibility = 'visible';

            // Add close button handler
            const closeButton = currentPopover.querySelector('.popover-close-btn');
            // console.log('Found close button element:', closeButton); // REMOVED log
            if (closeButton) {
                closeButton.addEventListener('click', closeHtmlPopover);
            } else {
                console.error('Could not find .popover-close-btn element to attach listener.');
            }

            // Add outside click handler
            setTimeout(() => {
                document.addEventListener('click', handleOutsidePopoverClick, true);
            }, 0);
        });
        // --- End Actions Creation ---

        imageRow.appendChild(imageInfo);
        imageRow.appendChild(actionsDiv);
        div.appendChild(imageRow);
        imagesList.appendChild(div);
    });
  }

  // *** REVISED: Function to update filtered images based on current selections ***
  function updateFilteredImages() {
    const imagesList = document.getElementById('imagesList');
    const originalImages = JSON.parse(imagesList.dataset.originalImages || '[]'); // Get stored images

    // Get active filters
    const activeTypeFilters = Array.from(document.querySelectorAll('#imageFilters .filter-btn[data-filter="regular"], #imageFilters .filter-btn[data-filter="svg"], #imageFilters .filter-btn[data-filter="background"]'))
        .filter(btn => btn.classList.contains('active'))
        .map(btn => btn.dataset.filter);

    const activeAltFilters = Array.from(document.querySelectorAll('#imageFilters .filter-btn[data-filter="has-alt"], #imageFilters .filter-btn[data-filter="empty-alt"], #imageFilters .filter-btn[data-filter="no-alt"]'))
        .filter(btn => btn.classList.contains('active'))
        .map(btn => btn.dataset.filter);

    // Get state of mutually exclusive filters
    const inLinkButtonActive = document.querySelector('#imageFilters .filter-btn[data-filter="in-link"]').classList.contains('active');
    const notInLinkButtonActive = document.querySelector('#imageFilters .filter-btn[data-filter="not-in-link"]').classList.contains('active');
    const ariaHiddenActive = document.querySelector('#imageFilters .filter-btn[data-filter="aria-hidden"]').classList.contains('active');
    const noAriaHiddenActive = document.querySelector('#imageFilters .filter-btn[data-filter="no-aria-hidden"]').classList.contains('active');
    const focusableFalseActive = document.querySelector('#imageFilters .filter-btn[data-filter="focusable-false"]').classList.contains('active');

    const filteredImages = originalImages.filter(item => {
        // --- 1. Type Filter ---
        if (activeTypeFilters.length === 0) {
            return false; // No types selected = no results
        }
        const matchesType = (
            (activeTypeFilters.includes('regular') && item.isImg && !item.isSvg) ||
            (activeTypeFilters.includes('svg') && item.isSvg) ||
            (activeTypeFilters.includes('background') && item.isBackgroundImage)
        );
        if (!matchesType) return false; // Must match one of the selected types

        // --- 2. Alt Filter ---
        let matchesAlt = false;
        if (item.isBackgroundImage) {
            matchesAlt = true; // Background images bypass alt checks
        } else if (item.isSvg) {
            const hasSvgAlt = !!(item.svgTitleDesc || item.ariaLabel || item.labelledByText);
            const isSvgDecorative = item.role === 'presentation' || item.role === 'none' || item.isAriaHidden;
            matchesAlt = (
                (activeAltFilters.includes('has-alt') && hasSvgAlt) ||
                (activeAltFilters.includes('empty-alt') && isSvgDecorative) ||
                (activeAltFilters.includes('no-alt') && !hasSvgAlt && !isSvgDecorative)
            );
        } else if (item.isImg) {
            matchesAlt = (
                (activeAltFilters.includes('has-alt') && item.hasAltAttribute && !item.isEmptyAlt) ||
                (activeAltFilters.includes('empty-alt') && item.isEmptyAlt) ||
                (activeAltFilters.includes('no-alt') && !item.hasAltAttribute)
            );
        }
         if (!matchesAlt && activeAltFilters.length > 0) return false; // Must match alt criteria *if any alt filters are active*


        // --- 3. Link/Button Filter ---
        // If both or neither link filter is active, don't filter by link status.
        // Otherwise, check if the item matches the *active* link filter.
        if (inLinkButtonActive !== notInLinkButtonActive) { // Only filter if exactly one is active
          const isItemInLink = item.ancestorLinkInfo?.isLink === true;
          if (inLinkButtonActive && !isItemInLink) return false; // Filter active, item not in link -> hide
          if (notInLinkButtonActive && isItemInLink) return false; // Filter active, item in link -> hide
        }
        
        // --- 4. ARIA Hidden Filter ---
        // If both or neither hidden filter is active, don't filter by hidden status.
        // Otherwise, check if the item matches the *active* hidden filter.
        if (ariaHiddenActive !== noAriaHiddenActive) { // Only filter if exactly one is active
          const isItemHidden = item.isAriaHidden === true;
          if (ariaHiddenActive && !isItemHidden) return false; // Filter active, item not hidden -> hide
          if (noAriaHiddenActive && isItemHidden) return false; // Filter active, item hidden -> hide
        }
        
        // --- 5. "Focusable False" Filter ---
        // If the filter is active, item.isFocusableFalse MUST be true.
        // If the filter is inactive, this condition doesn't apply (passes).
        const matchesFocusableFalseFilter = !focusableFalseActive || (focusableFalseActive && item.isFocusableFalse === true);
        if (!matchesFocusableFalseFilter) return false; // Exit if filter active and item doesn't have focusable="false"

        // --- 6. Final Result ---
        // If we reached here, all active filter criteria were met
        return true;
    });

    // First, update the alt counts for the full dataset
    updateAltCounts(originalImages);

    // Then update filtered count display
    const totalImages = document.getElementById('totalImages');
    if (totalImages) {
        // Get the total count of ALL images (which should be displayed in the element)
        const totalCount = originalImages.length;
        
        // Add filtered count info if filtering is active
        if (filteredImages.length !== totalCount) {
            totalImages.innerHTML = `${totalCount} <span style="font-size: 11px; color: #666;">(${filteredImages.length} filtered)</span>`;
        }
    }

    // Render the filtered results
    // renderFilteredImages(filteredImages);
	setTimeout(() => {
        console.log('[Panel] Starting deferred rendering...');
        renderFilteredImages(filteredImages);
    }, 0);
  }

  // Function to update the Missing Alt and Empty Alt counts
  function updateAltCounts(images) {
    // Get the count elements
    const totalImages = document.getElementById('totalImages');
    const missingAltCount = document.getElementById('missingAltCount');
    const emptyAltCount = document.getElementById('emptyAltCount');
    const withAltCountElement = document.getElementById('withAltCount');
    
    if (!missingAltCount || !emptyAltCount || !images || !Array.isArray(images)) {
      return;
    }
    
    // Initialize counters
    let totalAllImages = images.length; // Count ALL images
    let totalNormalImages = 0;
    let missingCount = 0;
    let emptyCount = 0;
    let withAltCount = 0;
    
    // Count images with missing or empty alt text - only normal images, not SVGs or backgrounds
    images.forEach(item => {
      // Only count regular images for alt text stats
      if (item.isImg && !item.isSvg && !item.isBackgroundImage) {
        totalNormalImages++;
        
        // For regular images
        if (!item.hasAltAttribute) {
          missingCount++;
        } else if (item.isEmptyAlt) {
          emptyCount++;
        } else if (item.hasAltAttribute && !item.isEmptyAlt) {
          withAltCount++;
        }
      }
    });
    
    // Update the count elements
    if (totalImages) {
      totalImages.textContent = totalAllImages; // Show ALL images count
    }
    missingAltCount.textContent = missingCount;
    emptyAltCount.textContent = emptyCount;
    
    // Update the with alt count if the element exists
    if (withAltCountElement) {
      withAltCountElement.textContent = withAltCount;
    }
  }

  // Helper function to update eye icon based on button state
  function updateButtonEyeIcon(button, isActive) {
    const eyeOpenSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeClosedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    
    // Get the original button text by data attribute, or extract from current content
    let buttonText = button.getAttribute('data-original-text');
    
    if (!buttonText) {
        // Extract text from current button content, skipping any SVG
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = button.innerHTML;
        // Remove any SVG elements
        const svgs = tempDiv.querySelectorAll('svg');
        svgs.forEach(svg => svg.remove());
        buttonText = tempDiv.textContent.trim();
        
        // Store for future use
        button.setAttribute('data-original-text', buttonText);
    }
    
    // Replace the button inner HTML with the appropriate icon and the original text
    button.innerHTML = isActive ? 
        `${eyeOpenSvg} ${buttonText}` :
        `${eyeClosedSvg} ${buttonText}`;
  }

  // Add listener for visibility changes to refresh data when panel becomes visible
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      console.log('[Panel] Panel became visible, refreshing data.');
      
      // Always get a fresh tab ID when the panel becomes visible
      updateCurrentTabId(function(success) {
        if (!success) {
          console.error('[Panel] Failed to update tab ID on visibility change');
          return;
        }
        
        // Now refresh data for the current tab
        refreshPanelData();
      });
    }
  });

  // Function to load and display FAQs
  function loadFAQs() {
    const faqContainer = document.getElementById('faqList');
    if (!faqContainer) return;

    fetch(chrome.runtime.getURL('faqs.json'))
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(faqs => {
        faqContainer.innerHTML = ''; // Clear loading message

        if (!faqs || !Array.isArray(faqs) || faqs.length === 0) {
          faqContainer.innerHTML = '<div class="no-faqs">No FAQs available</div>';
          return;
        }

        // Create FAQ elements
        faqs.forEach((faq, index) => {
          const faqItem = document.createElement('div');
          faqItem.className = 'faq-item';
          
          const question = document.createElement('div');
          question.className = 'faq-question';
          question.textContent = faq.question;
          question.setAttribute('aria-expanded', 'false');
          question.setAttribute('aria-controls', `faq-answer-${index}`);
          
          const answer = document.createElement('div');
          answer.className = 'faq-answer';
          answer.id = `faq-answer-${index}`;
          answer.innerHTML = faq.answer.replace(/\n/g, '<br>');
          answer.setAttribute('aria-hidden', 'true');
          
          // Toggle answer display on question click
          question.addEventListener('click', () => {
            const isOpen = answer.classList.contains('open');
            
            // Close all other FAQs
            document.querySelectorAll('.faq-question').forEach(q => {
              q.classList.remove('open');
              q.setAttribute('aria-expanded', 'false');
            });
            document.querySelectorAll('.faq-answer').forEach(a => {
              a.classList.remove('open');
              a.setAttribute('aria-hidden', 'true');
            });
            
            // Toggle current FAQ
            if (!isOpen) {
              question.classList.add('open');
              answer.classList.add('open');
              question.setAttribute('aria-expanded', 'true');
              answer.setAttribute('aria-hidden', 'false');
            }
          });
          
          faqItem.appendChild(question);
          faqItem.appendChild(answer);
          faqContainer.appendChild(faqItem);
        });
      })
      .catch(error => {
        console.error('Error loading FAQs:', error);
        faqContainer.innerHTML = `<div class="error-message">Error loading FAQs: ${error.message}</div>`;
      });
  }

  // Load FAQs when panel is initialized
  loadFAQs();

  // Function to refresh panel data with fresh tab ID first
  function refreshPanelData() {
    // Show loading state
    const imagesList = document.getElementById('imagesList');
    if (imagesList) {
      // Clear any cached original images data to force a complete refresh
      if (imagesList.dataset.originalImages) {
        delete imagesList.dataset.originalImages;
      }
      
      imagesList.innerHTML = '<div class="loading-message">Loading data...</div>';
    }
    
    // Always get a fresh tab ID before fetching data
    updateCurrentTabId(function(success) {
      if (!success) {
        if (imagesList) {
          imagesList.innerHTML = `
            <div class="error-message">
              Error: Unable to determine current tab.
              <button id="retryButton" class="retry-button">Try Again</button>
            </div>
          `;
          document.getElementById('retryButton')?.addEventListener('click', refreshPanelData);
        }
        return;
      }
      
      // Now fetch data with the current tab ID
      fetchAndUpdateData();
    });
  }

  // Update the image rendering logic in panel.js
  
});