// API endpoint pro správu zpráv z hlubiny
import { promises as fs } from 'fs';
import path from 'path';

const MESSAGES_FILE = '/tmp/messages.json';

// Načtení zpráv ze souboru
async function loadMessages() {
  try {
    const data = await fs.readFile(MESSAGES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Pokud soubor neexistuje, vrátíme prázdné pole
    return [];
  }
}

// Uložení zpráv do souboru
async function saveMessages(messages) {
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2));
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
      messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return res.status(200).json({ 
        success: true, 
        messages: messages.slice(0, 10) // Zobrazíme pouze posledních 10 zpráv
      });
    }

    if (req.method === 'POST') {
      // Přidání nové zprávy
      const { message, adminKey } = req.body;
      
      // Jednoduché ověření admin klíče
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
      await saveMessages(messages);

      return res.status(201).json({ 
        success: true, 
        message: 'Zpráva byla přidána',
        data: newMessage 
      });
    }

    if (req.method === 'DELETE') {
      // Smazání zprávy
      const { id, adminKey } = req.body;
      
      if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'hlubina42') {
        return res.status(401).json({ success: false, error: 'Neplatný admin klíč' });
      }

      const messages = await loadMessages();
      const filteredMessages = messages.filter(msg => msg.id !== id);
      
      if (messages.length === filteredMessages.length) {
        return res.status(404).json({ success: false, error: 'Zpráva nenalezena' });
      }

      await saveMessages(filteredMessages);

      return res.status(200).json({ 
        success: true, 
        message: 'Zpráva byla smazána' 
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
