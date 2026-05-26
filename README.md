# KRONOS | Simulatore di Gnomonica e Ore Storiche

Kronos è un'applicazione web interattiva sviluppata in HTML, CSS e JavaScript puro per simulare, confrontare e visualizzare diverse metodologie storiche di misurazione del tempo basate sulla luce solare. Il progetto propone un approccio gnomonico e scientifico per studiare come civiltà differenti leggevano le ore prima dell'avvento dei moderni orologi meccanici a tempo medio.

---

## 📐 I Sei Quadranti del Simulatore

L'interfaccia è strutturata per organizzare i sei quadranti in una disposizione coordinata ed equilibrata (i primi quattro in griglia $2 \times 2$ e gli ultimi due in pannelli estesi a larghezza intera):

### 1. Ora Civile, Parametri & Telemetria (Quadrante I)
*   **Pannello di Controllo:** Consente di modificare latitudine ($\phi$), longitudine ($\lambda$), data, ora locale e la declinazione della parete ($D$, per i quadranti verticali). Integra la geolocalizzazione GPS automatica (clamped ai limiti geometrici).
*   **Orologio Meccanico Francese:** Un orologio analogico mostra il tempo civile moderno (tempo medio locale coordinato).
*   **Letture Astronomiche:** Mostra in tempo reale l'altezza e l'azimut del Sole, la declinazione solare ($\delta$), gli orari di alba e tramonto locali, l'Ora Solare Apparente vera e la compensazione dell'**Equazione del Tempo (EoT)**.

### 2. Ora Italica da Tramonto (Quadrante II)
*   **Tipologia:** Meridiana verticale a parete declinata.
*   **Funzionamento:** Traccia 24 ore uguali a partire dal tramonto del giorno precedente (ora 24:00). Questo sistema indica direttamente quante ore di luce restano a disposizione prima del sopraggiungere della notte.

### 3. Ora Babilonese dall'Alba (Quadrante III)
*   **Tipologia:** Meridiana verticale a parete declinata.
*   **Funzionamento:** Suddivide il giorno in 24 ore uguali che iniziano al sorgere del Sole (ora 00:00). Indica quante ore di luce sono trascorse dall'alba corrente.

### 4. Ore Temporarie o Disuguali (Quadrante IV)
*   **Tipologia:** Meridiana verticale a parete declinata.
*   **Funzionamento:** Divide il periodo di luce diurna in 12 parti uguali (e la notte in altre 12), chiamate anche ore stagionali. La durata fisica di un'ora varia continuamente durante l'anno: è massima al solstizio d'estate e minima a quello d'inverno. L'ora VI (Sesta) corrisponde sempre al mezzogiorno solare.

### 5. Piazza Solare - Meridiana Analemmatica (Quadrante V)
*   **Tipologia:** Meridiana orizzontale a pavimentazione con gnomone mobile.
*   **Geometria Ellittica:** I punti orari (ore francesi da 6 a 18) sono disposti lungo un'ellisse il cui semiasse minore $B$ si adatta dinamicamente alla latitudine locale ($\phi$) rispetto al semiasse maggiore fisso $A = 150$:
    $$B = A \cdot \sin(\phi)$$
*   **Gnomone Umano Mobile:** La sagoma umana deve posizionarsi lungo la scala meridiana centrale (asse Nord-Sud) ad una coordinata $Y_{date}$ che dipende dalla declinazione del Sole ($\delta$) e dalla latitudine:
    $$Y_{date} = A \cdot \tan(\delta) \cdot \cos(\phi)$$
*   **Tracciamento:** Lo gnomone proietta un'ombra realistica (beige semitrasparente) abbinata a un raggio celeste di lettura che intercetta un mirino luminoso a doppio cerchio sull'ellisse oraria. Sulla scala sono evidenziate le posizioni solstiziali (Estate/Inverno) e quella equinoziale.

