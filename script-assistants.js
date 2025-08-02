const btn = document.getElementById("recordBtn");
const output = document.getElementById("outputText");

let mediaRecorder, audioChunks = [];
let isRecording = false;
let currentThreadId = localStorage.getItem("assistant_thread_id") || null;

// Zobrazíme aktuální nastavení v konzoli
console.log('🔧 Deep Thought AI nastavení:');
if (typeof CONFIG !== 'undefined') {
  console.log(`   Model: ${CONFIG.MODEL}`);
  console.log(`   Hlas: ${CONFIG.VOICE}`);
  console.log(`   Max tokeny: ${CONFIG.MAX_TOKENS}`);
  console.log(`   Assistant ID: ${CONFIG.ASSISTANT_ID}`);
  console.log(`   API klíč: ${CONFIG.OPENAI_API_KEY ? '✅ Nastaven' : '❌ Chybí'}`);
} else {
  console.log('   ⚠️ Config nebyl načten, používají se výchozí hodnoty');
}

btn.addEventListener("click", async () => {
  if (!isRecording) {
    try {
      await startRecording();
    } catch (error) {
      console.error("Chyba při spuštění nahrávání:", error);
      output.innerText = "Nelze získat přístup k mikrofonu. Zkontrolujte oprávnění.";
    }
  } else {
    stopRecording();
  }
});

// Přidat tlačítko pro nahrání souboru
const fileBtn = document.createElement("button");
fileBtn.innerText = "📎";
fileBtn.style.cssText = `
  position: fixed;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  color: white;
  font-size: 1.5em;
  width: 50px;
  height: 50px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
`;

const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".txt,.pdf,.doc,.docx,.md,.csv,.json,.jpg,.jpeg,.png,.gif,.webp";
fileInput.style.display = "none";

fileBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", handleFileUpload);

// Přidat tlačítko pro vymazání historie (neviditelné)
const clearBtn = document.createElement("button");
clearBtn.innerText = "🗑";
clearBtn.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  background: transparent;
  border: none;
  color: transparent;
  font-size: 1.5em;
  width: 50px;
  height: 50px;
  cursor: pointer;
  opacity: 0.05;
  transition: opacity 0.3s ease;
`;

// Zobrazí se při hover/touch
clearBtn.addEventListener("mouseenter", () => {
  clearBtn.style.opacity = "0.6";
  clearBtn.style.color = "white";
  clearBtn.style.background = "rgba(255, 255, 255, 0.1)";
});

clearBtn.addEventListener("mouseleave", () => {
  clearBtn.style.opacity = "0.05";
  clearBtn.style.color = "transparent";
  clearBtn.style.background = "transparent";
});

// Pro mobily - touch události
clearBtn.addEventListener("touchstart", () => {
  clearBtn.style.opacity = "0.6";
  clearBtn.style.color = "white";
  clearBtn.style.background = "rgba(255, 255, 255, 0.1)";
});

clearBtn.addEventListener("touchend", () => {
  setTimeout(() => {
    clearBtn.style.opacity = "0.05";
    clearBtn.style.color = "transparent";
    clearBtn.style.background = "transparent";
  }, 2000); // Skryje se po 2 sekundách
});

clearBtn.addEventListener("click", () => {
  currentThreadId = null;
  localStorage.removeItem("assistant_thread_id");
  output.innerText = "Historie vymazána. Stiskněte tlačítko a začněte mluvit nebo nahrajte soubor";
});

document.body.appendChild(fileBtn);
document.body.appendChild(fileInput);
document.body.appendChild(clearBtn);

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = sendAudioToAssistant;
  mediaRecorder.start();
  btn.innerText = "⏹";
  btn.classList.add("recording");
  isRecording = true;
}

function stopRecording() {
  mediaRecorder.stop();
  btn.innerText = "🎤";
  btn.classList.remove("recording");
  isRecording = false;
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  output.innerText = `Nahrávám soubor: ${file.name}...`;
  
  try {
    const API_KEY = localStorage.getItem('openai_api_key') || CONFIG?.OPENAI_API_KEY || prompt('Zadejte váš OpenAI API klíč:');
    if (!localStorage.getItem('openai_api_key')) {
      localStorage.setItem('openai_api_key', API_KEY);
    }
    
    // Nahraj soubor do OpenAI
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'assistants');
    
    const uploadRes = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      body: formData
    });
    
    const uploadData = await uploadRes.json();
    console.log('Soubor nahrán:', uploadData);
    
    // Pošli zprávu asistentovi s přilohou
    await sendMessageToAssistant(API_KEY, `Analyzuj prosím nahraný soubor: ${file.name}`, [uploadData.id]);
    
  } catch (error) {
    console.error('Chyba při nahrávání souboru:', error);
    output.innerText = "Chyba při nahrávání souboru. Zkuste to znovu.";
  }
}

async function sendAudioToAssistant() {
  output.innerText = "Zpracovávám audio...";
  
  try {
    const recordedAudio = new Blob(audioChunks, { type: 'audio/webm' });
    
    const API_KEY = localStorage.getItem('openai_api_key') || CONFIG?.OPENAI_API_KEY || prompt('Zadejte váš OpenAI API klíč:');
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
      output.innerText = "Nerozuměl jsem, zkuste to znovu.";
      return;
    }
    
    // Pošli zprávu asistentovi
    await sendMessageToAssistant(API_KEY, userText);
    
  } catch (error) {
    console.error('Chyba:', error);
    output.innerText = "Nastala chyba. Zkuste to znovu.";
  }
}

async function sendMessageToAssistant(apiKey, message, fileIds = []) {
  try {
    output.innerText = "Asistent přemýšlí...";
    
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
    }
    
    // Přidej zprávu do threadu
    const messageBody = {
      role: 'user',
      content: message
    };
    
    if (fileIds.length > 0) {
      messageBody.attachments = fileIds.map(fileId => ({
        file_id: fileId,
        tools: [{ type: 'file_search' }, { type: 'code_interpreter' }]
      }));
    }
    
    await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify(messageBody)
    });
    
    // Spusť asistenta
    const runRes = await fetch(`https://api.openai.com/v1/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: CONFIG?.ASSISTANT_ID || 'asst_btEDat2GZhHOQWMiZFqeeqDo'
      })
    });
    
    const runData = await runRes.json();
    
    // Čekej na dokončení
    await waitForRunCompletion(apiKey, currentThreadId, runData.id);
    
  } catch (error) {
    console.error('Chyba při komunikaci s asistentem:', error);
    output.innerText = "Chyba při komunikaci s asistentem.";
  }
}

async function waitForRunCompletion(apiKey, threadId, runId) {
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    const statusRes = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    
    const statusData = await statusRes.json();
    
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
      const assistantReply = lastMessage.content[0].text.value;
      
      // Zobraz odpověď
      output.innerText = assistantReply;
      
      // Převeď na řeč
      await textToSpeech(apiKey, assistantReply);
      break;
      
    } else if (statusData.status === 'failed') {
      output.innerText = "Asistent nedokázal zpracovat požadavek.";
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  if (attempts >= maxAttempts) {
    output.innerText = "Timeout - asistent příliš dlouho neodpovídá.";
  }
}

async function textToSpeech(apiKey, text) {
  try {
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: (typeof CONFIG !== 'undefined' && CONFIG.VOICE) || 'nova'
      })
    });
    
    const audioBuffer = await ttsRes.arrayBuffer();
    const speechAudio = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(speechAudio);
    
    const audio = new Audio(audioUrl);
    audio.play();
    
  } catch (error) {
    console.error('Chyba při převodu na řeč:', error);
  }
}
