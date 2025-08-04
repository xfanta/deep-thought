# 💾 Nastavení trvalého úložiště dat

Aplikace podporuje více způsobů trvalého ukládání zpráv:

## 🔴 Option 1: Vercel KV (Redis) - DOPORUČENO

Nejlepší řešení pro Vercel. Rychlé, spolehlivé, plně managed.

### Nastavení:
1. V Vercel dashboardu jděte do projektu → Settings → Storage
2. Vytvořte nový KV database
3. Přidejte environment proměnné:
   ```
   KV_REST_API_URL=https://your-kv-url.vercel-storage.com
   KV_REST_API_TOKEN=your-token-here
   ADMIN_KEY=your-admin-key
   ```

**Výhody:** Rychlé, bezpečné, automatické zálohování
**Nevýhody:** Placené po určitém limitu

## 🟡 Option 2: JSONBin.io - ZDARMA

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

**Výhody:** Zdarma, snadné nastavení
**Nevýhody:** Externí závislost, rate limity

## 🟢 Option 3: Memory Cache - FALLBACK

Pokud žádné externí úložiště není nastavené, data se ukládají jen do paměti serveru.

**Výhody:** Žádné nastavení
**Nevýhody:** Data se ztratí při restartu

## 📋 Postup nasazení s trvalým úložištěm:

1. **Vyberte si způsob úložiště** (doporučuji Vercel KV)
2. **Nastavte environment proměnné** ve Vercel
3. **Redeploy** aplikaci
4. **Testujte** admin panel na `/admin.html`

## 🔍 Kontrola stavu úložiště:

API vrací informaci o použitém úložišti:
```json
{
  "success": true,
  "messages": [...],
  "storage": "Vercel KV (Redis)" // nebo "JSONBin.io" nebo "Memory Cache"
}
```
