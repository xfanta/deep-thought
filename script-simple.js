const btn = document.getElementById("recordBtn");
const output = document.getElementById("outputText");

let mediaRecorder, audioChunks = [];
let isRecording = false;
let currentThreadId = localStorage.getItem("assistant_thread_id") || null;
let audioContext, analyser, microphone, dataArray;
let silenceStart = null;
let silenceThreshold = 30; // Práh ticha (0-255)
let silenceDuration = 4000; // 4 sekundy ticha pro automatické ukončení
let conversationHistory = JSON.parse(localStorage.getItem("conversation_history") || "[]");

// Kontrola URL parametrů pro API klíč a Assistant ID
const urlParams = new URLSearchParams(window.location.search);
const urlApiKey = urlParams.get('key') || urlParams.get('api_key') || urlParams.get('apikey');
const urlAssistantId = urlParams.get('assistant') || urlParams.get('assistant_id');

// Uložení do localStorage pokud jsou v URL
if (urlApiKey) {
  localStorage.setItem('openai_api_key', urlApiKey);
  console.log('✅ API klíč načten z URL a uložen');
  // Vyčistíme URL z bezpečnostních důvodů
  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);
}

if (urlAssistantId) {
  localStorage.setItem('assistant_id', urlAssistantId);
  console.log('✅ Assistant ID načten z URL a uložen');
}

// Zobrazíme aktuální nastavení v konzoli
console.log('🔧 Nastavení Hlubiny Myšlení:');
if (typeof CONFIG !== 'undefined' && CONFIG) {
  console.log(`   Model: ${CONFIG.MODEL || 'gpt-4o'}`);
  console.log(`   Hlas: ${CONFIG.VOICE || 'onyx'}`);
  console.log(`   Max tokeny: ${CONFIG.MAX_TOKENS || 500}`);
  console.log(`   ID asistenta: ${CONFIG.ASSISTANT_ID || 'Nebyl nastaven'}`);
  console.log(`   API klíč: ${CONFIG.OPENAI_API_KEY ? '✅ Nastaven' : '❌ Chybí'}`);
} else {
  console.log('   ⚠️ Konfigurace nebyla načtena - bude vyžadováno ruční zadání');
}

btn.addEventListener("click", async () => {
  if (!isRecording) {
    try {
      await startRecording();
    } catch (error) {
      console.error("Chyba při spuštění nahrávání:", error);
      output.innerText = "[CHYBA] Nelze získat přístup k mikrofonu. Zkontrolujte oprávnění.";
    }
  } else {
    stopRecording();
  }
});

// Skryté reset tlačítko
const clearBtn = document.querySelector(".hidden-reset");
clearBtn.addEventListener("click", () => {
  if (confirm("Opravdu chcete vymazat celou konverzaci?")) {
    currentThreadId = null;
    localStorage.removeItem("assistant_thread_id");
    output.innerText = "[SYSTÉM] Konverzace vymazána. Stiskněte NAHRÁVAT a začněte mluvit.";
  }
});

// Přidání posluchače pro double-click na reset tlačítko pro zobrazení historie
clearBtn.addEventListener("dblclick", () => {
  showHistory();
});

// Přidání posluchače pro triple-click na reset tlačítko pro vymazání historie
let clickCount = 0;
clearBtn.addEventListener("click", () => {
  clickCount++;
  setTimeout(() => {
    if (clickCount === 3) {
      if (confirm("Opravdu chcete vymazat celou historii konverzací?")) {
        clearHistory();
        output.innerText = "[SYSTÉM] Historie konverzací vymazána.";
      }
    }
    clickCount = 0;
  }, 500);
});

