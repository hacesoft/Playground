[🇨🇿 Česky](../cz/OPRAVA_INSTALACE.md) | [🇬🇧 **English**](INSTALLER_RECOVERY.md)

# Playground: repeatable NC35 installation

Extract the complete source package into the corresponding NAS directory, then run:

```sh
sudo sh install.sh
```

The installer checks the database on **every** run, including when Nextcloud already reports the same installed version. It adds only absent tables, columns and indexes. It does not call `migrations:migrate` or global `occ upgrade` and does not delete user rows. Application database: no application tables. It then enables the app and verifies its version. Application table names start with `hc_*`, in addition to Nextcloud's configured database prefix (`oc_` on the current NAS).

**Interrupted earlier install:** Run `sudo sh install.sh` again from this corrected package. No separate PHP repair command is needed. An error prints the full log and fails the installation.

Retain your database backup when deploying to live data. Browser behavior, permissions and background jobs still require qualification on the NAS.

For an interrupted install run `sudo sh install.sh` again.

## Required placement of working files

`custom_apps` is exclusively for live application directories named exactly after their App IDs. Before its first `occ` call, the installer uses `scripts/custom-apps-safety.sh` to move leftover copies of our applications with a duplicate `appinfo/info.xml` to `<datadirectory>/hc-core-deployment-backups/custom-apps-quarantine/`; it does not delete them. Incoming code is checked in `/tmp`, and the installer's private working directories are cleaned up on failure. Backups remain outside `custom_apps`. The same rule applies to a separate cron application mount.
