[🇨🇿 **Česky**](README.md) | [🇬🇧 English](README_EN.md)

# Shared App Core Playground 1.0.0

Samostatná demonstrační a testovací aplikace pro Nextcloud 35 a Shared App Core >= 0.18.0-dev.16. Umožňuje vyzkoušet layout, formuláře, editor, mapové služby, seznamy a další služby Core. Instalujte odděleně od Core.

Rozbalte celý balíček a spusťte `sudo sh install.sh`. Obsahuje sestavený runtime, zdroje, dokumentaci a `uninstall.sh`. `sh build-release.sh` aplikaci znovu sestaví. Provozní ověření na NASu není součástí lokálních automatických testů.

## Souběžná editace

Sekce Souběžné změny nabízí dva editory nad jedním dokumentem. Uložte A, potom změněný B se starou revizí. Zobrazí se konflikt a možnosti načíst vzdálenou verzi, pokračovat, sloučit nebo uložit kopii. Nepřekrývající změny v odlišných řádcích lze sloučit; překrývající se změny nejsou automaticky přepsány. Sledování revizí zachová rozepsaný text.

Ukázka používá skutečné `core.concurrency` API, ale úložiště a HTTP 409 simuluje v paměti jedné stránky. Nejde o serverový zámek souboru ani ověření dvou skutečných uživatelů. Aplikace se sdílenými daty musí v backendu samy implementovat atomický compare-and-swap a kontrolu oprávnění. Obnovením stránky se testovací data a kopie smažou.

[Core](https://github.com/hacesoft/hc-shared-app-core) · [Dokumentace](docs/) · [Licence](LICENSE)