### 6. Parete Solare - Meridiana Francese con Lemniscata (Quadrante VI)
*   **Tipologia:** Meridiana verticale a parete declinata.
*   **Funzionamento:** Mostra il tempo solare vero locale (ore francesi a ore uguali). 
*   **Lemniscata delle ore 12:** Lungo la linea meridiana del mezzogiorno vero (ore 12), viene tracciata la caratteristica curva a "otto" tratteggiata (Analemma o Lemniscata). Questa curva proietta i valori reali dell'Equazione del Tempo per ciascun giorno dell'anno, permettendo di confrontare visivamente il tempo solare vero con il tempo civile medio locale.

---

## 🔭 Fondamenti Scientifici di Proiezione

Per garantire l'accuratezza fisica delle ombre, il motore di calcolo implementa la rotazione tridimensionale dei vettori solari nel sistema di coordinate locali **SEZ (South-East-Zenith)**:

1.  **Vettore Unitario Solare:**
    $$S_{South} = -\cos(alt) \cos(azi)$$
    $$S_{East} = -\cos(alt) \sin(azi)$$
    $$S_{Zenith} = \sin(alt)$$

2.  **Meridiane a Parete (Verticali):**
    Il vettore solare viene proiettato sulla normale e sulla tangente della parete declinata dell'angolo $D$. Le coordinate dello stilo sul quadrante rispetto al piede della perpendicolare (nodus di altezza $a$) seguono le formule:
    $$x = -a \cdot \frac{S_{Horiz}}{S_{Normal}}$$
    $$y = -a \cdot \frac{S_{Zenith}}{S_{Normal}}$$
    Dove $S_{Normal} = S_{South} \cos(D) - S_{East} \sin(D)$ e $S_{Horiz} = S_{South} \sin(D) + S_{East} \cos(D)$. Se $S_{Normal} \le 0$ o $S_{Zenith} \le 0$, il sole è dietro la parete o sotto l'orizzonte (nessuna ombra proiettata).

3.  **Meridiane Orizzontali (Pavimentazione):**
    Le proiezioni dell'ombra sul piano orizzontale per uno gnomone verticale di altezza $a$ seguono le coordinate cartesiane:
    $$x = -a \cdot \frac{S_{East}}{S_{Zenith}}$$
    $$y = a \cdot \frac{S_{South}}{S_{Zenith}}$$

---

## 🛠️ Tecnologie Utilizzate

*   **HTML5 & CSS3:** Struttura semantica e interfaccia grafica in tema scuro ad alto contrasto. Utilizza elementi grafici sfumati ed effetti glassmorfici per favorire la leggibilità.
*   **JavaScript (ES6):** Sviluppo interamente nativo per i motori astronomici, i calcoli trigonometrici e la generazione dinamica dei nodi vettoriali delle curve e delle ombre all'interno delle tele SVG.
*   **Lucide Icons:** Libreria leggera di icone vettoriali per la navigazione visiva.

---

## 📦 Come Eseguire Localmente

Il simulatore non richiede fasi di build complesse o compilatori dedicati:
1.  Clonare il repository:
    ```bash
    git clone https://github.com/qsecofr76/SunDialTimeKeeping.git
    ```
2.  Accedere alla cartella del progetto:
    ```bash
    cd SunDialTimeKeeping
    ```
3.  Avviare un qualsiasi server HTTP statico locale. Ad esempio, con Node/npm:
    ```bash
    npm run dev
    ```
    Oppure utilizzando Python:
    ```bash
    python -m http.server 8000
    ```
4.  Aprire il proprio browser all'indirizzo locale indicato (ad es. `http://localhost:5173` o `http://localhost:8000`).

---

## ✍️ Note e Riconoscimenti

Questo simulatore è stato sviluppato coniugando rigore matematico e divulgazione storica delle discipline gnomoniche. I calcoli di declinazione ed equazione del tempo fanno riferimento ad algoritmi astronomici semplificati, sufficientemente accurati a scopi didattici e illustrativi.
