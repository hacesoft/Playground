[🇨🇿 Česky](../README_CZ.md) | [🇬🇧 English](../README.md)

# Provozní zkouška na NC35

Zálohujte databázi a adresáře aplikací. Vývojové sestavení nejprve instalujte na testovací instanci, ne místo živého Core. Po sestavení ZIPů zkontrolujte, že oba obsahují nové JS assety, správné `info.xml` a požadovanou verzi Core.

1. `sudo docker exec -u www-data nextcloud-app php occ status` — musí hlásit NC35 a `needsDbUpgrade: false` po dokončení upgradu aplikace.
2. Po dokončení Core spusťte v jeho zdrojovém adresáři `sudo docker exec -i -u www-data nextcloud-app php < build/tools/verify-core-install.php` a ověřte schéma jen pro čtení.
3. Přihlaste se do Playgroundu; vytvořte seznam a místo. Restartujte kontejnery a ověřte, že data zůstala.
4. Přihlaste se druhým uživatelem: bez sdílení data neuvidí; udělte `read` a ověřte zákaz zápisu; udělte `edit` a ověřte změnu místa. Totéž otestujte u členství ve skupině a po odebrání člena. Ověřte izolaci namespace jiné aplikace.
5. Ověřte kopii původních míst a ponechání původních dat. Zkuste opakované načtení a souběžné požadavky dvou relací; zaznamenejte počet záznamů a duplicity.
6. V editoru vložte `<script>alert(1)</script>`, odkaz `javascript:` a URL obrázku bez HTTPS; v náhledu se nesmí spustit skript ani načíst nepovolený obrázek.
7. Zkontrolujte skutečnou dlaždici mapy přes Core proxy, GPS povolení/odmítnutí, sledování po ručním posunu, mobilní resize a dotykový zoom.
8. Projděte log PHP/Nextcloud, chyby DB a `background-job:list`. Výsledek a přesné verze zapište před vydáním.

Zelené testy Playgroundu nepotvrzují tyto body automaticky. Pokud migrace, práva nebo import selžou, nepřecházejte s aplikacemi na novou službu.


Při přerušené instalaci spusťte znovu `sudo sh install.sh`.
