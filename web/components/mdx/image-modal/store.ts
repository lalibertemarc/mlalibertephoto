'use client'

/**
 * Modal state, held outside React.
 *
 * Any ImageModal on the page can open the modal, but they share no common React ancestor —
 * one may sit inside a Gallery, another inside FlexImages, a third loose in the body. A
 * context provider would therefore have to be mounted above all of them, i.e. in the page
 * layout, which belongs to a different work item. A module-level store is reachable from
 * anywhere with no provider at all, and it has exactly one subscriber (ModalHost), so
 * opening or navigating never re-renders the other images on the page.
 */

export interface ModalImage {
  src: string
  alt: string
  caption?: string
}

/**
 * `opening` and `closing` exist for sequencing, not appearance — both render the same CSS
 * as `closed`. `opening` holds for one painted frame so the transition has a start value
 * to move from, and `closing` keeps the current image mounted while it fades instead of
 * blanking it instantly.
 */
export type ModalPhase = 'closed' | 'opening' | 'open' | 'closing'

export interface ModalState {
  phase: ModalPhase
  images: ModalImage[]
  index: number
}

const CLOSED: ModalState = { phase: 'closed', images: [], index: 0 }

let state: ModalState = CLOSED
const listeners = new Set<() => void>()

function set(next: ModalState): void {
  state = next
  for (const listener of listeners) listener()
}

export const modalStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  getSnapshot(): ModalState {
    return state
  },

  /** The exported HTML always contains a closed modal; it can never be mid-transition. */
  getServerSnapshot(): ModalState {
    return CLOSED
  },

  open(images: ModalImage[], index: number): void {
    set({ phase: 'opening', images, index })
  },

  finishOpen(): void {
    if (state.phase !== 'opening') return
    set({ ...state, phase: 'open' })
  },

  close(): void {
    if (state.phase !== 'open' && state.phase !== 'opening') return
    set({ ...state, phase: 'closing' })
  },

  finishClose(): void {
    set(CLOSED)
  },

  /** Wrap-around in both directions, matching the Hugo modal's modulo arithmetic. */
  navigate(direction: 1 | -1): void {
    const count = state.images.length
    if (count <= 1) return
    set({ ...state, index: (state.index + direction + count) % count })
  },

  reset(): void {
    set(CLOSED)
  },
}
