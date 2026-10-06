[🇨🇿 Česky](../README.md) | [🇬🇧 English](../README_EN.md)

# Playground 0.18.0-dev.7

Playground je samostatná diagnostická aplikace pro Nextcloud 35 a Core 0.18.0-dev.7. Není součástí Core ZIPu ani podmínkou běhu ostatních aplikací.

Používá stejný jednoduchý start jako referenční aplikace: statické Core CSS, vlastní CSS, statický Core JS a vlastní JS v pořadí řízeném Nextcloudem. Neobsahuje samostatný Guard ani status polling pro start.

Po instalaci ověřte načtení Core, editor s živým náhledem a vložením obrázku, veřejné služby, layout, About, mapovou cache a skutečné statistiky. `/status` se používá pouze pro diagnostiku v Playgroundu. Postup je v [provozních zkouškách](PROVOZNI_ZKOUSKY_CZ.md).

Při přerušené instalaci spusťte znovu `sudo sh install.sh`.
