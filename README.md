# Deep Thought AI Assistant

Pokročilá mobilní PWA aplikace pro hlasový chat s OpenAI AI asistentem s podporou příloh.

## Funkce

- 🎤 **Hlasový vstup** - Nahrajte svou otázku
- 🔊 **Hlasový výstup** - AI odpovídá hlasem
- � **Nahrávání souborů** - Podporuje dokumenty, obrázky, PDF, CSV a další
- 🤖 **OpenAI Assistant** - Používá pokročilé Assistants API
- 💬 **Pokračující konverzace** - Asistent si pamatuje celý kontext
- 📱 **PWA podpora** - Instalovatelná jako nativní aplikace
- 🌐 **Offline ready** - Základní funkce fungují i offline

## Podporované typy souborů

- **Dokumenty**: TXT, PDF, DOC, DOCX, MD
- **Data**: CSV, JSON
- **Obrázky**: JPG, JPEG, PNG, GIF, WEBP

## Nastavení API klíče

### Možnost 1: Automatické nastavení (doporučeno)
1. Zkopírujte `config.template.js` jako `config.js`
2. Otevřete `config.js` a nahraďte `'sk-proj-VÁŠ_API_KLÍČ_ZDE'` svým skutečným API klíčem
3. Klíč se automaticky uloží při načtení aplikace

### Možnost 2: Ruční zadání
1. Aplikace se automaticky zeptá na API klíč při prvním použití
2. Klíč se uloží v prohlížeči (Local Storage)

### Získání OpenAI API klíče
1. Zaregistrujte se na https://platform.openai.com
2. Jděte do sekce API keys
3. Vytvořte nový API klíč
4. Zkopírujte klíč (začíná `sk-proj-...`)

## Jak používat

1. **Příprava asistenta**: Vytvořte si asistenta v [OpenAI webové administraci](https://platform.openai.com/assistants)
2. **Nahrání souborů**: Nahrajte soubory do asistenta přes webovou administraci
3. **První spuštění**: Aplikace se zeptá na OpenAI API klíč
4. **Hlasový chat**: Stiskněte modré tlačítko s mikrofonem (🎤) a mluvte
5. **Zastavení nahrávání**: Stiskněte červené tlačítko se stopem (⏹)
6. **Vymazání konverzace**: Najeďte na pravý horní roh a klikněte na koš (🗑)

## Práca s asistentom

- **Webová administrace**: https://platform.openai.com/assistants
- **Nastavení asistenta**: Můžete přidat nástroje, instrukce a soubory
- **Konverzace**: Aplikace komunikuje s vaším asistentem a používá všechny nahrané soubory
- **Pokračování**: Celá konverzace se uchovává a asistent si pamatuje kontext

## Možnosti použití

- **Hlasový chat s dokumenty**: Zeptejte se na obsah nahraných souborů
- **Analýza dat**: Asistent může pracovat s CSV, JSON a dalšími datovými soubory  
- **Práce s kódem**: Nahrané skripty může asistent analyzovat a ladit
- **Obecná konverzace**: Běžný chat bez specifických souborů

## Instalace na mobil

### iOS (Safari)
1. Otevřete aplikaci v Safari
2. Stiskněte tlačítko "Sdílet" 
3. Vyberte "Přidat na plochu"

### Android (Chrome)
1. Otevřete aplikaci v Chrome
2. Stiskněte menu (3 tečky)
3. Vyberte "Přidat na plochu"

## Požadavky

- Moderní webový prohlížeč s podporou Web APIs
- Mikrofon a reproduktory
- Internetové připojení pro komunikaci s OpenAI
- OpenAI API klíč

## Spuštění lokálně

```bash
# Naklonování repozitáře
git clone <repo-url>
cd deep-thought

# Spuštění lokálního serveru (např. pomocí Python)
python3 -m http.server 8000

# Nebo pomocí Node.js
npx serve .

# Otevření v prohlížeči
open http://localhost:8000
```

## Technologie

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **APIs**: OpenAI (Whisper, GPT-4, TTS)
- **PWA**: Service Worker, Web App Manifest
- **Audio**: Web Audio API, MediaRecorder API

## Poznámky

- API klíč se ukládá lokálně v Local Storage
- Historie konverzace se ukládá lokálně
- Aplikace vyžaduje HTTPS pro produkční použití (kvůli mikrofonu)
- Pro vývoj funguje i na HTTP localhost

## Bezpečnost

⚠️ **Důležité**: API klíč se ukládá v prohlížeči. V produkčním nasazení doporučujeme používat backend server pro bezpečnou správu API klíčů.
