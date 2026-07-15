# Tappr — Conținut prezentare (RO), slide cu slide

> **Pentru cine face PPTX-ul:** fiecare slide de mai jos are trei zone.
> **TEXT PE SLIDE** = se copiază exact, ăsta e conținutul vizibil.
> **VIZUAL** = ce se desenează/pune pe slide.
> **NOTIȚE** = ce spune prezentatorul, merge în zona de speaker notes.
>
> Termenii de produs (Smart Routing, AI Brain, A/B Testing, API) rămân în engleză — sunt nume
> de funcționalități, nu se traduc.
>
> **Citește obligatoriu secțiunea „Reguli" de la final înainte să adaugi orice cifră.**

---

## Slide 1 — Titlu

**TEXT PE SLIDE**
> # Tappr
> ### Link-uri inteligente pentru cei care nu-și permit să ghicească.
>
> tappr.me · v0.4 Beta

**VIZUAL:** fundal negru, logo Tappr mare, un singur accent verde. Nimic altceva.

**NOTIȚE:** Prezentare de 30 de secunde: „Tappr e o platformă de management al link-urilor. Rutează
fiecare click în funcție de țară, device și oră, detectează traficul de boți în timp real, și are
un AI care îți explică în cuvinte normale ce se întâmplă cu traficul tău."

---

## Slide 2 — Hook

**TEXT PE SLIDE**
> # Ai primit 2.400 de click-uri.
> # Câte au fost reale?
>
> 2.400 click-uri → **600 reale** · **1.800 boți**

**VIZUAL:** cifra 2.400 mare, care se sparge în două: 600 verde, 1.800 gri/roșu. E imaginea-simbol
a întregii prezentări.

**NOTIȚE:** Ăsta e momentul de tăcere. Lași cifra să stea pe ecran. Orice shortener îți spune
*câte* click-uri ai primit. Niciunul nu îți spune *câte au fost reale*.

---

## Slide 3 — Problema

**TEXT PE SLIDE**
> # Trei lucruri pe care shortener-ul tău nu ți le spune
>
> **01 — Cel mai bun link al tău tocmai a murit și tu nu știi.**
> Postarea de Instagram care aducea 70% din trafic a fost ștearsă. Trec ore până verifici.
>
> **02 — Jumătate din traficul tău „viral" sunt boți.**
> Un singur referrer pompează 1.800 de click-uri false. Arată excelent în dashboard — până
> compari cu conversiile.
>
> **03 — Îți ratezi target-ul și afli prea târziu.**
> Ziua 25 din 30, ești în urmă cu 60%. Nu mai ai ce corecta.

**VIZUAL:** trei coloane, numerotate. Fiecare cu o iconiță simplă. Fără poze de stock.

**NOTIȚE:** Astea nu sunt probleme teoretice — sunt exact motivele pentru care am construit
produsul. Fiecare dintre cele trei devine o funcționalitate pe slide-urile următoare.

---

## Slide 4 — De ce am construit Tappr

**TEXT PE SLIDE**
> # De ce am construit Tappr
>
> Am încercat **Bitly**. Ne-a spus că o campanie a primit click-uri. Nu ne-a spus care click-uri
> erau boți, nici de ce a murit brusc un link, nici ce postare ar trebui să redistribuim.
>
> Am încercat **Linktree**. Arată bine pe telefon. Dar nu e construit pentru rutare. Nu e
> construit pentru analiză. Și sigur nu e construit pentru cineva care rulează campanii plătite.
>
> **Așa că am construit Tappr** — pentru oamenii care chiar depind de link-uri: să funcționeze,
> să știe de ce funcționează, și să reacționeze rapid când nu mai funcționează.
>
> — Tappr Labs · București & Brooklyn

**VIZUAL:** slide de text, tipografie curată. Poate logo-urile Bitly/Linktree estompate în fundal.

