'use client'

type Props = {
  value: string
  onChange: (valor: string) => void
  placeholder: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
}

// Filtra mientras se escribe. La tecla "Buscar" del teclado lo cierra para dejar ver los resultados.
export default function CampoBusqueda({ value, onChange, placeholder, inputMode = 'search' }: Props) {
  return (
    <div className="relative mb-3">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-libre-texto pointer-events-none">🔍</span>
      <input
        type="search"
        inputMode={inputMode}
        enterKeyHint="search"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          e.currentTarget.blur()
        }}
        className="w-full border border-borde rounded-xl pl-10 pr-11 py-3 text-base bg-superficie focus:outline-none focus:border-rayo text-zeus transition-colors [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-xl text-libre-texto hover:bg-fondo"
        >
          ×
        </button>
      )}
    </div>
  )
}
