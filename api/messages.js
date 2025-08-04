// API endpoint pro správu zpráv z hlubiny s Upstash Redis
// Optimalizováno pro Vercel Upstash integraci

// Fallback data pro případ nedostupnosti Redis
let MESSAGES_CACHE = [];

// Funkce pro načtení zpráv z Upstash Redis
async function loadMessages() {
  try {
    // Upstash Redis REST API - správné proměnné prostředí
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const response = await fetch(`${process.env.KV_REST_API_URL}/get/deep_thought_messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 Redis response:', data);
        if (data.result) {
          try {
            const messages = JSON.parse(data.result);
            console.log('✅ Parsed messages from Redis:', messages.length, 'messages');
            // Ověříme strukturu zpráv
            messages.forEach((msg, index) => {
              if (!msg.id) {
                console.warn(`⚠️ Message ${index} missing ID:`, msg);
                // Přidáme ID pokud chybí
                msg.id = `fallback_${Date.now()}_${index}`;
              }
            });
            MESSAGES_CACHE = messages; // Aktualizujeme cache
            return messages;
          } catch (parseError) {
            console.error('❌ Error parsing Redis data:', parseError);
            return MESSAGES_CACHE;
          }
        }
      }
    }
    
    // Fallback na starší Upstash proměnné (pokud existují)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/get/deep_thought_messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          const messages = JSON.parse(data.result);
          MESSAGES_CACHE = messages;
          return messages;
        }
      }
    }
    
    // Fallback na Vercel KV (pokud je nastaven)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const response = await fetch(`${process.env.KV_REST_API_URL}/get/messages`, {
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          const messages = JSON.parse(data.result);
          MESSAGES_CACHE = messages;
          return messages;
        }
      }
    }
    
    // Fallback na JSONBin.io
    if (process.env.JSONBIN_API_KEY && process.env.JSONBIN_BIN_ID) {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${process.env.JSONBIN_BIN_ID}/latest`, {
        headers: {
          'X-Master-Key': process.env.JSONBIN_API_KEY
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        MESSAGES_CACHE = data.record || [];
        return MESSAGES_CACHE;
      }
    }
    
    // Poslední fallback na cache v paměti
    return MESSAGES_CACHE;
    
  } catch (error) {
    console.error('Chyba při načítání zpráv:', error);
    return MESSAGES_CACHE;
  }
}

// Funkce pro uložení zpráv do Upstash Redis
async function saveMessages(messages) {
  try {
    // Uložení do Upstash Redis - správné proměnné prostředí
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const response = await fetch(`${process.env.KV_REST_API_URL}/set/deep_thought_messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([JSON.stringify(messages)])
      });
      
      if (response.ok) {
        MESSAGES_CACHE = messages;
        console.log('✅ Zprávy uloženy do Upstash Redis');
        return { success: true, storage: 'Upstash Redis' };
      }
    }
    
    // Fallback na starší Upstash proměnné
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/set/deep_thought_messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([JSON.stringify(messages)])
      });
      
      if (response.ok) {
        MESSAGES_CACHE = messages;
        console.log('✅ Zprávy uloženy do Upstash Redis (legacy)');
        return { success: true, storage: 'Upstash Redis' };
      }
    }
    
    // Fallback na Vercel KV
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
        return { success: true, storage: 'Vercel KV' };
      }
    }
    
    // Fallback na JSONBin.io
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
        return { success: true, storage: 'JSONBin.io' };
      }
    }
    
    // Poslední fallback - jen cache v paměti
    MESSAGES_CACHE = messages;
    return { success: true, storage: 'Memory Cache' };
    
  } catch (error) {
    console.error('Chyba při ukládání zpráv:', error);
    MESSAGES_CACHE = messages; // Aspoň do cache
    return { success: false, storage: 'Error - Memory Fallback' };
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
        messages: sortedMessages.slice(0, 15), // Zobrazíme posledních 15 zpráv
        storage: getStorageType(),
        count: messages.length
      });
    }

    if (req.method === 'POST') {
      // Přidání nové zprávy
      const { message } = req.body;

      if (!message || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Zpráva nesmí být prázdná' });
      }

      const messages = await loadMessages();
      
      // Zajistíme, aby messages bylo pole
      const messagesArray = Array.isArray(messages) ? messages : [];
      console.log('🔍 Current messages count:', messagesArray.length);
      
      const newMessage = {
        id: Date.now().toString(),
        message: message.trim(),
        timestamp: new Date().toISOString(),
        created: new Date().toLocaleString('cs-CZ', { 
          timeZone: 'Europe/Prague',
          year: 'numeric',
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      console.log('🔍 Creating new message:', newMessage);

      messagesArray.push(newMessage);
      
      // Omezíme na posledních 100 zpráv pro úsporu místa
      if (messagesArray.length > 100) {
        messagesArray.splice(0, messagesArray.length - 100);
      }
      
      const saveResult = await saveMessages(messagesArray);

      return res.status(201).json({ 
        success: true, 
        message: 'Zpráva byla přidána',
        data: newMessage,
        storage: saveResult.storage,
        saved: saveResult.success,
        count: messages.length
      });
    }

    if (req.method === 'DELETE') {
      // Smazání zprávy
      const { id } = req.body;

      const messages = await loadMessages();
      const messagesArray = Array.isArray(messages) ? messages : [];
      const index = messagesArray.findIndex(msg => msg.id === id);
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Zpráva nenalezena' });
      }

      messagesArray.splice(index, 1);
      const saveResult = await saveMessages(messagesArray);

      return res.status(200).json({ 
        success: true, 
        message: 'Zpráva byla smazána',
        storage: saveResult.storage,
        saved: saveResult.success,
        count: messagesArray.length
      });
    }

    return res.status(405).json({ success: false, error: 'Metoda není podporována' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Interní chyba serveru: ' + error.message
    });
  }
}

// Funkce pro určení typu úložiště
function getStorageType() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return 'Upstash Redis ⚡';
  }
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return 'Upstash Redis (legacy) ⚡';
  }
  if (process.env.JSONBIN_API_KEY && process.env.JSONBIN_BIN_ID) {
    return 'JSONBin.io 🌐';
  }
  return 'Memory Cache 💾';
}