**NOTIȚE:** Slide-ul de credibilitate. Nu vindem aici — povestim frustrarea din care s-a născut
produsul. Publicul ar trebui să dea din cap că a pățit-o și el.

---

## Slide 5 — Ce este Tappr

**TEXT PE SLIDE**
> # Un link. Trei pași. Zero ghicit.
>
> **01 — Creezi link-ul**
> Pui destinația, alegi slug-ul. Ai `tappr.me/promo` instant. Zero configurare ca să pornești.
>
> **02 — Adaugi reguli de rutare**
> Același link duce în locuri diferite după țară, device, oră, zi a săptămânii sau interval de
> date. Regulile se evaluează de sus în jos — prima care se potrivește câștigă.
> `dacă țara=US ȘI device=mobil → App Store`
>
> **03 — Vezi ce s-a întâmplat cu adevărat**
> Fiecare click e clasificat *înainte* de redirect. Boții sunt marcați, anomaliile declanșează
> alerte într-o oră, iar AI Brain îți explică schimbările în limbaj normal.
> `2.400 click-uri → 600 reale · 1.800 boți`

**VIZUAL:** trei pași orizontali cu săgeți între ei. Fragmentele de cod în monospace, pe fundal
mai închis.

**NOTIȚE:** Ăsta e slide-ul „ce face produsul". Dacă cineva pleacă după el, trebuie să poată
explica Tappr unui prieten.

---

## Slide 6 — Smart Routing

**TEXT PE SLIDE**
> # Smart Routing
> ## Un link. Orice context.
>
> Setezi reguli după **țară · device · oră · zi a săptămânii · interval de date**.
>
> Din același `tappr.me/promo`:
> - 🇺🇸 SUA, mobil → **App Store**
> - 🇷🇴 România, mobil → **magazinul localizat**
> - 📱 TikTok, browser in-app → **WhatsApp**
> - După ora 22:00 → **fallback**
>
> Plus **deep linking automat** — deschide direct aplicația nativă pe mobil (100+ aplicații).

**VIZUAL:** cel mai bun slide vizual din deck. Un link în stânga, trei-patru săgeți care pleacă
spre destinații diferite în dreapta, fiecare cu steagul/iconița contextului.

**NOTIȚE:** Aici oamenii înțeleg diferența față de un shortener clasic. Un link clasic are o
singură destinație. Al nostru are câte destinații ai nevoie.

---

## Slide 7 — AI Brain

**TEXT PE SLIDE**
> # AI Brain
> ## Întrebi în română. Îți răspunde cu cauza și cu ce ai de făcut.
>
> **› de ce a pierdut /promo trafic?**
>
> *Scădere de 67% în 12 ore. Săptămâna trecută, 84% din click-uri veneau de pe
> instagram.com/p/abc — acel referrer a căzut la zero azi. Cauză probabilă: postarea a fost
> ștearsă.*
>
> *→ Dă-i DM contului sau mută /promo pe o strategie TikTok-first.*

**VIZUAL:** o fereastră de chat, stil terminal. Întrebarea în verde, răspunsul AI-ului dedesubt.
Fără avatar de robot, fără clipart AI.

**NOTIȚE:** Diferența e că nu îți dă un grafic — îți dă **cauza** și **acțiunea**. Menționează și
raportul săptămânal generat automat: rezumat, ce a mers, ce a scăzut, ce ai de făcut.

---

## Slide 8 — Alerte în timp real

**TEXT PE SLIDE**
> # Alerte în timp real
> ## Afli în mai puțin de o oră, nu peste trei zile.
>
> **SPIKE — /launch — de 6× peste normal**
> *412 click-uri în ultimele 60 de minute, față de o medie de 68/oră. Ceva funcționează —
> împinge buget cât e cald.*
>
> **12 tipuri de alerte:** creșteri bruște · scăderi de trafic (40%+) · link-uri moarte ·
> tipare de boți · fraudă de click-uri
>
> Fiecare anomalie vine cu **cauza generată de AI** și **acțiunea recomandată**.

