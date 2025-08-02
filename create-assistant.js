// Pomocný skript pro vytvoření OpenAI Asistenta
// Spusťte v Node.js prostředí nebo v prohlížeči

async function createAssistant() {
  const API_KEY = 'VÁŠ_OPENAI_API_KLÍČ_ZDE'; // Nahraďte svým API klíčem
  
  const response = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      name: 'Hlubina myšlení Assistant',
      description: 'Hlasový AI asistent s podporou souborů a příloh',
      instructions: 'Jsi inteligentní asistent jménem "Hlubina myšlení". Umíš analyzovat soubory, obrázky, dokumenty a odpovídat v češtině. Buď přívětivý, nápomocný a stručný.',
      tools: [
        { type: 'file_search' },
        { type: 'code_interpreter' }
      ],
      temperature: 0.7
    })
  });
  
  const assistant = await response.json();
  console.log('✅ Asistent vytvořen:');
  console.log('ID:', assistant.id);
  console.log('Název:', assistant.name);
  return assistant;
}

// Spustit funkci
createAssistant().then(assistant => {
  console.log('Zkopírujte ID asistenta do konfigurace:', assistant.id);
}).catch(console.error);
