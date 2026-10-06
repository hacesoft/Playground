[🇨🇿 **Česky**](OPRAVA_INSTALACE.md) | [🇬🇧 English](../en/INSTALLER_RECOVERY.md)

# Ukázková aplikace: opakovatelná instalace na NC35

Po rozbalení úplného zdrojového balíčku do příslušného adresáře NAS spusťte pouze:

```sh
sudo sh install.sh
```

Instalátor kontroluje strukturu databáze při **každém** spuštění, i když Nextcloud již hlásí stejnou nainstalovanou verzi. Doplní pouze chybějící tabulky, sloupce a indexy. Nepoužívá `migrations:migrate`, globální `occ upgrade` ani neodstraňuje uživatelské řádky. Vlastní databáze: žádné vlastní tabulky. Potom zapne aplikaci a ověří verzi. Všechny tabulky používají technický název `hc_*` spolu se systémovým prefixem Nextcloudu (na aktuálním NASu `oc_`).

**Přerušená předchozí instalace:** Znovu spusťte tentýž `sudo sh install.sh` z tohoto opraveného balíčku. Žádný samostatný opravný PHP příkaz není potřeba. Instalátor při chybě ukáže celý výpis a skončí neúspěchem; nepovažujte takový běh za dokončený.

Před nasazením nad živá data ponechte existující zálohu databáze. Výsledek chování v prohlížeči, přístupová práva a funkčnost úloh ověřte na NASu; místní testy nenahrazují provozní ověření.

Při přerušené instalaci spusťte znovu `sudo sh install.sh`.

## Závazné umístění pracovních souborů

`custom_apps` je výhradně produkční adresář: obsahuje pouze živou složku přesně pojmenovanou podle App ID. Instalátor před prvním `occ` pomocí `scripts/custom-apps-safety.sh` přesune dřívější chybné kopie našich aplikací s duplicitním `appinfo/info.xml` do `<datadirectory>/hc-core-deployment-backups/custom-apps-quarantine/`; nemaže je. Nový kód kontroluje v `/tmp` a při chybě uklidí své pracovní adresáře. Zálohy zůstávají mimo `custom_apps`. Stejné pravidlo platí i pro samostatný cron svazek.
