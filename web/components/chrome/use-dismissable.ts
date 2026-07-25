'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Close an open disclosure on an outside pointer press or Escape.
 *
 * Bootstrap's dropdown plugin gave this for free; it is the only behaviour of that plugin
 * the nav actually depended on beyond toggling.
 *
 * Listeners are attached only while `enabled`, so a page of closed dropdowns registers
 * nothing. `pointerdown` rather than `click` matches the plugin's felt behaviour — the menu
 * closes as the press begins, not on release.
 */
export function useDismissable(
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && !ref.current?.contains(target)) onDismiss()
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      onDismiss()
      // Escape implies the keyboard has focus somewhere inside; put it back on the control
      // that opened the menu rather than letting it fall to the top of the document.
      ref.current?.querySelector('button')?.focus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, onDismiss, enabled])
}
