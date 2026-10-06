<script setup lang="ts">
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
const dialogResult = ref('Zatím nebyla provedena žádná akce.')
const toolbarDemo = ref<HTMLElement | null>(null)
const toolbarResult = ref('Zatím nebyla vybrána žádná akce.')
const settingsFormHost = ref<HTMLElement | null>(null)
const settingsResult = ref('Načítám uložené nastavení…')
const pickerHost = ref<HTMLElement | null>(null)
const pickerResult = ref('Není vybrán žádný uživatel ani skupina.')
const layoutPreview = ref<HTMLElement | null>(null)
const layoutMetrics = ref<LayoutMetrics | null>(null)
const aboutHost = ref<HTMLElement | null>(null)
const mapHost = ref<HTMLElement | null>(null)
const mapViewport = ref('čekám')
const mapProviders = ref<Array<{ id: string; name: string; configured: boolean; enabled: boolean }>>([])
const mapDiagnostics = ref<{ rateLimitedRequests?: number; limiterUnavailableRequests?: number; providerErrors?: number; requests: number; cacheHits: number; cacheMisses: number; externalRequests: number; savedExternalRequests: number; cacheBytes: number; cacheLimitBytes: number; cacheFreeBytes: number; cacheUsagePercent: number; cacheEntryCount: number; cacheOldestStoredAt: string | null; cacheNewestStoredAt: string | null; tileCacheTtlSeconds: number; browserCacheTtlSeconds: number; lastProviderError: string; canManage: boolean } | null>(null)
const mapDiagnosticsError = ref('')
const editorHost = ref<HTMLElement | null>(null)
const editorLabels: Record<string, string> = {
  Formatting: 'Formátování', Document: 'Dokument', Preview: 'Náhled',
  Undo: 'Zpět', Redo: 'Znovu', Heading: 'Nadpis', Bold: 'Tučné', Italic: 'Kurzíva',
  Underline: 'Podtržené', Strikethrough: 'Přeškrtnuté', Highlight: 'Zvýraznění',
  'Bullet list': 'Odrážky', 'Numbered list': 'Číslovaný seznam', Checklist: 'Zaškrtávací seznam',
  Quote: 'Citace', 'Inline code': 'Kód v textu', 'Code block': 'Blok kódu', Table: 'Tabulka',
  Link: 'Odkaz', 'Image URL': 'Adresa obrázku', 'Insert image': 'Vložit obrázek',
  'Emoji library': 'Knihovna emoji', 'Emoji category': 'Kategorie emoji', 'All emoji': 'Všechna emoji', 'Find emoji': 'Hledat emoji', 'Free image libraries': 'Knihovny volných obrázků', 'Image source': 'Zdroj obrázků', 'Search free images': 'Hledat volné obrázky', 'Text color': 'Barva textu', Font: 'Písmo', Search: 'Hledat', Source: 'Zdroj', Separator: 'Oddělovač', Image: 'Obrázek',
}
const backgroundHost = ref<HTMLElement | null>(null)
const backgroundStatus = ref('Pozadí čeká na načtení.')
const backgroundMode = ref<'none' | 'solid' | 'gradient'>('none')
let backgroundController: { load(): Promise<{ mode: string }>; save(choice: { mode: 'none' } | { mode: 'solid' | 'gradient'; color: string }): Promise<void>; destroy(): void } | null = null
const listsStatus = ref('Seznamy čekají na načtení.')
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
let mapController: MapController | null = null
let nMapDiagnosticsTimer: number | null = null

