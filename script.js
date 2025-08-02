const btn = document.getElementById("recordBtn");
const output = document.getElementById("outputText");

let mediaRecorder, audioChunks = [];
let isRecording = false;
let history = JSON.parse(localStorage.getItem("chat_history")) || [];

btn.addEventListener("click", async () => {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder = new MediaRecorder(stream);
  audioChunks = [];
  mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
  mediaRecorder.onstop = sendToOpenAI;
  mediaRecorder.start();
  btn.innerText = "⏹ Stop";
  isRecording = true;
}

function stopRecording() {
  mediaRecorder.stop();
  btn.innerText = "🎤 Mluv";
  isRecording = false;
}

async function sendToOpenAI() {
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

  const formData = new FormData();
  formData.append("model", "gpt-4o-audio-preview");
  formData.append("input[0]", audioBlob, "input.webm");
  formData.append("modalities", JSON.stringify(["text", "audio"]));
  formData.append("voice", "verse");

  // Přidání historie do inputu
  if (history.length > 0) {
    formData.append("conversation", JSON.stringify(history));
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer TVŮJ_OPENAI_API_KEY`
    },
    body: formData
  });

  const data = await res.json();

  const textReply = data.output_text;
  const audioBase64 = data.output.find(o => o.type === "output_audio").audio;

  // Uložit do historie
  history.push({ role: "user", content: "[hlas]" });
  history.push({ role: "assistant", content: textReply });
  localStorage.setItem("chat_history", JSON.stringify(history));

  // Zobrazit text
  output.innerText = textReply;

  // Přehrát audio
  const audio = new Audio("data:audio/mp3;base64," + audioBase64);
  audio.play();
}