**VIZUAL:** o notificare/alertă stil card, cu bandă verde pe margine. Poate un mic grafic cu
spike-ul.

**NOTIȚE:** Punctul cheie: alerta nu e doar „ai un spike". E „ai un spike, uite de ce, uite ce
faci acum". Alertele apar live în dashboard, fără refresh, iar cele grave vin și pe email.

---

## Slide 9 — A/B Testing

**TEXT PE SLIDE**
> # A/B Testing
> ## Testezi variante. Câștigătorul se alege singur.
>
> Traficul se împarte 50/50 în spatele unui singur link.
>
> `A/landing-v1 → 7,4% conversie`
> `B/landing-v2 → 4,1% conversie`
> `★ câștigător: A — rutat automat la 100% din trafic`
>
> Tracking de conversii și venit. Calculator de ROI conectat la datele reale ale testului.

**VIZUAL:** două bare comparate, cea câștigătoare verde, cu o stea. Simplu.

**NOTIȚE:** Nu trebuie să stai să te uiți la test. După ce trece pragul de conversii pe care îl
setezi, Tappr mută singur tot traficul pe varianta câștigătoare.

---

## Slide 10 — API pentru dezvoltatori

**TEXT PE SLIDE**
> # API
> ## REST. Bearer auth. Cu tot cu rutare.
>
> ```
> POST https://tappr.me/api/v1/links
> Authorization: Bearer dl_xxx
>
> {
>   "destination_url": "https://shop.io",
>   "slug": "promo",
>   "redirect_rules": [...]
> }
> ```
>
> Creezi link-uri, citești analytics, gestionezi colecții — programatic.

**VIZUAL:** bloc de cod monospace, syntax highlighting discret. Un singur slide, curat.

**NOTIȚE:** Slide-ul pentru publicul tehnic. Dacă în sală nu sunt dezvoltatori, treci repede
peste el — dar lasă-l, arată că produsul e serios.

---

## Slide 11 — Pentru cine e

**TEXT PE SLIDE**
> # Pentru cine e Tappr
>
> **Creatori** (Instagram, TikTok, YouTube)
> Link-ul din bio moare în tăcere. Nu poți deosebi fanii reali de boți.
>
> **Antreprenori la început & marketeri**
> Rulezi campanii plătite. Nu îți permiți să plătești pentru click-uri false.
>
> **Companii care scalează**
> Ai nevoie de rutare geo/device/oră, domeniu propriu, API, roluri pe echipă.
>
> **Agenții**
> Multe campanii de client, volum mare, echipă nelimitată, suport prioritar.

**VIZUAL:** patru coloane sau un grid 2×2. Fiecare segment cu o iconiță.

**NOTIȚE:** Leagă fiecare segment de planul de preț corespunzător — asta pregătește slide-ul de
pricing.

---

## Slide 12 — Tappr vs. alternativele

**TEXT PE SLIDE**
> # De ce nu Bitly sau Linktree
>
> | | Bitly | Linktree | **Tappr** |
> |---|---|---|---|
> | Numărare click-uri | Un total unic | De bază | **Boții separați de oameni reali** |
> | Rutare | O singură destinație | Pagină statică | **După țară · device · oră · zi** |
> | *De ce* s-a schimbat traficul | Sapi prin grafice | — | **AI Brain îți explică** |
> | Când moare un link | Afli eventual | — | **Alertă într-o oră, cu cauza** |
> | Optimizare | Manual | — | **A/B test cu câștigător automat** |

**TEXT DE ÎNCHIDERE PE SLIDE:**
> Toate celelalte îți spun **câte** click-uri ai.
> Tappr îți spune **care au fost reale, de ce s-a schimbat cifra și ce ai de făcut.**

**VIZUAL:** tabel curat, coloana Tappr evidențiată cu verde. Fraza de închidere mare, sub tabel.

