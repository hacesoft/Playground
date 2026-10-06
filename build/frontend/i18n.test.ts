// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { language, t, supportedLanguages } from './i18n'
import { editorSample } from './editorSample'
import catalogs from './translations.json'
import ConcurrencyDemo from './ConcurrencyDemo.vue'
const ocWindow = window as unknown as { OC?: { getLanguage(): string } }
afterEach(() => { document.documentElement.lang = 'cs'; delete ocWindow.OC })
describe('Nextcloud language integration', () => {
  it.each(supportedLanguages)('renders controls and the editor sample in %s', locale => {
    document.documentElement.lang = locale
    expect(language()).toBe(locale)
    const wrapper = mount(ConcurrencyDemo)
    expect(wrapper.find('h2').text()).toBe(catalogs[locale]['Concurrent changes · revisions and conflicts'])
    expect(wrapper.findAll('button').at(-1)?.text()).toBe(catalogs[locale]['Reset test'])
    const sample = editorSample()
    expect(sample).toContain('# '+t('Editor test'))
    expect(sample).toContain('- [ ] '+t('Incomplete task'))
    expect(sample).toContain('```js')
    expect(sample).toContain('../media/...')
    wrapper.unmount()
  })
  it('uses Nextcloud language ahead of HTML and resolves regional variants', () => {
    document.documentElement.lang = 'cs'
    ocWindow.OC = { getLanguage: () => 'pt_BR' }
    expect(language()).toBe('pt')
    expect(t('Save')).toBe('Guardar')
    delete ocWindow.OC
    document.documentElement.lang = 'de-DE'
    expect(t('Save')).toBe('Speichern')
    document.documentElement.lang = 'ja'
    expect(language()).toBe('en')
    expect(t('Save')).toBe('Save')
  })
  it('falls back to English for a single missing translation', () => {
    document.documentElement.lang = 'de'
    const table = catalogs.de as Record<string, string>
    const previous = table['Editor instructions']
    delete table['Editor instructions']
    try { expect(t('Editor instructions')).toBe(catalogs.en['Editor instructions']) }
    finally { table['Editor instructions'] = previous! }
  })
  it('requires complete catalogs for every supported language', () => {
    const keys = Object.keys(catalogs.en).sort()
    for (const locale of supportedLanguages) {
      expect(Object.keys(catalogs[locale]).sort(), locale).toEqual(keys)
      expect(Object.values(catalogs[locale]).every(value => value.trim().length > 0), locale).toBe(true)
    }
  })
})
