import catalogs from './translations.json'
export const supportedLanguages = ['cs', 'en', 'de', 'es', 'fr', 'it', 'nl', 'pl', 'pt', 'sk', 'uk'] as const
export type Language = typeof supportedLanguages[number]
export function language(): Language {
  const oc = (window as unknown as { OC?: { getLanguage?: () => string } }).OC
  const code = (oc?.getLanguage?.() || document.documentElement.lang || 'en').toLowerCase().split(/[-_]/)[0]
  return supportedLanguages.includes(code as Language) ? code as Language : 'en'
}
export function t(text: string): string {
  const table = catalogs[language()] as Record<string, string>
  return table[text] ?? (catalogs.en as Record<string, string>)[text] ?? text
}
