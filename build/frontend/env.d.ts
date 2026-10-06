/// <reference types="vite/client" />

interface CoreEventBus {
  on(event: string, handler: (payload: unknown) => void): () => void
  emit(event: string, payload: unknown): void
}

interface CoreConfig {
  get<T>(key: string, fallback: T): T
  set(key: string, value: string | number | boolean | null): void
}

interface CoreLogger {
  info(message: string, context?: unknown): void
}

interface WorkspaceMetrics {
  width: number
  height: number
  viewportHeight: number
  mode: 'mobile' | 'tablet' | 'desktop'
  compact: boolean
}

interface WorkspaceController {
  refresh(): WorkspaceMetrics
  destroy(): void
}

interface LayoutMetrics extends WorkspaceMetrics {
  availableHeight: number
  reason: 'initial' | 'container' | 'viewport' | 'orientation' | 'manual'
}

interface LayoutController {
  element: HTMLElement
  refresh(reason?: LayoutMetrics['reason']): LayoutMetrics
  onResize(listener: (metrics: LayoutMetrics) => void): () => void
  destroy(): void
}

interface DialogController {
  element: HTMLElement
  closed: Promise<string>
  close(reason?: 'action' | 'backdrop' | 'escape' | 'close' | 'programmatic'): void
}

interface DialogAction {
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
  close?: boolean
  onClick?: (dialog: DialogController) => void | Promise<void>
}

interface NotificationController {
  id: string
  element: HTMLElement
  closed: Promise<string>
  dismiss(): void
}

interface NotificationOptions {
  title?: string
  duration?: number
  persistent?: boolean
  dedupeKey?: string
  cooldownMs?: number
  action?: { label: string; onClick: () => void | Promise<void> }
}

interface ToolbarAction {
  id: string
  label: string
  icon?: string
  title?: string
  variant?: 'default' | 'primary' | 'danger'
  disabled?: boolean
  hidden?: boolean
  compact?: boolean
  onClick: () => void | Promise<void>
}

interface ToolbarController {
  element: HTMLElement
  update(actions: ToolbarAction[]): void
  setDisabled(id: string, disabled: boolean): void
  destroy(): void
}

interface FormController {
  element: HTMLFormElement
  values(): Record<string, string | number | boolean>
  setValues(values: Record<string, string | number | boolean>): void
  validate(): boolean
  destroy(): void
}

interface PickerItem {
  id: string
  label: string
  type: 'user' | 'group'
}

interface PickerController {
  element: HTMLElement
  selected(): PickerItem[]
  setSelected(items: PickerItem[]): void
  clear(): void
  destroy(): void
}

interface AboutController {
  element: HTMLElement
  refresh(): Promise<{ app: Record<string, unknown>; core: Record<string, unknown> }>
  destroy(): void
}

interface MapPoint { lat: number; lon: number }
interface MapViewport { center: MapPoint; zoom: number; rotationDeg: number; [key: string]: unknown }
interface MapDriver {
  getCenter(): MapPoint
  getZoom(): number
  getBounds(): { north: number; south: number; east: number; west: number }
  setView(center: MapPoint, zoom?: number): void
  zoomIn(): void
  zoomOut(): void
  invalidateSize(): void
  on(event: string, listener: () => void): void
  off(event: string, listener: () => void): void
}
interface MapController {
  getViewport(): MapViewport
  on(event: string, listener: (payload: unknown) => void): () => void
  setRotation(degrees: number): void
  destroy(): Promise<void>
}

