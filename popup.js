document.getElementById("scan-btn").addEventListener("click", async () => {
  const statusDiv = document.getElementById("status");
  const metricsSection = document.getElementById("metricsSection");
  const warningsSection = document.getElementById("warningsSection");
  const trapsSection = document.getElementById("trapsSection");
  const recSection = document.getElementById("recSection");
  const trapsList = document.getElementById("trapsList");

  // Clear Dashboard Panels
  metricsSection.style.display = "none";
  warningsSection.style.display = "none";
  trapsSection.style.display = "none";
  recSection.style.display = "none";
  trapsList.innerHTML = "";
  statusDiv.textContent = "Analyzing site ecosystem... ⚙️";

  // ⚠️ PASTE YOUR COPIED GEMINI API KEY HERE!
  const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";

  if (GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" || !GEMINI_API_KEY) {
    statusDiv.style.color = "#ff6b6b";
    statusDiv.textContent = "❌ Missing API Key in popup.js!";
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      statusDiv.textContent = "Cannot scan this viewport layer.";
      return;
    }

    const currentDomain = new URL(tab.url).hostname;
    statusDiv.textContent = `Auditing: ${currentDomain}...`;

    // Strictly engineered parameters to control length, risk tags, time configurations and traps list
    const dynamicPrompt = `You are an automated threat auditor analyzing "${currentDomain}". 
    Evaluate its security landscape. You must return EXACTLY this format structure without using any bold symbols, asterisks, or markdown characters:
    SCORE: [Single integer value 0-100]
    TIME_ESTIMATE: [Estimated minutes it would take a human to read full TOS/Security docs of this site, e.g., 25]
    PHISH: [Start text with "Green", "Yellow", or "Red" followed by a space and a very short 1-sentence assessment]
    SSL: [Start text with "Green", "Yellow", or "Red" followed by a space and a very short 1-sentence assessment]
    AGE: [Start text with "Green", "Yellow", or "Red" followed by a space and a very short 1-sentence assessment]
    TRACK: [Start text with "Green", "Yellow", or "Red" followed by a space and a very short 1-sentence assessment]
    TRAPS: [Provide a comma-separated list of 2 or 3 brief hidden traps, auto-renewal configurations, dark patterns, or security missing flags found here. If clear, write "No major traps found"]
    RECOMMENDATION: [Write exactly a clean, short 1-line verdict action statement for the user]`;

    const apiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const serverResponse = await fetch(apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: dynamicPrompt }] }] })
    });

    if (!serverResponse.ok) throw new Error(`API Error: ${serverResponse.status}`);

    const dataPayload = await serverResponse.json();
    const rawAiOutput = dataPayload.candidates[0].content.parts[0].text;
    
    statusDiv.textContent = ""; 

    // Target Value Parsers
    const scoreMatch = rawAiOutput.match(/SCORE:\s*(\d+)/i);
    const timeMatch = rawAiOutput.match(/TIME_ESTIMATE:\s*(\d+)/i);
    const phishMatch = rawAiOutput.match(/PHISH:\s*(.*)/i);
    const sslMatch = rawAiOutput.match(/SSL:\s*(.*)/i);
    const ageMatch = rawAiOutput.match(/AGE:\s*(.*)/i);
    const trackMatch = rawAiOutput.match(/TRACK:\s*(.*)/i);
    const trapsMatch = rawAiOutput.match(/TRAPS:\s*(.*)/i);
    const recMatch = rawAiOutput.match(/RECOMMENDATION:\s*(.*)/i);

    // 1. Process Core Metric Row (Score + Reading Saved Calculation)
    if (scoreMatch) {
      const numericScore = parseInt(scoreMatch[1]);
      const scoreElement = document.getElementById("trustVal");
      scoreElement.textContent = numericScore;
      
      if (numericScore >= 80) scoreElement.style.color = "#1dd1a1";
      else if (numericScore >= 50) scoreElement.style.color = "#feca57";
      else scoreElement.style.color = "#ff6b6b";

      // Calculate time metrics dynamically
      const originalTime = timeMatch ? parseInt(timeMatch[1]) : 20;
      document.getElementById("timeVal").textContent = `${originalTime}m`;
      document.getElementById("timeSub").textContent = `${originalTime}min doc → 30s check`;

      metricsSection.style.display = "grid";
    }

    // 2. Hydrate Hidden Traps Unfolded Row
    if (trapsMatch) {
      const trapsText = trapsMatch[1].trim();
      if (trapsText.toLowerCase().includes("no major traps")) {
        trapsList.innerHTML = `<li>🟢 No hidden operational dark patterns found.</li>`;
      } else {
        const trapsArray = trapsText.split(",");
        trapsArray.forEach(trap => {
          if (trap.trim()) {
            trapsList.innerHTML += `<li>🔴 ${trap.trim()}</li>`;
          }
        });
      }
      trapsSection.style.display = "block";
    }

    // 3. Process All Warnings Simultaneously with 🔴 🟡 🟢 Levels
    processRiskCard("cardPhish", "txtPhish", phishMatch ? phishMatch[1] : "Green Secure layout.");
    processRiskCard("cardSsl", "txtSsl", sslMatch ? sslMatch[1] : "Green Secure layout.");
    processRiskCard("cardAge", "txtAge", ageMatch ? ageMatch[1] : "Green Secure layout.");
    processRiskCard("cardData", "txtData", trackMatch ? trackMatch[1] : "Green Secure layout.");
    warningsSection.style.display = "grid";

    // 4. Update 1-2 Line Recommendation Block
    if (recMatch) {
      document.getElementById("recVal").textContent = recMatch[1].trim();
      recSection.style.display = "block";
    }

  } catch (error) {
    console.error(error);
    statusDiv.style.color = "#ff6b6b";
    statusDiv.textContent = "Node communication error.";
  }
});

// Decodes risk prefix tags and structures the card classes instantly
function processRiskCard(cardId, textId, rawResponseStr) {
  const targetCard = document.getElementById(cardId);
  const targetText = document.getElementById(textId);
  
  // Clean string prefixes
  let cleanText = rawResponseStr.trim();
  let riskIndicator = "green";

  if (cleanText.toLowerCase().startsWith("red")) {
    riskIndicator = "red";
    cleanText = "🔴 " + cleanText.substring(3).trim();
  } else if (cleanText.toLowerCase().startsWith("yellow")) {
    riskIndicator = "yellow";
    cleanText = "🟡 " + cleanText.substring(6).trim();
  } else if (cleanText.toLowerCase().startsWith("green")) {
    riskIndicator = "green";
    cleanText = "🟢 " + cleanText.substring(5).trim();
  }

  if (targetText) targetText.textContent = cleanText;

  // Apply visual colors
  targetCard.classList.remove("risk-high", "risk-medium", "risk-safe");
  if (riskIndicator === "red") targetCard.classList.add("risk-high");
  else if (riskIndicator === "yellow") targetCard.classList.add("risk-medium");
  else targetCard.classList.add("risk-safe");
}  
