# Tappr — lansare în comunitate: ce mai avem de făcut

*Stare verificată pe 24 august 2026, direct în producție (Supabase) și în repo. Fiecare punct are dovada lângă el.*

Arborele git e curat, `origin/main` la zi — tot codul scris până acum poate ajunge live.

---

## 🔴 1. Blocante — nu trimite linkul nimănui până nu sunt rezolvate

Ambele sunt deschise chiar acum în producție.

- [ ] **Orice user autentificat poate citi tot tabelul `users`**
  Politica `users_select_team_members` se termină cu `OR (email IS NOT NULL)`. Toate cele 21 de rânduri satisfac condiția, deci oricine are cont citește email, `full_name`, `is_admin`, `is_partner` pentru toți ceilalți — cu cheia anon care e publică în bundle. E problemă de GDPR, nu doar de securitate. Devine mult mai gravă în clipa în care intră oameni din comunitate.

- [ ] **Orice `UPDATE` pe `public.users` din browser eșuează**
  Politica `admins_can_update_users` face `EXISTS (SELECT 1 FROM users u ...)` — subinterogare pe `users` dintr-o politică *pe* `users`. Rezultat: `ERROR: 42P17: infinite recursion detected in policy for relation "users"`. Fix-ul standard e o funcție `security definer` care ocolește RLS, ca `is_team_member` care există deja în schemă.

- [ ] **Testează bypass-ul porții de referral, după ce repari recursia**
  Din sesiunea unui cont în carantină: `PATCH /rest/v1/users?id=eq.<id>` cu `{"signup_status":"ok"}`. Cererea trebuie să reușească iar valoarea să **nu** se schimbe. Triggerul `guard_signup_status` e instalat și activ, dar **nu a putut fi verificat end-to-end** fiindcă recursia de mai sus lovește înaintea lui. Practic poarta e apărată azi de un bug, nu de trigger — și cade exact când repari politica.

---

## 🟡 2. Înainte să plece invitațiile

- [ ] **Decide confirmarea pe email și setează-o**
  Supabase → Authentication → Sign In / Providers → Email → „Confirm email". Codul funcționează în ambele configurații: `signUp` se ramifică pe `data.session`, deci nu cere redeploy când comuți.
  **Cu ea pornită:** nimeni nu intră cu adresa altcuiva, dar orice problemă de livrare = user blocat.
  **Cu ea oprită:** intrare instantă, dar adrese neverificate în bază care produc bounce-uri și erodează reputația domeniului la Resend.

- [ ] **Nu mai testa cu `test@gmail.com` și `test@yahoo.com`**
  Sunt pe lista de suprimare a contului Resend. Acceptă cererea, întorc 200 și un id, dar nu trimit nimic — de acolo au venit toate orele pierdute cu „nu primesc emailul". Sunt și cutii poștale reale ale altcuiva. Ca să le refolosești, scoase manual din Suppression List în dashboard-ul Resend.

- [ ] **Webhook Resend pentru `email.bounced` și `email.delivery_delayed`**
  Azi o trimitere suprimată arată identic cu una livrată: fiecare strat raportează succes, iar `confirmation_sent_at` se setează. Logăm id-ul întors de Resend, dar cineva tot trebuie să-l caute manual. Fără webhook, următorul caz de nelivrare costă la fel de mult de diagnosticat.

- [ ] **Parcurge fluxul complet, cu o adresă reală pe care o deții**
  Link de referral → cont nou → email de confirmare → confirmare → dashboard → verifică în `partner_referrals` că partenerul a fost creditat.

- [ ] **Lămurește ce comite automat în repo**
  De patru ori în ultimele zile au apărut commit-uri și push-uri pe care nu le-a făcut nimeni explicit (`update by push` în reflog). Cât timp rulează, „nu publica încă" nu poate fi respectat, iar înainte de lansare vrei control asupra a ce ajunge live.

- [ ] **Confirmă că ultimul deploy conține tot**
  Ultimele commit-uri: `08c56df` tooltip alerte, `2bdec93` layout quick-create, `ea1a805` cod vanity editabil din Overview, `660fbbe` listă explicită de tipuri care trimit email.

---

## 🟠 3. Igiena alertelor — restul din spec, partea B

Parțial făcută. `EMAIL_TYPES` e listă explicită acum, iar `click_drop` a ieșit de pe email și i-am reparat calculul. Ce a rămas:

