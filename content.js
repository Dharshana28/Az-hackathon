// Add this to the end of your existing content.js file

// Listen for messages from the background script for word replacement
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "replaceWord") {
      const selectedText = window.getSelection().toString();
      const replacementWord = request.simplifiedWord;
      
      if (selectedText && replacementWord) {
        // Create a temporary element to hold our replacement
        const tempElement = document.createElement('span');
        tempElement.className = 'simplified-word';
        tempElement.textContent = replacementWord;
        tempElement.style.backgroundColor = '#e6ffe6';
        tempElement.style.padding = '0 2px';
        tempElement.title = 'Original: ' + selectedText;
        
        // Get the selection and replace it
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(tempElement);
          
          // Clear selection
          selection.removeAllRanges();
          
          // Fade effect
          setTimeout(() => {
            tempElement.style.transition = 'background-color 2s';
            tempElement.style.backgroundColor = 'transparent';
          }, 100);
        }
        
        sendResponse({success: true});
      } else {
        sendResponse({success: false, error: "No text selected or no replacement available"});
      }
      return true;
    }
  });