interface Window {
  HcSharedAppCore?: {
    version: string
    apiVersion: number
    events: CoreEventBus
    config: CoreConfig
    logger: CoreLogger
    workspace: {
      resolveMode(width: number): WorkspaceMetrics['mode']
      measure(element: HTMLElement): WorkspaceMetrics
      observe(
        element: HTMLElement,
        onChange?: (metrics: WorkspaceMetrics) => void,
      ): WorkspaceController
    }
    layout: {
      classes: Readonly<Record<string, string>>
      resolveMode(width: number): WorkspaceMetrics['mode']
      observe(element: HTMLElement, options?: {
        topOffset?: number
        onResize?: (metrics: LayoutMetrics) => void
      }): LayoutController
      createAppLayout(element: HTMLElement, options?: Record<string, unknown>): LayoutController
      createView(content?: Node | string): HTMLElement
      createPanel(content?: Node | string): HTMLElement
      createScrollArea(content?: Node | string): HTMLElement
      createSplitView(primary: Node, secondary: Node, options?: Record<string, unknown>): HTMLElement
      createSurface(content?: Node | string): HTMLElement
    }
    dialogs: {
      open(options: {
        title: string
        content: string | Node
        actions?: DialogAction[]
        size?: 'small' | 'medium' | 'large'
        closeLabel?: string
        closeOnBackdrop?: boolean
        closeOnEscape?: boolean
        onClose?: (reason: string) => void
      }): DialogController
      confirm(options: {
        title: string
        message: string
        confirmLabel?: string
        cancelLabel?: string
        danger?: boolean
      }): Promise<boolean>
      closeAll(): void
    }
    notifications: {
      show(options: NotificationOptions & {
        type?: 'success' | 'info' | 'warning' | 'error'
        message: string
      }): NotificationController
      success(message: string, options?: NotificationOptions): NotificationController
      info(message: string, options?: NotificationOptions): NotificationController
      warning(message: string, options?: NotificationOptions): NotificationController
      error(message: string, options?: NotificationOptions): NotificationController
      clear(): void
    }
    toolbar: {
      create(element: HTMLElement, options: {
        ariaLabel?: string
        actions: ToolbarAction[]
      }): ToolbarController
    }
    forms: {
      create(fields: Array<Record<string, unknown>>): FormController
    }
    settings: {
      create(endpoint: string, namespace: string): {
        load(): Promise<Readonly<Record<string, string | number | boolean | null>>>
        save(values: Readonly<Record<string, string | number | boolean | null>>): Promise<Readonly<Record<string, string | number | boolean | null>>>
      }
    }
    picker: {
      create(element: HTMLElement, options: {
        endpoint: string
        types?: Array<'user' | 'group'>
        multiple?: boolean
        placeholder?: string
        selected?: PickerItem[]
        onChange?: (selected: PickerItem[]) => void
      }): PickerController
    }
    updates: {
      check(options?: {
        id: string
        name: string
        version: string
        repository: string
        endpoint?: string
      }): Promise<Record<string, unknown>>
    }
    about: {
      register(options: {
        id: string
        name: string
        version: string
        repository: string
        releaseNotes?: string
        documentation?: string
        core?: string
      }): Readonly<Record<string, unknown>>
      getRegistration(): Readonly<Record<string, unknown>> | null
      mount(element: HTMLElement, options?: {
        app?: { id: string; name: string; version: string; repository: string }
        requiredCoreVersion?: string
        coreRepository?: string
        endpoint?: string
        heading?: string
        checkUpdates?: boolean
      }): AboutController
    }
    maps: {
      mount(element: HTMLElement, options: {
        driver: MapDriver
        home?: MapPoint
        controls?: { zoom?: boolean; home?: boolean; gps?: boolean; compass?: boolean }
        compassOverlay?: boolean | { mode?: 'off' | 'rose' | 'dial' | 'minimal'; opacity?: number }
      }): MapController
      favorites: {
        list(): Promise<ReadonlyArray<Record<string, unknown>>>
        add(value: Record<string, unknown>): Promise<Record<string, unknown>>
        update(id: string, changes: Record<string, unknown>): Promise<Record<string, unknown>>
        remove(id: string): Promise<void>
      }
      tileTemplate(provider: string, mapset?: string, tileSize?: number): string
      tileUrl(provider: string, mapset: string, tileSize: number, z: number, x: number, y: number): string
      providers: { list(): Promise<Array<{ id: string; name: string; configured: boolean; enabled: boolean; mapsets: string[] }>> }
      diagnostics: { get(): Promise<{ requests: number; cacheHits: number; cacheMisses: number; externalRequests: number; savedExternalRequests: number; cacheBytes: number; cacheLimitBytes: number; cacheFreeBytes: number; cacheUsagePercent: number; cacheEntryCount: number; cacheOldestStoredAt: string | null; cacheNewestStoredAt: string | null; tileCacheTtlSeconds: number; browserCacheTtlSeconds: number; lastProviderError: string; canManage: boolean }> }
      cache: {
        clear(options?: { mode?: 'expired' | 'provider' | 'all'; provider?: string; confirm?: boolean }): Promise<Record<string, unknown>>
        openSettings(): { close(reason?: string): void; closed: Promise<string> }
      }
    }
    editor: { create(host: HTMLElement, options?: { value?: string; label?: string; onChange?: (value: string) => void; onError?: (message: string) => void; uploadImage?: (file: File) => Promise<string>; embedImages?: boolean; showPreview?: boolean; splitView?: boolean; resolveImageUrl?: (url: string) => string; translate?: (label: string) => string }): { element: HTMLElement; getValue(): string; setValue(value: string): void; focus(): void; insertText(value: string): void; setReadOnly(value: boolean): void; setPreview(visible: boolean): void; destroy(): void } }
    background: { create(host: HTMLElement, endpoint: string, namespace: string): {
      load(): Promise<{ mode: 'none' | 'solid' | 'gradient' | 'image' }>
      save(choice: { mode: 'none' } | { mode: 'solid' | 'gradient'; color: string } | { mode: 'image'; url: string }): Promise<void>
      destroy(): void
    } }
    lists: {
      list(namespace: string): Promise<Array<{ id: string; title: string; permission: string; archived: boolean; position: number; parent_id: string | null }>>
      create(namespace: string, title: string, position?: number, parentId?: string | null, icon?: string): Promise<{ id: string }>
      update(namespace: string, id: string, changes: { archived?: boolean; position?: number; title?: string; parent_id?: string | null }): Promise<unknown>
      places(namespace: string, id: string): Promise<Array<{ id: string; name: string; lat: number; lon: number; position: number }>>
      addPlace(namespace: string, id: string, place: { name: string; lat: number; lon: number; note: string; color: string; position: number }): Promise<unknown>
      share(namespace: string, id: string, type: 'user' | 'group', target: string, permission: 'read' | 'edit'): Promise<unknown>
      sharePlace(namespace: string, id: string, placeId: string, type: 'user' | 'group', target: string, permission: 'read' | 'edit'): Promise<unknown>
      sharedPlaces(namespace: string): Promise<Array<{ id: string; list_id: string; name: string; permission: 'read' | 'edit' }>>
    }
    assertCompatible(minimumVersion: string): void
  }
}
