'use client'

import { useEffect, useRef, useState } from 'react'
import { formatCelularParcial } from '@/lib/formato'
import {
  PAISES, celularGuardado, esLocalValido, interpretarCelular, paisDeCelular, type Pais,
} from '@/lib/validaciones'

// Contact Picker API: solo existe en Chrome Android (no en Safari/iOS)
type ContactoElegido = { name?: string[]; tel?: string[] }
type SelectorContactos = {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<ContactoElegido[]>
}

export const inputBase =
  'w-full border-2 rounded-xl px-4 py-3 text-base text-zeus bg-fondo focus:outline-none transition-colors'

export function mensajeErrorCelular(pais: Pais, local: string, tocado: boolean): string | null {
  if (pais === 'CO' && local.length > 0 && !local.startsWith('3')) return 'El celular debe empezar por 3'
  if (pais === 'US' && /^[01]/.test(local)) return 'El código de área no puede empezar por 0 ni 1'
  if (!tocado || esLocalValido(pais, local)) return null
  if (local.length === 0) return 'Escribe el celular'
  const faltan = 10 - local.length
  return `Faltan ${faltan} ${faltan === 1 ? 'dígito' : 'dígitos'}`
}

// Al enfocar un campo, se espera a que el teclado termine de abrir y se lleva el campo a la vista
export function alEnfocar(e: React.FocusEvent<HTMLElement>) {
  const campo = e.currentTarget
  setTimeout(() => campo.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 300)
}

type Props = {
  idPrefijo: string
  nombre: string
  setNombre: (v: string) => void
  celular: string                 // como se guarda: CO 10 dígitos, EE. UU. "1" + 10 dígitos
  setCelular: (v: string) => void
  celularTocado: boolean
  setCelularTocado: (v: boolean) => void
  notas: string
  setNotas: (v: string) => void
  nombreRef: React.RefObject<HTMLInputElement | null>
  celularRef: React.RefObject<HTMLInputElement | null>
  enfocarNombre?: boolean
  onEnviar: () => void            // "Listo" en el teclado desde el último campo
}

