<?php

declare(strict_types=1);

use OCP\Util;

// Nextcloud owns asset ordering. No dynamic loader or duplicated Guard is used.
Util::addStyle('hc_shared_app_core', 'workspace');
Util::addStyle('hc_shared_app_core_playground', 'playground');
Util::addScript('hc_shared_app_core', 'hc_shared_app_core');
Util::addScript('hc_shared_app_core_playground', 'playground');
?>
<div
    id="hc_shared_app_core_playground"
    data-playground-version="<?php p($_['playgroundVersion']); ?>"
    data-required-core-api-version="<?php p($_['requiredCoreApiVersion']); ?>"
    data-required-core-version="<?php p($_['requiredCoreVersion']); ?>"
    data-core-status-url="<?php p($_['coreStatusUrl']); ?>"
    data-core-settings-url="<?php p($_['coreSettingsUrl']); ?>"
    data-core-sharees-url="<?php p($_['coreShareesUrl']); ?>"
    data-core-release-url="<?php p($_['coreReleaseUrl']); ?>"
    data-core-download-url="<?php p($_['coreDownloadUrl']); ?>"
></div>
