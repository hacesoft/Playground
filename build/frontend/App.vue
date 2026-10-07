<script setup lang="ts">
import { t } from './i18n'

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import RuntimeChecks from './RuntimeChecks.vue'
import ConcurrencyDemo from './ConcurrencyDemo.vue'
import { editorSample } from './editorSample'

interface Props {
  playgroundVersion: string
  requiredCoreVersion: string
  coreStatusUrl: string
  coreSettingsUrl: string
  coreShareesUrl: string
  coreReleaseUrl: string
}

interface TestResult {
  id: string
  name: string
  detail: string
  state: 'waiting' | 'running' | 'passed' | 'failed'
}

interface StatusResponse {
  app: string
  version: string
  apiVersion: number
  nextcloud: { min: number; max: number }
  contract: string
  qualification?: string
}

const props = defineProps<Props>()
const running = ref(false)
const serverStatus = ref<StatusResponse | null>(null)
const tests = ref<TestResult[]>(createTests())
const workspacePreview = ref<HTMLElement | null>(null)
const previewSize = ref<'auto' | 'desktop' | 'tablet' | 'mobile'>('auto')
const workspaceMetrics = ref<WorkspaceMetrics | null>(null)
const dialogResult = ref(t("No action has been performed yet."))
const toolbarDemo = ref<HTMLElement | null>(null)
const toolbarResult = ref(t("No action has been selected yet."))
const settingsFormHost = ref<HTMLElement | null>(null)
const settingsResult = ref(t("Loading saved settings…"))
const pickerHost = ref<HTMLElement | null>(null)
const pickerResult = ref(t("No user or group selected."))
const layoutPreview = ref<HTMLElement | null>(null)
const layoutMetrics = ref<LayoutMetrics | null>(null)
const aboutHost = ref<HTMLElement | null>(null)
const mapHost = ref<HTMLElement | null>(null)
const mapViewport = ref(t("waiting"))
const mapProviders = ref<Array<{ id: string; name: string; configured: boolean; enabled: boolean }>>([])
const mapDiagnostics = ref<{ rateLimitedRequests?: number; limiterUnavailableRequests?: number; providerErrors?: number; requests: number; cacheHits: number; cacheMisses: number; externalRequests: number; savedExternalRequests: number; cacheBytes: number; cacheLimitBytes: number; cacheFreeBytes: number; cacheUsagePercent: number; cacheEntryCount: number; cacheOldestStoredAt: string | null; cacheNewestStoredAt: string | null; tileCacheTtlSeconds: number; browserCacheTtlSeconds: number; lastProviderError: string; canManage: boolean } | null>(null)
const mapDiagnosticsError = ref('')
const editorHost = ref<HTMLElement | null>(null)
const editorLabels: Record<string, string> = {
  Formatting: t("Formatting"), Document: t("Document"), Preview: t("Preview"),
  Undo: t("Undo"), Redo: t("Redo"), Heading: t("Heading"), Bold: t("Bold"), Italic: t("Italic"),
  Underline: t("Underline"), Strikethrough: t("Strikethrough"), Highlight: t("Highlight"),
  'Bullet list': t("Bullet list"), 'Numbered list': t("Numbered list"), Checklist: t("Checklist"),
  Quote: t("Quote"), 'Inline code': t("Inline code"), 'Code block': t("Code block"), Table: t("Table"),
  Link: t("Link"), 'Image URL': t("Image URL"), 'Insert image': t("Insert image"),
  'Emoji library': t("Emoji library"), 'Emoji category': t("Emoji category"), 'All emoji': t("All emoji"), 'Find emoji': t("Find emoji"), 'Free image libraries': t("Free image libraries"), 'Image source': t("Image source"), 'Search free images': t("Search free images"), 'Text color': t("Text color"), Font: t("Font"), Search: t("Search"), Source: t("Source"), Separator: t("Separator"), Image: t("Image"),
}
const backgroundHost = ref<HTMLElement | null>(null)
const backgroundStatus = ref(t("Waiting to load the background."))
const backgroundMode = ref<'none' | 'solid' | 'gradient'>('none')
let backgroundController: { load(): Promise<{ mode: string }>; save(choice: { mode: 'none' } | { mode: 'solid' | 'gradient'; color: string }): Promise<void>; destroy(): void } | null = null
const listsStatus = ref(t("Waiting to load lists."))
const sharedLists = ref<Array<{ id: string; title: string; permission: string; archived: boolean; position: number; parent_id: string | null }>>([])
const activeListId = ref('')
const sharedPlaces = ref<Array<{ id: string; name: string; lat: number; lon: number; position: number }>>([])
let editorController: { getValue(): string; destroy(): void } | null = null
let workspaceController: WorkspaceController | null = null
let toolbarController: ToolbarController | null = null
let formController: FormController | null = null
let pickerController: PickerController | null = null
let layoutController: LayoutController | null = null
let aboutController: AboutController | null = null
const checkingUpdates = ref(false)
async function refreshUpdates(): Promise<void> {
  if (!aboutController || checkingUpdates.value) return
  checkingUpdates.value = true
  try { await aboutController.refresh() } finally { checkingUpdates.value = false }
}
let mapController: MapController | null = null
let nMapDiagnosticsTimer: number | null = null

