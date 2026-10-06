[🇨🇿 Česky](../README.md) | [🇬🇧 English](../README_EN.md)

# NC35 runtime qualification

Back up the database and app directories. Install development builds on a test instance first. Check that both built ZIPs contain the new JS assets, matching `info.xml` files and the Core version requirement.

1. Run `sudo docker exec -u www-data nextcloud-app php occ status`. Confirm NC35 and `needsDbUpgrade: false` after app upgrade.
2. After finishing Core, run `sudo docker exec -i -u www-data nextcloud-app php < build/tools/verify-core-install.php` in its source directory to check its schema without modification.
3. Create a list and place in Playground. Restart containers and check persistence.
4. Test another user without a grant, with `read`, then with `edit`; repeat for a group and after removing membership. Check namespace isolation.
5. Compare imported legacy favorites with a backup; reload twice and try two concurrent sessions. Record counts and duplicates.
6. Preview `<script>alert(1)</script>`, a `javascript:` link and an insecure image URL. None may execute or load as active content.
7. Test real Core proxy map tiles, GPS grant/denial, tracking after manual pan, mobile resize and touch zoom.
8. Review PHP, database and Nextcloud logs plus `background-job:list`; record exact versions and results before release.

Green Playground checks alone do not qualify these steps. Do not move consuming apps to the new list service if migration, access control or import fails.


For an interrupted install run `sudo sh install.sh` again.
