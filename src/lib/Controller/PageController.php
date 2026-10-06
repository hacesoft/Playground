<?php

declare(strict_types=1);

namespace OCA\HcSharedAppCorePlayground\Controller;

use OCA\HcSharedAppCorePlayground\AppInfo\Application;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\ContentSecurityPolicy;
use OCP\IRequest;
use OCP\IURLGenerator;

final class PageController extends Controller {
    public function __construct(
        IRequest $request,
        private IURLGenerator $urlGenerator,
    ) {
        parent::__construct(Application::APP_ID, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function index(): TemplateResponse {
        $contract = json_decode((string)file_get_contents(__DIR__ . '/../../appinfo/hc_shared_app_core.json'), true, 512, JSON_THROW_ON_ERROR);
        $requiredCoreVersion = (string)($contract['requiredVersion'] ?? '');
        $coreDownloadUrl = (string)($contract['downloadUrl'] ?? 'https://github.com/hacesoft/core/releases');
        $response = new TemplateResponse(Application::APP_ID, 'main', [
            'playgroundVersion' => Application::VERSION,
            'requiredCoreVersion' => $requiredCoreVersion,
            'requiredCoreApiVersion' => (int)($contract['requiredApiVersion'] ?? 0),
            'coreStatusUrl' => $this->urlGenerator->linkTo('', 'index.php/apps/hc_shared_app_core/api/v1/status'),
            'coreSettingsUrl' => $this->urlGenerator->linkTo('', 'index.php/apps/hc_shared_app_core/api/v1/settings'),
            'coreShareesUrl' => $this->urlGenerator->linkTo('', 'index.php/apps/hc_shared_app_core/api/v1/sharees'),
            'coreReleaseUrl' => $this->urlGenerator->linkTo('', 'index.php/apps/hc_shared_app_core/api/v1/release'),
            'coreDownloadUrl' => $coreDownloadUrl,
        ]);
        // Playground explicitly demonstrates opt-in, bounded data URI images.
        $policy = new ContentSecurityPolicy();
        $policy->addAllowedImageDomain('data:');
        $response->setContentSecurityPolicy($policy);
        return $response;
    }
}
