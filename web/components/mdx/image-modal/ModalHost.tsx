'use client'

import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { ContentImage } from '../ContentImage'
import { modalStore } from './store'
import styles from './modal.module.css'

/** Horizontal travel, in px, before a touch counts as a swipe rather than a tap. */
const SWIPE_THRESHOLD = 50

/** Must match the opacity transition in modal.module.css. */
const CLOSE_TRANSITION_MS = 300

/**
 * The single modal instance for the page, portalled to document.body.
 *
 * Exactly one ImageModal renders this (see use-modal-host.ts), which reproduces Hugo's
 * once-per-page `#imageModal` element without needing a provider in the page layout.
 */
export function ModalHost() {
  const t = useTranslations('ImageModal')
  const state = useSyncExternalStore(
    modalStore.subscribe,
    modalStore.getSnapshot,
    modalStore.getServerSnapshot,
  )

  const touchStartX = useRef(0)

  /**
   * Hold `opening` for one painted frame before flipping to `open`.
   *
   * `opening` and `open` differ only in opacity, so applying both within a single commit
   * lets the browser collapse them into one style recalculation and the transition never
   * runs. This is the same failure the source guarded against by reading `offsetHeight`;
   * two nested rAFs guarantee the start value is painted first.
   */
  useLayoutEffect(() => {
    if (state.phase !== 'opening') return
    let inner = 0
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => modalStore.finishOpen())
    })
    return () => {
      cancelAnimationFrame(outer)
      if (inner) cancelAnimationFrame(inner)
    }
  }, [state.phase])

  /**
   * Backstop for the close transition.
   *
   * `transitionend` is the primary signal but it is not guaranteed to arrive: the browser
   * skips it when the tab is backgrounded mid-transition, when the transition is
   * interrupted, and when `prefers-reduced-motion` removes the transition altogether.
   * Without this the modal sticks in `closing` — visually gone, since that phase already
   * renders as hidden, but still exposed to assistive technology and still holding the
   * image list. Observed in practice, not theoretical.
   */
  useLayoutEffect(() => {
    if (state.phase !== 'closing') return
    const timer = setTimeout(() => modalStore.finishClose(), CLOSE_TRANSITION_MS + 50)
    return () => clearTimeout(timer)
  }, [state.phase])

  // Gated on `open` rather than "not closed", matching the source's
  // `if (!modal.classList.contains('active')) return`.
  useLayoutEffect(() => {
    if (state.phase !== 'open') return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') modalStore.close()
      else if (event.key === 'ArrowLeft') modalStore.navigate(-1)
      else if (event.key === 'ArrowRight') modalStore.navigate(1)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [state.phase])

  const current = state.images[state.index]
  const hasNav = state.images.length > 1

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.changedTouches[0]?.screenX ?? 0
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const endX = event.changedTouches[0]?.screenX ?? 0
    const travelled = touchStartX.current - endX
    if (Math.abs(travelled) > SWIPE_THRESHOLD) modalStore.navigate(travelled > 0 ? 1 : -1)
  }

  /**
   * Backdrop click closes; clicks on the image or caption do not. The source achieved this
   * with stopPropagation listeners on each child, which the target/currentTarget check
   * covers without needing them.
   */
  function handleClick(event: React.MouseEvent) {
    if (event.target === event.currentTarget) modalStore.close()
  }

  /**
   * The image's transform transition bubbles and shares the backdrop's 0.3s duration, so
   * without this filter it could be mistaken for the backdrop's own fade completing.
   */
  function handleTransitionEnd(event: React.TransitionEvent) {
    if (event.target !== event.currentTarget) return
    if (state.phase === 'closing') modalStore.finishClose()
  }

  return createPortal(
    <div
      className={styles.modal}
      data-phase={state.phase}
      role="dialog"
      aria-modal="true"
      aria-label={t('enlargedView')}
      // Hidden from assistive technology whenever it is not fully open: `closing` already
      // renders as invisible, so exposing it there would announce a dialog nobody can see.
      aria-hidden={state.phase !== 'open'}
      onClick={handleClick}
      onTransitionEnd={handleTransitionEnd}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button type="button" className={styles.close} aria-label={t('close')} onClick={() => modalStore.close()}>
        &times;
      </button>

      {hasNav && (
        <button
          type="button"
          className={`${styles.nav} ${styles.prev}`}
          aria-label={t('previousImage')}
          onClick={(event) => {
            event.stopPropagation()
            modalStore.navigate(-1)
          }}
        >
          &#8249;
        </button>
      )}

      {hasNav && (
        <button
          type="button"
          className={`${styles.nav} ${styles.next}`}
          aria-label={t('nextImage')}
          onClick={(event) => {
            event.stopPropagation()
            modalStore.navigate(1)
          }}
        >
          &#8250;
        </button>
      )}

      {current && (
        <ContentImage
          className={styles.image}
          src={current.src}
          alt={current.alt}
          sizes="90vw"
          // The modal is opened by a deliberate click, so its image is never part of the
          // initial paint and must not compete with the page's own images for bandwidth.
          loading="lazy"
        />
      )}

      {current?.caption && (
        <div className={styles.caption} aria-live="polite">
          {current.caption}
        </div>
      )}

      {hasNav && (
        <div className={styles.counter} aria-live="polite">
          {state.index + 1} / {state.images.length}
        </div>
      )}
    </div>,
    // Straight into body, with no container element of its own: the host is only ever
    // elected on the client, so `document` is guaranteed to exist by the time this runs.
    document.body,
  )
}
