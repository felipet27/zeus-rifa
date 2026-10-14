export type Boleta = {
  numero: number
  estado: 'libre' | 'comprometida'
  pagada: boolean
  nombre: string | null
  celular: string | null
  notas: string | null
  responsable: string | null
  comprometida_en: string | null
  actualizado_por: string | null
  actualizado_en: string
}
