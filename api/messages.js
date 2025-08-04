// API endpoint pro správu zpráv z hlubiny s trvalým uložením
// Podporuje více způsobů ukládání dat

// Fallback data pro případ nedostupnosti externího úložiště
let MESSAGES_CACHE = [];

// Funkce pro načtení zpráv z různých zdrojů
async function loadMessages() {
  try {
    // Pokusíme se načíst z Vercel KV (pokud je dostupné)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const response = await fetch(`${process.env.KV_REST_API_URL}/get/messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.result ? JSON.parse(data.result) : [];
      }
    }
    
    // Pokud KV není dostupné, použijeme JSONBin.io jako externí JSON storage
    if (process.env.JSONBIN_API_KEY && process.env.JSONBIN_BIN_ID) {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': process.env.JSONBIN_API_KEY
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.record || [];
      }
    }
    
    // Fallback na cache v paměti
    return MESSAGES_CACHE;
    
  } catch (error) {
    console.error('Chyba při načítání zpráv:', error);
    return MESSAGES_CACHE;
  }
}

// Funkce pro uložení zpráv
async function saveMessages(messages) {
  try {
    // Uložení do Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const response = await fetch(`${process.env.KV_REST_API_URL}/set/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(JSON.stringify(messages))
      });
      
      if (response.ok) {
        MESSAGES_CACHE = messages;
        return true;
      }
    }
    
    // Uložení do JSONBin.io
    if (process.env.JSONBIN_API_KEY && process.env.JSONBIN_BIN_ID) {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}`, {
        method: 'PUT',
        headers: {
          'X-Master-Key': process.env.JSONBIN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messages)
      });
      
      if (response.ok) {
        MESSAGES_CACHE = messages;
        return true;
      }
    }
    
    // Fallback na cache v paměti
    MESSAGES_CACHE = messages;
    return true;
    
  } catch (error) {
    console.error('Chyba při ukládání zpráv:', error);
    MESSAGES_CACHE = messages; // Aspoň do cache
    return false;
  }
}

export default async function handler(req, res) {
  // CORS hlavičky
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Získání všech zpráv
      const messages = await loadMessages();
      
      // Seřadíme od nejnovější k nejstarší
      const sortedMessages = messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return res.status(200).json({ 
        success: true, 
        messages: sortedMessages.slice(0, 10), // Zobrazíme pouze posledních 10 zpráv
        storage: getStorageType()
      });
    }

    if (req.method === 'POST') {
      // Přidání nové zprávy
      const { message, adminKey } = req.body;
      
      // Ověření admin klíče
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'hlubina42') {
        return res.status(401).json({ success: false, error: 'Neplatný admin klíč' });
      }

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Zpráva nesmí být prázdná' });
      }

      const messages = await loadMessages();
      
      const newMessage = {
        id: Date.now().toString(),
        message: message.trim(),
        timestamp: new Date().toISOString(),
        created: new Date().toLocaleString('cs-CZ')
      };

      messages.push(newMessage);
      const saved = await saveMessages(messages);

      return res.status(201).json({ 
        success: true, 
        message: 'Zpráva byla přidána',
        data: newMessage,
        storage: getStorageType(),
        saved: saved
      });
    }

    if (req.method === 'DELETE') {
      // Smazání zprávy
      const { id, adminKey } = req.body;
      
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'hlubina42') {
        return res.status(401).json({ success: false, error: 'Neplatný admin klíč' });
      }

      const messages = await loadMessages();
      const index = messages.findIndex(msg => msg.id === id);
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Zpráva nenalezena' });
      }

      messages.splice(index, 1);
      const saved = await saveMessages(messages);

      return res.status(200).json({ 
        success: true, 
        message: 'Zpráva byla smazána',
        storage: getStorageType(),
        saved: saved
      });
    }

    return res.status(405).json({ success: false, error: 'Metoda není podporována' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Interní chyba serveru' 
    });
  }
}

// Funkce pro určení typu úložiště
function getStorageType() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return 'Vercel KV (Redis)';
  }
  if (process.env.JSONBIN_API_KEY && process.env.JSONBIN_BIN_ID) {
    return 'JSONBin.io';
  }
  return 'Memory Cache';
}
