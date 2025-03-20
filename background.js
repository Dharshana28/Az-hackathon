// Background script for AI integration
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background script received message:", request.action);
    
    if (request.action === "generateVisual") {
      console.log("Generating AI-based visual... (Connect to an AI API like Napkin AI)");
      sendResponse({status: "Visual generation request received"});
    } else if (request.action === "createPPT") {
      console.log("Creating PowerPoint presentation... (Use PptxGenJS or another library)");
      sendResponse({status: "PowerPoint creation request received"});
    } else if (request.action === "getAISummary") {
      console.log("Processing AI summary request");
      
      // Get the page data
      const pageData = request.data;
      
      // Call the AI API to get the summary
      fetchAISummary(pageData)
        .then(response => {
          console.log("AI API response received:", response);
          sendResponse({
            success: true,
            summary: response.summary,
            simplified: response.simplified
          });
        })
        .catch(error => {
          console.error("AI API error:", error);
          sendResponse({
            success: false,
            error: error.message || "Failed to get AI summary"
          });
        });
      
      return true; // Keep the communication channel open for async response
    } else if (request.action === "testApiConnection") {
      console.log("Testing API connection");
      
      // Simple test request to Cohere API
      testApiConnection(request.apiKey)
        .then(result => {
          console.log("API test result:", result);
          sendResponse({
            success: true,
            message: "API connection successful"
          });
        })
        .catch(error => {
          console.error("API test error:", error);
          sendResponse({
            success: false,
            error: error.message || "Failed to connect to API"
          });
        });
        
      return true; // Keep the communication channel open for async response
    }
    
    return true;
  });
  
  // Function to test API connection
  async function testApiConnection(apiKey) {
    const apiEndpoint = "https://api.cohere.ai/v1/generate";
    
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model: "command",
        prompt: "Hello",
        max_tokens: 5
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API request failed: ${errorData.message || response.statusText}`);
    }
    
    return await response.json();
  }
  
  // Function to call the AI API
  async function fetchAISummary(pageData) {
    console.log("Fetching AI summary for:", pageData.title);
    
    try {
      // Get the API key from storage
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(['cohere_api_key'], resolve);
      });
      
      const apiKey = result.cohere_api_key;
      
      if (!apiKey) {
        throw new Error("API key not found. Please set your Cohere API key in the extension settings.");
      }
      
      // Replace with Cohere API endpoint
      const apiEndpoint = "https://api.cohere.ai/v1/generate";
      
      // Create the prompt for the AI
      const prompt = `
        Webpage Title: ${pageData.title}
        
        Content: ${pageData.content}
        
        Based on the above content, please provide:
        1. A comprehensive summary of the main points
        2. A simplified version that's easy to understand (use simple language)
        
        Format your response as follows:
        SUMMARY:
        [Your comprehensive summary here]
        
        SIMPLIFIED:
        [Your simplified version here]
      `;
      
      console.log("Sending request to Cohere API");
      
      // Make the API request
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json"
        },
        body: JSON.stringify({
          model: "command",
          prompt: prompt,
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${errorData.message || response.statusText}`);
      }
      
      const data = await response.json();
      console.log("API response data:", data);
      
      // Extract the content from the API response
      const aiResponse = data.generations[0].text;
      
      // Parse the response to get the summary and simplified versions
      const summaryMatch = aiResponse.match(/SUMMARY:\s*([\s\S]*?)(?=SIMPLIFIED:|$)/);
      const simplifiedMatch = aiResponse.match(/SIMPLIFIED:\s*([\s\S]*?)$/);
      
      return {
        summary: summaryMatch ? summaryMatch[1].trim() : "No summary generated",
        simplified: simplifiedMatch ? simplifiedMatch[1].trim() : "No simplified version generated"
      };
    } catch (error) {
      console.error("Error fetching AI summary:", error);
      throw error;
    }
  }
  
  // Add context menu for word simplification
  chrome.runtime.onInstalled && chrome.runtime.onInstalled.addListener(function() {
    chrome.contextMenus.create({
      id: "simplifyWord",
      title: "Simplify this word",
      contexts: ["selection"]
    });
  });
  
  // Handle context menu clicks
  chrome.contextMenus.onClicked && chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "simplifyWord") {
      const selectedText = info.selectionText;
      
      if (selectedText) {
        // Get API key from storage
        chrome.storage.sync.get(['cohere_api_key'], async function(result) {
          const apiKey = result.cohere_api_key;
          
          if (!apiKey) {
            // Notify user they need to set an API key
            chrome.scripting.executeScript({
              target: {tabId: tab.id},
              function: () => {
                alert("Please set your Cohere API key in the extension settings.");
              }
            });
            return;
          }
          
          try {
            // Call Cohere API to simplify the word
            const response = await fetch("https://api.cohere.ai/v1/generate", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "Accept": "application/json"
              },
              body: JSON.stringify({
                model: "command",
                prompt: `Provide a simpler alternative for the word or phrase: "${selectedText}". Reply with only the simplified word or short phrase.`,
                max_tokens: 50,
                temperature: 0.3
              })
            });
            
            if (!response.ok) {
              throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            const simplifiedWord = data.generations[0].text.trim();
            
            // Send the simplified word to content script for replacement
            chrome.tabs.sendMessage(tab.id, {
              action: "replaceWord",
              simplifiedWord: simplifiedWord
            });
            
          } catch (error) {
            console.error("Error simplifying word:", error);
            chrome.scripting.executeScript({
              target: {tabId: tab.id},
              function: (errorMsg) => {
                alert("Error simplifying word: " + errorMsg);
              },
              args: [error.message]
            });
          }
        });
      }
    }
  });
