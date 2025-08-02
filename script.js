const btn = document.getElementById("recordBtn");
const output = document.getElementById("outputText");

let mediaRecorder, audioChunks = [];
let isRecording = false;
let history = JSON.parse(localStorage.getItem("chat_history")) || [];

// Zobrazíme aktuální nastavení v konzoli
console.log('🔧 Deep Thought AI nastavení:');
if (typeof CONFIG !== 'undefined') {
  console.log(`   Model: ${CONFIG.MODEL}`);
  console.log(`   Hlas: ${CONFIG.VOICE}`);
  console.log(`   Max tokeny: ${CONFIG.MAX_TOKENS}`);
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
  history = [];
  localStorage.removeItem("chat_history");
  localStorage.removeItem("openai_api_key");
  output.innerText = "Historie vymazána. Stiskněte tlačítko a začněte mluvit";
});
document.body.appendChild(clearBtn);

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = sendToOpenAI;
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

async function sendToOpenAI() {
  output.innerText = "Zpracovávám...";
  
  try {
    const recordedAudio = new Blob(audioChunks, { type: 'audio/webm' });
    
    // Nejdříve převedeme audio na text pomocí Whisper API
    const transcriptFormData = new FormData();
    transcriptFormData.append('file', recordedAudio, 'audio.webm');
    transcriptFormData.append('model', 'whisper-1');
    
    const API_KEY = localStorage.getItem('openai_api_key') || prompt('Zadejte váš OpenAI API klíč:');
    if (!localStorage.getItem('openai_api_key')) {
      localStorage.setItem('openai_api_key', API_KEY);
    }
    
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
    
    // Přidáme uživatelovu zprávu do historie
    history.push({ role: "user", content: userText });
    
    // Pošleme konverzaci do ChatGPT
    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: (typeof CONFIG !== 'undefined' && CONFIG.MODEL) || 'gpt-4',
        messages: history,
        max_tokens: (typeof CONFIG !== 'undefined' && CONFIG.MAX_TOKENS) || 500
      })
    });
    
    const chatData = await chatRes.json();
    
    if (chatData.error) {
      throw new Error(`OpenAI API chyba: ${chatData.error.message}`);
    }
    
    const assistantReply = chatData.choices[0].message.content;
    
    // Zkontrolujeme, jestli se odpověď neořízla
    if (chatData.choices[0].finish_reason === 'length') {
      console.warn('⚠️ Odpověď byla oříznutá kvůli max_tokens limitu');
      // Můžeme přidat indikátor, že odpověď byla oříznutá
      // assistantReply += ' [...pokračování bylo oříznuté]';
    }
    
    // Přidáme odpověď asistenta do historie
    history.push({ role: "assistant", content: assistantReply });
    localStorage.setItem("chat_history", JSON.stringify(history));
    
    // Zobrazíme text
    output.innerText = assistantReply;
    
    // Převedeme text na řeč pomocí TTS API
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: assistantReply,
        voice: (typeof CONFIG !== 'undefined' && CONFIG.VOICE) || 'nova'
      })
    });
    
    const audioBuffer = await ttsRes.arrayBuffer();
    const speechAudio = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(speechAudio);
    
    const audio = new Audio(audioUrl);
    
    // iOS/Safari kompatibilita - musíme přidat event listenery
    audio.addEventListener('canplaythrough', () => {
      audio.play().catch(error => {
        console.warn('Automatické přehrávání audio selhalo (iOS omezení):', error);
        // Přidáme tlačítko pro manuální přehrání
        addPlayButton(audio);
      });
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Chyba při načítání audia:', e);
      output.innerText += '\n\n⚠️ Audio se nepodařilo přehrát';
    });
    
    // Pro iOS - pokusíme se o okamžité přehrání
    audio.load();
    
    // Pokus o přehrání s lepším error handlingem
    try {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.warn('Autoplay byl blokován:', error);
          addPlayButton(audio);
        });
      }
    } catch (error) {
      console.warn('Play() není podporováno:', error);
      addPlayButton(audio);
    }
    
  } catch (error) {
    console.error('Chyba:', error);
    output.innerText = "Nastala chyba. Zkuste to znovu.";
  }
}

// Funkce pro přidání play tlačítka jako fallback pro iOS
function addPlayButton(audio) {
  // Odebereme předchozí play tlačítko pokud existuje
  const existingBtn = document.getElementById('playAudioBtn');
  if (existingBtn) existingBtn.remove();
  
  const playBtn = document.createElement('button');
  playBtn.id = 'playAudioBtn';
  playBtn.innerHTML = '🔊 Přehrát odpověď';
  playBtn.style.cssText = `
    margin-top: 15px;
    padding: 10px 20px;
    background: #007AFF;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    animation: pulse 2s infinite;
  `;
  
  playBtn.onclick = () => {
    audio.play().then(() => {
      playBtn.remove();
    }).catch(error => {
      console.error('Nepodařilo se přehrát audio:', error);
      playBtn.innerHTML = '❌ Audio nedostupné';
      playBtn.disabled = true;
    });
  };
  
  document.getElementById('outputText').appendChild(playBtn);
}