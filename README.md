# Terapia — PWA con promemoria

App semplice per spuntare le medicine della settimana, con notifiche push agli orari. Tutto gratuito: GitHub Pages (app) + Cloudflare Worker (notifiche).

Le spunte restano salvate sul telefono. Le notifiche arrivano anche ad app chiusa.

## 1. Pubblica l'app su GitHub

1. Su github.com crea un repository nuovo (es. `terapia`), pubblico.
2. Carica **tutto il contenuto di questa cartella** (Add file → Upload files).
3. Settings → Pages → Source: *Deploy from a branch* → branch `main`, cartella `/ (root)` → Save.
4. Dopo 1-2 minuti l'app è su `https://TUOUSER.github.io/terapia/`.

## 2. Genera le chiavi per le notifiche

Apri sul PC `setup/genera-chiavi.html` (doppio clic) e premi **Genera chiavi**. Tieni la pagina aperta: ti servono i due valori.

## 3. Crea il Worker su Cloudflare (gratis)

1. Crea un account su cloudflare.com (piano Free).
2. **Storage & Databases → KV → Create** un namespace chiamato `SUBS`.
3. **Workers & Pages → Create → Create Worker**, nome `terapia-push` → Deploy → *Edit code*, cancella tutto e incolla il contenuto di `worker/worker.js` → Deploy.
4. Nel Worker: **Settings → Bindings → Add → KV namespace**: variable name `SUBS`, scegli il namespace creato.
5. **Settings → Variables and Secrets** aggiungi:
   - `ALLOWED_ORIGIN` (testo) = `https://TUOUSER.github.io` (senza `/terapia` e senza `/` finale)
   - `VAPID_PUBLIC_KEY` (testo) = chiave pubblica
   - `VAPID_SUBJECT` (testo) = `mailto:tua-email@esempio.it`
   - `VAPID_PRIVATE_JWK` (**Secret**) = chiave privata JWK
6. **Settings → Trigger Events → Add → Cron Trigger**: `*/5 * * * *`
7. Copia l'indirizzo del Worker (`https://terapia-push.TUONOME.workers.dev`).

## 4. Collega app e Worker

Su GitHub modifica `config.js` e compila `WORKER_URL` (indirizzo del Worker) e `VAPID_PUBLIC_KEY`. Commit.

## 5. Installa sul telefono Android

1. Apri `https://TUOUSER.github.io/terapia/` con Chrome.
2. Menu ⋮ → **Installa app** (oppure il pulsante *Installa app* nella pagina).
3. Apri l'app installata → **Attiva promemoria** → Consenti.
4. Premi **Prova notifica** per verificare.

Consiglio: nelle impostazioni Android, per l'app Terapia / Chrome togli l'ottimizzazione batteria ("Nessuna restrizione"), altrimenti le notifiche possono arrivare in ritardo.

## Modificare la terapia

- `terapia.js`: farmaci, orari, giorni, dosi.
- `worker/worker.js` (lista `SCHEDULE`): gli stessi orari/giorni. Incolla di nuovo il codice nel Worker e fai Deploy.

## Stampa

Nella scheda **Settimana** il pulsante *Stampa settimana* produce lo schema A4 orizzontale con le caselle.

## Note

- Gli orari delle notifiche seguono il fuso Europe/Rome (ora legale inclusa).
- Il testo della notifica elenca le medicine di quell'orario.
- Il piano riflette quanto indicato dall'utente; eventuali modifiche vanno concordate con il medico.
