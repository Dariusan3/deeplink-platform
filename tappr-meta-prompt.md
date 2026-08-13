# Meta-prompt pentru tappr.me

De dat developerului. El îl bagă în **Claude Code-ul lui**, deschis în repo-ul
tappr.me. Rezultatul nu e un test — e un *prompt de tester*, scris de Claude Code
după ce citește codul, pe care apoi îl dai unei alte persoane.

De ce în doi pași: eu nu știu tappr.me. Claude Code-ul lui știe. Un prompt de
tester scris fără rutele reale, fără fluxurile reale și fără să știe ce e
periculos de apăsat e generic și inutil.

Se copiază tot, de sub separator.

---

Ești în repo-ul **tappr.me**. Nu scrii cod în această sarcină.

Sarcina ta: **produci un prompt de tester UX/UI**, pe care îl va primi o persoană
din exterior care intră cu Claude Code și Playwright pe aplicație. Persoana aia
nu are acces la acest repo și nu știe nimic despre produs. Tot ce are nevoie
trebuie să fie în promptul pe care îl scrii tu.

## Pasul 1 — citește codul și află

Nu presupune nimic. Deschide fișierele și verifică. Ai nevoie de:

**Rutele.** Lista completă de pagini pe care le poate atinge un utilizator
autentificat, plus cele publice. Pentru fiecare, o propoziție despre ce face.
Caută în router (`app/`, `pages/`, sau definițiile de rute) și în componenta de
navigație — navigația îți spune care sunt rutele *importante*, routerul ți le
spune pe toate.

**Autentificarea.** Cum se loghează cineva? Există un cont de test sau un seed?
Există magic link, OAuth, 2FA — ceva ce face automatizarea grea? Dacă login-ul nu
se poate automatiza, spune-o explicit în promptul final, cu soluția (de exemplu
un `storageState` pregătit manual).

**Fluxurile principale.** Cele 3–5 lucruri pentru care există produsul. Nu
inventa; deduce-le din rute, din numele componentelor, din ce e în navigație și
din README dacă există.

**Ce e periculos de apăsat.** Asta e partea cea mai importantă. Caută tot ce:
trimite email sau notificări, atinge Stripe sau orice plată, șterge definitiv,
publică ceva în afară, apelează un serviciu extern, sau modifică date pe care nu
le poți reface. Fă o listă explicită de acțiuni interzise. Un tester care
declanșează un webhook de plată în producție e o problemă mai mare decât orice
bug ar fi găsit.

**Mediul.** Există staging? Dacă da, testerul lucrează acolo și lista de
interdicții se scurtează mult. Dacă nu, spune direct că e producție.

**Zonele fragile.** Ce s-a scris cel mai recent, ce are cel mai puțin test
coverage, ce componentă are cea mai mare complexitate. Acolo sunt bug-urile.
`git log --since="3 weeks ago" --name-only` îți dă prima listă în zece secunde.

**Breakpoint-uri.** Ce lățimi presupune CSS-ul? Dacă cel mai mic breakpoint e
768px, testarea la 390px va produce zgomot — spune ce e suportat oficial.

**Design tokens.** Dacă există un fișier de teme sau tokens, extrage paleta,
fonturile și scara de spacing. Testerul are nevoie de ele ca să deosebească „e
inconsistent" de „așa e sistemul".

## Pasul 2 — scrie promptul

Un singur fișier Markdown, `UX-TESTER-PROMPT.md`, adresat direct testerului, cu
structura asta:

1. **Ce e tappr.me** — trei propoziții. Ce face, pentru cine, în ce stadiu e.
2. **Reguli care nu se încalcă** — lista de acțiuni interzise pe care ai
   găsit-o. Concret, cu numele butoanelor. „Nu apăsa Publish în /campaigns/[id]"
   bate „ai grijă cu acțiunile distructive".
3. **Acces** — URL, cont, cum se automatizează login-ul, cu `<<…>>` acolo unde
   developerul trebuie să completeze credențiale.
4. **Rutele**, cu o linie de context fiecare, în ordinea în care are sens să fie
   testate (fluxul principal întâi, setările la final).
5. **Fluxurile de parcurs cap-coadă** — 3–5 scenarii scrise ca pași, nu ca
   descrieri. „Creează X, atribuie-i Y, verifică că apare în Z."
6. **Unde să caute mai atent** — zonele fragile identificate la pasul 1, cu
   motivul.
7. **Ce nu se raportează** — preferințe, sugestii de features, lucruri
   nereproduse, warning-uri din librării.
8. **Formatul raportului** — severitate P0–P3, pași de reproducere, așteptat vs
   obținut, consolă, screenshot, și `file:line` dacă poate localiza.
9. **Metoda** — per pagină: snapshot de accesibilitate, screenshot la
   breakpoint-urile suportate, apoi interacțiuni reale cu citirea consolei după
   fiecare.

## Cum trebuie să iasă

- **Autonom.** Cineva care nu a văzut niciodată tappr.me trebuie să poată începe
  imediat. Zero „vezi cu echipa".
- **Specific.** Fiecare nume de rută, buton și flux e cel real din cod. Dacă
  scrii un exemplu generic, l-ai ratat.
- **Onest despre limite.** Dacă o zonă nu se poate testa fără să trimiți un email
  real, scrie asta în prompt, nu-l lăsa pe tester să descopere singur.
- Sub 200 de linii. Un prompt pe care nu-l citește nimeni nu ajută.

## La final, în chat (nu în fișier)

Spune-mi separat:

- Rutele pe care **nu** le-ai putut înțelege din cod și de ce.
- Acțiunile despre care nu ești sigur dacă sunt distructive — le decid eu.
- Dacă lipsește un cont de test și trebuie să creez unul.