async function startRecording() {
  // Odemknutí audio contextu pro iOS - vytvoříme "tichý" audio pro povolení autoplay
  try {
    if (!window.audioContextUnlocked) {
      const silentAudio = new Audio();
      silentAudio.src = 'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAAVE=';
      silentAudio.volume = 0;
      await silentAudio.play().catch(() => {}); // Ignoruj chyby
      window.audioContextUnlocked = true;
      console.log('🔓 Audio context odemčen pro iOS');
    }
  } catch (e) {
    console.log('Audio unlock se nepodařil:', e);
  }
  
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // Nastavení Web Audio API pro detekci hlasitosti
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  microphone = audioContext.createMediaStreamSource(stream);
  microphone.connect(analyser);
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  
  // Spuštění nahrávání
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = sendAudioToAssistant;
  mediaRecorder.start();
  
  btn.innerText = "MLUVTE...";
  btn.classList.add("recording");
  isRecording = true;
  
  // Spuštění monitorování hlasitosti
  silenceStart = null;
  monitorAudioLevel();
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  if (audioContext) {
    audioContext.close();
  }
  btn.innerText = "NAHRÁVAT";
  btn.classList.remove("recording");
  isRecording = false;
  silenceStart = null;
}

function monitorAudioLevel() {
  if (!isRecording) return;
  
  analyser.getByteFrequencyData(dataArray);
  
  // Výpočet průměrné hlasitosti
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const average = sum / dataArray.length;
  
  // Detekce ticha
  if (average < silenceThreshold) {
    if (silenceStart === null) {
      silenceStart = Date.now();
      btn.innerText = "ČEKÁM...";
    } else if (Date.now() - silenceStart > silenceDuration) {
      console.log('🔇 Detekováno ticho, automaticky ukončuji nahrávání');
      stopRecording();
      return;
    }
  } else {
    silenceStart = null;
    btn.innerText = "MLUVTE...";
  }
  
  // Pokračuj v monitorování
  requestAnimationFrame(monitorAudioLevel);
}

async function sendAudioToAssistant() {
  output.innerText = "[ZPRACOVÁVÁM] Analyzujem zvukový signál...";
  
  try {
    const recordedAudio = new Blob(audioChunks, { type: 'audio/webm' });
    
    const API_KEY = localStorage.getItem('openai_api_key') || prompt('Zadejte váš OpenAI API klíč:') || CONFIG?.OPENAI_API_KEY;
    if (!localStorage.getItem('openai_api_key')) {
      localStorage.setItem('openai_api_key', API_KEY);
    }
    
    // Převod audio na text pomocí Whisper
    const transcriptFormData = new FormData();
    transcriptFormData.append('file', recordedAudio, 'audio.webm');
    transcriptFormData.append('model', 'whisper-1');
    
    const transcriptRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      },
      body: transcriptFormData
    });
    
    const transcriptData = await transcriptRes.json();
    const userText = transcriptData.text;
    
    if (!userText) {
      output.innerText = "[CHYBA] Zvukový signál nerozpoznán. Zkuste to znovu.";
      return;
    }
    
    console.log('🎤 Rozpoznaný text:', userText);
    
    // Pošli zprávu asistentovi
    await sendMessageToAssistant(API_KEY, userText);
    
  } catch (error) {
    console.error('Chyba:', error);
    output.innerText = "[SYSTÉMOVÁ CHYBA] Nastala chyba. Zkuste to znovu.";
  }
}

