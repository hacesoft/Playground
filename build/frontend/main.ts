import { createApp } from 'vue'
import App from './App.vue'
import './playground.css'

const fShowStartupError = (oTarget: HTMLElement, sMessage: string): void => {
  const oPanel = document.createElement('section')
  oPanel.setAttribute('role', 'alert')
  const oHeading = document.createElement('h2'); oHeading.textContent = 'Playground nelze spustit'
  const oDetail = document.createElement('p'); oDetail.textContent = sMessage
  const oLink = document.createElement('a'); oLink.href = 'https://github.com/hacesoft/hc-shared-app-core/releases'; oLink.textContent = 'Stáhnout Shared App Core'
  oPanel.append(oHeading, oDetail, oLink); oTarget.replaceChildren(oPanel)
}

const fStart = (): void => {
  const oTarget = document.getElementById('hc_shared_app_core_playground')
  if (!oTarget) return
  const oCore = window.HcSharedAppCore
  if (!oCore) { fShowStartupError(oTarget, 'Shared App Core není nainstalované, povolené nebo se nepodařilo načíst.'); return }
  try {
    if (oCore.apiVersion !== Number(oTarget.dataset.requiredCoreApiVersion)) throw new Error('Nekompatibilní API Shared App Core.')
    oCore.assertCompatible(oTarget.dataset.requiredCoreVersion ?? '')
  }
  catch (oError) { fShowStartupError(oTarget, oError instanceof Error ? oError.message : 'Shared App Core není kompatibilní.'); return }
  const oApp = createApp(App, {
    playgroundVersion: oTarget.dataset.playgroundVersion ?? 'unknown',
    requiredCoreVersion: oTarget.dataset.requiredCoreVersion ?? '',
    coreStatusUrl: oTarget.dataset.coreStatusUrl ?? '',
    coreSettingsUrl: oTarget.dataset.coreSettingsUrl ?? '',
    coreShareesUrl: oTarget.dataset.coreShareesUrl ?? '',
    coreReleaseUrl: oTarget.dataset.coreReleaseUrl ?? '',
  })
  oApp.config.errorHandler = (oError) => { console.error('Playground Vue error', oError) }
  oApp.mount(oTarget)
  const onPageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) return // BFCache restores this live Vue tree.
    window.removeEventListener('pagehide', onPageHide)
    oApp.unmount()
  }
  window.addEventListener('pagehide', onPageHide)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fStart, { once: true })
else fStart()