- [ ] **`click_spam` retrage în fiecare zi**
  Cheia de dedup e `click_spam:<ip>:<azi>`, bucket zilnic, Tier 1, severity `high` — deci email zilnic cât timp un bot lovește. Weekly + adăugat în `AUTO_CLOSE_ON_ABSENCE`: 1 email pe săptămână în loc de 7, iar rândul se închide singur când rafala se oprește.

- [ ] **`destination_broken` retrage la fiecare pâlpâire**
  Cheia n-are bucket de timp, iar rândurile închise automat sunt excluse intenționat din cooldown. Destinație care dă 502 dimineața și merge seara = email zilnic. Cere partea A din spec (`link_health.down_since`) ca să lege cheia de episodul de cădere.

- [ ] **Opt-out real + one-click unsubscribe**
  `List-Unsubscribe` trimite azi la un `mailto` procesat de om, pe care nu-l respectă niciun cod, iar `team_settings` n-are nicio coloană de notificări. Gmail și Yahoo cer one-click funcțional de la expeditorii bulk din februarie 2024 — e și risc de deliverability, nu doar UX.

- [ ] **Retrage sistemul de anomalii cu AI**
  `cron/anomaly-check` scrie rânduri cu `alert_type = NULL`, îmbogățite cu text generat de `llama-3.1-8b-instant` — un model care inventează cauza unei căderi de trafic fără să vadă datele. Acolo e copy-ul fără sens. Fiindcă n-au `dedup_key`, nu se închid niciodată singure. Trei dintre cei cinci detectori merită portați ca tipuri normale, doi dublează `click_drop`.

---

## 🟢 4. Interfața de partener — partea C din spec

- [ ] **`h-screen` → `h-dvh` în layout-ul de partener**
  Bug real pe telefon: `100vh` pe iOS Safari și Chrome Android ignoră barele browserului, iar cu `overflow-hidden` pe același element ultimii ~60–100px ai shell-ului ajung sub bară și nu se poate ajunge la ei.

- [ ] **73 de mărimi de font hardcodate**
  60 de `text-[8px]`–`text-[10px]` plus 13 de `text-[11px]`–`text-[14px]`. Fixe în px, nu scalează, și ignoră complet setarea de font-size din browser — problemă de accesibilitate. 8px și 9px sunt sub orice prag citibil.

- [ ] **Tabelul de referrals pe telefon**
  Șapte coloane într-un `overflow-x-auto`, fără niciun indiciu de scroll și fără variantă card.

---

## 🔵 5. De urmărit în prima săptămână

- [ ] **Val de 403 `Session not found` pe `/user`**
  Zeci de cereri în două secunde, de la același IP, în log-ul de auth. Arată a buclă de retry în client, nu a comportament normal. Cu mai mulți useri, se înmulțește.

- [ ] **Verifică dacă `click_drop` s-a liniștit**
  Compara o felie parțială de zi cu media pe zi întreagă, deci trimitea în fiecare dimineață. Exemplu real: medie 30/zi, 11 clicuri la ora 09:00 — adică **98% din ritmul normal** pentru acea oră — raportat ca „down 64%". Acum baseline-ul se construiește pe aceeași felie de zi din ultimele 7 zile.

- [ ] **Conturi rămase neconfirmate**
  Două acum, ambele adrese de test. Dacă numărul crește după lansare, livrarea are o problemă.

---

## ⚪ 6. Goluri acceptate conștient

*Nu sunt de rezolvat înainte de lansare, dar merită știute.*

- **Nu există niciun framework de test.** `package.json` are doar `dev`, `build`, `start`, `lint`, zero fișiere `*.test.*`. Toată verificarea e `npm run build`, `npm run lint` și probe manuale. Plasa de siguranță reală sunt hărțile `Record<AlertType, …>` din TypeScript, care refuză build-ul dacă un tip nou nu e tratat peste tot.

- **Partea A din spec, link health, nu e construită.** Nimic nu știe azi dacă un redirect a funcționat cu adevărat. Singura verificare a destinațiilor e cronul de două ori pe zi.

- **Rata de comision a dispărut din headerul sidebar-ului de partener.** N-avea loc pe un rând fără să strice alinierea. Apare pe Overview și în Settings.

---

*Specul complet, cu raționamentul din spatele fiecărei decizii: `docs/superpowers/specs/2026-08-10-pre-launch-alerts-and-partner-design.md`*
