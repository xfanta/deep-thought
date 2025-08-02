// Konfigurační soubor pro Deep Thought AI
// POZOR: Nikdy nenahrávejte tento soubor do veřejného repozitáře!

const CONFIG = {
  // Váš OpenAI API klíč
  OPENAI_API_KEY: 'sk-proj-VÁŠ_API_KLÍČ_ZDE',
  
  // ID vašeho asistenta z webové administrace
  ASSISTANT_ID: 'asst_VÁŠ_ASSISTANT_ID_ZDE',
  
  // Další nastavení
  MODEL: 'gpt-4.1',
  VOICE: 'onyx',
  MAX_TOKENS: 500,
  
  // Assistants API nastavení
  USE_ASSISTANTS_API: true,
  UPLOAD_FILES_VIA_WEB: true // Soubory se nahrávají přes web admin
};

// Automatické uložení do Local Storage při načtení stránky
if (typeof localStorage !== 'undefined' && CONFIG.OPENAI_API_KEY) {
  localStorage.setItem('openai_api_key', CONFIG.OPENAI_API_KEY);
  console.log('✅ API klíč byl automaticky uložen');
}
