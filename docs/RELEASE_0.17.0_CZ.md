[🇨🇿 Česky](../README_CZ.md) | [🇬🇧 English](../README.md)

# Core a Playground 0.17.0

- Nové maps.watchLocation a maps.followLocation, AbortSignal a opakovatelné ukončení.
- Mapový controller: setCenter, notifyManualPan a události pro následování a zničení.
- Playground: ručně spouštěná GPS ukázka a zachování Vue stromu při návratu z BFCache.
- Návod MAPS_LOCATION_CZ.md obsahuje kontrakt, integraci a úklid prostředků.

Instalujte nejprve Core, potom samostatný Playground pomocí `sudo sh install.sh` v příslušné rozbalené složce. Build-release.sh je pro vývojáře k novému sestavení archivu, k instalaci není potřeba.

Stávající aplikace se automaticky nepřepnou na kontinuální GPS. Weather a Navigation musí nové služby zavolat a propojit skutečný ruční pan s notifyManualPan. Jejich start ani minimum verze není nutné měnit, dokud novou službu nezačnou používat. Ukázka Playground vyžaduje Core 0.17.0.

Ověřeno lokálně: TypeScript Core a prázdné aplikace, Vue TypeScript, 38 Core testů (včetně nového integračního testu), 1 Playground test, kontrola dokumentace, produkční sestavení obou balíků, veřejné API výsledného Core bundle a referenční jednoduchý start.

PHP/NAS instalace a skutečná poloha na mobilním zařízení nejsou v tomto prostředí ověřené. Testování polohy používá náhradní geolokační rozhraní.

Při přerušené instalaci spusťte znovu `sudo sh install.sh`.
