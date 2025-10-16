# DÁP + Supabase (mit csinál és miért jó neked)

**Mi ez?**  
Ez a bővítés azt tudja, hogy a felhasználóidat a magyar **DÁP** (Digitális Állampolgárság Program)
rendszerén keresztül tudod azonosítani. A DÁP az állam hivatalos „beléptető rendszere” mobilon –
biztonságos, ellenőrzött, és a felhasználó látja, hogy milyen adatait osztja meg.

**Miért fontos?**  
- Mert hiteles: állami azonosítás → kisebb csalás kockázat.  
- Mert nyomonkövethető: minden lépést naplózunk (audit), ez GDPR-ban is nagy segítség.  
- Mert átlátható: a felhasználó jóváhagyja, milyen adatai mennek tovább (név, születési dátum stb.).

**Hogyan működik röviden?**  
1. A felhasználó a te appodban rányom a „Bejelentkezés DÁP-pal” gombra.  
2. Átirányítjuk a DÁP rendszerébe, ahol az appban jóváhagyja, hogy megoszthatja az adatait.  
3. Visszajön hozzánk egy igazolás (ezt „prezentációnak” hívják).  
4. Ezt eltároljuk a **Supabase**-ben (ez egy felhős Postgres adatbázis), és kiadunk a felhasználónak
   egy rövid érvényességű „belépő” tokent.  
5. Innentől a saját rendszeredben már a megszokott módon megy tovább minden, csak épp biztos kézből
   tudod, ki a felhasználó.

**Miért Supabase?**  
- Gyors: nem kell saját adatbázist és jogosultsági rendszert felépítened.  
- Biztonságos: sor-szintű jogosultság (RLS) – a felhasználó csak a saját adatait éri el.  
- Egyszerű: REST/JS kliens, Edge Functions – jól illeszkedik a modern webhez.

**Mik a következő lépések?**  
- A mostani verzió egy minta („mock”) prezentációt használ. Amint a DÁP hivatalos végpontjait
  megkapod, a beállításokat átírjuk az `.env` fájlban, és élesben is megy.  
- Ha több adatot szeretnél kérni (pl. lakcím), a „kért attribútumok” listáját bővítjük.  
- A kriptográfiai ellenőrzést (aláírás) a következő verziókban bekötjük a DÁP által megadott
  trust listák alapján.

**Hol találod a technikai részleteket?**  
- Új útvonalak: `/dap/login`, `/dap/callback`, `/dap/attributes`.  
- Adattáblák: `dap_identities` (azonosítás), `dap_audit` (naplózás).  
- Beállítások: `.env` fájl (Supabase kulcsok, DÁP végpontok).

**Összefoglalva:**  
Hiteles beléptetés állami rendszerrel, átlátható adatkezelés, fejfájásmentes tárolás Supabase-ben.
A felhasználó biztonságban érzi magát, te pedig biztosan tudod, hogy ki van a túloldalon.
