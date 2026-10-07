[🇨🇿 **Česky**](README_CZ.md) | [🇬🇧 English](README.md)

# Shared App Core Playground 1.0.0

## Povinná závislost: Hacesoft Core

**Playground bez nainstalovaného a zapnutého Core nefunguje.** Vyžaduje **Core 0.18.1 nebo novější**. Core poskytuje společné služby a komponenty, které Playground předvádí.

**Repozitář Core: [https://github.com/hacesoft/core](https://github.com/hacesoft/core)**

Nejprve nainstalujte a zapněte Core podle jeho návodu. Potom nainstalujte Playground. Core je samostatná aplikace a není přibalené v tomto archivu.

Samostatná demonstrační a testovací aplikace pro Nextcloud 35 a Shared App Core >= 0.18.1. Umožňuje vyzkoušet layout, formuláře, editor, mapové služby, seznamy a další služby Core. Instalujte odděleně od Core.

Rozbalte celý balíček a spusťte `sudo sh install.sh`. Obsahuje sestavený runtime, zdroje, dokumentaci a `uninstall.sh`. `sh build-release.sh` aplikaci znovu sestaví. Provozní ověření na NASu není součástí lokálních automatických testů.

## Souběžná editace

Sekce Souběžné změny nabízí dva editory nad jedním dokumentem. Uložte A, potom změněný B se starou revizí. Zobrazí se konflikt a možnosti načíst vzdálenou verzi, pokračovat, sloučit nebo uložit kopii. Nepřekrývající změny v odlišných řádcích lze sloučit; překrývající se změny nejsou automaticky přepsány. Sledování revizí zachová rozepsaný text.

Ukázka používá skutečné `core.concurrency` API, ale úložiště a HTTP 409 simuluje v paměti jedné stránky. Nejde o serverový zámek souboru ani ověření dvou skutečných uživatelů. Aplikace se sdílenými daty musí v backendu samy implementovat atomický compare-and-swap a kontrolu oprávnění. Obnovením stránky se testovací data a kopie smažou.

[Core](https://github.com/hacesoft/core) · [Dokumentace](docs/) · [Licence](LICENSE)

## Jazykové mutace

Rozhraní Playgroundu obsahuje 11 jazyků: čeština (`cs`), angličtina (`en`), němčina (`de`), španělština (`es`), francouzština (`fr`), italština (`it`), nizozemština (`nl`), polština (`pl`), portugalština (`pt`), slovenština (`sk`) a ukrajinština (`uk`). Jazyk se určuje z nastavení uživatele Nextcloudu; regionální varianty se mapují na základní jazyk. Pro nepodporovaný jazyk i chybějící jednotlivý překlad se použije angličtina (EN). Přeložené jsou vlastní ovládání Playgroundu, stavové zprávy, dialogové popisky a ukázkový dokument editoru. Texty a chyby vytvořené přímo závislostí Core nebo serverem závisejí na lokalizaci těchto služeb; názvy API zůstávají technickými názvy. Dokumentace je pouze CZ a EN.

Při každé další úpravě aplikace se ověří jazyky proti společné sadě `cs`, `en`, `de`, `es`, `fr`, `it`, `nl`, `pl`, `pt`, `sk`, `uk`. Doplní se chybějící jazyky i překladové klíče, prověří se výběr jazyka podle Nextcloudu a aktualizuje seznam skutečně podporovaných jazyků. Přítomnost souboru není důkaz úplného překladu. Návody a vývojová dokumentace se vydávají pouze česky a anglicky.

## O aplikaci a aktualizace

Blok O aplikaci najdete hned pod úvodním nadpisem. Zobrazuje nainstalovanou a zveřejněnou verzi aplikace i Core. Tlačítko „Zkontrolovat aktualizace“ načte GitHub znovu bez čekání na šestihodinovou cache. Core 0.18.1 čte `src/appinfo/info.xml` z vlastního repozitáře každé aplikace a ověřuje její ID. Vyšší verze na NASu se označí jako novější než zveřejněná. Podrobnosti: [kontrola verzí Core](https://github.com/hacesoft/core/blob/main/docs/UPDATE_CHECK_CZ.md).