async function sendMessageToAssistant(apiKey, message) {
  try {
    output.innerText = "[PŘEMÝŠLÍM] Hlubina Myšlení zvažuje vaši otázku...";
    
    // Vytvoř nebo použij existující thread
    if (!currentThreadId) {
      const threadRes = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({})
      });
      
      const threadData = await threadRes.json();
      currentThreadId = threadData.id;
      localStorage.setItem("assistant_thread_id", currentThreadId);
      console.log('🆕 Nová konverzace vytvořena:', currentThreadId);
    }
    
    // Přidej zprávu do threadu
    await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        role: 'user',
        content: message
      })
    });
    
    // Získej Assistant ID
    let assistantId = (typeof CONFIG !== 'undefined' && CONFIG?.ASSISTANT_ID) || 
                     localStorage.getItem('assistant_id');
    
    if (!assistantId) {
      assistantId = prompt('Zadejte ID vašeho OpenAI asistenta (začíná asst_):');
      if (assistantId) {
        localStorage.setItem('assistant_id', assistantId);
      } else {
        assistantId = 'asst_0bT4Ceja8eeEDfwlrnxCS4j0'; // Fallback
      }
    }
    
    // Spusť asistenta
    const runRes = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistantId
      })
    });
    
    const runData = await runRes.json();
    console.log('🤖 Zpracování spuštěno:', runData.id);
    
    // Čekej na dokončení a předej otázku pro uložení do historie
    await waitForRunCompletion(apiKey, currentThreadId, runData.id, message);
    
  } catch (error) {
    console.error('Chyba při komunikaci s asistentem:', error);
    output.innerText = "[SYSTÉMOVÁ CHYBA] Komunikace s Hlubinou Myšlení selhala.";
  }
}

async function waitForRunCompletion(apiKey, threadId, runId, userQuestion) {
  let attempts = 0;
  const maxAttempts = 60; // Zvýšeno na 60 sekund pro složitější dotazy
  
  while (attempts < maxAttempts) {
    const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    const statusData = await statusRes.json();
    console.log(`🔄 Status (${attempts + 1}/${maxAttempts}):`, statusData.status);
    
    if (statusData.status === 'completed') {
      // Získej odpověď
      const messagesRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      const messagesData = await messagesRes.json();
      const lastMessage = messagesData.data[0];
      
      if (lastMessage && lastMessage.content && lastMessage.content[0]) {
        const assistantReply = lastMessage.content[0].text.value;
        console.log('✅ Odpověď asistenta:', assistantReply.substring(0, 100) + '...');
        
        // Ulož do historie
        saveToHistory(userQuestion, assistantReply);
        
        // Zobraz odpověď
        output.innerText = assistantReply;
        
        // Převeď na řeč
        await textToSpeech(apiKey, assistantReply);
      } else {
        output.innerText = "[CHYBA] Hlubina Myšlení neodpověděla.";
      }
      break;
      
    } else if (statusData.status === 'failed') {
      output.innerText = "[KRITICKÁ CHYBA] Hlubina Myšlení nedokázala zpracovat požadavek.";
      console.error('❌ Zpracování selhalo:', statusData);
      break;
    } else if (statusData.status === 'requires_action') {
      console.log('⚠️ Asistent vyžaduje akci:', statusData.required_action);
      output.innerText = "[VAROVÁNÍ] Hlubina Myšlení vyžaduje dodatečnou akci - přeformulujte prosím otázku.";
      break;
    }
    
    // Zobraz progress
    if (attempts % 5 === 0 && attempts > 0) {
      output.innerText = `[PŘEMÝŠLÍM] Hlubina Myšlení stále zvažuje... (${attempts}s)`;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    output.innerText = "[ČASOVÝ LIMIT] Hlubina Myšlení příliš dlouho neodpovídá.";
    console.error('⏰ Časový limit po', maxAttempts, 'sekundách');
  }
}

async function textToSpeech(apiKey, text) {
  try {
    // Zkrácení textu pokud je příliš dlouhý pro TTS
    const maxLength = 4000;
    const textForSpeech = text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
    
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: textForSpeech,
        voice: (typeof CONFIG !== 'undefined' && CONFIG?.VOICE) || 'onyx'
      })
    });
    
    if (ttsRes.ok) {
      const audioBuffer = await ttsRes.arrayBuffer();
      const speechAudio = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(speechAudio);
      
      const audio = new Audio(audioUrl);
      
      // Nastavíme audio element pro iOS optimalizaci
      audio.preload = 'auto';
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      
      // Pokusíme se o okamžité přehrání (funguje pokud už uživatel kliknul)
      const tryPlayAudio = async () => {
        try {
          await audio.play();
          console.log('🔊 Audio přehráno automaticky');
          return true;
        } catch (error) {
          console.warn('Autoplay blokován:', error.name);
          return false;
        }
      };
      
      // Ihned zkusíme přehrát
      const playedSuccessfully = await tryPlayAudio();
      
      // Pokud se nepovedlo automatické přehrání
      if (!playedSuccessfully) {
        // Zkusíme ještě jednou po malém delay (někdy pomůže)
        setTimeout(async () => {
          const retrySuccess = await tryPlayAudio();
          if (!retrySuccess) {
            // Teprve teď zobrazíme fallback tlačítko
            addPlayButton(audio);
          }
        }, 100);
      }
    } else {
      console.error('❌ Chyba TTS:', await ttsRes.text());
    }
    
  } catch (error) {
    console.error('Chyba při převodu na řeč:', error);
  }
}

