// API endpoint pro správu zpráv z hlubiny
const MESSAGES_DATA = [];

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
      // Seřadíme od nejnovější k nejstarší
      const sortedMessages = MESSAGES_DATA.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return res.status(200).json({ 
        success: true, 
        messages: sortedMessages.slice(0, 10) // Zobrazíme pouze posledních 10 zpráv
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

      const newMessage = {
        id: Date.now().toString(),
        message: message.trim(),
        timestamp: new Date().toISOString(),
        created: new Date().toLocaleString('cs-CZ')
      };

      MESSAGES_DATA.push(newMessage);

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

      const originalLength = MESSAGES_DATA.length;
      const index = MESSAGES_DATA.findIndex(msg => msg.id === id);
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Zpráva nenalezena' });
      }

      MESSAGES_DATA.splice(index, 1);

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
