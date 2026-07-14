# AI dialogue orchestrator

Cloudflare Worker senza dipendenze che espone `POST /api/dialogue`. Le chiavi dei provider restano nei secret del Worker e non vengono mai inviate al client.

## Routing

Il campo `mode` determina il provider preferito:

| Modalita | Provider preferito | Obiettivo |
| --- | --- | --- |
| `director`, `coherence` | OpenAI | regia e coerenza |
| `narrative`, `emotion` | Anthropic | narrativa ed emozione |
| `worldbuilding`, `missions` | Gemini | mondo e missioni |
| `banter`, `conflict` | xAI | botta e risposta e conflitto |

Sono accettati anche gli alias italiani `coerenza`, `narrativa`, `emozione`, `missioni` e `conflitto`. Se il provider preferito non e configurato o fallisce, il Worker prova il primo provider disponibile nell'ordine OpenAI, Anthropic, Gemini, xAI.

## Configurazione

I seguenti nomi modello sono default applicativi, non una garanzia che siano abilitati o disponibili nel proprio account. Verificare gli ID nel pannello del provider e sovrascriverli tramite variabili del Worker quando necessario.

| Secret / variabile | Default | Note |
| --- | --- | --- |
| `OPENAI_API_KEY` | - | secret opzionale; abilita OpenAI |
| `OPENAI_MODEL` | `gpt-5.2` | modello OpenAI sovrascrivibile |
| `ANTHROPIC_API_KEY` | - | secret opzionale; abilita Anthropic |
| `ANTHROPIC_MODEL` | `claude-opus-4.5` | modello Anthropic sovrascrivibile |
| `GEMINI_API_KEY` | - | secret opzionale; abilita Gemini |
| `GEMINI_MODEL` | `gemini-3-pro` | modello Gemini sovrascrivibile |
| `XAI_API_KEY` | - | secret opzionale; abilita xAI |
| `XAI_MODEL` | `grok-4.1` | modello xAI sovrascrivibile |
| `CORS_ALLOWED_ORIGINS` | `*` | origini separate da virgola, per esempio `https://example.com,https://staging.example.com` |
| `AI_TIMEOUT_MS` | `20000` | timeout per singolo tentativo, limitato a 1-60 secondi |
| `AI_MAX_OUTPUT_TOKENS` | `1200` | token massimi, limitati a 128-8192 |
| `API_AUTH_TOKEN` | - | token Bearer opzionale per proteggere l'endpoint |

Impostare almeno una chiave provider:

```sh
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put XAI_API_KEY
```

Le variabili non sensibili possono essere configurate in `wrangler.toml`, nel dashboard Cloudflare oppure come secret se si preferisce. Esempio di `wrangler.toml` esterno a questa cartella:

```toml
name = "testaccio-ai-orchestrator"
main = "worker/ai-orchestrator.js"
compatibility_date = "2026-07-14"

[vars]
CORS_ALLOWED_ORIGINS = "https://example.pages.dev"
OPENAI_MODEL = "gpt-5.2"
ANTHROPIC_MODEL = "claude-opus-4.5"
GEMINI_MODEL = "gemini-3-pro"
XAI_MODEL = "grok-4.1"
AI_TIMEOUT_MS = "20000"
AI_MAX_OUTPUT_TOKENS = "1200"
```

Non inserire API key o `API_AUTH_TOKEN` in `wrangler.toml`, nel JavaScript del browser o in altre risorse pubbliche.

## Richiesta

```http
POST /api/dialogue
Content-Type: application/json
```

```json
{
  "mode": "narrative",
  "language": "Italian",
  "prompt": "Marta confronta Edo dopo il fallimento della missione.",
  "messages": [
    { "role": "user", "content": "Edo ha nascosto una parte dell'accaduto." }
  ],
  "context": {
    "scene": "Piazza Testaccio",
    "trust": 42,
    "day": 3
  }
}
```

Occorre fornire almeno uno tra `prompt`, `messages` e `context`. Il body massimo e 64 KiB. `messages` accetta al massimo 40 elementi con ruolo `user` o `assistant`.

La risposta usa questo schema predefinito:

```json
{
  "data": {
    "dialogue": [
      {
        "speaker": "Marta",
        "text": "...",
        "emotion": "delusa",
        "intent": "ottenere la verita"
      }
    ],
    "summary": "...",
    "stateUpdates": {},
    "hooks": []
  },
  "meta": {
    "provider": "anthropic",
    "model": "modello-effettivamente-usato",
    "mode": "narrative",
    "fallback": false
  }
}
```

Per un contratto diverso, passare `outputSchema` con un JSON Schema avente `type: "object"`. Il Worker richiede output JSON al provider, esegue il parsing e valida il risultato sul sottoinsieme essenziale dello schema (`type`, `required`, `properties`, `items`, `enum`, `additionalProperties`).

Se `API_AUTH_TOKEN` e configurato, aggiungere `Authorization: Bearer <token>`. Questo token controlla l'accesso al Worker ma, in un client web pubblico, non va considerato un segreto; per produzione affiancare protezioni Cloudflare come rate limiting o Access secondo il modello di autenticazione dell'app.

## Deploy

Dal root del repository, dopo aver configurato Wrangler e i secret:

```sh
npx wrangler deploy
```

Per testare il preflight CORS:

```sh
curl -i -X OPTIONS "https://<worker>.workers.dev/api/dialogue" \
  -H "Origin: https://example.pages.dev" \
  -H "Access-Control-Request-Method: POST"
```

Per testare una richiesta:

```sh
curl -X POST "https://<worker>.workers.dev/api/dialogue" \
  -H "Content-Type: application/json" \
  -d '{"mode":"director","prompt":"Scrivi uno scambio breve prima della missione."}'
```
