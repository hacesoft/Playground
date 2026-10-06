[🇨🇿 Česky](../README.md) | [🇬🇧 English](../README_EN.md)

# Playground 0.18.0-dev.7

Playground je samostatná diagnostická aplikace pro Nextcloud 35 a Core 0.18.0-dev.7. Není součástí Core ZIPu ani podmínkou běhu ostatních aplikací.

Používá stejný jednoduchý start jako referenční aplikace: statické Core CSS, vlastní CSS, statický Core JS a vlastní JS v pořadí řízeném Nextcloudem. Neobsahuje samostatný Guard ani status polling pro start.

Po instalaci ověřte načtení Core, editor s živým náhledem a vložením obrázku, veřejné služby, layout, About, mapovou cache a skutečné statistiky. `/status` se používá pouze pro diagnostiku v Playgroundu. Postup je v [provozních zkouškách](PROVOZNI_ZKOUSKY_CZ.md).

Při přerušené instalaci spusťte znovu `sudo sh install.sh`.

## Jazykové mutace

Rozhraní Playgroundu obsahuje 11 jazyků: čeština (`cs`), angličtina (`en`), němčina (`de`), španělština (`es`), francouzština (`fr`), italština (`it`), nizozemština (`nl`), polština (`pl`), portugalština (`pt`), slovenština (`sk`) a ukrajinština (`uk`). Jazyk se určuje z nastavení uživatele Nextcloudu; regionální varianty se mapují na základní jazyk. Pro nepodporovaný jazyk i chybějící jednotlivý překlad se použije angličtina (EN). Přeložené jsou vlastní ovládání Playgroundu, stavové zprávy, dialogové popisky a ukázkový dokument editoru. Texty a chyby vytvořené přímo závislostí Core nebo serverem závisejí na lokalizaci těchto služeb; názvy API zůstávají technickými názvy. Dokumentace je pouze CZ a EN.

Při každé další úpravě aplikace se ověří jazyky proti společné sadě `cs`, `en`, `de`, `es`, `fr`, `it`, `nl`, `pl`, `pt`, `sk`, `uk`. Doplní se chybějící jazyky i překladové klíče, prověří se výběr jazyka podle Nextcloudu a aktualizuje seznam skutečně podporovaných jazyků. Přítomnost souboru není důkaz úplného překladu. Návody a vývojová dokumentace se vydávají pouze česky a anglicky.