// Funkce pro ukládání konverzace do historie
function saveToHistory(question, answer) {
  const entry = {
    timestamp: new Date().toLocaleString('cs-CZ'),
    question: question,
    answer: answer
  };
  
  conversationHistory.unshift(entry); // Přidej na začátek
  
  // Omez historii na posledních 50 záznamů
  if (conversationHistory.length > 50) {
    conversationHistory = conversationHistory.slice(0, 50);
  }
  
  localStorage.setItem("conversation_history", JSON.stringify(conversationHistory));
  console.log('💾 Konverzace uložena do historie');
}

// Funkce pro zobrazení historie
function showHistory() {
  if (conversationHistory.length === 0) {
    output.innerText = "[HISTORIE] Žádné předchozí konverzace nenalezeny.";
    return;
  }
  
  let historyText = "[HISTORIE KONVERZACÍ]\n\n";
  conversationHistory.slice(0, 10).forEach((entry, index) => {
    historyText += `${index + 1}. ${entry.timestamp}\n`;
    historyText += `Q: ${entry.question}\n`;
    historyText += `A: ${entry.answer.substring(0, 200)}${entry.answer.length > 200 ? '...' : ''}\n\n`;
  });
  
  if (conversationHistory.length > 10) {
    historyText += `... a dalších ${conversationHistory.length - 10} záznamů`;
  }
  
  output.innerText = historyText;
}

// Funkce pro vymazání historie
function clearHistory() {
  conversationHistory = [];
  localStorage.removeItem("conversation_history");
  console.log('🗑️ Historie konverzací vymazána');
}

// Funkce pro přidání play tlačítka jako fallback pro iOS
function addPlayButton(audio) {
  // Odebereme předchozí play tlačítko pokud existuje
  const existingBtn = document.getElementById('playAudioBtn');
  if (existingBtn) existingBtn.remove();
  
  const playBtn = document.createElement('button');
  playBtn.id = 'playAudioBtn';
  playBtn.innerHTML = '🔊 Tap to play';
  playBtn.style.cssText = `
    display: inline-block;
    margin: 10px 0 0 10px;
    padding: 8px 16px;
    background: rgba(0,122,255,0.8);
    color: white;
    border: 1px solid #007AFF;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
    backdrop-filter: blur(10px);
  `;
  
  // Hover efekt
  playBtn.onmouseenter = () => {
    playBtn.style.background = '#007AFF';
    playBtn.style.transform = 'scale(1.05)';
  };
  playBtn.onmouseleave = () => {
    playBtn.style.background = 'rgba(0,122,255,0.8)';
    playBtn.style.transform = 'scale(1)';
  };
  
  playBtn.onclick = () => {
    audio.play().then(() => {
      playBtn.innerHTML = '✅';
      playBtn.style.background = '#34C759';
      setTimeout(() => playBtn.remove(), 1500);
    }).catch(error => {
      console.error('Nepodařilo se přehrát audio:', error);
      playBtn.innerHTML = '❌';
      playBtn.disabled = true;
      playBtn.style.background = '#666';
    });
  };
  
  // Přidáme tlačítko na konec output textu
  document.getElementById('outputText').appendChild(playBtn);
}
