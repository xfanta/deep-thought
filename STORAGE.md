# 💾 Nastavení trvalého úložiště dat

Aplikace podporuje více způsobů trvalého ukládání zpráv s prioritním použitím Upstash Redis:

## � Option 1: Upstash Redis - DOPORUČENO PRO VERCEL

**Nejlepší řešení dostupné přímo na Vercel platformě.**

### Nastavení:
1. V Vercel dashboardu jděte do projektu → Storage → Browse Storage Partners
2. Vyberte **"Upstash" → "Serverless DB (Redis, Vector, Queue)"**
3. Klikněte "Add Integration" a dokončete setup
4. Vercel automaticky přidá environment proměnné:
   ```
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```
5. Přidejte ještě manuálně:
   ```
   ADMIN_KEY=your-secret-admin-key
   ```

**Výhody:** 
- ⚡ Bleskově rychlé
- 🔄 Automatické zálohování
- 🎯 Nativní Vercel integrace
- 💰 Generous free tier (10K commands/day)
- 🌍 Global edge locations

## 🟡 Option 2: Vercel KV - ALTERNATIVA

Vercel vlastní KV storage (také Redis-based).

### Nastavení:
1. V Vercel dashboardu → Storage → Create KV Database
2. Environment proměnné se přidají automaticky:
   ```
   KV_REST_API_URL=https://your-kv.vercel-storage.com
   KV_REST_API_TOKEN=your-token
   ADMIN_KEY=your-admin-key
   ```

## � Option 3: JSONBin.io - EXTERNÍ ZDARMA

Externí JSON úložiště, zdarma až 10,000 requests/měsíc.

### Nastavení:
1. Registrujte se na [jsonbin.io](https://jsonbin.io)
2. Vytvořte nový bin s prázdným polem: `[]`
3. Zkopírujte Bin ID a API klíč
4. Přidejte environment proměnné:
   ```
   JSONBIN_API_KEY=your-api-key
   JSONBIN_BIN_ID=your-bin-id
   ADMIN_KEY=your-admin-key
   ```

## � Option 4: Memory Cache - FALLBACK

Automatický fallback pokud žádné externí úložiště není nastavené.

## 📋 Doporučený postup pro Vercel:

1. **Přidejte Upstash Redis integraci** (nejjednodušší)
2. **Nastavte ADMIN_KEY** environment proměnnou
3. **Redeploy** aplikaci
4. **Testujte** admin panel na `/admin.html`

## 🔍 Automatická detekce úložiště:

API automaticky detekuje a používá dostupné úložiště v tomto pořadí:
1. **Upstash Redis** (priorita #1)
2. **Vercel KV** (priorita #2) 
3. **JSONBin.io** (priorita #3)
4. **Memory Cache** (fallback)

Admin panel zobrazuje aktuálně používané úložiště.
