[🇨🇿 Česky](../README_CZ.md) | [🇬🇧 English](../README.md)

# Playground 0.18.0-dev.7 – provozní zkoušky

Vyžaduje Core 0.18.0-dev.7, API 1. Core není v tomto balíčku změněno.
Deklarovaný rozsah je Nextcloud 35. Tento kandidát není dokladem kompletní kvalifikace na serveru.

## Postup na NC35

1. Nainstalujte pouze tento Playground pomocí `sudo sh install.sh` z jeho adresáře. Neodinstalovávejte Core.
2. Otevřete Playground a ověřte 16 základních kontrol. Ty samy nestahují mapové dlaždice.
   V sekci společného editoru zkontrolujte formátovací lištu a živý náhled vedle textu na PC, pod textem na mobilu. Vložte obrázek PNG nebo JPEG do 1 MiB a ověřte jej v náhledu; obnovení stránky ukázku smaže.
3. V sekci „Provozní zkoušky na tomto serveru“ spusťte skutečnou mapu. Posouvejte a zoomujte, vyberte dostupného providera/podklad. Podklady procházejí Core proxy/cache; žádné přímé URL s klíčem ani CDN se nepoužívají. Požadavky mohou čerpat kredity.
4. Klikněte „Ověřit serverovou cache“. Dva požadavky na stejnou viditelnou dlaždici obejdou pouze cache prohlížeče, nikoli Core cache. Výsledek vypíše hlavičku `X-HC-Core-Map-Cache`. Teprve druhé `hit` potvrzuje HIT. Jiné odpovědi nejsou automaticky neúspěch cache: revalidace či pravidla providera vyžadují posouzení. HTTP chyby se vypíší včetně Retry-After; probe sám neopakuje chyby.
5. Spusťte GPS a povolte polohu. Marker i střed mapy mají sledovat zařízení. Zoom zachová následování, tažení jej vypne, „Moje poloha“ jej zapne. Změna podkladu zachová současný stav. „Zastavit GPS“ ukončí watch. Souřadnice se neukládají do oblíbených, ale související mapové požadavky odpovídají poloze mapy.
6. Spusťte test ukládání. Vytvoří unikátní namespace nastavení a jediné testovací místo, ověří čtení a aktualizaci místa, vyprázdní namespace a odstraní místo. Skutečné nastavení a existující místa nemění. Namespace může zůstat jako prázdný záznam. Během zápisu nezavírejte stránku; ukončení prohlížeče nebo výpadek serveru nelze překlenout cleanupem v JS. Při chybě úklidu se zobrazí ID místa a tlačítko opakování. Při přerušené stránce lze místo poznat podle názvu „Playground test/updated“ a unikátního tokenu.
7. Zastavte mapu. Core controller, Leaflet, pozorovatel velikosti, GPS i rozpracované dlaždice se uvolní.

Pošlete text výsledku cache, ukládání a případnou chybu mapy. GPS bez oprávnění nebo bez dostupné polohy není důkaz chyby Core. Neodesílejte API klíče.

## Technické ověření balíčku

TypeScript/Vue kontrola, unit testy manuálního spouštění a úklidu při selhání, validace manifestu, sestavení a test veřejných bundle Core/Playground s mock HTTP. Tyto testy nejsou serverové integrační testy PHP/MariaDB/Redis.

Leaflet 1.9.4 je lokálně součástí sestavení, licence v LEAFLET_LICENSE.md. Canvas dlaždice dekódují odpovědi Core pomocí createImageBitmap; nedochází k povolování externích obrázkových domén. Core createTileLoader řídí souběh a retry; unload ruší zastaralé požadavky. Používá se veřejný Leaflet adaptér Core a layout.observe.

Sdílení a seznamy míst tímto testem pokryté nejsou. Ověřuje se současné ploché favorites API. Spotřebitelské aplikace se touto verzí nemění.

Při přerušené instalaci spusťte znovu `sudo sh install.sh`.