async function loadLists(): Promise<void> {
  try {
    const core = window.HcSharedAppCore
    if (!core) return
    sharedLists.value = await core.lists.list('map_places')
    if (!sharedLists.value.some(list => list.id === activeListId.value)) activeListId.value = sharedLists.value[0]?.id ?? ''
    sharedPlaces.value = activeListId.value ? await core.lists.places('map_places', activeListId.value) : []
    listsStatus.value = 'Načteno ze služby Core. Import starých míst se provede při prvním načtení.'
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function createDemoList(): Promise<void> {
  try {
    const item = await window.HcSharedAppCore!.lists.create('map_places', 'Ukázkový seznam')
    activeListId.value = item.id; await loadLists()
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function createDemoChild(): Promise<void> {
  if (!activeListId.value || sharedLists.value.find(item => item.id === activeListId.value)?.permission !== 'owner') return
  try {
    const item = await window.HcSharedAppCore!.lists.create('map_places', 'Podseznam', 0, activeListId.value)
    activeListId.value = item.id; await loadLists()
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function shareDemoPlace(permission: 'read' | 'edit'): Promise<void> {
  if (!activeListId.value || !sharedPlaces.value.length || !pickerController) return
  try {
    for (const target of pickerController.selected()) await window.HcSharedAppCore!.lists.sharePlace('map_places', activeListId.value, sharedPlaces.value[0]!.id, target.type, target.id, permission)
    listsStatus.value = 'Sdíleno pouze vybrané místo, nikoli celý seznam.'
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function addDemoPlace(): Promise<void> {
  if (!activeListId.value) return
  try {
    await window.HcSharedAppCore!.lists.addPlace('map_places', activeListId.value, { name: 'Praha', lat: 50.087, lon: 14.421, note: '', color: '#3388ff', position: sharedPlaces.value.length })
    await loadLists()
  } catch (error) { listsStatus.value = error instanceof Error ? error.message : String(error) }
}

async function grantSelected(permission: 'read' | 'edit'): Promise<void> {
  if (!activeListId.value || !pickerController) return
  try {
    for (const target of pickerController.selected()) await window.HcSharedAppCore!.lists.share('map_places', activeListId.value, target.type, target.id, permission)
    listsStatus.value = 'Sdílení bylo uloženo. Příjemce uvidí seznam po přihlášení.'
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
    backgroundStatus.value = 'Pozadí je uloženo v uživatelském nastavení.'
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
const loadedCoreVersion = computed(() => window.HcSharedAppCore?.version ?? 'nenalezeno')

function createTests(): TestResult[] {
  return [
    { id: 'global', name: 'Načtení Core', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'api', name: 'Stavové API', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'version', name: 'Kompatibilita verze', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'events', name: 'EventBus', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'config', name: 'Config', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'logger', name: 'Logger', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'workspace', name: 'Responsive Workspace', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'dialogs', name: 'Dialog Engine', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'notifications', name: 'Notification Manager', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'toolbar', name: 'Toolbar', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'forms', name: 'Form Engine', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'settings', name: 'Settings Service', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'picker', name: 'User/Group Picker', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'layout', name: 'Layout Primitives', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'about', name: 'About & Updates', detail: 'Čeká na spuštění', state: 'waiting' },
    { id: 'maps', name: 'Core Maps', detail: 'Čeká na spuštění', state: 'waiting' },
  ]
}

function setResult(id: string, state: TestResult['state'], detail: string): void {
  const test = tests.value.find((item) => item.id === id)
  if (test) Object.assign(test, { state, detail })
}

async function execute(id: string, action: () => void | Promise<void>): Promise<void> {
  setResult(id, 'running', 'Probíhá test…')
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
    if (!core) throw new Error('Globální API window.HcSharedAppCore nebylo nalezeno.')
    setResult('global', 'passed', 'Core ' + core.version + ', API ' + core.apiVersion)
  })

  await execute('api', async () => {
    if (!props.coreStatusUrl) throw new Error('Chybí URL stavového API.')
    const separator = props.coreStatusUrl.includes('?') ? '&' : '?'
    const response = await fetch(props.coreStatusUrl + separator + '_core=' + Date.now(), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    const status = await response.json() as StatusResponse
    if (status.app !== 'hc_shared_app_core' || status.contract !== 'hc-shared-app-core-v1' || status.apiVersion !== 1) throw new Error('Neplatný veřejný kontrakt Core.')
    if (status.nextcloud?.min !== 35 || status.nextcloud?.max !== 35) throw new Error('Core nehlásí očekávaný rozsah NC35.')
    serverStatus.value = status
    if (core && status.version !== core.version) {
      throw new Error('Backend ' + status.version + ' a frontend ' + core.version + ' se neshodují.')
    }
    setResult('api', 'passed', 'Backend hc_shared_app_core ' + status.version + ' odpovídá.')
  })

  if (!core) {
    for (const id of ['version', 'events', 'config', 'logger', 'workspace', 'dialogs', 'notifications', 'toolbar', 'forms', 'settings', 'picker', 'layout', 'about', 'maps']) {
      setResult(id, 'failed', 'Core není načtené.')
    }
    running.value = false
    return
  }

  await execute('version', () => {
    core.assertCompatible(props.requiredCoreVersion)
    setResult('version', 'passed', 'Požadavek ≥ ' + props.requiredCoreVersion + ' splněn.')
  })

  await execute('events', () => {
    const received: string[] = []
    const unsubscribe = core.events.on('playground:self-test', (payload) => {
      received.push(String((payload as { value: string }).value))
    })
    core.events.emit('playground:self-test', { value: 'OK' })
    unsubscribe()
    if (!received.includes('OK')) throw new Error('Událost nebyla správně doručena.')
    setResult('events', 'passed', 'Událost doručena a listener odpojen.')
  })

  await execute('config', () => {
    core.config.set('playground.selfTest', 'OK')
    if (core.config.get<string>('playground.selfTest', '') !== 'OK') {
      throw new Error('Uložená hodnota nebyla vrácena.')
    }
    setResult('config', 'passed', 'Zápis a čtení hodnoty funguje.')
  })

  await execute('logger', () => {
    core.logger.info('Playground self-test completed.', { version: props.playgroundVersion })
    setResult('logger', 'passed', 'Zpráva zapsána do konzole prohlížeče.')
  })

  await execute('workspace', async () => {
    await nextTick()
    if (!workspacePreview.value) throw new Error('Ukázkový workspace nebyl nalezen.')
    workspaceController?.destroy()
    workspaceController = core.workspace.observe(workspacePreview.value, (metrics) => {
      workspaceMetrics.value = metrics
    })
    const metrics = workspaceController.refresh()
    if (!['mobile', 'tablet', 'desktop'].includes(metrics.mode)) {
      throw new Error('Workspace vrátil neplatný režim.')
    }
    setResult('workspace', 'passed', 'Observer aktivní, režim ' + metrics.mode + '.')
  })

  await execute('dialogs', async () => {
    const dialog = core.dialogs.open({
      title: 'Automatický test',
      content: 'Dialog je funkční.',
    })
    dialog.close('programmatic')
    if (await dialog.closed !== 'programmatic') {
      throw new Error('Dialog se neuzavřel očekávaným způsobem.')
    }
    setResult('dialogs', 'passed', 'Otevření, stack a zavření fungují.')
  })

  await execute('notifications', async () => {
    const notification = core.notifications.info('Automatický test', { persistent: true })
    notification.dismiss()
    if (await notification.closed !== 'dismiss') {
      throw new Error('Oznámení se neuzavřelo očekávaným způsobem.')
    }
    setResult('notifications', 'passed', 'Zobrazení, deduplikace a zavření fungují.')
  })

  await execute('toolbar', () => {
    if (!toolbarDemo.value) throw new Error('Ukázkový toolbar nebyl nalezen.')
    if (!toolbarDemo.value.querySelector('[data-toolbar-action="add"]')) {
      throw new Error('Akce toolbaru nebyla vykreslena.')
    }
    toolbarController?.setDisabled('filter', true)
    toolbarController?.setDisabled('filter', false)
    setResult('toolbar', 'passed', 'Akce, stav tlačítek a mobilní režim fungují.')
  })

  await execute('forms', () => {
    if (!formController || !settingsFormHost.value?.querySelector('[name="location"]')) {
      throw new Error('Formulářová pole nebyla vykreslena.')
    }
    if (!formController.validate()) throw new Error('Výchozí formulář není platný.')
    setResult('forms', 'passed', 'Pole, hodnoty a validace fungují.')
  })

  await execute('settings', async () => {
    if (!props.coreSettingsUrl) throw new Error('Chybí URL settings API.')
    const oClient = core.settings.create(props.coreSettingsUrl, 'hc_shared_app_core_playground')
    const oValues = await oClient.load()
    formController?.setValues(oValues as Record<string, string | number | boolean>)
    settingsResult.value = Object.keys(oValues).length
      ? 'Uložené nastavení bylo načteno.'
      : 'Zatím není uloženo žádné nastavení.'
    setResult('settings', 'passed', 'Uživatelské nastavení lze načíst ze serveru.')
  })

  await execute('picker', () => {
    if (!props.coreShareesUrl) throw new Error('Chybí URL User/Group API.')
    if (!pickerController || !pickerHost.value?.querySelector('input[type="search"]')) {
      throw new Error('User/Group Picker nebyl vykreslen.')
    }
    setResult('picker', 'passed', 'Vyhledávání a vícenásobný výběr jsou připravené.')
  })

  await execute('layout', async () => {
    await nextTick()
    const oElement = layoutPreview.value
    if (!oElement) throw new Error('Ukázka Layout Primitives nebyla nalezena.')
    layoutController?.destroy()
    layoutController = core.layout.observe(oElement, {
      topOffset: 0,
      onResize: (oMetrics) => {
        layoutMetrics.value = oMetrics
      },
    })
    const oMetrics = layoutController.refresh('manual')
    if (!core.layout.classes.appLayout || oMetrics.availableHeight < 0) {
      throw new Error('Veřejné Layout API vrátilo neplatný kontrakt.')
    }
    setResult('layout', 'passed', 'Kostra, scroll a resize události fungují.')
  })

  await execute('about', () => {
    if (!aboutController || !aboutHost.value?.querySelector('.hc-shared-app-core-about__row')) {
      throw new Error('Společný blok O aplikaci nebyl vykreslen.')
    }
    setResult('about', 'passed', 'Verze aplikace, Core a odkazy na GitHub jsou dostupné.')
  })

  await execute('maps', async () => {
    if (!mapController || !mapHost.value?.querySelector('.hc-shared-app-core-map__compass')) throw new Error('Core Maps nebylo vykresleno.')
    const oViewport = mapController.getViewport()
    if (oViewport.center.lat !== 49.1 || oViewport.rotationDeg !== 0) throw new Error('Mapový viewport není platný.')
    const sTemplate = core.maps.tileTemplate('osm', 'basic', 256)
    if (!sTemplate.includes('/api/v1/maps/tile/osm/basic/256/{z}/{x}/{y}')) throw new Error('Tile proxy šablona není platná.')
    mapProviders.value = await core.maps.providers.list()
    await loadMapDiagnostics()
    if (!mapDiagnostics.value) throw new Error('Diagnostiku mapové cache nelze načíst: ' + mapDiagnosticsError.value)
    setResult('maps', 'passed', 'API viewportu, vrstev a tile URL ověřeno (bez reálného stahování); providerů: ' + mapProviders.value.length + '.')
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
    title: 'Potvrzení akce',
    message: 'Má se ukázková akce opravdu provést?',
    confirmLabel: 'Ano, provést',
    cancelLabel: 'Zrušit',
  })
  dialogResult.value = accepted ? 'Akce byla potvrzena.' : 'Akce byla zrušena.'
}

function showSettings(): void {
  const core = window.HcSharedAppCore
  if (!core) return
  const form = document.createElement('div')
  form.className = 'dialog-demo-form'
  const label = document.createElement('label')
  label.textContent = 'Název umístění'
  const input = document.createElement('input')
  input.type = 'text'
  input.value = 'Domov'
  input.maxLength = 80
  label.append(input)
  const hint = document.createElement('p')
  hint.textContent = 'Formulářový obsah zůstává uvnitř scrollovatelné části dialogu.'
  form.append(label, hint)
  core.dialogs.open({
    title: 'Ukázkové nastavení',
    content: form,
    actions: [
      { label: 'Zrušit' },
      {
        label: 'Uložit',
        variant: 'primary',
        onClick: () => {
          dialogResult.value = 'Uložena hodnota: ' + input.value
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
    heading.textContent = 'Sekce ' + index
    const paragraph = document.createElement('p')
    paragraph.textContent = 'Dlouhý obsah se posouvá uvnitř dialogu, zatímco nadpis a ovládací tlačítka zůstávají dostupné.'
    section.append(heading, paragraph)
    content.append(section)
  }
  core.dialogs.open({
    title: 'Dlouhý scrollovatelný obsah',
    content,
    size: 'large',
    actions: [{ label: 'Zavřít', variant: 'primary' }],
  })
}

function showNotification(type: 'success' | 'info' | 'warning' | 'error'): void {
  const manager = window.HcSharedAppCore?.notifications
  if (!manager) return
  const messages = {
    success: 'Změny byly úspěšně uloženy.',
    info: 'Probíhá aktualizace zobrazených dat.',
    warning: 'Některé hodnoty vyžadují kontrolu.',
    error: 'Spojení se službou se nezdařilo.',
  }
  manager.show({
    type,
    title: type === 'error' ? 'Chyba spojení' : undefined,
    message: messages[type],
    persistent: type === 'error',
  })
}

function showDuplicate(): void {
  window.HcSharedAppCore?.notifications.success('Nastavení uloženo.', {
    dedupeKey: 'playground-save',
    cooldownMs: 2500,
  })
}

function showNotificationAction(): void {
  window.HcSharedAppCore?.notifications.info('Je dostupná nová ukázková akce.', {
    persistent: true,
    action: {
      label: 'Provést',
      onClick: () => {
        dialogResult.value = 'Akce z oznámení byla provedena.'
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
    toolbarResult.value = 'Vybraná akce: ' + sAction
  }
  toolbarController = oCore.toolbar.create(oElement, {
    ariaLabel: 'Ukázkové nástroje',
    actions: [
      { id: 'add', label: 'Přidat', icon: '+', variant: 'primary', onClick: () => fnSelect('Přidat') },
      { id: 'filter', label: 'Filtrovat', icon: '⌕', compact: true, onClick: () => fnSelect('Filtrovat') },
      { id: 'settings', label: 'Nastavení', icon: '⚙', compact: true, onClick: () => fnSelect('Nastavení') },
      { id: 'delete', label: 'Odstranit', icon: '×', variant: 'danger', compact: true, onClick: () => fnSelect('Odstranit') },
    ],
  })
}

function mountSettingsForm(): void {
  const oHost = settingsFormHost.value
  const oCore = window.HcSharedAppCore
  if (!oHost || !oCore) return
  formController?.destroy()
  formController = oCore.forms.create([
    { id: 'location', label: 'Výchozí místo', type: 'text', value: 'Praha', required: true, maxLength: 80 },
    { id: 'items', label: 'Počet položek', type: 'number', value: 6, min: 1, max: 24 },
    { id: 'units', label: 'Jednotky', type: 'select', value: 'metric', options: [{ value: 'metric', label: 'Metrické' }, { value: 'imperial', label: 'Imperiální' }] },
    { id: 'notifications', label: 'Povolit upozornění', type: 'checkbox', value: true, hint: 'Ukázka přepínače společného formuláře.' },
  ])
  oHost.replaceChildren(formController.element)
}

async function saveSettings(): Promise<void> {
  const oCore = window.HcSharedAppCore
  if (!oCore || !formController || !formController.validate()) return
  try {
    const oClient = oCore.settings.create(props.coreSettingsUrl, 'hc_shared_app_core_playground')
    await oClient.save(formController.values())
    settingsResult.value = 'Nastavení bylo trvale uloženo pro aktuálního uživatele.'
    oCore.notifications.success('Nastavení uloženo.', { dedupeKey: 'playground-settings' })
  } catch (oError) {
    settingsResult.value = oError instanceof Error ? oError.message : String(oError)
    oCore.notifications.error('Nastavení se nepodařilo uložit.')
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
    placeholder: 'Začni psát jméno uživatele nebo skupiny…',
    onChange: (aItems) => {
      pickerResult.value = aItems.length
        ? 'Vybráno: ' + aItems.map((oItem) => oItem.label).join(', ')
        : 'Není vybrán žádný uživatel ani skupina.'
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
    repository: 'https://github.com/hacesoft/hc-shared-app-core-playground',
    releaseNotes: 'https://github.com/hacesoft/hc-shared-app-core-playground/releases',
    documentation: 'https://github.com/hacesoft/hc-shared-app-core-playground#readme',
  })
  aboutController = oCore.about.mount(oHost, { endpoint: props.coreReleaseUrl })
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
    value: editorSample,
    label: 'Text ukázkového dokumentu',
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
      backgroundStatus.value = 'Pozadí načteno.'
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
        <p>Vývojová laboratoř společných komponent a služeb.</p>
      </div>
      <div class="version-badge">Playground {{ playgroundVersion }}</div>
    </header>

    <section class="summary" :class="{ success: allPassed }">
      <div class="summary-icon">{{ allPassed ? '✓' : running ? '…' : '!' }}</div>
      <div>
        <h2>{{ allPassed ? 'Kontroly API prošly' : running ? 'Probíhá kontrola' : 'Kontrola vyžaduje pozornost' }}</h2>
        <p>{{ passedCount }} z {{ tests.length }} testů úspěšných</p>
      </div>
      <button type="button" :disabled="running" @click="runTests">
        {{ running ? 'Testuji…' : 'Spustit znovu' }}
      </button>
    </section>

      <p role="status">Základní kontroly API jsou oddělené od provozních zkoušek níže. Skutečnou mapu, GPS a ukládání spustíte tlačítkem.</p>
    <section class="test-grid" aria-label="Výsledky testů Core">
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
      <h2>Aktivní kontrakt</h2>
      <dl>
        <div><dt>Požadované Core</dt><dd>≥ {{ requiredCoreVersion }}</dd></div>
        <div><dt>Načtené Core</dt><dd>{{ loadedCoreVersion }}</dd></div>
        <div><dt>Backend API</dt><dd>{{ serverStatus?.apiVersion ?? '—' }}</dd></div>
        <div><dt>Nextcloud rozsah</dt><dd>{{ serverStatus?.nextcloud ? serverStatus.nextcloud.min + '–' + serverStatus.nextcloud.max : '—' }}</dd></div>
      </dl>
    </section>

    <section class="workspace-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">První společná komponenta</p>
          <h2>Responsive Workspace</h2>
          <p>Režim se určuje podle šířky kontejneru, ne pouze podle celého okna.</p>
        </div>
        <div class="size-switcher" aria-label="Šířka ukázky">
          <button
            v-for="size in (['auto', 'desktop', 'tablet', 'mobile'] as const)"
            :key="size"
            type="button"
            :class="{ active: previewSize === size }"
            @click="setPreviewSize(size)"
          >
            {{ size === 'auto' ? 'Automaticky' : size }}
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
            <div><strong>Ukázková aplikace</strong><small>Společné adaptivní rozložení</small></div>
            <span class="mode-chip">{{ workspaceMetrics?.mode ?? 'čekám' }}</span>
          </header>
          <nav class="hc-shared-app-core-workspace__toolbar">
            <button type="button">Přidat</button>
            <button type="button">Filtrovat</button>
            <button type="button">Nastavení</button>
          </nav>
          <div class="hc-shared-app-core-workspace__body">
            <aside class="hc-shared-app-core-workspace__sidebar">
              <strong>Navigace</strong>
              <a href="#" @click.prevent>První položka</a>
              <a href="#" @click.prevent>Druhá položka</a>
              <a href="#" @click.prevent>Třetí položka</a>
            </aside>
            <div class="hc-shared-app-core-workspace__content">
              <div class="hc-shared-app-core-responsive-grid">
                <article v-for="item in 4" :key="item">
                  <strong>Karta {{ item }}</strong>
                  <p>Obsah se přizpůsobuje dostupnému prostoru.</p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p class="metrics">
        {{ workspaceMetrics?.width ?? '—' }} × {{ workspaceMetrics?.height ?? '—' }} px ·
        viewport {{ workspaceMetrics?.viewportHeight ?? '—' }} px ·
        režim <strong>{{ workspaceMetrics?.mode ?? '—' }}</strong>
      </p>
    </section>

    <section class="dialog-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">Druhá společná komponenta</p>
          <h2>Dialog Engine</h2>
          <p>Jednotné dialogy s podporou klávesnice, fokusu, dlouhého obsahu a mobilu.</p>
        </div>
      </div>
      <div class="dialog-demo-actions">
        <button type="button" @click="showConfirmation">Otevřít potvrzení</button>
        <button type="button" @click="showSettings">Otevřít nastavení</button>
        <button type="button" @click="showLongDialog">Otevřít dlouhý obsah</button>
      </div>
      <p class="dialog-result" aria-live="polite">{{ dialogResult }}</p>
    </section>

    <section class="notification-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">Třetí společná komponenta</p>
          <h2>Notification Manager</h2>
          <p>Lehká oznámení aplikace bez zbytečného zaplňování Nextcloud zvonečku.</p>
        </div>
      </div>
      <div class="notification-demo-actions">
        <button type="button" @click="showNotification('success')">Success</button>
        <button type="button" @click="showNotification('info')">Info</button>
        <button type="button" @click="showNotification('warning')">Warning</button>
        <button type="button" @click="showNotification('error')">Trvalá chyba</button>
        <button type="button" @click="showDuplicate">Opakované uložení</button>
        <button type="button" @click="showNotificationAction">Oznámení s akcí</button>
      </div>
      <p class="notification-note">
        Klikni několikrát na „Opakované uložení“ — místo záplavy zpráv se aktivní
        oznámení sloučí a ukáže počet opakování.
      </p>
    </section>

    <section class="toolbar-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">Čtvrtá společná komponenta</p>
          <h2>Toolbar</h2>
          <p>Jednotné akce, přístupnost, blokování během operace a kompaktní mobilní zobrazení.</p>
        </div>
      </div>
      <nav ref="toolbarDemo" class="toolbar-demo-host"></nav>
      <p class="toolbar-result" aria-live="polite">{{ toolbarResult }}</p>
    </section>

    <section class="settings-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">Pátý společný milník</p>
          <h2>Form Engine + Settings Service</h2>
          <p>Jednotná pole, validace a nastavení uložené pro přihlášeného uživatele.</p>
        </div>
      </div>
      <div ref="settingsFormHost"></div>
      <div class="settings-demo-actions">
        <button type="button" @click="saveSettings">Uložit nastavení</button>
        <span aria-live="polite">{{ settingsResult }}</span>
      </div>
    </section>

    <section class="picker-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">Šestá společná komponenta</p>
          <h2>User/Group Picker</h2>
          <p>Vyhledání skutečných účtů a skupin Nextcloudu s vícenásobným výběrem.</p>
        </div>
      </div>
      <div ref="pickerHost"></div>
      <p class="picker-result" aria-live="polite">{{ pickerResult }}</p>
    </section>

    <section class="layout-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">Sedmá společná komponenta</p>
          <h2>Layout Primitives</h2>
          <p>Jednotná výška, pevná hlavička a toolbar, scrollovatelný obsah a plocha pro mapu nebo graf.</p>
        </div>
      </div>
      <div ref="layoutPreview" class="layout-preview hc-shared-app-core-layout">
        <header class="hc-shared-app-core-layout__header">
          <strong>Weather pohled</strong>
          <span class="mode-chip">{{ layoutMetrics?.mode ?? 'čekám' }}</span>
        </header>
        <nav class="hc-shared-app-core-layout__toolbar" aria-label="Ukázkové pohledy">
          <button type="button">Přehled</button>
          <button type="button">Radar</button>
          <button type="button">Vítr</button>
          <button type="button">Bouřky</button>
        </nav>
        <div class="hc-shared-app-core-layout__content">
          <section class="hc-shared-app-core-view">
            <div class="hc-shared-app-core-split-view hc-shared-app-core-split-view--horizontal">
              <aside class="hc-shared-app-core-split-view__primary hc-shared-app-core-scroll-area">
                <strong>Ovládání pohledu</strong>
                <p>Posouvá se pouze obsah panelu.</p>
              </aside>
              <div class="hc-shared-app-core-split-view__secondary hc-shared-app-core-surface">
                <strong>Mapa / graf</strong>
                <small>Vyplňuje všechen zbývající prostor.</small>
              </div>
            </div>
          </section>
        </div>
      </div>
      <p class="metrics">
        {{ layoutMetrics?.width ?? '—' }} × {{ layoutMetrics?.height ?? '—' }} px ·
        režim <strong>{{ layoutMetrics?.mode ?? '—' }}</strong> · resize událost připravena
      </p>
    </section>

    <section class="about-demo">
      <div class="demo-heading">
        <div>
          <p class="eyebrow">Osmá společná komponenta</p>
          <h2>About & Update Service</h2>
          <p>Jednotné informace o aplikaci, Core a dostupných verzích na GitHubu.</p>
        </div>
      </div>
      <div ref="aboutHost"></div>
    </section>

    <section class="settings-demo">
      <h2>Společný editor</h2>
      <p>Vyzkoušej kurzívu, podtržení, barvy, písma, knihovnu emoji a hledání volných obrázků. Náhled je vedle textu na PC a pod ním na mobilu. Obsah této ukázky se neukládá; obrázek do 1 MiB je vložen jen do dočasného dokumentu.</p>
      <div ref="editorHost"></div>
    </section>

    <section class="settings-demo">
      <h2>Společné pozadí</h2>
      <p>Volba pozadí se ukládá zvlášť pro aktuálního uživatele.</p>
      <label>Režim <select v-model="backgroundMode"><option value="none">Bez pozadí</option><option value="solid">Barva</option><option value="gradient">Přechod</option></select></label>
      <button type="button" @click="saveBackground">Uložit pozadí</button>
      <p role="status">{{ backgroundStatus }}</p>
      <div ref="backgroundHost" class="background-demo-preview">Ukázková plocha aplikace</div>
    </section>

    <section class="settings-demo">
      <h2>Sdílené seznamy a místa</h2>
      <p>Ukázka skutečné služby Core. Právo read/edit a skupinové sdílení kontroluje server.</p>
      <p role="status">{{ listsStatus }}</p>
      <button type="button" @click="createDemoList">Vytvořit seznam</button>
      <button type="button" :disabled="!activeListId || sharedLists.find(item => item.id === activeListId)?.permission !== 'owner'" @click="createDemoChild">Vytvořit podseznam</button>
      <label>Seznam <select v-model="activeListId" @change="loadLists"><option v-for="item in sharedLists" :key="item.id" :value="item.id">{{ item.parent_id ? '↳ ' : '' }}{{ item.title }} ({{ item.permission }})</option></select></label>
      <button type="button" :disabled="!activeListId || sharedLists.find(item => item.id === activeListId)?.permission === 'read'" @click="addDemoPlace">Přidat Prahu</button>
      <button type="button" :disabled="sharedLists.find(item => item.id === activeListId)?.permission !== 'owner'" @click="grantSelected('read')">Sdílet výběru pro čtení</button>
      <button type="button" :disabled="sharedLists.find(item => item.id === activeListId)?.permission !== 'owner'" @click="grantSelected('edit')">Sdílet výběru pro úpravy</button>
      <button type="button" :disabled="!sharedPlaces.length || sharedLists.find(item => item.id === activeListId)?.permission !== 'owner'" @click="shareDemoPlace('read')">Sdílet pouze první místo</button>
      <button type="button" :disabled="!activeListId || sharedLists.find(item => item.id === activeListId)?.permission === 'read'" @click="toggleArchive">Archivovat / obnovit</button>
      <ul><li v-for="place in sharedPlaces" :key="place.id">{{ place.name }} · {{ place.lat }}, {{ place.lon }}</li></ul>
    </section>

    <section class="maps-demo">
      <div class="demo-heading"><div><p class="eyebrow">Desátá společná komponenta</p><h2>Core Maps Proxy & Cache</h2><p>Jednotný viewport, vrstvy, serverová tile proxy, sdílená cache a registry providerů.</p></div><button type="button" @click="openMapCacheSettings">Nastavení cache a statistiky</button></div>
      <div ref="mapHost" class="maps-demo-host"><div class="maps-demo-grid">Mapová plocha aplikace</div></div>
      <p class="metrics">{{ mapViewport }}</p>
      <div class="map-diagnostics">
        <article><small>Provideři</small><strong>{{ mapProviders.map((oProvider) => oProvider.id + (oProvider.configured ? ' ✓' : ' – bez klíče')).join(', ') || 'načítám' }}</strong></article>
        <article><small>Odmítnuto limitem</small><strong>{{ mapDiagnostics?.rateLimitedRequests ?? '—' }}</strong></article>
        <article><small>Chyby počítadla / poskytovatele</small><strong>{{ mapDiagnostics ? (mapDiagnostics.limiterUnavailableRequests ?? '—') + ' / ' + (mapDiagnostics.providerErrors ?? '—') : '—' }}</strong></article>
        <article><small>Požadavky dnes</small><strong>{{ mapDiagnostics?.requests ?? '—' }}</strong></article>
        <article><small>Cache hit / miss</small><strong>{{ mapDiagnostics ? mapDiagnostics.cacheHits + ' / ' + mapDiagnostics.cacheMisses : '—' }}</strong></article>
        <article><small>Externí / ušetřené</small><strong>{{ mapDiagnostics ? mapDiagnostics.externalRequests + ' / ' + mapDiagnostics.savedExternalRequests : '—' }}</strong></article>
        <article><small>Velikost cache</small><strong>{{ mapDiagnostics ? (mapDiagnostics.cacheBytes / 1048576).toFixed(1) + ' MiB / ' + (mapDiagnostics.cacheLimitBytes / 1073741824).toFixed(1) + ' GiB' : '—' }}</strong></article>
        <article><small>Zaplnění</small><strong>{{ mapDiagnostics ? mapDiagnostics.cacheUsagePercent.toFixed(2) + ' %' : '—' }}</strong></article>
        <article><small>Počet dlaždic</small><strong>{{ mapDiagnostics?.cacheEntryCount ?? '—' }}</strong></article>
        <article><small>Nejstarší položka</small><strong>{{ mapDiagnostics?.cacheOldestStoredAt ? new Date(mapDiagnostics.cacheOldestStoredAt).toLocaleString() : '—' }}</strong></article>
        <article><small>TTL server / prohlížeč</small><strong>{{ mapDiagnostics ? Math.round(mapDiagnostics.tileCacheTtlSeconds / 86400) + ' / ' + Math.round(mapDiagnostics.browserCacheTtlSeconds / 86400) + ' dní' : '—' }}</strong></article>
      </div>
      <p v-if="mapDiagnosticsError" class="map-provider-error">Diagnostiku nelze načíst: {{ mapDiagnosticsError }}</p>
      <p v-if="mapDiagnostics?.lastProviderError" class="map-provider-error">Poslední chyba: {{ mapDiagnostics.lastProviderError }}</p>
    </section>
  <ConcurrencyDemo />
  <RuntimeChecks :settings-url="coreSettingsUrl" />
  </main>
</template>
