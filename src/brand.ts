export type BrandConfig = {
  name: string
  product: string
  logoMark: string
  practiceType: string
  primary: string
  accent: string
}

export const defaultBrand: BrandConfig = {
  name: 'Aperture Dental',
  product: 'Revenue Operations',
  logoMark: 'AD',
  practiceType: 'Pediatric Dental Group',
  primary: '#315c75',
  accent: '#c9f45b',
}

export const BRAND_STORAGE_KEY = 'dental-rcm-brand'

export function loadBrand(): BrandConfig {
  try {
    const stored = localStorage.getItem(BRAND_STORAGE_KEY)
    return stored ? { ...defaultBrand, ...JSON.parse(stored) } : defaultBrand
  } catch {
    return defaultBrand
  }
}
