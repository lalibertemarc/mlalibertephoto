'use client'

import { useCallback, useId, useSyncExternalStore } from 'react'
import { modalStore } from './store'

/**
 * Elects exactly one ImageModal on the page to render the shared modal.
 *
 * Hugo did this with a per-page Scratch flag, so that 246 image-modal calls emitted one
 * `#imageModal` element between them. Keeping the election inside ImageModal — rather than
 * mounting the modal from a page layout — means an ImageModal works wherever it is dropped,
 * which matters because the page-layout item has not been built yet.
 *
 * The claim runs inside `subscribe` rather than an effect that calls setState. Both elect
 * correctly, but a setState-in-effect schedules a second render pass for every ImageModal on
 * the page purely to answer "am I the host?", where subscribe re-renders only the one whose
 * answer actually changed.
 *
 * The contract is "exactly one", not "the first one": the image list is read from the DOM at
 * click time, so nothing depends on which instance hosts.
 */
let host: string | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

export function useIsModalHost(): boolean {
  const id = useId()

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      listeners.add(onStoreChange)
      if (host === null) {
        host = id
        // Module state outlives a client-side navigation between statically exported pages.
        // Without this, a modal left open on the previous page would render already-open
        // here, showing the previous page's image.
        modalStore.reset()
        emit()
      }
      return () => {
        listeners.delete(onStoreChange)
        if (host === id) {
          host = null
          emit()
        }
      }
    },
    [id],
  )

  return useSyncExternalStore(
    subscribe,
    () => host === id,
    // No host exists during the server render, so the modal is never in the exported HTML.
    () => false,
  )
}
