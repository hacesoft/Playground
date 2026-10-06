// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.vue'

describe('Core Playground', () => {
  let editorOptions: Record<string, unknown> | undefined
  beforeEach(() => {
    document.documentElement.lang = "cs"
    editorOptions = undefined
    const config = new Map<string, unknown>()
    window.HcSharedAppCore = {
      version: '1.0.0',
      apiVersion: 1,
      assertCompatible: vi.fn(),
      events: {
        on: (_event, handler) => {
          ;(window as unknown as { testHandler: (payload: unknown) => void }).testHandler = handler
          return vi.fn()
        },
        emit: (_event, payload) => {
          ;(window as unknown as { testHandler: (payload: unknown) => void }).testHandler(payload)
        },
      },
      config: {
        get: (key, fallback) => (config.has(key) ? config.get(key) : fallback) as typeof fallback,
        set: (key, value) => { config.set(key, value) },
      },
      logger: { info: vi.fn() },
      workspace: {
        resolveMode: () => 'desktop',
        measure: () => ({ width: 1200, height: 700, viewportHeight: 800, mode: 'desktop', compact: false }),
        observe: () => ({
          refresh: () => ({ width: 1200, height: 700, viewportHeight: 800, mode: 'desktop', compact: false }),
          destroy: vi.fn(),
        }),
      },
      layout: {
        classes: { appLayout: 'hc-shared-app-core-layout' },
        resolveMode: () => 'desktop',
        observe: (_element, options) => {
          const metrics: LayoutMetrics = { width: 1200, height: 440, viewportHeight: 800, availableHeight: 800, mode: 'desktop', compact: false, reason: 'manual' }
          options?.onResize?.(metrics)
          return { element: _element, refresh: () => metrics, onResize: () => vi.fn(), destroy: vi.fn() }
        },
        createAppLayout: (element) => ({ element, refresh: vi.fn(), onResize: vi.fn(), destroy: vi.fn() }),
        createView: () => document.createElement('section'),
        createPanel: () => document.createElement('section'),
        createScrollArea: () => document.createElement('div'),
        createSplitView: () => document.createElement('div'),
        createSurface: () => document.createElement('div'),
      },
      dialogs: {
        open: () => ({
          element: document.createElement('div'),
          closed: Promise.resolve('programmatic'),
          close: vi.fn(),
        }),
        confirm: () => Promise.resolve(true),
        closeAll: vi.fn(),
      },
      notifications: {
        show: () => ({ id: '1', element: document.createElement('div'), closed: Promise.resolve('dismiss'), dismiss: vi.fn() }),
        success: () => ({ id: '1', element: document.createElement('div'), closed: Promise.resolve('dismiss'), dismiss: vi.fn() }),
        info: () => ({ id: '1', element: document.createElement('div'), closed: Promise.resolve('dismiss'), dismiss: vi.fn() }),
        warning: () => ({ id: '1', element: document.createElement('div'), closed: Promise.resolve('dismiss'), dismiss: vi.fn() }),
        error: () => ({ id: '1', element: document.createElement('div'), closed: Promise.resolve('dismiss'), dismiss: vi.fn() }),
        clear: vi.fn(),
      },
      toolbar: {
        create: (element, options) => {
          for (const action of options.actions) {
            const button = document.createElement('button')
            button.dataset.toolbarAction = action.id
            button.textContent = action.label
            element.append(button)
          }
          return {
            element,
            update: vi.fn(),
            setDisabled: vi.fn(),
            destroy: vi.fn(),
          }
        },
      },
      forms: {
        create: (fields) => {
          const element = document.createElement('form')
          for (const field of fields) {
            const input = document.createElement('input')
            input.name = String(field.id)
            element.append(input)
          }
          return {
            element,
            values: () => ({ location: 'Praha' }),
            setValues: vi.fn(),
            validate: () => true,
            destroy: vi.fn(),
          }
        },
      },
      settings: {
        create: () => ({
          load: async () => ({}),
          save: async (values) => values,
        }),
      },
      picker: {
        create: (element) => {
          const input = document.createElement('input')
          input.type = 'search'
          element.append(input)
          return {
            element,
            selected: () => [],
            setSelected: vi.fn(),
            clear: vi.fn(),
            destroy: vi.fn(),
          }
        },
      },
      updates: {
        check: async () => ({ state: 'current', latestVersion: '0.12.0' }),
      },
      about: {
        register: vi.fn(),
        getRegistration: vi.fn(),
        mount: (element) => {
          const row = document.createElement('article')
          row.className = 'hc-shared-app-core-about__row'
          row.textContent = 'Core Playground Shared App Core'
          element.append(row)
          return { element, refresh: async () => ({ app: {}, core: {} }), destroy: vi.fn() }
        },
      },
      maps: {
        mount: (element) => {
          const compass = document.createElement('span')
          compass.className = 'hc-shared-app-core-map__compass'
          element.append(compass)
          return { getViewport: () => ({ center: { lat: 49.1, lon: 16.6 }, zoom: 8, rotationDeg: 0 }), on: vi.fn(), setRotation: vi.fn(), destroy: vi.fn() }
        },
        favorites: { list: vi.fn(), add: vi.fn(), update: vi.fn(), remove: vi.fn() },
        tileTemplate: () => '/apps/hc_shared_app_core/api/v1/maps/tile/osm/basic/256/{z}/{x}/{y}',
        tileUrl: vi.fn(),
        providers: { list: async () => [{ id: 'osm', name: 'OpenStreetMap', configured: true, enabled: true, mapsets: ['basic'] }] },
        diagnostics: { get: async () => ({ requests: 0, cacheHits: 0, cacheMisses: 0, externalRequests: 0, savedExternalRequests: 0, cacheBytes: 0, cacheLimitBytes: 536870912, cacheFreeBytes: 536870912, cacheUsagePercent: 0, cacheEntryCount: 0, cacheOldestStoredAt: null, cacheNewestStoredAt: null, tileCacheTtlSeconds: 31536000, browserCacheTtlSeconds: 604800, lastProviderError: '', canManage: true }) },
        cache: { clear: vi.fn(), openSettings: vi.fn() },
      },
      editor: { create: (host, options) => {
        editorOptions = options as Record<string, unknown>
        const element = document.createElement('div'); host.append(element)
        return { element, getValue: () => '', setValue: vi.fn(), focus: vi.fn(), insertText: vi.fn(), setReadOnly: vi.fn(), setPreview: vi.fn(), destroy: () => element.remove() }
      } },
      background: { create: () => ({ load: async () => ({ mode: 'none' }), save: async () => {}, destroy: vi.fn() }) },
      lists: { list: async () => [], create: async () => ({ id: 'list_1' }), update: async () => ({}), places: async () => [], addPlace: async () => ({}), share: async () => ({}), sharePlace: async () => ({}), sharedPlaces: async () => [] },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        app: 'hc_shared_app_core',
        version: '1.0.0',
        apiVersion: 1,
        nextcloud: { min: 35, max: 35 },
        contract: 'hc-shared-app-core-v1',
      }),
    }))
  })

  it('renders the dashboard and runs checks', async () => {
    const wrapper = mount(App, {
      props: {
        playgroundVersion: '1.0.0',
        requiredCoreVersion: '1.0.0',
        coreStatusUrl: '/status',
        coreSettingsUrl: '/settings',
        coreShareesUrl: '/sharees',
        coreReleaseUrl: '/release',
      },
    })
    await vi.waitFor(() => expect(wrapper.text()).toContain('16 z 16 testů úspěšných'))
    expect(wrapper.text()).toContain('Kontroly API prošly')
    expect(editorOptions).toMatchObject({ embedImages: true, showPreview: true, splitView: true })
    expect(editorOptions?.translate).toBeTypeOf('function')
    expect(editorOptions?.value).toContain('- [ ] Nesplněný úkol')
  })
})