**NOTIȚE:** Slide-ul de poziționare. Dacă reții un singur lucru din prezentare, ăsta e.

---

## Slide 13 — Prețuri

**TEXT PE SLIDE**
> # Începi gratis. Plătești când depășești.
>
> | | **Free** | **Starter** | **Growth** ★ | **Agency** |
> |---|---|---|---|---|
> | Preț | €0 | €97/lună | €297/lună | €997/lună |
> | Click-uri/lună | 500 | 50.000 | 250.000 | Nelimitat |
> | Link-uri | 25 | 500 | 5.000 | Nelimitat |
> | Membri echipă | 1 | 3 | 10 | Nelimitat |
> | Smart Routing | — | Geo + Device | Complet | Complet |
> | AI Brain | 10 chat-uri/lună | Nelimitat | Nelimitat | Nelimitat |
> | Alerte | De bază | Toate 12 | Toate 12 | Toate 12 |
> | Domeniu propriu | — | — | ✓ | ✓ |
> | API | — | — | ✓ | ✓ |
> | Suport | Comunitate | Email | Email prioritar | Prioritar · 4h |

**VIZUAL:** patru carduri de preț, Growth evidențiat („cel mai popular"). Sau tabelul de mai sus
dacă vrei densitate.

**NOTIȚE:** Planul Free e momentan **pe bază de invitație** — se deblochează cu un cod de
partener. Dacă spui în sală „intrați gratis", pregătește coduri de împărțit, altfel oamenii
lovesc un zid.

---

## Slide 14 — Închidere

**TEXT PE SLIDE**
> # Nu mai pierde click-uri pe care nu le poți explica.
>
> **Începi gratis. Fără card. Gata în 60 de secunde.**
>
> ## tappr.me
>
> hello@tappr.me

**VIZUAL:** minimal. Fundal negru, mesajul, domeniul mare. Eventual un QR code către tappr.me
(ironic și potrivit — Tappr generează QR-uri).

**NOTIȚE:** Cere ceva concret. Dacă e eveniment cu investitori, aici e ask-ul. Dacă e eveniment cu
utilizatori, aici e QR-ul.

---

## ⚠️ REGULI — citește înainte să adaugi orice cifră

Tappr e la început (**v0.4 Beta**). Onestitatea face parte din pitch. **Nu inventa:**

- ❌ **Zero testimoniale. Zero logo-uri de clienți. Zero „Trusted by".** Nu există. Nu pune.
- ❌ **Zero cifre de tracțiune** de tipul „1,4 miliarde de click-uri rutate" sau „312 milioane de
  boți blocați". Erau text de machetă și au fost șterse intenționat de pe site. Cifrele reale de
  azi sunt mici. Prezentarea vinde **problema și mecanismul**, nu scara.
- ❌ **Zero promisiuni de uptime, SLA sau certificări** (SOC 2 etc.). Nu există.
- ❌ **Zero studii de caz inventate.**

✅ **Ce e legitim de arătat:** problema, cum funcționează produsul, demo-ul de rutare, exemplele
reale de output AI Brain, exemplele de alerte, prețurile, povestea fondatorilor.

---

## Ton și direcție vizuală

- **Ton:** direct, tehnic, fără fluff. Propoziții scurte, afirmative. Zero limbaj corporatist.
  Vocea brandului: *„pentru cei care nu-și permit să ghicească."*
- **Vizual:** fundal întunecat, un singur accent **verde** folosit pe cuvântul-cheie din fiecare
  titlu, monospace pentru date/cod, secțiuni numerotate (`/01`, `/02`), mult spațiu alb.
- **O idee per slide.** Dacă un slide are două mesaje, sunt două slide-uri.
- **Stack tehnic** (dacă e nevoie de un slide tehnic): Next.js 16 · React 19 · TypeScript ·
  Supabase (PostgreSQL + Realtime) · Groq (LLaMA 3.3 70B) · deployment pe Vercel.
