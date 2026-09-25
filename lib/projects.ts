export interface Project {
  id: string
  kind: 'internal' | 'external'
  name: string
  business_name: string | null
  ruc: string | null
  active: boolean
}

// SUNAT RUC: 11 digits, valid prefix and modulo-11 check digit
export function isValidRuc(ruc: string): boolean {
  if (!/^(10|15|17|20)\d{9}$/.test(ruc)) return false
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, w, i) => acc + w * Number(ruc[i]), 0)
  const check = (11 - (sum % 11)) % 10
  return check === Number(ruc[10])
}

export const projectLabel = (p: Pick<Project, 'kind' | 'name' | 'ruc'>) =>
  p.kind === 'external' && p.ruc ? `${p.name} · RUC ${p.ruc}` : p.name
