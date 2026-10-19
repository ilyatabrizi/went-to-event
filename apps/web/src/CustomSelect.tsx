import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

export type SelectOption = { value: string; label: string }

export function CustomSelect({ value, options, onChange, ariaLabel, className = '' }: {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(Math.max(0, options.findIndex((option) => option.value === value)))
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [])

  function choose(option: SelectOption) {
    onChange(option.value)
    setHighlighted(options.findIndex((item) => item.value === option.value))
    setOpen(false)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setHighlighted((current) => (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) choose(options[highlighted] ?? selected)
      else setOpen(true)
    }
  }

  return (
    <div ref={rootRef} className={`custom-select ${open ? 'custom-select-open' : ''} ${className}`}>
      <button type="button" className="custom-select-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => { setOpen((current) => !current); setHighlighted(Math.max(0, options.findIndex((option) => option.value === value))) }} onKeyDown={onKeyDown}>
        <span>{selected?.label ?? ''}</span><span className="custom-select-chevron" aria-hidden="true">⌄</span>
      </button>
      {open && <div id={listId} className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
        {options.map((option, index) => <button type="button" role="option" aria-selected={option.value === value} className={`custom-select-option ${option.value === value ? 'custom-select-option-selected' : ''} ${index === highlighted ? 'custom-select-option-highlighted' : ''}`} key={option.value} onMouseEnter={() => setHighlighted(index)} onClick={() => choose(option)}>
          <span>{option.label}</span>{option.value === value && <span aria-hidden="true">✓</span>}
        </button>)}
      </div>}
    </div>
  )
}
