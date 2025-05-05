// Helper for styled console logs that stand out
function debugLog(message, data = null) {
    console.log(
      `%c IMAGE DEBUGGER %c ${message}`,
      'background: #4285f4; color: white; padding: 2px 4px; border-radius: 2px;',
      'color: #4285f4; font-weight: bold;',
      data || ''
    );
  }
  
  // Helper function to recursively find elements including those in shadow DOM
  function findAllElementsRecursive(selector, rootNode = document) {
    let elements = Array.from(rootNode.querySelectorAll(selector));
    const allNodes = rootNode.querySelectorAll('*');
    
    allNodes.forEach(node => {
      if (node.shadowRoot) {
        elements = elements.concat(findAllElementsRecursive(selector, node.shadowRoot));
      }
    });
    
    return elements;
  }
  
  // Helper function to find a single element recursively by attribute
  function findElementRecursive(attributeSelector, rootNode = document) {
    try {
      // First try direct querySelector (fastest)
      let element = rootNode.querySelector(attributeSelector);
      if (element) return element;
      
      // Try to find by ID if it's an ID selector (most common for SVG symbols)
      if (attributeSelector.startsWith('#')) {
        const id = attributeSelector.substring(1);
        element = rootNode.getElementById(id);
        if (element) return element;
        
        // For SVG symbols specifically, try these common containers
        // Check for symbols in common locations for icon systems
        const svgContainers = rootNode.querySelectorAll('svg, symbol, defs, g[id*="icons"], div[id*="icons"]');
        for (const container of svgContainers) {
          if (container.querySelector(`#${id}`)) {
            return container.querySelector(`#${id}`);
          }
        }
      }
  
      // Search in all shadow roots recursively
      const allNodes = rootNode.querySelectorAll('*');
      for (const node of allNodes) {
        if (node.shadowRoot) {
          element = findElementRecursive(attributeSelector, node.shadowRoot);
          if (element) return element;
        }
      }
      
      // In some cases, try searching in iframes if same-origin
      if (rootNode === document) {
        const frames = document.querySelectorAll('iframe');
        for (const frame of frames) {
          try {
            // Only if same-origin and accessible
            const frameDoc = frame.contentDocument || frame.contentWindow?.document;
            if (frameDoc) {
              element = findElementRecursive(attributeSelector, frameDoc);
              if (element) return element;
            }
          } catch (e) {
            // Cross-origin iframe, can't access
          }
        }
      }
    } catch (e) {
      console.warn('Error in findElementRecursive:', e);
    }
    
    return null;
  }
  
  // Helper: Check element and ancestors for aria-hidden="true"
  function checkAriaHiddenRecursive(element, depth = 0) {
    if (!element || depth > 10) {
      return false;
    }
    if (element.getAttribute('aria-hidden') === 'true') {
      return true;
    }
    return checkAriaHiddenRecursive(element.parentElement, depth + 1);
  }
  
  // Helper: Check element and ancestors for focusable="false"
  function checkFocusableFalseRecursive(element, depth = 0) {
    if (!element || depth > 10) {
      return false;
    }
    if (element.getAttribute('focusable') === 'false') {
      return true;
    }
    return checkFocusableFalseRecursive(element.parentElement, depth + 1);
  }
  
  // Helper: Find nearest ancestor link/button and return the ELEMENT
  // *** MODIFIED: Returns the element, or null ***
  function findAncestorLinkElementRecursive(element, depth = 0) {
    if (!element || depth > 10) return null;
    
    // Debug the element we're checking
    console.log(`[DEBUG findAncestorLink] Checking element at depth ${depth}:`, 
                element.tagName ? element.tagName.toLowerCase() : 'unknown', 
                element.getAttribute ? (element.getAttribute('role') || 'no role') : 'no getAttribute');
    
    // Check if the current element is a link or button
    const tagName = element.tagName ? element.tagName.toLowerCase() : null;
    if (tagName === 'a' || tagName === 'button' || element.getAttribute('role') === 'link' || element.getAttribute('role') === 'button') {
      console.log(`[DEBUG findAncestorLink] Found link element:`, element.outerHTML?.substring(0, 100) + '...');
      return element; // Return the element itself
    }
    
    // Continue checking parent even if this element has aria-hidden="true" 
    // This ensures we find link relationships even for decorative/hidden elements
    if (element.parentElement && element.parentElement.nodeType === Node.ELEMENT_NODE) {
       console.log(`[DEBUG findAncestorLink] Moving to parent:`, 
                   element.parentElement.tagName ? element.parentElement.tagName.toLowerCase() : 'unknown');
       return findAncestorLinkElementRecursive(element.parentElement, depth + 1);
    }
    
    console.log(`[DEBUG findAncestorLink] No link found, reached end of traversal`);
    return null;
  }
  
  // Helper: Get details from a link/button element (separated logic)
  function getLinkElementDetails(linkElement) {
      // Special debug for link element
      console.log(`[DEBUG getLinkElementDetails] Link element:`, linkElement ? linkElement.outerHTML?.substring(0, 100) + '...' : 'null');
      
      if (!linkElement) {
          console.log(`[DEBUG getLinkElementDetails] No link element found`);
          return { isLink: false };
      }
      
      // Add debug to see DOM properties of the element
      console.log(`[DEBUG getLinkElementDetails] linkElement.nodeType:`, linkElement.nodeType);
      console.log(`[DEBUG getLinkElementDetails] linkElement type:`, typeof linkElement);
      
      try {
          const tagName = linkElement.tagName ? linkElement.tagName.toLowerCase() : null;
          console.log(`[DEBUG getLinkElementDetails] tagName=${tagName}`);
          
          const role = linkElement.getAttribute ? linkElement.getAttribute('role') : null;
          console.log(`[DEBUG getLinkElementDetails] role=${role}`);
          
          // More reliable check - if tagName is 'a', always consider it a link
          const isLink = tagName === 'a' || tagName === 'button' || role === 'link' || role === 'button';
          
          // Add more debug 
          console.log(`[DEBUG getLinkElementDetails] tagName=${tagName}, role=${role}, isLink=${isLink}`);
          
          if (!isLink) {
              console.log(`[DEBUG getLinkElementDetails] Not a link element despite finding an ancestor`);
              return { isLink: false };
          }
  
          // Extract text content safely
          let linkTextContent = '';
          try {
              linkTextContent = linkElement.textContent ? linkElement.textContent.trim() : '';
          } catch (e) {
              console.warn(`[DEBUG getLinkElementDetails] Error getting textContent:`, e);
          }
          
          // Get other attributes safely
          const linkTitle = linkElement.getAttribute ? (linkElement.getAttribute('title') || null) : null;
          const linkAriaLabel = linkElement.getAttribute ? (linkElement.getAttribute('aria-label') || null) : null;
          const linkLabelledByIds = linkElement.getAttribute ? (linkElement.getAttribute('aria-labelledby') || null) : null;
          const linkDescribedByIds = linkElement.getAttribute ? (linkElement.getAttribute('aria-describedby') || null) : null;
          const ownerDoc = linkElement.ownerDocument || document;
          
          // Get text for aria ids
          const linkLabelledByText = getTextForAriaIds(linkLabelledByIds, ownerDoc);
          const linkDescribedByText = getTextForAriaIds(linkDescribedByIds, ownerDoc);
          
          // Add final debug
          console.log(`[DEBUG getLinkElementDetails] Result:`, {
              isLink,
              tagName,
              role,
              linkTextContent: linkTextContent.substring(0, 50) + (linkTextContent.length > 50 ? '...' : ''),
              linkTitle,
              linkAriaLabel
          });
          
          return {
              isLink,
              tagName,
              role,
              linkTextContent,
              linkTitle,
              linkAriaLabel,
              linkLabelledByText,
              linkDescribedByText
          };
      } catch (e) {
          console.error(`[DEBUG getLinkElementDetails] Unexpected error processing link element:`, e);
          // Fallback - if we found an element but had an error, still try to return basic link info
          return { 
              isLink: true,
              tagName: 'unknown',
              linkTextContent: 'Error detecting link text'
          };
      }
  }
  
  // New helper function to properly evaluate media queries
  function evaluateMediaQuery(mediaQuery) {
    // If no media query specified, it always matches
    if (!mediaQuery) return true;
    
    try {
      // Use the browser's native matchMedia API to evaluate the query
      return window.matchMedia(mediaQuery).matches;
    } catch (error) {
      console.warn('Error evaluating media query:', mediaQuery, error);
      // If there's an error (invalid query), assume it doesn't match
      return false;
    }
  }
  
  // Helper: Find nearest ancestor figure and get figcaption
  function findAncestorFigureRecursive(element, depth = 0) {
    if (!element || depth > 10) {
      // Return initial object structure
      return { inFigureElement: false, hasFigcaption: false, figcaptionText: '', imgSrc: null, pictureSources: [], hasPicture: false, currentSrc: null };
    }
    if (element.tagName.toLowerCase() === 'figure') {
      const figcaption = element.querySelector('figcaption');
      const pictureElement = element.querySelector('picture');
      let imgSrc = null;
      let currentSrc = null;
      let pictureSources = [];
      const hasPicture = !!pictureElement;
  
      if (hasPicture) {
        // --- Handle Picture Element --- 
        const imgElement = pictureElement.querySelector('img');
        
        // 1. Get fallback img src (most reliable)
        if (imgElement) {
          // Check for currentSrc first (browser's selected source)
          if (imgElement.currentSrc) {
            currentSrc = imgElement.currentSrc;
          }
          
          imgSrc = imgElement.getAttribute('src');
          if (imgSrc) {
            try {
              imgSrc = new URL(imgSrc, document.baseURI).href;
            } catch (e) {
              console.warn('Could not create absolute URL for figure picture>img src:', imgSrc, e);
              // Keep original relative/invalid src on error
            }
          } 
  
          // Add img srcset if present
          const imgSrcset = imgElement.getAttribute('srcset');
          if (imgSrcset) {
            const firstUrl = imgSrcset.split(',')[0].trim().split(' ')[0];
            let absoluteFirstUrl = firstUrl;
            try {
              absoluteFirstUrl = new URL(firstUrl, document.baseURI).href;
            } catch (e) {
              console.warn('Could not create absolute URL for figure picture>img srcset:', firstUrl, e);
            }
            pictureSources.push({
              media: null,
              srcset: imgSrcset,
              type: null,
              url: absoluteFirstUrl,
              isImgFallback: true,
              mediaMatches: true // Always matches if no media query
            });
          }
        }
        
        // 2. Get all source elements
        const sourceElements = Array.from(pictureElement.querySelectorAll('source'));
        const sourcesData = sourceElements.map(source => {
          const media = source.getAttribute('media');
          const srcset = source.getAttribute('srcset');
          const type = source.getAttribute('type');
          const firstSrcsetUrl = srcset ? srcset.split(',')[0].trim().split(' ')[0] : null;
          let absoluteUrl = firstSrcsetUrl;
          if (firstSrcsetUrl) {
            try {
              absoluteUrl = new URL(firstSrcsetUrl, document.baseURI).href;
            } catch (e) {
              console.warn('Could not create absolute URL for figure picture>source:', firstSrcsetUrl, e);
            }
          }
          // Use the evaluateMediaQuery helper function to check if this source matches
          const mediaMatches = evaluateMediaQuery(media);
          return {
            media,
            srcset,
            type,
            url: absoluteUrl,
            mediaMatches
          };
        }).filter(s => s.url); // Only keep sources that yielded a URL
        pictureSources = [...pictureSources, ...sourcesData];
  
        // 3. Determine best imgSrc if not already set by fallback
        if (!currentSrc && pictureSources.length > 0) {
          // First try to find a matching source based on media query
          const matchingSource = pictureSources.find(source => source.mediaMatches && source.url);
          if (matchingSource) {
            currentSrc = matchingSource.url;
          } else {
            // If no matching media, take the first source URL available (could be from img srcset)
            const firstAvailableSource = pictureSources.find(source => source.url);
            if (firstAvailableSource) {
              currentSrc = firstAvailableSource.url;
            }
          }
        }
      }
      
      // --- Handle Direct Img Element (No Picture) --- 
      const imgElement = element.querySelector('img');
      if (imgElement) {
        // Try currentSrc first
        if (imgElement.currentSrc) {
          currentSrc = imgElement.currentSrc;
        }
        
        imgSrc = imgElement.getAttribute('src');
        if (imgSrc) {
          try {
            imgSrc = new URL(imgSrc, document.baseURI).href;
          } catch (e) {
            console.warn('Could not create absolute URL for figure>img src:', imgSrc, e);
          }
        }
        // Check direct img srcset as well
        const imgSrcset = imgElement.getAttribute('srcset');
        if (imgSrcset) {
          const firstUrl = imgSrcset.split(',')[0].trim().split(' ')[0];
          let absoluteFirstUrl = firstUrl;
          try {
            absoluteFirstUrl = new URL(firstUrl, document.baseURI).href;
          } catch (e) {
            console.warn('Could not create absolute URL for figure>img srcset:', firstUrl, e);
          }
          pictureSources.push({
            media: null,
            srcset: imgSrcset,
            type: null,
            url: absoluteFirstUrl,
            isImgFallback: true,
            mediaMatches: true
          });
          // If direct img has srcset but no src, use the first srcset URL
          if (!imgSrc && absoluteFirstUrl) {
            imgSrc = absoluteFirstUrl;
          }
        }
      }
  
      // If we have a currentSrc but no imgSrc, use currentSrc as the fallback
      if (!imgSrc && currentSrc) {
        imgSrc = currentSrc;
      }
  
      return {
        inFigureElement: true,
        hasFigcaption: !!figcaption,
        figcaptionText: figcaption ? (figcaption.textContent?.trim() || '') : '',
        imgSrc: imgSrc, // The determined primary source URL (absolute)
        pictureSources, // Array of all potential sources with details
        hasPicture,
        currentSrc // The browser-selected source (if available)
      };
    }
     // Check parent only if it's an Element node
    if (element.parentElement && element.parentElement.nodeType === Node.ELEMENT_NODE) {
       return findAncestorFigureRecursive(element.parentElement, depth + 1);
    }
    // Return the initial object structure if not a figure or ancestor found
    return { inFigureElement: false, hasFigcaption: false, figcaptionText: '', imgSrc: null, pictureSources: [], hasPicture: false, currentSrc: null };
  }
  
  // Helper: Get text content for space-separated IDs
  function getTextForAriaIds(idString, rootNode = document) {
    if (!idString) return '';
    const ids = idString.split(' ').filter(id => id.trim() !== '');
    let text = '';
    ids.forEach(id => {
      // Search globally and within shadow roots if necessary (simplified for now)
      const referencedElement = findElementRecursive(`[id="${id}"]`, rootNode);
      if (referencedElement) {
        text += (referencedElement.textContent?.trim() || '') + ' ';
      } else {
         text += `[Missing ID: ${id}] `;
      }
    });
    return text.trim();
  }
  
  // Helper: Get title/desc from SVG element
  function getSvgTitleDesc(svgElement) {
    const titleEl = svgElement.querySelector('title');
    const descEl = svgElement.querySelector('desc');
    const title = titleEl ? titleEl.textContent?.trim() : '';
    const desc = descEl ? descEl.textContent?.trim() : '';
    if (title && desc) return `${title} - ${desc}`;
    return title || desc || ''; // Return title if available, else desc, else empty
  }
  
  // Helper: Ensure SVG elements have a visible fixed color attribute
  function ensureSvgFixedColor(svgString, fixedColor = '#888888') { // Renamed, added default fixed color (grey)
      if (!svgString) return null;
      try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgString, "image/svg+xml");
          const svgElement = doc.documentElement;
  
          const parseError = svgElement.querySelector('parsererror');
          if (svgElement.tagName === 'parsererror' || parseError) {
               console.warn('Failed to parse SVG string. Original source:', svgString);
               return svgString;
          }
  
          // Select elements that typically need fill/stroke
          const elementsToColor = svgElement.querySelectorAll('path, rect, circle, polygon, ellipse, line, polyline');
  
          elementsToColor.forEach(el => {
               // Check fill: Add if missing OR replace if it's 'currentColor'
               const currentFill = el.getAttribute('fill');
               if (!currentFill || currentFill.toLowerCase() === 'currentColor') {
                    el.setAttribute('fill', fixedColor);
               } // Otherwise, leave existing explicit color
  
               // Check stroke: Add if missing OR replace if it's 'currentColor'
               const currentStroke = el.getAttribute('stroke');
               if (!currentStroke || currentStroke.toLowerCase() === 'currentColor') {
                    // Only add stroke if it likely needs one (e.g., lines, or paths without fill)
                    // Basic heuristic: add stroke if fill is none or missing, or if it's a line/polyline
                    const fillIsNone = currentFill && currentFill.toLowerCase() === 'none';
                    const tagName = el.tagName.toLowerCase();
                    if (fillIsNone || !currentFill || tagName === 'line' || tagName === 'polyline') {
                       el.setAttribute('stroke', fixedColor);
                    }
               } // Otherwise, leave existing explicit stroke color
          });
  
          const serializer = new XMLSerializer();
          return serializer.serializeToString(svgElement);
      } catch (e) {
          console.error("Error processing SVG for fixed color. Original source:", svgString, e);
          return svgString;
      }
  }
  
  // Function to sanitize SVG for preview
  function sanitizeSvgForPreview(svgSource) {
      if (!svgSource || typeof svgSource !== 'string') {
          console.warn('sanitizeSvgForPreview received invalid input:', svgSource);
          return ''; // Return empty string for invalid input
      }
      try {
          // Fix incorrect namespace URLs (both http vs https and with/without www)
          let cleanedSource = svgSource.replace(/xmlns=["']https?:\/\/(www\.)?w3\.org\/2000\/svg["']/g,
                                       'xmlns="http://www.w3.org/2000/svg"');
  
          // --- BEGIN xlink NAMESPACE FIX ---
          // Check if xlink prefix is used but the namespace is NOT declared
          const usesXlink = cleanedSource.includes('xlink:');
          const declaresXlink = cleanedSource.includes('xmlns:xlink');
  
          if (usesXlink && !declaresXlink) {
              debugLog('Detected xlink usage without declaration. Adding xmlns:xlink.');
              // Attempt to add xmlns:xlink to the root <svg> tag
              // This regex is basic and might fail on complex SVG tags, but covers common cases
              cleanedSource = cleanedSource.replace(/<svg/i, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
          }
          // --- END xlink NAMESPACE FIX ---
  
          // Continue with existing sanitization using the potentially modified source
          const parser = new DOMParser();
          const doc = parser.parseFromString(cleanedSource, 'image/svg+xml');
  
          // Check for parsing errors AFTER attempting the fix
          const errors = doc.querySelectorAll('parsererror');
          if (errors.length > 0) {
              // Log the error with the source *after* the attempted fix
              console.warn('SVG parsing error (after xlink fix attempt):', errors[0].textContent, 'Source:', cleanedSource);
              // Return the original source as a last resort, maybe the browser is more lenient
              return svgSource;
          }
  
          const svg = doc.querySelector('svg');
          if (!svg) {
              console.warn('Could not find SVG element after parsing:', cleanedSource);
              return svgSource; // Fallback
          }
  
          // Ensure main SVG namespace is correct (might have been missed by regex)
          svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          // Ensure xlink namespace is present if needed (double-check after parsing)
          if (usesXlink && !svg.hasAttribute('xmlns:xlink')) {
               svg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
          }
  
          // Basic pass-through for now
          return new XMLSerializer().serializeToString(doc);
  
      } catch (e) {
          console.error('Error sanitizing SVG:', e, 'Original source:', svgSource);
          return svgSource; // Fallback to original source on any exception
      }
  }
  
  // Update fetchAndProcessSvgUse to be more robust
  async function fetchAndProcessSvgUse(svgElement) {
      try {
        // Create a new SVG element
        const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        
        // Copy original SVG attributes
        Array.from(svgElement.attributes).forEach(attr => {
            newSvg.setAttribute(attr.name, attr.value);
        });
        
        // Ensure required SVG attributes
        newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        if (!newSvg.getAttribute('width')) newSvg.setAttribute('width', '24');
        if (!newSvg.getAttribute('height')) newSvg.setAttribute('height', '24');
        
        // Check if SVG has inline content (Scenario 1)
        const hasInlineContent = svgElement.children.length > 0 && 
            !svgElement.querySelector('use');
        if (hasInlineContent) {
            Array.from(svgElement.children).forEach(child => {
                newSvg.appendChild(child.cloneNode(true));
            });
            return newSvg.outerHTML;
        }
        
        // Get the use element for scenarios 2 and 3
        const useEl = svgElement.querySelector('use');
        if (!useEl) return null;
        
        // Get href (support both xlink:href and href)
          const href = useEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || 
                      useEl.getAttribute('href');
          
          if (!href) return null;
          
          // Split URL and fragment
          const [url, fragment] = href.split('#');
        
        // Handle inline reference (Scenario 3)
        if (!url && fragment) {
            const referencedElement = document.getElementById(fragment);
            if (!referencedElement) return null;
            
            if (referencedElement.tagName.toLowerCase() === 'symbol') {
                const viewBox = referencedElement.getAttribute('viewBox');
                if (viewBox) newSvg.setAttribute('viewBox', viewBox);
                Array.from(referencedElement.children).forEach(child => {
                    newSvg.appendChild(child.cloneNode(true));
                });
            } else {
                newSvg.appendChild(referencedElement.cloneNode(true));
            }
            return newSvg.outerHTML;
        }
        
        // Handle external SVG (Scenario 2)
          if (!fragment) return null;
          
          const fullUrl = new URL(url, window.location.href).href;
        console.log('Fetching SVG from:', fullUrl);
          
          const response = await fetch(fullUrl);
          if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
          
          const svgText = await response.text();
        console.log('Fetched SVG content:', svgText.substring(0, 100) + '...');
        
          const parser = new DOMParser();
          const externalDoc = parser.parseFromString(svgText, 'image/svg+xml');
          
          const referencedElement = externalDoc.getElementById(fragment);
        if (!referencedElement) {
            console.log('Referenced element not found:', fragment);
            return null;
        }
        
          if (referencedElement.tagName.toLowerCase() === 'symbol') {
              const viewBox = referencedElement.getAttribute('viewBox');
              if (viewBox) newSvg.setAttribute('viewBox', viewBox);
              Array.from(referencedElement.children).forEach(child => {
                  newSvg.appendChild(child.cloneNode(true));
              });
          } else {
              newSvg.appendChild(referencedElement.cloneNode(true));
          }
          
        console.log('Processed SVG:', newSvg.outerHTML);
          return newSvg.outerHTML;
      } catch (error) {
        console.error('Error processing SVG use:', error);
          return null;
      }
  }
  
  // Add these helper functions back if they're missing
  async function fetchImageAsDataUri(url) {
      try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const blob = await response.blob();
          return await convertBlobToDataUri(blob);
      } catch (error) {
          console.error('Error fetching image:', error);
          return null;
      }
  }
  
  function convertBlobToDataUri(blob) {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
      });
  }
  
  
  function getBackgroundImageUrls(element, includePseudo = true) {
    const urls = [];
    const computedStyle = window.getComputedStyle(element);
    let bgImage = computedStyle.backgroundImage;
  
    // Fallback to background shorthand if backgroundImage is 'none'
    if (!bgImage || bgImage === 'none') {
        bgImage = computedStyle.background;
    }
  
    // Extract URLs from the element itself
    if (bgImage && bgImage !== 'none') {
        const matches = bgImage.match(/url\((['"]?)(.*?)\1\)/g);
        if (matches) {
            matches.forEach(match => {
                const url = match.replace(/url\(['"]?/, '').replace(/['"]?\)$/, '');
                if (url && url !== 'none') {
                    try {
                        if (url.startsWith('data:')) {
                            urls.push({ url: url, pseudo: null });
                        } else {
                            const absoluteUrl = new URL(url, document.baseURI).href;
                            urls.push({ url: absoluteUrl, pseudo: null });
                        }
                    } catch (e) {
                        console.warn(`Invalid background image URL: ${url}`, e);
                        urls.push({ url: url, pseudo: null });
                    }
                }
            });
        }
    }
  
    // Check pseudo-elements if enabled
    if (includePseudo) {
        // ::before
        const beforeStyle = window.getComputedStyle(element, '::before');
        let beforeBgImage = beforeStyle.backgroundImage;
        if (!beforeBgImage || beforeBgImage === 'none') {
            beforeBgImage = beforeStyle.background;
        }
        if (beforeBgImage && beforeBgImage !== 'none') {
            const beforeMatches = beforeBgImage.match(/url\((['"]?)(.*?)\1\)/g);
            if (beforeMatches) {
                beforeMatches.forEach(match => {
                    const url = match.replace(/url\(['"]?/, '').replace(/['"]?\)$/, '');
                    if (url && url !== 'none') {
                        try {
                            if (url.startsWith('data:')) {
                                urls.push({ url: url, pseudo: '::before' });
                            } else {
                                const absoluteUrl = new URL(url, document.baseURI).href;
                                urls.push({ url: absoluteUrl, pseudo: '::before' });
                            }
                        } catch (e) {
                            console.warn(`Invalid ::before background image URL: ${url}`, e);
                            urls.push({ url: url, pseudo: '::before' });
                        }
                    }
                });
            }
        }
  
        // ::after
        const afterStyle = window.getComputedStyle(element, '::after');
        let afterBgImage = afterStyle.backgroundImage;
        if (!afterBgImage || afterBgImage === 'none') {
            afterBgImage = afterStyle.background;
        }
        if (afterBgImage && afterBgImage !== 'none') {
            const afterMatches = afterBgImage.match(/url\((['"]?)(.*?)\1\)/g);
            if (afterMatches) {
                afterMatches.forEach(match => {
                    const url = match.replace(/url\(['"]?/, '').replace(/['"]?\)$/, '');
                    if (url && url !== 'none') {
                        try {
                            if (url.startsWith('data:')) {
                                urls.push({ url: url, pseudo: '::after' });
                            } else {
                                const absoluteUrl = new URL(url, document.baseURI).href;
                                urls.push({ url: absoluteUrl, pseudo: '::after' });
                            }
                        } catch (e) {
                            console.warn(`Invalid ::after background image URL: ${url}`, e);
                            urls.push({ url: url, pseudo: '::after' });
                        }
                    }
                });
            }
        }
    }
  
    return urls;
  }
  
  
  // --- NEW: Resizing Function ---
  const MAX_PREVIEW_DIMENSION = 150; // Max width/height for preview in pixels
  const PREVIEW_JPEG_QUALITY = 0.7; // JPEG quality (0.0 to 1.0) - Use JPEG for photos
  const MAX_PREVIEW_DATA_URI_LENGTH = 256 * 1024 * 1000; // 256KB limit for the final preview string
  
  async function createResizedPreviewDataUri(url) {
      if (!url || url.startsWith('data:')) { // Don't re-process data URIs
           return url; // Return existing data URI or null
      }
      debugLog(`Creating resized preview for: ${url.substring(0, 80)}...`);
      try {
          // Fetch the image as a blob first to check size (optional but good practice)
          const initialResponse = await fetch(url, { mode: 'cors' });
           if (!initialResponse.ok) throw new Error(`Initial fetch failed: ${initialResponse.status}`);
           const blob = await initialResponse.blob();
  
           // Optional: Skip resizing if original blob is excessively large (e.g., > 20MB)
           const MAX_ORIGINAL_BLOB_SIZE = 20 * 1024 * 1024;
           if (blob.size > MAX_ORIGINAL_BLOB_SIZE) {
               console.warn(`Original image blob too large (${(blob.size / 1024 / 1024).toFixed(1)}MB), skipping preview generation for: ${url}`);
               return null; // Indicate no preview generated
           }
  
          // Create an ImageBitmap (more efficient than <img> element for canvas)
          const imageBitmap = await createImageBitmap(blob);
  
          const originalWidth = imageBitmap.width;
          const originalHeight = imageBitmap.height;
  
          if (originalWidth === 0 || originalHeight === 0) {
               imageBitmap.close(); // Clean up bitmap
               throw new Error('Image has zero dimensions');
          }
  
          // Calculate new dimensions, maintaining aspect ratio
          let targetWidth = originalWidth;
          let targetHeight = originalHeight;
          if (originalWidth > MAX_PREVIEW_DIMENSION || originalHeight > MAX_PREVIEW_DIMENSION) {
              const ratio = Math.min(MAX_PREVIEW_DIMENSION / originalWidth, MAX_PREVIEW_DIMENSION / originalHeight);
              targetWidth = Math.round(originalWidth * ratio);
              targetHeight = Math.round(originalHeight * ratio);
              debugLog(`Resizing from ${originalWidth}x${originalHeight} to ${targetWidth}x${targetHeight}`);
          } else {
               debugLog(`Image within preview size (${originalWidth}x${originalHeight}), using original dimensions.`);
          }
  
  
          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext('2d');
          // Draw white background for transparent images (optional, prevents black background on JPEG conversion)
          // ctx.fillStyle = '#FFFFFF';
          // ctx.fillRect(0, 0, targetWidth, targetHeight);
          ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  
          // Close the ImageBitmap to free memory
          imageBitmap.close();
  
          // --- MODIFIED: Determine output format ---
          let outputMimeType = 'image/jpeg'; // Default to JPEG for good compression
          let qualityArgument = PREVIEW_JPEG_QUALITY; // Use quality for JPEG
  
          // If the original blob type was PNG, output as PNG to preserve transparency
          if (blob.type === 'image/png') {
              outputMimeType = 'image/png';
              qualityArgument = undefined; // quality argument is not used for PNG, pass undefined
              debugLog(`Original type is PNG, exporting preview as PNG.`);
          }
          // Optional: Handle GIF - could convert to PNG to keep transparency (first frame)
          else if (blob.type === 'image/gif') {
               outputMimeType = 'image/png'; // Convert GIF to PNG
               qualityArgument = undefined;
               debugLog(`Original type is GIF, exporting preview as PNG.`);
          }
          // For other types (jpeg, webp, etc.) or unknown, stick with JPEG
  
          // Get Data URI from canvas using the determined format
          const dataUri = canvas.toDataURL(outputMimeType, qualityArgument);
          
  
          // --- FINAL SIZE CHECK ---
          if (dataUri.length > MAX_PREVIEW_DATA_URI_LENGTH) {
              console.warn(`Resized preview Data URI still exceeds limit (${(dataUri.length / 1024).toFixed(1)} KB) for: ${url}`);
              return null; // Return null if even the resized preview is too big
          }
          // --- END FINAL SIZE CHECK ---
  
          debugLog(`Generated preview URI length: ${(dataUri.length / 1024).toFixed(1)} KB`);
          return dataUri;
  
      } catch (error) {
          console.error(`Error creating resized preview for ${url}:`, error);
          return null; // Return null on any error during resizing
      }
  }
  // --- END NEW Resizing Function ---
  
  // Update the relevant part of getAllImages
  // Update getAllImages to include CSS background images
  async function getAllImages() {
    const imgSvgElements = findAllElementsRecursive('img, svg');
    const allElements = findAllElementsRecursive('*');
    const backgroundImageElements = allElements.filter(el => getBackgroundImageUrls(el).length > 0);
    const uniqueElements = new Set([...imgSvgElements, ...backgroundImageElements]);
  
    if (!uniqueElements.size) {
          return [];
      }
  
    const imagePromises = Array.from(uniqueElements).map(async (el) => {
          // *** START: Relaxed Filtering Logic ***
          try {
              const computedStyle = window.getComputedStyle(el);
              // Condition 1: Skip only if display is explicitly 'none'
              if (computedStyle.display === 'none') {
                  debugLog(`Skipping display:none element: ${el.tagName}#${el.id || '(no id)'}`);
                  return null; 
              }
          } catch (e) {
              // Errors reading style might happen for weird elements, skip them too
              debugLog(`Error checking style for element, skipping: ${el.tagName}#${el.id || '(no id)'}`, e);
              return null;
          }
  
          const tagName = el.tagName.toLowerCase();
          const isSvg = tagName === 'svg';
  
          // Condition 2: SVG definition block check (Simplified)
          if (isSvg) {
              let hasNonDefChild = false;
              // Check if ANY direct child is NOT a definition type
              for (const child of el.children) {
                   if (!['defs', 'symbol', 'metadata', 'title', 'desc'].includes(child.tagName.toLowerCase())) {
                       hasNonDefChild = true;
                       break;
                   }
              }
              // Skip only if the SVG has children AND none of them are renderable types
              if (!hasNonDefChild && el.children.length > 0) { 
                  debugLog(`Skipping SVG containing only definition elements: ${el.tagName}#${el.id || '(no id)'}`);
                  return null; 
              }
          }
          // *** END: Relaxed Filtering Logic ***
  
          const results = [];
          const id = el.getAttribute('data-image-id') || Math.random().toString(36).substr(2, 9);
          el.setAttribute('data-image-id', id);
          
          const isImg = tagName === 'img';
          const originalOuterHTML = el.outerHTML;
          const isInShadowDom = el.getRootNode() !== document;
  
          let originalUrl = null;      // To store the original HTTP/HTTPS URL
          let previewSrc = null;       // To store the source for preview (Data URI, SVG string, or fallback URL)
          let svgSanitizedSource = null; // To specifically hold sanitized SVG string before assigning to previewSrc
          
          let useHref = null;
          let absoluteUseHref = null;
          let hasUseTag = false;
  
          // Correct function name used here:
          const backgroundImageData = getBackgroundImageUrls(el);
          const isBackgroundImage = backgroundImageData.length > 0;
  
          // *** START: Modified SVG Handling Logic ***
          if (isSvg) {
              const useEl = el.querySelector('use');
              hasUseTag = !!useEl;
              const hasInternalDefs = !!el.querySelector(':scope > defs, :scope > linearGradient, :scope > radialGradient, :scope > filter, :scope > pattern, :scope > mask');
              
              let svgStringForPreview = originalOuterHTML;
  
              if (hasInternalDefs) {
                   debugLog(`Processing SVG with internal defs: ${el.id || '(no id)'}`);
                   // Resolve CSS variables first for SVGs with defs but potentially also inline styles
                   svgStringForPreview = resolveCssVariablesInSvg(el);
                   // No need to sanitize here, will be done later
                   if(hasUseTag) {
                       useHref = useEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || useEl.getAttribute('href');
                       if (useHref && !useHref.startsWith('#')) { try { absoluteUseHref = new URL(useHref, document.baseURI).href; } catch(e){ absoluteUseHref = useHref; } }
                       else { absoluteUseHref = useHref; }
                   }
              } 
              else if (hasUseTag) {
                  useHref = useEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || useEl.getAttribute('href');
                  if (useHref) {
                       if (useHref.startsWith('#')) {
                           debugLog(`Processing SVG with internal symbol use: ${useHref}`);
                           absoluteUseHref = useHref;
                           try {
                              const symbolId = useHref.substring(1);
                              console.log(`[DEBUG] Searching for symbol #${symbolId} in page DOM`);
                              // Use our improved symbol finder
                              const symbolElement = findSvgSymbolById(symbolId);
                              console.log(`[DEBUG] Found symbol #${symbolId}? ${!!symbolElement}`);
                              if (symbolElement && (symbolElement.tagName.toLowerCase() === 'symbol' || symbolElement.tagName.toLowerCase() === 'svg')) { 
                                  const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                                  newSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                                  newSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
                                  const attrsToCopy = ['class', 'style', 'width', 'height', 'fill', 'stroke', 'color', 'preserveAspectRatio'];
                                  attrsToCopy.forEach(attr => { if (el.hasAttribute(attr)) newSvg.setAttribute(attr, el.getAttribute(attr)); });
                                  const viewBox = el.getAttribute('viewBox') || symbolElement.getAttribute('viewBox');
                                  if (viewBox) newSvg.setAttribute('viewBox', viewBox);
                                  if (!newSvg.getAttribute('width') && viewBox) { const vbParts = viewBox.split(/[\s,]+/); if (vbParts.length === 4) newSvg.setAttribute('width', vbParts[2]); }
                                  if (!newSvg.getAttribute('height') && viewBox) { const vbParts = viewBox.split(/[\s,]+/); if (vbParts.length === 4) newSvg.setAttribute('height', vbParts[3]); }
                                  if (!newSvg.getAttribute('width')) newSvg.setAttribute('width', '24');
                                  if (!newSvg.getAttribute('height')) newSvg.setAttribute('height', '24');
                                  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                                  const clonedSymbol = symbolElement.cloneNode(true);
                                  let symbolIdInNewSvg = clonedSymbol.id || `internal-${Math.random().toString(36).substr(2, 9)}`;
                                  clonedSymbol.setAttribute('id', symbolIdInNewSvg);
                                  defs.appendChild(clonedSymbol);
                                  newSvg.appendChild(defs);
                                  const newUse = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                                  newUse.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${symbolIdInNewSvg}`);
                                  if (useEl.hasAttribute('fill')) newUse.setAttribute('fill', useEl.getAttribute('fill')); else if (el.hasAttribute('fill')) newUse.setAttribute('fill', el.getAttribute('fill'));
                                  if (useEl.hasAttribute('stroke')) newUse.setAttribute('stroke', useEl.getAttribute('stroke')); else if (el.hasAttribute('stroke')) newUse.setAttribute('stroke', el.getAttribute('stroke'));
                                  newSvg.appendChild(newUse);
                                  svgSanitizedSource = sanitizeSvgForPreview(newSvg.outerHTML);
                              } else {
                                  debugLog(`Internal symbol #${symbolId} not found or invalid. Checking if it's an arrow.`);
                                  if (isLikelyArrowIcon(symbolId)) {
                                      debugLog(`-> Identified as arrow. Generating default fallback SVG for #${symbolId}...`);
                                      const fallbackSvg = createDefaultArrowSvg(el);
                                      debugLog(`--> Generated fallback SVG: ${fallbackSvg ? fallbackSvg.substring(0, 100) + '...' : 'null'}`);
                                      svgSanitizedSource = sanitizeSvgForPreview(fallbackSvg);
                                      debugLog(`---> Sanitized fallback SVG: ${svgSanitizedSource ? svgSanitizedSource.substring(0, 100) + '...' : 'null'}`);
                                  } else {
                                      debugLog(`-> Symbol #${symbolId} not identified as arrow. Preserving original SVG.`);
                                      svgSanitizedSource = sanitizeSvgForPreview(originalOuterHTML);
                                  }
                              }
                          } catch (e) {
                              debugLog(`Error processing internal symbol ${useHref}: ${e.message}. Checking if arrow.`);
                              const symbolId = useHref.substring(1);
                              if (isLikelyArrowIcon(symbolId)) {
                                   debugLog(`-> Identified as arrow after error. Generating default fallback SVG for #${symbolId}...`);
                                   const fallbackSvg = createDefaultArrowSvg(el);
                                   debugLog(`--> Generated fallback SVG after error: ${fallbackSvg ? fallbackSvg.substring(0, 100) + '...' : 'null'}`);
                                   svgSanitizedSource = sanitizeSvgForPreview(fallbackSvg);
                                   debugLog(`---> Sanitized fallback SVG after error: ${svgSanitizedSource ? svgSanitizedSource.substring(0, 100) + '...' : 'null'}`);
                              } else {
                                  debugLog(`-> Error processing non-arrow symbol ${useHref}. Preserving original SVG.`);
                                  svgSanitizedSource = sanitizeSvgForPreview(originalOuterHTML);
                              }
                          }
                       } else {
                           debugLog(`Processing SVG with external use: ${useHref}`);
                           let processedSvg = null; // Initialize to null
                           try {
                               absoluteUseHref = new URL(useHref, document.baseURI).href;
                               processedSvg = await fetchAndProcessSvgUse(el);
                               if (processedSvg) {
                                   debugLog(`--> Successfully processed external SVG for ${useHref}`);
                                   svgSanitizedSource = sanitizeSvgForPreview(processedSvg);
                               } else {
                                   // fetchAndProcessSvgUse returned null (fetch error, CORS, ID not found)
                                   debugLog(`--> Failed to fetch or process external SVG content for ${useHref}. Preserving original SVG.`);
                                   svgSanitizedSource = sanitizeSvgForPreview(originalOuterHTML);
                               }
                           } catch (e) { 
                               // Error creating URL or other unexpected error during the try block
                               debugLog(`--> Error during external SVG processing setup for ${useHref}: ${e.message}. Preserving original SVG.`);
                               absoluteUseHref = useHref; // Keep original relative href
                               svgSanitizedSource = sanitizeSvgForPreview(originalOuterHTML);
                           }
                       }
                  } else {
                       // Use tag without href - resolve CSS vars and sanitize original
                       svgStringForPreview = resolveCssVariablesInSvg(el);
                       svgSanitizedSource = sanitizeSvgForPreview(svgStringForPreview);
                  }
              } 
              else { // Simple SVG without <use> or complex <defs>
                  debugLog(`Processing simple SVG. Resolving CSS Variables first.`);
                  // Resolve CSS variables for simple SVGs
                  svgStringForPreview = resolveCssVariablesInSvg(el);
                  // Sanitize the result
                  svgSanitizedSource = sanitizeSvgForPreview(svgStringForPreview);
              }
  
              // Final assignment (ensure previewSrc gets set unless <use> logic already did)
              // The <use> branches MUST set svgSanitizedSource themselves if they succeed.
              // If svgSanitizedSource wasn't set by a <use> branch, use the processed one.
              previewSrc = svgSanitizedSource || svgStringForPreview; 
  
              originalUrl = null;
          }
          // *** END: Modified SVG Handling Logic ***
  
          // --- Handle regular images (<img>) --- 
          else if (isImg) {
               let initialSrc = el.getAttribute('src') || '';
               if (!initialSrc) {
                  const figureInfo = findAncestorFigureRecursive(el);
                  if (figureInfo.inFigureElement && figureInfo.imgSrc) {
                       initialSrc = figureInfo.imgSrc;
                  }
               }
               if(initialSrc) {
                   try { 
                      originalUrl = new URL(initialSrc, document.baseURI).href; 
                      previewSrc = originalUrl;
                   } catch (e) { 
                       console.warn(`Invalid initial src: ${initialSrc}`, e); 
                       originalUrl = initialSrc;
                       previewSrc = originalUrl;
                   }
               } else {
                   // --- MODIFIED WARNING --- 
                   const elementIdentifier = el.id ? `#${el.id}` : (el.className ? `.${el.className.split(' ').join('.')}` : '');
                   console.warn(`Image tag found with no discernible src: ${el.tagName}${elementIdentifier}`, el);
                   // No originalUrl or previewSrc will be set, so this image won't be added to results later.
               }
          }
  
          // --- Fetch image data URI if needed --- 
          if (isImg && originalUrl && !originalUrl.startsWith('data:')) {
              // --- REPLACED LOGIC ---
              try {
                  const resizedDataUri = await createResizedPreviewDataUri(originalUrl);
                  if (resizedDataUri) {
                      previewSrc = resizedDataUri;
                      debugLog(`Successfully created resized preview for: ${originalUrl.substring(0, 60)}`);
                  } else {
                      // Keep originalUrl as fallback if resizing failed or was skipped
                      previewSrc = originalUrl;
                      debugLog(`Failed or skipped preview generation, using original URL for: ${originalUrl.substring(0, 60)}`);
                  }
              } catch (error) {
                   console.error(`Error generating preview for ${originalUrl.substring(0, 60)}:`, error);
                   previewSrc = originalUrl; // Fallback to original URL on error
              }
              // --- END REPLACED LOGIC ---
          } else if (isImg && originalUrl && originalUrl.startsWith('data:')) {
               // If it's already a data URI, just use it (might still be large, but less common)
               previewSrc = originalUrl;
          }
  
          // --- Get accessibility attributes --- 
          const altAttr = isImg ? el.getAttribute('alt') : null;
          const hasAltAttribute = isImg && el.hasAttribute('alt');
          const isEmptyAlt = hasAltAttribute && altAttr === '';
          const role = el.getAttribute('role');
          const titleAttr = el.getAttribute('title') || '';
          const ariaLabel = el.getAttribute('aria-label') || '';
          const svgTitleDesc = isSvg ? getSvgTitleDesc(el) : '';
          
          // Accessibility attributes - note that we check these separately
          // so one doesn't impact the other (e.g., aria-hidden shouldn't prevent link detection)
          const isAriaHidden = checkAriaHiddenRecursive(el);
          const isFocusableFalse = checkFocusableFalseRecursive(el);
          
          // --- Always look for ancestor links regardless of aria-hidden status
          const ancestorLinkElement = findAncestorLinkElementRecursive(el);
          const ancestorLinkInfo = getLinkElementDetails(ancestorLinkElement);
          const ancestorLinkOuterHTML = ancestorLinkElement ? ancestorLinkElement.outerHTML : null;
  
          // Special debug for SVGs with role="presentation" inside aria-hidden divs
          if (isSvg && (role === 'presentation' || role === 'none' || isAriaHidden) && ancestorLinkElement) {
              console.log(`[DEBUG] Decorative SVG (${id}) found with ancestor link:`, 
                          ancestorLinkElement ? ancestorLinkElement.outerHTML.substring(0, 100) + '...' : 'null');
              console.log(`[DEBUG] Link info for decorative SVG:`, ancestorLinkInfo);
          }
          
          const figureInfo = findAncestorFigureRecursive(el);
          const labelledByText = getTextForAriaIds(el.getAttribute('aria-labelledby'), el.ownerDocument || document);
          const describedByText = getTextForAriaIds(el.getAttribute('aria-describedby'), el.ownerDocument || document);
  
          // --- Process Background Images --- 
          if (isBackgroundImage) {
              for (const bgData of backgroundImageData) {
                  const bgId = `${id}${bgData.pseudo ? `-${bgData.pseudo.replace('::', '')}` : ''}`;
                  const bgOriginalUrl = bgData.url;
                  let bgPreviewSrc = bgOriginalUrl;
  
                  if (bgOriginalUrl && !bgOriginalUrl.startsWith('data:')) {
                     try {
                       const img = new Image(); img.crossOrigin = "Anonymous";
                       const loadPromise = new Promise((resolve, reject) => {
                          img.onload = () => resolve(true);
                          img.onerror = (err) => reject(new Error(`Image load failed: ${err.type || 'unknown'}`));
                          setTimeout(() => reject(new Error('Image load timeout')), 5000);
                       });
                       img.src = bgOriginalUrl;
                       try { 
                           await loadPromise;
                            // --- REPLACED LOGIC ---
                 try {
                  const resizedDataUri = await createResizedPreviewDataUri(bgOriginalUrl);
                  if (resizedDataUri) {
                      bgPreviewSrc = resizedDataUri;
                      debugLog(`Successfully created resized BG preview for: ${bgOriginalUrl.substring(0, 60)}`);
                  } else {
                      // Keep originalUrl as fallback if resizing failed or was skipped
                      // bgPreviewSrc already defaults to bgOriginalUrl
                      debugLog(`Failed or skipped BG preview generation, using original URL for: ${bgOriginalUrl.substring(0, 60)}`);
                  }
              } catch (error) {
                  console.error(`Error generating BG preview for ${bgOriginalUrl.substring(0, 60)}:`, error);
                  console.warn(`BG Canvas conversion failed, using fetch fallback: ${bgOriginalUrl.substring(0,60)}`, canvasError);
                  const dataUri = await fetchImageAsDataUri(bgOriginalUrl);
                  if (dataUri) bgPreviewSrc = dataUri;
                  // bgPreviewSrc already defaults to bgOriginalUrl
              }
              // --- END REPLACED LOGIC ---
  
  
  
   
                       } catch (loadError) {
                            const dataUri = await fetchImageAsDataUri(bgOriginalUrl);
                            if (dataUri) bgPreviewSrc = dataUri;
                       }
                   } catch (fetchError) {
                       console.error(`Error loading BG image data for: ${bgOriginalUrl.substring(0,60)}`, fetchError);
                   }
                  }
                   
                  let bgEffectiveLabel = ariaLabel || labelledByText || titleAttr;
                  let bgAltStatus = bgEffectiveLabel ? `Accessible Name: ${bgEffectiveLabel}` :
                      (role === 'presentation' || role === 'none' || isAriaHidden) ? `Decorative Background (${bgData.pseudo || 'element'})` :
                      `Background (${bgData.pseudo || 'element'}) - No alt`;
                   
                   results.push({ 
                       id: bgId, 
                       type: `background${bgData.pseudo ? `-${bgData.pseudo.replace('::', '')}` : ''}`,                     
                       isSvg: false, 
                       isImg: false, 
                       isBackgroundImage: true, 
                       pseudoElement: bgData.pseudo, 
                       isInShadowDom: isInShadowDom,
                       originalUrl: bgOriginalUrl,
                       previewSrc: bgPreviewSrc,
                       outerHTML: originalOuterHTML,
                       altStatus: bgAltStatus, 
                       alt: null, 
                       isEmptyAlt: false, 
                       hasAltAttribute: false, 
                       role: role, 
                       isAriaHidden: isAriaHidden,
                       isFocusableFalse: isFocusableFalse,
                       ariaLabel: ariaLabel, 
                       labelledByText: labelledByText, 
                       describedByText: describedByText, 
                       title: titleAttr, 
                       svgTitleDesc: '',
                       ancestorLinkInfo: ancestorLinkInfo, 
                       ancestorLinkOuterHTML: ancestorLinkOuterHTML, 
                       figureInfo: figureInfo, 
                       hasUseTag: false, 
                       useHref: null 
                   });
              }
          }
  
          // --- Add the main element result (img or svg) --- 
          if ((isImg && originalUrl) || (isSvg && previewSrc)) {
               // For SVGs, calculate effectiveLabel but don't let role="presentation" or aria-hidden 
               // affect whether we show link information
               let effectiveLabel = isSvg ? (ariaLabel || labelledByText || svgTitleDesc || titleAttr) :
                  (altAttr || ariaLabel || labelledByText || titleAttr);
               
               let altStatus = 'Unknown';
               if (isSvg) {
                  // Determine the alt status - we still report if it's decorative for alt status purposes
                  const isDecorative = (role === 'presentation' || role === 'none' || isAriaHidden);
                  altStatus = effectiveLabel ? `Accessible Name: ${effectiveLabel}` :
                              isDecorative ? 'Decorative SVG' :
                              'Missing accessible name';
  
                  // Special debug for SVGs to see if link info is being lost
                  if (isDecorative && ancestorLinkElement) {
                      console.log(`[DEBUG] Decorative SVG (${id}) found with ancestor link:`, 
                                  ancestorLinkElement ? ancestorLinkElement.outerHTML.substring(0, 100) + '...' : 'null');
                      console.log(`[DEBUG] Link info for decorative SVG:`, ancestorLinkInfo);
                  }
               } else {
                  altStatus = !hasAltAttribute ? 'Missing alt attribute' :
                              isEmptyAlt ? 'Empty alt attribute' :
                              `Alt: ${altAttr}`;
               }
  
               // Create a special ancestorLinkInfo object if for some reason it's missing
               // Try harder to create link info for SVGs inside links
               let finalAncestorLinkInfo;
  
               if (ancestorLinkInfo && Object.keys(ancestorLinkInfo).length > 0 && ancestorLinkInfo.isLink) {
                   // Good case: We have proper link info
                   finalAncestorLinkInfo = ancestorLinkInfo;
                   console.log(`[DEBUG] Using existing ancestor link info for ${id}:`, finalAncestorLinkInfo);
               } else if (ancestorLinkElement) {
                   // Link element exists but info object wasn't created correctly
                   // Create a minimal but working link info object
                   console.log(`[DEBUG] Creating manual link info for ${id} from:`, 
                               ancestorLinkElement.tagName.toLowerCase());
                   
                   // Safely get properties
                   let linkTextContent = '';
                   try {
                       linkTextContent = ancestorLinkElement.textContent?.trim() || '';
                   } catch (e) { 
                       console.log(`[DEBUG] Error getting link text:`, e);
                   }
                   
                   // Create simplified link info
                   finalAncestorLinkInfo = { 
                       isLink: true, 
                       tagName: ancestorLinkElement.tagName.toLowerCase(),
                       linkTextContent: linkTextContent,
                       linkTitle: ancestorLinkElement.getAttribute ? (ancestorLinkElement.getAttribute('title') || null) : null,
                       linkAriaLabel: ancestorLinkElement.getAttribute ? (ancestorLinkElement.getAttribute('aria-label') || null) : null
                   };
                   console.log(`[DEBUG] Created manual link info:`, finalAncestorLinkInfo);
               } else {
                   // No link found
                   finalAncestorLinkInfo = { isLink: false };
                   console.log(`[DEBUG] No link found for ${id}, using:`, finalAncestorLinkInfo);
               }
  
               results.push({
                  id: id,
                  type: tagName,
                  isSvg: isSvg,
                  isImg: isImg,
                  isBackgroundImage: false,
                  pseudoElement: null,
                  isInShadowDom: isInShadowDom,
                  originalUrl: originalUrl,
                  previewSrc: previewSrc,
                  backgroundImageUrls: backgroundImageData.filter(bg => !bg.pseudo).map(bg => bg.url),
                  outerHTML: originalOuterHTML,
                  altStatus: altStatus,
                  alt: altAttr,
                  isEmptyAlt: isEmptyAlt,
                  hasAltAttribute: hasAltAttribute,
                  role: role,
                  isAriaHidden: isAriaHidden,
                  isFocusableFalse: isFocusableFalse,
                  ariaLabel: ariaLabel,
                  labelledByText: labelledByText,
                  describedByText: describedByText,
                  title: titleAttr,
                  svgTitleDesc: svgTitleDesc,
                  ancestorLinkInfo: finalAncestorLinkInfo, // Always include link info even for decorative SVGs
                  ancestorLinkOuterHTML: ancestorLinkOuterHTML,
                  figureInfo: figureInfo,
                  hasUseTag: hasUseTag,
                  useHref: useHref,
                  absoluteUseHref: absoluteUseHref
               });
          }
  
          return results; 
      });
  
      return Promise.all(imagePromises).then(resultsArrays => 
          resultsArrays.filter(result => result !== null).flat()
      );
  }
  
  // Function to highlight images with their alt text status
  function highlightImages(enabled) {
    const images = findAllElementsRecursive('img'); // Use recursive find
    if (!images || images.length === 0) {
      return true;
    }
    
    // First, remove any existing indicators and wrappers
    // Indicators are appended to body, so querySelectorAll is fine here
    document.querySelectorAll('.image-alt-indicator').forEach(indicator => {
      indicator.remove();
    });
    
    if (enabled) {
      // Create a style element if it doesn't exist yet
      let styleEl = document.getElementById('image-alt-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'image-alt-styles';
        styleEl.textContent = `
          .image-alt-indicator {
            position: fixed;
            background: black;
            color: white;
            padding: 4px 8px;
            font-size: 12px;
            text-align: center;
            border: 2px dashed white;
            word-break: break-word;
            z-index: 2147483647;
            box-sizing: content-box;
            max-width: 300px;
            pointer-events: none;
          }
        `;
        document.head.appendChild(styleEl);
      }
      
      // Function to update indicator positions
      function updateIndicatorPositions() {
        document.querySelectorAll('.image-alt-indicator').forEach(indicator => {
          const imageId = indicator.getAttribute('data-for-image');
          const img = findElementRecursive(`[data-image-id="${imageId}"]`); // Use recursive find
          if (img) {
            const rect = img.getBoundingClientRect();
            // Skip very small images (likely icons)
            if (rect.width < 10 || rect.height < 10) {
              indicator.style.display = 'none';
              return;
            }
            
            // Position just below the image
            indicator.style.left = `${Math.max(0, rect.left)}px`;
            indicator.style.top = `${rect.bottom + 5}px`;
            indicator.style.width = `${Math.min(300, rect.width)}px`;
            indicator.style.display = 'block';
            
            // If indicator is outside viewport, hide it
            if (
              indicator.getBoundingClientRect().right > window.innerWidth ||
              indicator.getBoundingClientRect().bottom > window.innerHeight ||
              indicator.getBoundingClientRect().top < 0 ||
              indicator.getBoundingClientRect().left < 0
            ) {
              indicator.style.display = 'none';
            }
          } else {
            // Remove indicators for images that no longer exist
            indicator.remove();
          }
        });
      }
      
      // Add indicators for each image found recursively
      images.forEach(img => {
        // Skip very small images (likely icons)
        const rect = img.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
          return;
        }
        
        // Create the indicator
        const altIndicator = document.createElement('div');
        altIndicator.className = 'image-alt-indicator';
        
        // Determine alt status
        const hasAltAttribute = img.hasAttribute('alt');
        const altText = img.getAttribute('alt') || '';
        
        if (!hasAltAttribute) {
          altIndicator.textContent = 'No alt attribute';
        } else if (altText.trim() === '') {
          altIndicator.textContent = 'Empty alt attribute';
        } else {
          altIndicator.textContent = 'Alt: ' + altText;
        }
        
        // Link the indicator to the image
        // Ensure the image has an ID (might have been added in getAllImages, but double check)
        let imageId = img.getAttribute('data-image-id');
        if (!imageId) {
          imageId = Math.random().toString(36).substr(2, 9);
          img.setAttribute('data-image-id', imageId);
        }
        altIndicator.setAttribute('data-for-image', imageId);
        
        // Add indicator to document body (fixed positioning works globally)
        document.body.appendChild(altIndicator);
      });
      
      // Initial positioning
      updateIndicatorPositions();
      
      // Update positions on scroll or resize
      window.addEventListener('scroll', updateIndicatorPositions, { passive: true });
      window.addEventListener('resize', updateIndicatorPositions, { passive: true });
      
      // Store the update function on window so we can remove it later
      window._updateImageAltIndicators = updateIndicatorPositions;
      
      // Update periodically to handle dynamic content
      window._imageAltIntervalId = setInterval(updateIndicatorPositions, 500);
    } else {
      // Remove event listeners and interval
      if (window._updateImageAltIndicators) {
        window.removeEventListener('scroll', window._updateImageAltIndicators);
        window.removeEventListener('resize', window._updateImageAltIndicators);
        window._updateImageAltIndicators = null;
      }
      
      if (window._imageAltIntervalId) {
        clearInterval(window._imageAltIntervalId);
        window._imageAltIntervalId = null;
      }
      
      // Remove the style element
      const styleEl = document.getElementById('image-alt-styles');
      if (styleEl) {
        styleEl.remove();
      }
    }
    
    return true;
  }
  
  // Function to scroll to an image
  function scrollToImage(imageId) {
    const image = findElementRecursive(`[data-image-id="${imageId}"]`); // Use recursive find
    if (image) {
      image.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Added block: center for better visibility
      
      // Add highlight effect
      const originalOutline = image.style.outline;
      const originalOutlineOffset = image.style.outlineOffset;
      
      image.style.outline = '2px solid #007bff';
      image.style.outlineOffset = '2px';
  
      // Remove highlight after 2 seconds
      setTimeout(() => {
        image.style.outline = originalOutline;
        image.style.outlineOffset = originalOutlineOffset;
      }, 2000);
      
      return true;
    }
    return false;
  }
  
  // Function to inspect an image
  function inspectImage(imageId) {
    const image = findElementRecursive(`[data-image-id="${imageId}"]`); // Use recursive find
    if (image) {
      // The inspect function is provided by Chrome DevTools
      if (typeof inspect === 'function') {
        inspect(image);
        return true;
      } else {
        console.log('Inspect function not available');
      }
    }
    return false;
  }
  
  
  async function analyzePageImages(){
      const images = await getAllImages(); // Wait for the result
      return images; // Return the actual result
  }
  
  // --- Listener for requests from content.js (via window.postMessage) ---
  window.addEventListener('message', async function(event) {
    // Only accept messages from the same window
    if (event.source !== window || !event.data) {
      return;
    }
  
    const request = event.data;
  
    // Check if it's a request for the image analyzer
    if (request.type === 'IMAGE_ANALYZER_REQUEST') {
      console.log('images.js (page context) received request:', request.action);
      let responseData = null;
      let success = false;
      let error = null;
  
      try {
        switch (request.action) {
          case 'getAllImages':
            responseData = await analyzePageImages();
            success = true;
            break;
          case 'highlightImages':
            success = highlightImages(request.enabled);
            break;
          case 'scrollToImage':
            success = scrollToImage(request.imageId);
            break;
          case 'inspectImage':
            success = inspectImage(request.imageId);
            break;
          default:
             error = 'Unknown action in images.js';
             console.warn(error, request.action);
             break;
        }
      } catch (e) {
          console.error(`Error executing action '${request.action}' in images.js:`, e);
          success = false;
          error = e.message || 'An unexpected error occurred.';
      }
  
      // Send response back to content.js
      window.postMessage({
        type: 'IMAGE_ANALYZER_RESPONSE',
        action: request.action,
        requestId: request.requestId, // Include the request ID for tracking
        success: success,
        data: responseData, // Only include data if relevant (like for getAllImages)
        error: error
      }, '*');
    }
  });
  // --- End window.postMessage listener ---
  
  // --- Listener removed: This code runs in page context, cannot use chrome.runtime --- 
  // chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { ... });
  // console.log("Content script runtime message listener added.");
  // --- End removed listener ---
  
  // REMOVED: fetchImageAsDataUri, convertBlobToDataUri
  // REMOVED: IIFE wrapper (let's try simplest setup first)
  // REMOVED: window.addEventListener('message', ...) unless specifically needed for page interaction
  
  // Keep functions: highlightImages, scrollToImage, inspectImage
  // Keep helper: safePostMessage (if using window.message listener)
  
  // Helper function to safely post messages (ensure it targets the correct window/context)
  function safePostMessage(data, targetOrigin = '*') { // Default to wildcard for simplicity, refine if needed
    try {
      // This needs adjustment depending on how panel and content script communicate
      // If using chrome.runtime.sendMessage, this function isn't used for panel comms
      // Assuming window.postMessage for now for page script comms
      window.postMessage(data, targetOrigin);
  
      // If communicating back to the panel that potentially posted a message:
      // Need a reference to the panel's window or use chrome.runtime messaging
      // Example placeholder for sending back to potentially the source window (panel?)
      if (window.parent && window.parent !== window) { // Basic check if potentially in an iframe/different context
         // console.log("Attempting postMessage to parent for panel response");
         // window.parent.postMessage(data, targetOrigin); // Might not be correct context
      }
  
    } catch (error) {
      console.error('Error posting message:', error);
    }
  }
  
  // IMPORTANT: Communication between panel.js and images.js (content script)
  // is typically done using chrome.runtime.sendMessage from the panel and
  // chrome.runtime.onMessage.addListener in the content script.
  // The window.addEventListener('message', ...) approach might need replacement
  // if you are using the standard extension messaging system.
  // I'll assume standard messaging for the panel.js part below. 
  
  // Make the main function async
  async function findBackgroundImages() {
    console.log("🔍 Starting comprehensive background image search...");
    const backgroundImages = [];
    const uniqueUrls = new Set();
    let idCounter = 0;
  
    if (!window.__bgElements) window.__bgElements = new Map();
  
    // Make processStylesheets async
    async function processStylesheets() {
      try {
        for (const stylesheet of Array.from(document.styleSheets)) {
          try {
            const rules = stylesheet.cssRules || stylesheet.rules;
            if (!rules) continue;
  
            for (const rule of Array.from(rules)) {
              if (rule instanceof CSSStyleRule && rule.style.backgroundImage) {
                try {
                  const elements = document.querySelectorAll(rule.selectorText);
                  for (const element of elements) {
                    await processElement(element);
                  }
                } catch (e) { /* Skip invalid selectors */ }
              }
              else if (rule instanceof CSSMediaRule) {
                for (const mediaRule of Array.from(rule.cssRules)) {
                  if (mediaRule instanceof CSSStyleRule && mediaRule.style.backgroundImage) {
                    try {
                      const elements = document.querySelectorAll(mediaRule.selectorText);
                      for (const element of elements) {
                        await processElement(element);
                      }
                    } catch (e) { /* Skip invalid selectors */ }
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Could not access stylesheet:', e);
          }
        }
      } catch (e) {
        console.warn('Error processing stylesheets:', e);
      }
    }
  
    // Execute both methods for maximum coverage
    await processAllElements();
    await processStylesheets();
  
    console.log(`🔍 Found ${backgroundImages.length} unique CSS background images`);
    return backgroundImages;
  }
  
  // Modify the findSvgSymbolById function to also check for similar icons:
  function findSvgSymbolById(symbolId, rootNode = document) {
    // First try with the improved findElementRecursive
    const element = findElementRecursive(`#${symbolId}`, rootNode);
    if (element) return element;
    
    // For SVG symbols, try additional techniques
    try {
      // 1. Check if any <symbol> elements exist at all (for debugging)
      const allSymbols = rootNode.querySelectorAll('symbol');
      console.log(`Found ${allSymbols.length} symbol elements in document`);
      
      // 2. Check for sprites/icons that might have partial ID matches
      if (symbolId.includes('Arrow') || symbolId.includes('Icon')) {
        const partialMatches = Array.from(rootNode.querySelectorAll('symbol[id*="Arrow"], symbol[id*="Icon"]'));
        console.log(`Found ${partialMatches.length} partially matching symbols:`, 
                  partialMatches.map(el => el.id).join(', '));
        
        // 3. NEW: If this is an arrow icon and we found no matches, look for similar icons
        if (symbolId.includes('Arrow') && partialMatches.length === 0) {
          console.log('Looking for similar arrow icons in navigation...');
          const similarArrows = extractArrowPathFromSimilarIcons();
          if (similarArrows) {
            console.log(`Found ${similarArrows.length} similar arrow icons without use tags`);
            // Create a synthetic symbol based on the first found arrow
            const syntheticSymbol = document.createElementNS('http://www.w3.org/2000/svg', 'symbol');
            syntheticSymbol.id = symbolId;
            syntheticSymbol.setAttribute('viewBox', '0 0 24 24');
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', similarArrows[0].d);
            pathEl.setAttribute('stroke', 'currentColor');
            pathEl.setAttribute('fill', 'none');
            syntheticSymbol.appendChild(pathEl);
            
            // Insert into the document so it can be found
            const defs = document.querySelector('defs') || document.createElement('defs');
            if (!document.querySelector('defs')) {
              document.body.appendChild(defs);
            }
            defs.appendChild(syntheticSymbol);
            
            return syntheticSymbol;
          }
        }
      }
      
      // 4. As a last resort, check if there's a <use> tag that references this symbol
      const useElements = rootNode.querySelectorAll('use[href="#' + symbolId + '"]');
      if (useElements.length > 0) {
        console.log(`Found ${useElements.length} use elements referencing #${symbolId}`);
      }
    } catch(e) {
      console.warn('Error in symbol search:', e);
    }
    
    return null;
  }
  
  // Function to extract the path data from similar arrow icons on the page
  function extractArrowPathFromSimilarIcons() {
    // Look for SVG icons in navigation contexts that have direct path elements (not use tags)
    const navSvgs = document.querySelectorAll('nav svg, [role="navigation"] svg, .navigation svg, .nav svg');
    const arrowPaths = [];
    
    // Check each SVG for direct path elements
    for (const svg of navSvgs) {
      if (!svg.querySelector('use')) {
        const paths = svg.querySelectorAll('path');
        for (const path of paths) {
          const d = path.getAttribute('d');
          if (d && (
            // Common patterns for right arrows
            d.includes('M9') || 
            d.includes('l6') ||
            d.includes('-6') ||
            d.includes('L12')
          )) {
            arrowPaths.push({
              d: d,
              svg: svg.outerHTML
            });
          }
        }
      }
    }
    
    return arrowPaths.length > 0 ? arrowPaths : null;
  }
  
  function isLikelyArrowIcon(symbolId) {
      if (!symbolId) return false;
      const lowerId = symbolId.toLowerCase();
      return lowerId.includes('arrow') ||
             lowerId.includes('chevron') ||
             lowerId.includes('caret') ||
             lowerId.includes('next') ||
             lowerId.includes('prev') ||
             lowerId.includes('back');
  }
  
  function createDefaultArrowSvg(originalSvg) {
      const viewBox = originalSvg.getAttribute('viewBox') || '0 0 24 24';
      const width = '24'; // Force fixed size for preview robustness
      const height = '24';
      const explicitColor = '#333333'; // Use an explicit dark grey
  
      // Standard Material Design arrow-right path
      const arrowPathData = "M9 18l6-6-6-6";
  
      // Create a clean, minimal SVG
      // Set fill/stroke directly on the path, remove fill from svg element
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}">
          <path d="${arrowPathData}" fill="none" stroke="${explicitColor}" stroke-width="2"/>
      </svg>`;
  }
  
  // Add this helper function BEFORE getAllImages
  function resolveCssVariablesInSvg(svgElement) {
      try {
          const clonedSvg = svgElement.cloneNode(true);
  
          // Select elements that might use CSS variables for fill/stroke in the ORIGINAL element
          const originalElements = svgElement.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon, text, g');
          // Select corresponding elements in the CLONE
          const clonedElements = clonedSvg.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon, text, g');
  
          if (originalElements.length !== clonedElements.length) {
              console.warn('Mismatch between original and cloned SVG elements for CSS var resolution. Skipping.', svgElement);
              return clonedSvg.outerHTML; // Return clone's outerHTML as fallback
          }
  
          originalElements.forEach((origEl, index) => {
              const clonedEl = clonedElements[index];
              if (!clonedEl) return; // Should not happen if lengths match
  
              try {
                  const computedStyle = window.getComputedStyle(origEl);
                  const computedFill = computedStyle.getPropertyValue('fill');
                  const computedStroke = computedStyle.getPropertyValue('stroke');
                  const computedOpacity = computedStyle.getPropertyValue('opacity');
                  const computedFillOpacity = computedStyle.getPropertyValue('fill-opacity');
                  const computedStrokeOpacity = computedStyle.getPropertyValue('stroke-opacity');
  
                  // Apply computed values ONLY if they are not the default/initial ones
                  // or if the original attribute explicitly used 'var('
                  // This prevents overriding meaningful 'none' or specific color values unnecessarily
                  // However, simpler approach: always apply computed style for robustness
  
                  if (computedFill) {
                      clonedEl.setAttribute('fill', computedFill);
                  }
                  if (computedStroke && computedStroke !== 'none') { // Avoid setting stroke="none"
                      clonedEl.setAttribute('stroke', computedStroke);
                  }
  
                  // Also handle opacities which might be needed for effects
                  if (computedOpacity && computedOpacity !== '1') {
                      clonedEl.setAttribute('opacity', computedOpacity);
                  }
                  if (computedFillOpacity && computedFillOpacity !== '1') {
                      clonedEl.setAttribute('fill-opacity', computedFillOpacity);
                  }
                  if (computedStrokeOpacity && computedStrokeOpacity !== '1') {
                      clonedEl.setAttribute('stroke-opacity', computedStrokeOpacity);
                  }
  
              } catch (styleError) {
                  console.warn('Error getting computed style for SVG child:', styleError, origEl);
              }
          });
  
          return clonedSvg.outerHTML;
      } catch (cloneError) {
          console.error('Error resolving CSS variables in SVG:', cloneError, svgElement);
          // Fallback to original outerHTML if cloning/processing fails
          return svgElement.outerHTML;
      }
  }
  
   