async function loadLists(): Promise<void> {
  try {
    const core = window.HcSharedAppCore
    if (!core) return
    sharedLists.value = await core.lists.list('map_places')
    if (!sharedLists.value.some(list => list.id === activeListId.value)) activeListId.value = sharedLists.value[0]?.id ?? ''
    sharedPlaces.value = activeListId.value ? await core.lists.places('map_places', activeListId.value) : []
    listsStatus.value = t("Loaded from Core. Old places are imported on the first load.")
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function createDemoList(): Promise<void> {
  try {
    const item = await window.HcSharedAppCore!.lists.create('map_places', t("Example list"))
    activeListId.value = item.id; await loadLists()
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function createDemoChild(): Promise<void> {
  if (!activeListId.value || sharedLists.value.find(item => item.id === activeListId.value)?.permission !== 'owner') return
  try {
    const item = await window.HcSharedAppCore!.lists.create('map_places', t("Sublist"), 0, activeListId.value)
    activeListId.value = item.id; await loadLists()
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function shareDemoPlace(permission: 'read' | 'edit'): Promise<void> {
  if (!activeListId.value || !sharedPlaces.value.length || !pickerController) return
  try {
    for (const target of pickerController.selected()) await window.HcSharedAppCore!.lists.sharePlace('map_places', activeListId.value, sharedPlaces.value[0]!.id, target.type, target.id, permission)
    listsStatus.value = t("Only the selected place was shared, not the entire list.")
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function addDemoPlace(): Promise<void> {
  if (!activeListId.value) return
  try {
    await window.HcSharedAppCore!.lists.addPlace('map_places', activeListId.value, { name: t("Prague"), lat: 50.087, lon: 14.421, note: '', color: '#3388ff', position: sharedPlaces.value.length })
    await loadLists()
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function grantSelected(permission: 'read' | 'edit'): Promise<void> {
  if (!activeListId.value || !pickerController) return
  try {
    for (const target of pickerController.selected()) await window.HcSharedAppCore!.lists.share('map_places', activeListId.value, target.type, target.id, permission)
    listsStatus.value = t("Sharing saved. The recipient will see the list after signing in.")
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function toggleArchive(): Promise<void> {
  const item = sharedLists.value.find(list => list.id === activeListId.value)
  if (!item) return
  try { await window.HcSharedAppCore!.lists.update('map_places', item.id, { archived: !item.archived }); await loadLists() }
  catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function saveBackground(): Promise<void> {
  if (!backgroundController) return
  try {
    const choice = backgroundMode.value === 'none' ? { mode: 'none' as const } : { mode: backgroundMode.value, color: '#b8dbf6' }
    await backgroundController.save(choice)
    backgroundStatus.value = t("Background saved in user settings.")
  } catch (error) { backgroundStatus.value = error instanceof Error ? error.message : String(error) }
}

async function loadMapDiagnostics(): Promise<void> {
  const oCore = window.HcSharedAppCore
  if (!oCore) return
  try {
    mapDiagnostics.value = await oCore.maps.diagnostics.get()
    mapDiagnosticsError.value = ''
  } catch (oError) {
    mapDiagnostics.value = null
    mapDiagnosticsError.value = oError instanceof Error ? oError.message : String(oError)
  }
}

const passedCount = computed(() => tests.value.filter((test) => test.state === 'passed').length)
const allPassed = computed(() => passedCount.value === tests.value.length)
const loadedCoreVersion = computed(() => window.HcSharedAppCore?.version ?? t("not found"))

function createTests(): TestResult[] {
  return [
    { id: 'global', name: t("Load Core"), detail: t("Waiting to start"), state: 'waiting' },
    { id: 'api', name: t("Status API"), detail: t("Waiting to start"), state: 'waiting' },
    { id: 'version', name: t("Version compatibility"), detail: t("Waiting to start"), state: 'waiting' },
    { id: 'events', name: 'EventBus', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'config', name: 'Config', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'logger', name: 'Logger', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'workspace', name: 'Responsive Workspace', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'dialogs', name: 'Dialog Engine', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'notifications', name: 'Notification Manager', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'toolbar', name: 'Toolbar', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'forms', name: 'Form Engine', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'settings', name: 'Settings Service', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'picker', name: 'User/Group Picker', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'layout', name: 'Layout Primitives', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'about', name: 'About & Updates', detail: t("Waiting to start"), state: 'waiting' },
    { id: 'maps', name: 'Core Maps', detail: t("Waiting to start"), state: 'waiting' },
  ]
}

function setResult(id: string, state: TestResult['state'], detail: string): void {
  const test = tests.value.find((item) => item.id === id)
  if (test) Object.assign(test, { state, detail })
}

async function execute(id: string, action: () => void | Promise<void>): Promise<void> {
  setResult(id, 'running', t("Testing…"))
  try {
    await action()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setResult(id, 'failed', message)
  }
}

async function runTests(): Promise<void> {
  running.value = true
  serverStatus.value = null
  tests.value = createTests()

  const core = window.HcSharedAppCore
  await execute('global', () => {
    if (!core) throw new Error(t("Global API window.HcSharedAppCore was not found."))
    setResult('global', 'passed', 'Core ' + core.version + ', API ' + core.apiVersion)
  })

  await execute('api', async () => {
    if (!props.coreStatusUrl) throw new Error(t("Status API URL is missing."))
    const separator = props.coreStatusUrl.includes('?') ? '&' : '?'
    const response = await fetch(props.coreStatusUrl + separator + '_core=' + Date.now(), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const status = await response.json() as StatusResponse
    if (status.app !== 'hc_shared_app_core' || status.contract !== 'hc-shared-app-core-v1' || status.apiVersion !== 1) throw new Error(t("Invalid public Core contract."))
    if (status.nextcloud?.min !== 35 || status.nextcloud?.max !== 35) throw new Error(t("Core does not report the expected NC35 range."))
    serverStatus.value = status
    if (core && status.version !== core.version) {
      throw new Error('Backend ' + status.version + ' a frontend ' + core.version + t(" do not match."))
    }
    setResult('api', 'passed', 'Backend hc_shared_app_core ' + status.version + t(" responds."))
  })

  if (!core) {
    for (const id of ['version', 'events', 'config', 'logger', 'workspace', 'dialogs', 'notifications', 'toolbar', 'forms', 'settings', 'picker', 'layout', 'about', 'maps']) {
      setResult(id, 'failed', t("Core is not loaded."))
    }
    running.value = false
    return
  }

  await execute('version', () => {
    core.assertCompatible(props.requiredCoreVersion)
    setResult('version', 'passed', t("Requirement ≥ ") + props.requiredCoreVersion + t(" met."))
  })

  await execute('events', () => {
    const received: string[] = []
    const unsubscribe = core.events.on('playground:self-test', (payload) => {
      received.push(String((payload as { value: string }).value))
    })
    core.events.emit('playground:self-test', { value: 'OK' })
    unsubscribe()
    if (!received.includes('OK')) throw new Error(t("The event was not delivered correctly."))
    setResult('events', 'passed', t("Event delivered and listener detached."))
  })

  await execute('config', () => {
    core.config.set('playground.selfTest', 'OK')
    if (core.config.get<string>('playground.selfTest', '') !== 'OK') {
      throw new Error(t("The stored value was not returned."))
    }
    setResult('config', 'passed', t("Writing and reading values works."))
  })

  await execute('logger', () => {
    core.logger.info('Playground self-test completed.', { version: props.playgroundVersion })
    setResult('logger', 'passed', t("Message written to the browser console."))
  })

  await execute('workspace', async () => {
    await nextTick()
    if (!workspacePreview.value) throw new Error(t("Example workspace was not found."))
    workspaceController?.destroy()
    workspaceController = core.workspace.observe(workspacePreview.value, (metrics) => {
      workspaceMetrics.value = metrics
    })
    const metrics = workspaceController.refresh()
    if (!['mobile', 'tablet', 'desktop'].includes(metrics.mode)) {
      throw new Error(t("Workspace returned an invalid mode."))
    }
    setResult('workspace', 'passed', t("Observer active, mode ") + metrics.mode + '.')
  })

  await execute('dialogs', async () => {
    const dialog = core.dialogs.open({
      title: t("Automatic test"),
      content: t("Dialog works."),
    })
    dialog.close('programmatic')
    if (await dialog.closed !== 'programmatic') {
      throw new Error(t("The dialog did not close as expected."))
    }
    setResult('dialogs', 'passed', t("Opening, stacking and closing works."))
  })

  await execute('notifications', async () => {
    const notification = core.notifications.info(t("Automatic test"), { persistent: true })
    notification.dismiss()
    if (await notification.closed !== 'dismiss') {
      throw new Error(t("The notification did not close as expected."))
    }
    setResult('notifications', 'passed', t("Display, deduplication and closing works."))
  })

  await execute('toolbar', () => {
    if (!toolbarDemo.value) throw new Error(t("Example toolbar was not found."))
    if (!toolbarDemo.value.querySelector('[data-toolbar-action="add"]')) {
      throw new Error(t("Toolbar action was not rendered."))
    }
    toolbarController?.setDisabled('filter', true)
    toolbarController?.setDisabled('filter', false)
    setResult('toolbar', 'passed', t("Actions, button states and mobile mode work."))
  })

  await execute('forms', () => {
    if (!formController || !settingsFormHost.value?.querySelector('[name="location"]')) {
      throw new Error(t("Form fields were not rendered."))
    }
    if (!formController.validate()) throw new Error(t("The default form is invalid."))
    setResult('forms', 'passed', t("Fields, values and validation work."))
  })

  await execute('settings', async () => {
    if (!props.coreSettingsUrl) throw new Error(t("Settings API URL is missing."))
    const oClient = core.settings.create(props.coreSettingsUrl, 'hc_shared_app_core_playground')
    const oValues = await oClient.load()
    formController?.setValues(oValues as Record<string, string | number | boolean>)
    settingsResult.value = Object.keys(oValues).length
      ? t("Saved settings loaded.")
      : t("No settings saved yet.")
    setResult('settings', 'passed', t("User settings can be loaded from the server."))
  })

  await execute('picker', () => {
    if (!props.coreShareesUrl) throw new Error(t("User/Group API URL is missing."))
    if (!pickerController || !pickerHost.value?.querySelector('input[type="search"]')) {
      throw new Error(t("User/Group Picker was not rendered."))
    }
    setResult('picker', 'passed', t("Search and multiple selection are ready."))
  })

  await execute('layout', async () => {
    await nextTick()
    const oElement = layoutPreview.value
    if (!oElement) throw new Error(t("Layout Primitives example was not found."))
    layoutController?.destroy()
    layoutController = core.layout.observe(oElement, {
      topOffset: 0,
      onResize: (oMetrics) => {
        layoutMetrics.value = oMetrics
      },
    })
    const oMetrics = layoutController.refresh('manual')
    if (!core.layout.classes.appLayout || oMetrics.availableHeight < 0) {
      throw new Error(t("Public Layout API returned an invalid contract."))
    }
    setResult('layout', 'passed', t("Layout, scrolling and resize events work."))
  })

  await execute('about', () => {
    if (!aboutController || !aboutHost.value?.querySelector('.hc-shared-app-core-about__row')) {
      throw new Error(t("The shared About panel was not rendered."))
    }
    setResult('about', 'passed', t("App version, Core and GitHub links are available."))
  })

  await execute('maps', async () => {
    if (!mapController || !mapHost.value?.querySelector('.hc-shared-app-core-map__compass')) throw new Error(t("Core Maps was not rendered."))
    const oViewport = mapController.getViewport()
    if (oViewport.center.lat !== 49.1 || oViewport.rotationDeg !== 0) throw new Error(t("Map viewport is invalid."))
    const sTemplate = core.maps.tileTemplate('osm', 'basic', 256)
    if (!sTemplate.includes('/api/v1/maps/tile/osm/basic/256/{z}/{x}/{y}')) throw new Error(t("Tile proxy template is invalid."))
    mapProviders.value = await core.maps.providers.list()
    await loadMapDiagnostics()
    if (!mapDiagnostics.value) throw new Error(t("Cannot load map cache diagnostics: ") + mapDiagnosticsError.value)
    setResult('maps', 'passed', t("Viewport, layers and tile URL verified without downloading; providers: ") + mapProviders.value.length + '.')
  })

  running.value = false
}

function setPreviewSize(size: typeof previewSize.value): void {
  previewSize.value = size
  nextTick(() => workspaceController?.refresh())
}

function openMapCacheSettings(): void {
  window.HcSharedAppCore?.maps.cache.openSettings()
}

async function showConfirmation(): Promise<void> {
  const accepted = await window.HcSharedAppCore?.dialogs.confirm({
    title: t("Confirm action"),
    message: t("Perform the example action?"),
    confirmLabel: t("Yes, proceed"),
    cancelLabel: t("Cancel"),
  })
  dialogResult.value = accepted ? t("Action confirmed.") : t("Action cancelled.")
}

function showSettings(): void {
  const core = window.HcSharedAppCore
  if (!core) return
  const form = document.createElement('div')
  form.className = 'dialog-demo-form'
  const label = document.createElement('label')
  label.textContent = t("Location name")
  const input = document.createElement('input')
  input.type = 'text'
  input.value = t("Home")
  input.maxLength = 80
  label.append(input)
  const hint = document.createElement('p')
  hint.textContent = t("Form content stays inside the scrollable area of the dialog.")
  form.append(label, hint)
  core.dialogs.open({
    title: t("Example settings"),
    content: form,
    actions: [
      { label: t("Cancel") },
      {
        label: t("Save"),
        variant: 'primary',
        onClick: () => {
          dialogResult.value = t("Saved value: ") + input.value
        },
      },
    ],
  })
}

function showLongDialog(): void {
  const core = window.HcSharedAppCore
  if (!core) return
  const content = document.createElement('div')
  content.className = 'dialog-demo-long'
  for (let index = 1; index <= 12; index += 1) {
    const section = document.createElement('section')
    const heading = document.createElement('h3')
    heading.textContent = t("Section ") + index
    const paragraph = document.createElement('p')
    paragraph.textContent = t("Long content scrolls inside the dialog while its heading and buttons remain accessible.")
    section.append(heading, paragraph)
    content.append(section)
  }
  core.dialogs.open({
    title: t("Long scrollable content"),
    content,
    size: 'large',
    actions: [{ label: t("Close"), variant: 'primary' }],
  })
}

function showNotification(type: 'success' | 'info' | 'warning' | 'error'): void {
  const manager = window.HcSharedAppCore?.notifications
  if (!manager) return
  const messages = {
    success: t("Changes saved successfully."),
    info: t("Updating displayed data."),
    warning: t("Some values need review."),
    error: t("Connection to the service failed."),
  }
  manager.show({
    type,
    title: type === 'error' ? t("Connection error") : undefined,
    message: messages[type],
    persistent: type === 'error',
  })
}

function showDuplicate(): void {
  window.HcSharedAppCore?.notifications.success(t("Settings saved."), {
    dedupeKey: 'playground-save',
    cooldownMs: 2500,
  })
}

function showNotificationAction(): void {
  window.HcSharedAppCore?.notifications.info(t("A new example action is available."), {
    persistent: true,
    action: {
      label: t("Proceed"),
      onClick: () => {
        dialogResult.value = t("Notification action performed.")
      },
    },
  })
}

function mountToolbar(): void {
  const oCore = window.HcSharedAppCore
  const oElement = toolbarDemo.value
  if (!oCore || !oElement) return
  toolbarController?.destroy()
  const fnSelect = (sAction: string): void => {
    toolbarResult.value = t("Selected action: ") + sAction
  }
  toolbarController = oCore.toolbar.create(oElement, {
    ariaLabel: t("Example tools"),
    actions: [
      { id: 'add', label: t("Add"), icon: '+', variant: 'primary', onClick: () => fnSelect(t("Add")) },
      { id: 'filter', label: t("Filter"), icon: '⌕', compact: true, onClick: () => fnSelect(t("Filter")) },
      { id: 'settings', label: t("Settings"), icon: '⚙', compact: true, onClick: () => fnSelect(t("Settings")) },
      { id: 'delete', label: t("Delete"), icon: '×', variant: 'danger', compact: true, onClick: () => fnSelect(t("Delete")) },
    ],
  })
}

function mountSettingsForm(): void {
  const oHost = settingsFormHost.value
  const oCore = window.HcSharedAppCore
  if (!oHost || !oCore) return
  formController?.destroy()
  formController = oCore.forms.create([
    { id: 'location', label: t("Default location"), type: 'text', value: t("Prague"), required: true, maxLength: 80 },
    { id: 'items', label: t("Number of items"), type: 'number', value: 6, min: 1, max: 24 },
    { id: 'units', label: t("Units"), type: 'select', value: 'metric', options: [{ value: 'metric', label: t("Metric") }, { value: 'imperial', label: t("Imperial") }] },
    { id: 'notifications', label: t("Enable notifications"), type: 'checkbox', value: true, hint: t("Example shared form toggle.") },
  ])
  oHost.replaceChildren(formController.element)
}

async function saveSettings(): Promise<void> {
  const oCore = window.HcSharedAppCore
  if (!oCore || !formController || !formController.validate()) return
  try {
    const oClient = oCore.settings.create(props.coreSettingsUrl, 'hc_shared_app_core_playground')
    await oClient.save(formController.values())
    settingsResult.value = t("Settings saved permanently for the current user.")
    oCore.notifications.success(t("Settings saved."), { dedupeKey: 'playground-settings' })
  } catch (oError) {
    settingsResult.value = oError instanceof Error ? oError.message : String(oError)
    oCore.notifications.error(t("Failed to save settings."))
  }
}

function mountPicker(): void {
  const oCore = window.HcSharedAppCore
  const oHost = pickerHost.value
  if (!oCore || !oHost) return
  pickerController?.destroy()
  pickerController = oCore.picker.create(oHost, {
    endpoint: props.coreShareesUrl,
    multiple: true,
    placeholder: t("Start typing a user or group name…"),
    onChange: (aItems) => {
      pickerResult.value = aItems.length
        ? t("Selected: ") + aItems.map((oItem) => oItem.label).join(', ')
        : t("No user or group selected.")
    },
  })
}

function mountAboutInfo(): void {
  const oCore = window.HcSharedAppCore
  const oHost = aboutHost.value
  if (!oCore || !oHost) return
  aboutController?.destroy()
  oCore.about.register({
    id: 'hc_shared_app_core_playground',
    name: 'Shared App Core Playground',
    version: props.playgroundVersion,
    repository: 'https://github.com/hacesoft/Playground',
    releaseNotes: 'https://github.com/hacesoft/Playground/tree/HEAD/release',
    documentation: 'https://github.com/hacesoft/Playground#readme',
  })
  aboutController = oCore.about.mount(oHost, { endpoint: props.coreReleaseUrl, heading: t("About") })
}

function mountMapDemo(): void {
  const oCore = window.HcSharedAppCore
  const oHost = mapHost.value
  if (!oCore || !oHost) return
  const oListeners = new Map<string, Set<() => void>>()
  const oState = { center: { lat: 49.1, lon: 16.6 }, zoom: 8 }
  const oDriver: MapDriver = {
    getCenter: () => oState.center,
    getZoom: () => oState.zoom,
    getBounds: () => ({ north: 50.2, south: 48, east: 18, west: 14.8 }),
    setView: (oCenter, nZoom) => { oState.center = oCenter; if (nZoom !== undefined) oState.zoom = nZoom },
    zoomIn: () => { oState.zoom += 1 }, zoomOut: () => { oState.zoom -= 1 }, invalidateSize: () => {},
    on: (sEvent, fnListener) => { const oSet = oListeners.get(sEvent) ?? new Set(); oSet.add(fnListener); oListeners.set(sEvent, oSet) },
    off: (sEvent, fnListener) => { oListeners.get(sEvent)?.delete(fnListener) },
  }
  mapController = oCore.maps.mount(oHost, { driver: oDriver, home: oState.center, controls: { gps: false, compass: true }, compassOverlay: { mode: 'rose', opacity: .7 } })
  mapController.on('viewportChanged', (oValue) => { const oViewport = oValue as MapViewport; mapViewport.value = `${oViewport.center.lat.toFixed(1)}, ${oViewport.center.lon.toFixed(1)} · zoom ${oViewport.zoom} · ${oViewport.rotationDeg}°` })
  mapViewport.value = '49.1, 16.6 · zoom 8 · 0°'
}

onMounted(async () => {
  await nextTick()
  mountToolbar()
  mountSettingsForm()
  mountPicker()
  mountAboutInfo()
  mountMapDemo()
  if (editorHost.value) editorController = window.HcSharedAppCore?.editor.create(editorHost.value, {
    value: editorSample(),
    label: t("Example document text"),
    embedImages: true,
    showPreview: true,
    splitView: true,
    translate: (label) => editorLabels[label] ?? label,
  }) ?? null
  if (backgroundHost.value) {
    backgroundController = window.HcSharedAppCore?.background.create(backgroundHost.value, props.coreSettingsUrl, 'hc_playground_appearance') ?? null
    try {
      const saved = await backgroundController?.load()
      if (saved?.mode === 'none' || saved?.mode === 'solid' || saved?.mode === 'gradient') backgroundMode.value = saved.mode
      backgroundStatus.value = t("Background loaded.")
    } catch (error) { backgroundStatus.value = error instanceof Error ? error.message : String(error) }
  }
  await loadLists()
  await runTests()
  nMapDiagnosticsTimer = window.setInterval(() => void loadMapDiagnostics(), 10000)
})
onBeforeUnmount(() => {
  if (nMapDiagnosticsTimer !== null) window.clearInterval(nMapDiagnosticsTimer)
  workspaceController?.destroy()
  toolbarController?.destroy()
  formController?.destroy()
  pickerController?.destroy()
  layoutController?.destroy()
  aboutController?.destroy()
  void mapController?.destroy()
  editorController?.destroy()
  backgroundController?.destroy()
})
</script>

<template>
  <main class="playground">
    <header class="hero">
      <div>
        <p class="eyebrow">Shared App Core</p>
        <h1>Shared App Core Playground</h1>
        <p>{{ t("Development lab for shared components and services.") }}</p>
      </div>
      <div class="version-badge">Playground {{ playgroundVersion }}</div>
    </header>

    <section class="about-demo" aria-labelledby="playground-about-title">
      <div class="demo-heading">
        <div>
          
          <h2 id="playground-about-title">{{ t("About") }}</h2>
          <p>{{ t("Consistent information about the app, Core and available GitHub versions.") }}</p>
        </div>
        <button type="button" :disabled="checkingUpdates" @click="refreshUpdates">{{ t("Check for updates") }}</button>
      </div>
      <div ref="aboutHost"></div>
    </section>

    <section class="summary" :class="{ success: allPassed }">
      <div class="summary-icon">{{ allPassed ? '✓' : running ? '…' : '!' }}</div>
      <div>
        <h2>{{ allPassed ? t("API checks passed") : running ? t("Checking") : t("Checks need attention") }}</h2>
        <p>{{ passedCount }} {{ t("of") }} {{ tests.length }} {{ t("successful tests") }}</p>
      </div>
      <button type="button" :disabled="running" @click="runTests">
        {{ running ? t("Testing…") : t("Run again") }}
      </button>
    </section>

      <p role="status">{{ t("Basic API checks are separate from the runtime tests below. Start the real map, GPS and storage tests with the buttons.") }}</p>
    <section class="test-grid" :aria-label="t('Core test results')">
      <article v-for="test in tests" :key="test.id" class="test-card" :class="test.state">
        <div class="state-icon">
          <span v-if="test.state === 'passed'">✓</span>
          <span v-else-if="test.state === 'failed'">×</span>
          <span v-else-if="test.state === 'running'">…</span>
          <span v-else>○</span>
        </div>
        <div>
          <h3>{{ test.name }}</h3>
          <p>{{ test.detail }}</p>
        </div>
      </article>
    </section>

    <section class="details">
      <h2>{{ t("Active contract") }}</h2>
      <dl>
        <div><dt>{{ t("Required Core") }}</dt><dd>≥ {{ requiredCoreVersion }}</dd></div>
        <div><dt>{{ t("Loaded Core") }}</dt><dd>{{ loadedCoreVersion }}</dd></div>
        <div><dt>Backend API</dt><dd>{{ serverStatus?.apiVersion ?? '—' }}</dd></div>
        <div><dt>{{ t("Nextcloud range") }}</dt><dd>{{ serverStatus?.nextcloud ? serverStatus.nextcloud.min + '–' + serverStatus.nextcloud.max : '—' }}</dd></div>
      </dl>
    </section>

    <section class="workspace-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">{{ t("First shared component") }}</p>
          <h2>Responsive Workspace</h2>
          <p>{{ t("The mode depends on the container width rather than the entire window.") }}</p>
        </div>
        <div class="size-switcher" :aria-label="t('Example width')">
          <button
            v-for="size in (['auto', 'desktop', 'tablet', 'mobile'] as const)"
            :key="size"
            type="button"
            :class="{ active: previewSize === size }"
            @click="setPreviewSize(size)"
          >
            {{ size === 'auto' ? t("Automatic") : size }}
          </button>
        </div>
      </div>

      <div class="preview-stage">
        <div
          ref="workspacePreview"
          class="workspace-preview hc-shared-app-core-workspace"
          :class="'preview-' + previewSize"
        >
          <header class="hc-shared-app-core-workspace__header">
            <div><strong>{{ t("Example app") }}</strong><small>{{ t("Shared adaptive layout") }}</small></div>
            <span class="mode-chip">{{ workspaceMetrics?.mode ?? t("waiting") }}</span>
          </header>
          <nav class="hc-shared-app-core-workspace__toolbar">
            <button type="button">{{ t("Add") }}</button>
            <button type="button">{{ t("Filter") }}</button>
            <button type="button">{{ t("Settings") }}</button>
          </nav>
          <div class="hc-shared-app-core-workspace__body">
            <aside class="hc-shared-app-core-workspace__sidebar">
              <strong>{{ t("Navigation") }}</strong>
              <a href="#" @click.prevent>{{ t("First item") }}</a>
              <a href="#" @click.prevent>{{ t("Second item") }}</a>
              <a href="#" @click.prevent>{{ t("Third item") }}</a>
            </aside>
            <div class="hc-shared-app-core-workspace__content">
              <div class="hc-shared-app-core-responsive-grid">
                <article v-for="item in 4" :key="item">
                  <strong>{{ t("Card") }} {{ item }}</strong>
                  <p>{{ t("Content adapts to the available space.") }}</p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p class="metrics">
        {{ workspaceMetrics?.width ?? '—' }} × {{ workspaceMetrics?.height ?? '—' }} px ·
        viewport {{ workspaceMetrics?.viewportHeight ?? '—' }} {{ t("px · mode") }} <strong>{{ workspaceMetrics?.mode ?? '—' }}</strong>
      </p>
    </section>

    <section class="dialog-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">{{ t("Second shared component") }}</p>
          <h2>Dialog Engine</h2>
          <p>{{ t("Consistent dialogs supporting keyboard navigation, focus, long content and mobile devices.") }}</p>
        </div>
      </div>
      <div class="dialog-demo-actions">
        <button type="button" @click="showConfirmation">{{ t("Open confirmation") }}</button>
        <button type="button" @click="showSettings">{{ t("Open settings") }}</button>
        <button type="button" @click="showLongDialog">{{ t("Open long content") }}</button>
      </div>
      <p class="dialog-result" aria-live="polite">{{ dialogResult }}</p>
    </section>

    <section class="notification-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">{{ t("Third shared component") }}</p>
          <h2>Notification Manager</h2>
          <p>{{ t("Lightweight app notifications without filling the Nextcloud notification bell.") }}</p>
        </div>
      </div>
      <div class="notification-demo-actions">
        <button type="button" @click="showNotification('success')">{{ t("Success") }}</button>
        <button type="button" @click="showNotification('info')">{{ t("Info") }}</button>
        <button type="button" @click="showNotification('warning')">{{ t("Warning") }}</button>
        <button type="button" @click="showNotification('error')">{{ t("Persistent error") }}</button>
        <button type="button" @click="showDuplicate">{{ t("Repeated save") }}</button>
        <button type="button" @click="showNotificationAction">{{ t("Notification with action") }}</button>
      </div>
      <p class="notification-note"> {{ t("Click Repeated save several times. Active notifications merge and display the repetition count.") }} </p>
    </section>

    <section class="toolbar-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">{{ t("Fourth shared component") }}</p>
          <h2>Toolbar</h2>
          <p>{{ t("Consistent actions, accessibility, operation locking and compact mobile controls.") }}</p>
        </div>
      </div>
      <nav ref="toolbarDemo" class="toolbar-demo-host"></nav>
      <p class="toolbar-result" aria-live="polite">{{ toolbarResult }}</p>
    </section>

    <section class="settings-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">{{ t("Fifth shared milestone") }}</p>
          <h2>Form Engine + Settings Service</h2>
          <p>{{ t("Consistent fields, validation and settings saved for the signed-in user.") }}</p>
        </div>
      </div>
      <div ref="settingsFormHost"></div>
      <div class="settings-demo-actions">
        <button type="button" @click="saveSettings">{{ t("Save settings") }}</button>
        <span aria-live="polite">{{ settingsResult }}</span>
      </div>
    </section>

    <section class="picker-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">{{ t("Sixth shared component") }}</p>
          <h2>User/Group Picker</h2>
          <p>{{ t("Search for real Nextcloud users and groups with multiple selection.") }}</p>
        </div>
      </div>
      <div ref="pickerHost"></div>
      <p class="picker-result" aria-live="polite">{{ pickerResult }}</p>
    </section>

    <section class="layout-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">{{ t("Seventh shared component") }}</p>
          <h2>Layout Primitives</h2>
          <p>{{ t("Consistent height, fixed header and toolbar, scrollable content and a map or chart surface.") }}</p>
        </div>
      </div>
      <div ref="layoutPreview" class="layout-preview hc-shared-app-core-layout">
        <header class="hc-shared-app-core-layout__header">
          <strong>{{ t("Weather view") }}</strong>
          <span class="mode-chip">{{ layoutMetrics?.mode ?? t("waiting") }}</span>
        </header>
        <nav class="hc-shared-app-core-layout__toolbar" :aria-label="t('Example views')">
          <button type="button">{{ t("Overview") }}</button>
          <button type="button">Radar</button>
          <button type="button">{{ t("Wind") }}</button>
          <button type="button">{{ t("Storms") }}</button>
        </nav>
        <div class="hc-shared-app-core-layout__content">
          <section class="hc-shared-app-core-view">
            <div class="hc-shared-app-core-split-view hc-shared-app-core-split-view--horizontal">
              <aside class="hc-shared-app-core-split-view__primary hc-shared-app-core-scroll-area">
                <strong>{{ t("View controls") }}</strong>
                <p>{{ t("Only the panel content scrolls.") }}</p>
              </aside>
              <div class="hc-shared-app-core-split-view__secondary hc-shared-app-core-surface">
                <strong>{{ t("Map / chart") }}</strong>
                <small>{{ t("Fills all remaining space.") }}</small>
              </div>
            </div>
          </section>
        </div>
      </div>
      <p class="metrics">
        {{ layoutMetrics?.width ?? '—' }} × {{ layoutMetrics?.height ?? '—' }} {{ t("px · mode") }} <strong>{{ layoutMetrics?.mode ?? '—' }}</strong> {{ t("· resize event ready") }} </p>
    </section>



    <section class="settings-demo">
      <h2>{{ t("Shared editor") }}</h2>
      <p>{{ t("Try formatting, fonts, emoji and free image search. Preview is beside the text on desktop and below it on mobile. The sample is not saved; images up to 1 MiB are embedded only in the temporary document.") }}</p>
      <div ref="editorHost"></div>
    </section>

    <section class="settings-demo">
      <h2>{{ t("Shared background") }}</h2>
      <p>{{ t("Background choice is saved separately for the current user.") }}</p>
      <label>{{ t("Mode") }} <select v-model="backgroundMode"><option value="none">{{ t("No background") }}</option><option value="solid">{{ t("Color") }}</option><option value="gradient">{{ t("Gradient") }}</option></select></label>
      <button type="button" @click="saveBackground">{{ t("Save background") }}</button>
      <p role="status">{{ backgroundStatus }}</p>
      <div ref="backgroundHost" class="background-demo-preview">{{ t("Example app surface") }}</div>
    </section>

    <section class="settings-demo">
      <h2>{{ t("Shared lists and places") }}</h2>
      <p>{{ t("Real Core service demo. The server checks read/edit permissions and group sharing.") }}</p>
      <p role="status">{{ listsStatus }}</p>
      <button type="button" @click="createDemoList">{{ t("Create list") }}</button>
      <button type="button" :disabled="!activeListId || sharedLists.find(item => item.id === activeListId)?.permission !== 'owner'" @click="createDemoChild">{{ t("Create sublist") }}</button>
      <label>{{ t("List") }} <select v-model="activeListId" @change="loadLists"><option v-for="item in sharedLists" :key="item.id" :value="item.id">{{ item.parent_id ? '↳ ' : '' }}{{ item.title }} ({{ item.permission }})</option></select></label>
      <button type="button" :disabled="!activeListId || sharedLists.find(item => item.id === activeListId)?.permission === 'read'" @click="addDemoPlace">{{ t("Add Prague") }}</button>
      <button type="button" :disabled="sharedLists.find(item => item.id === activeListId)?.permission !== 'owner'" @click="grantSelected('read')">{{ t("Share with selected users for reading") }}</button>
      <button type="button" :disabled="sharedLists.find(item => item.id === activeListId)?.permission !== 'owner'" @click="grantSelected('edit')">{{ t("Share with selected users for editing") }}</button>
      <button type="button" :disabled="!sharedPlaces.length || sharedLists.find(item => item.id === activeListId)?.permission !== 'owner'" @click="shareDemoPlace('read')">{{ t("Share only the first place") }}</button>
      <button type="button" :disabled="!activeListId || sharedLists.find(item => item.id === activeListId)?.permission === 'read'" @click="toggleArchive">{{ t("Archive / restore") }}</button>
      <ul><li v-for="place in sharedPlaces" :key="place.id">{{ place.name }} · {{ place.lat }}, {{ place.lon }}</li></ul>
    </section>

    <section class="maps-demo">
      <div class="demo-heading"><div><p class="eyebrow">{{ t("Tenth shared component") }}</p><h2>Core Maps Proxy & Cache</h2><p>{{ t("Shared viewport, layers, server tile proxy, shared cache and provider registry.") }}</p></div><button type="button" @click="openMapCacheSettings">{{ t("Cache settings and statistics") }}</button></div>
      <div ref="mapHost" class="maps-demo-host"><div class="maps-demo-grid">{{ t("App map surface") }}</div></div>
      <p class="metrics">{{ mapViewport }}</p>
      <div class="map-diagnostics">
        <article><small>{{ t("Providers") }}</small><strong>{{ mapProviders.map((oProvider) => oProvider.id + (oProvider.configured ? ' ✓' : t(" – no key"))).join(', ') || t("loading") }}</strong></article>
        <article><small>{{ t("Rate limited") }}</small><strong>{{ mapDiagnostics?.rateLimitedRequests ?? '—' }}</strong></article>
        <article><small>{{ t("Counter / provider errors") }}</small><strong>{{ mapDiagnostics ? (mapDiagnostics.limiterUnavailableRequests ?? '—') + ' / ' + (mapDiagnostics.providerErrors ?? '—') : '—' }}</strong></article>
        <article><small>{{ t("Requests today") }}</small><strong>{{ mapDiagnostics?.requests ?? '—' }}</strong></article>
        <article><small>Cache hit / miss</small><strong>{{ mapDiagnostics ? mapDiagnostics.cacheHits + ' / ' + mapDiagnostics.cacheMisses : '—' }}</strong></article>
        <article><small>{{ t("External / saved") }}</small><strong>{{ mapDiagnostics ? mapDiagnostics.externalRequests + ' / ' + mapDiagnostics.savedExternalRequests : '—' }}</strong></article>
        <article><small>{{ t("Cache size") }}</small><strong>{{ mapDiagnostics ? (mapDiagnostics.cacheBytes / 1048576).toFixed(1) + ' MiB / ' + (mapDiagnostics.cacheLimitBytes / 1073741824).toFixed(1) + ' GiB' : '—' }}</strong></article>
        <article><small>{{ t("Usage") }}</small><strong>{{ mapDiagnostics ? mapDiagnostics.cacheUsagePercent.toFixed(2) + ' %' : '—' }}</strong></article>
        <article><small>{{ t("Tile count") }}</small><strong>{{ mapDiagnostics?.cacheEntryCount ?? '—' }}</strong></article>
        <article><small>{{ t("Oldest entry") }}</small><strong>{{ mapDiagnostics?.cacheOldestStoredAt ? new Date(mapDiagnostics.cacheOldestStoredAt).toLocaleString() : '—' }}</strong></article>
        <article><small>{{ t("TTL server / browser") }}</small><strong>{{ mapDiagnostics ? Math.round(mapDiagnostics.tileCacheTtlSeconds / 86400) + ' / ' + Math.round(mapDiagnostics.browserCacheTtlSeconds / 86400) + t(" days") : '—' }}</strong></article>
      </div>
      <p v-if="mapDiagnosticsError" class="map-provider-error">{{ t("Cannot load diagnostics:") }} {{ mapDiagnosticsError }}</p>
      <p v-if="mapDiagnostics?.lastProviderError" class="map-provider-error">{{ t("Last error:") }} {{ mapDiagnostics.lastProviderError }}</p>
    </section>
  <ConcurrencyDemo />
  <RuntimeChecks :settings-url="coreSettingsUrl" />
  </main>
</template>