export default function CamposComprador({
  idPrefijo,
  nombre, setNombre,
  celular, setCelular,
  celularTocado, setCelularTocado,
  notas, setNotas,
  nombreRef, celularRef,
  enfocarNombre = false,
  onEnviar,
}: Props) {
  const notasRef = useRef<HTMLInputElement>(null)
  const [hayContactos, setHayContactos] = useState(false)
  const [puedePegar, setPuedePegar]     = useState(false)
  const [pais, setPais] = useState<Pais>(() => paisDeCelular(celular))

  // En EE. UU. el valor guardado lleva el 1 adelante; el campo solo muestra los 10 dígitos locales
  const local         = pais === 'US' && celular.startsWith('1') ? celular.slice(1) : celular
  const celularValido = esLocalValido(pais, local)
  const errorCelular  = mensajeErrorCelular(pais, local, celularTocado)

  function aplicarCelular(valor: string, paisBase: Pais = pais) {
    const r = interpretarCelular(valor, paisBase)
    setPais(r.pais)
    setCelular(celularGuardado(r.pais, r.local))
    return r
  }

  function cambiarPais(nuevo: Pais) {
    setPais(nuevo)
    setCelular(celularGuardado(nuevo, local))
    celularRef.current?.focus()
  }

  useEffect(() => {
    setHayContactos('contacts' in navigator && 'ContactsManager' in window)
    setPuedePegar(typeof navigator.clipboard?.readText === 'function')
  }, [])

  // "Siguiente" en el teclado pasa al próximo campo en vez de enviar el formulario
  function pasarA(siguiente: React.RefObject<HTMLInputElement | null>) {
    return (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      siguiente.current?.focus()
    }
  }

  async function elegirContacto() {
    const contactos = (navigator as Navigator & { contacts?: SelectorContactos }).contacts
    if (!contactos) return
    try {
      const [contacto] = await contactos.select(['name', 'tel'], { multiple: false })
      if (!contacto) return
      const nombreContacto = contacto.name?.[0]?.trim()
      if (nombreContacto) setNombre(nombreContacto)
      // Se prefiere el primer número que sea un celular válido (Colombia o EE. UU.)
      const tels = (contacto.tel ?? []).map((t) => interpretarCelular(t, pais))
      const tel  = tels.find((t) => esLocalValido(t.pais, t.local)) ?? tels[0]
      if (tel) {
        setPais(tel.pais)
        setCelular(celularGuardado(tel.pais, tel.local))
        setCelularTocado(true)
      }
      notasRef.current?.focus()
    } catch {
      // el usuario cerró la agenda sin elegir
    }
  }

  // Plan B donde no hay agenda (iPhone): pegar el número copiado de WhatsApp o Contactos
  async function pegarCelular() {
    try {
      const texto = await navigator.clipboard.readText()
      if (!texto.replace(/\D/g, '')) return
      aplicarCelular(texto)
      setCelularTocado(true)
      celularRef.current?.focus()
    } catch {
      // el usuario no dio permiso para leer el portapapeles
    }
  }

  const botonCelular = hayContactos
    ? { etiqueta: 'Elegir de mis contactos', icono: '+', accion: elegirContacto }
    : puedePegar
      ? { etiqueta: 'Pegar número copiado', icono: '📋', accion: pegarCelular }
      : null

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-zeus mb-1" htmlFor={`${idPrefijo}-nombre`}>
          Nombre <span className="text-peligro">*</span>
        </label>
        <input
          ref={nombreRef}
          id={`${idPrefijo}-nombre`}
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={pasarA(celularRef)}
          onFocus={alEnfocar}
          autoFocus={enfocarNombre}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="next"
          className={`${inputBase} border-borde focus:border-rayo`}
          placeholder="Nombre completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zeus mb-1" htmlFor={`${idPrefijo}-celular`}>
          Celular <span className="text-peligro">*</span>
        </label>
        <div className="flex gap-2">
        <div className="relative shrink-0">
          <select
            value={pais}
            onChange={(e) => cambiarPais(e.target.value as Pais)}
            aria-label="Indicativo del país"
            className="appearance-none h-full border-2 border-borde rounded-xl pl-3 pr-7 text-base text-zeus bg-fondo focus:outline-none focus:border-rayo tabular-nums"
          >
            {(Object.keys(PAISES) as Pais[]).map((p) => (
              <option key={p} value={p}>{PAISES[p].bandera} +{PAISES[p].indicativo}</option>
            ))}
          </select>
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-libre-texto pointer-events-none">▾</span>
        </div>
        <div className="relative flex-1 min-w-0">
          <input
            ref={celularRef}
            id={`${idPrefijo}-celular`}
            type="tel"
            inputMode="numeric"
            value={formatCelularParcial(local)}
            onChange={(e) => aplicarCelular(e.target.value)}
            onBlur={() => celular && setCelularTocado(true)}
            onKeyDown={pasarA(notasRef)}
            onFocus={alEnfocar}
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={Boolean(errorCelular)}
            aria-describedby={errorCelular ? `${idPrefijo}-celular-error` : undefined}
            className={`${inputBase} ${botonCelular ? 'pr-24' : 'pr-11'} tabular-nums tracking-wide ${
              errorCelular
                ? 'border-peligro focus:border-peligro'
                : celularValido
                  ? 'border-pagada focus:border-pagada'
                  : 'border-borde focus:border-rayo'
            }`}
            placeholder={PAISES[pais].ejemplo}
          />
          {celularValido && (
            <span className={`absolute ${botonCelular ? 'right-14' : 'right-3'} top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-pagada text-white text-sm flex items-center justify-center pointer-events-none`}>
              ✓
            </span>
          )}
          {botonCelular && (
            <button
              type="button"
              onClick={botonCelular.accion}
              aria-label={botonCelular.etiqueta}
              title={botonCelular.etiqueta}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-rayo text-zeus text-2xl font-bold leading-none flex items-center justify-center active:scale-95 transition-transform"
            >
              {botonCelular.icono}
            </button>
          )}
        </div>
        </div>
        {botonCelular && !errorCelular && !celular && (
          <p className="text-xs text-libre-texto mt-1">
            {hayContactos ? 'Toca + para elegirlo de tus contactos' : 'Copia el número en WhatsApp y toca 📋 para pegarlo'}
          </p>
        )}
        {errorCelular && (
          <p id={`${idPrefijo}-celular-error`} className="text-sm text-peligro mt-1">{errorCelular}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-zeus mb-1" htmlFor={`${idPrefijo}-notas`}>
          Notas{' '}
          <span className="text-libre-texto font-normal">(opcional)</span>
        </label>
        <input
          ref={notasRef}
          id={`${idPrefijo}-notas`}
          type="text"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            onEnviar()
          }}
          onFocus={alEnfocar}
          autoComplete="off"
          enterKeyHint="done"
          className={`${inputBase} border-borde focus:border-rayo`}
          placeholder="Observaciones..."
        />
      </div>
    </>
  )
}
