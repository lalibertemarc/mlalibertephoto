'use client'

import { useState } from 'react'
import { ContentImage } from './ContentImage'
import styles from './before-after.module.css'

/**
 * A drag-to-reveal restoration comparison. Ports layouts/shortcodes/before-after.html.
 *
 * The source re-emitted its entire <style> and <script> on every invocation, so the
 * restoration page shipped four copies of both and bound four duplicate sets of listeners.
 * Here the styles live in a module and the behaviour is component state, so both exist once
 * regardless of how many comparisons a page renders.
 */
export interface BeforeAfterProps {
  before: string
  after: string
  altBefore?: string
  altAfter?: string
  captionBefore?: string
  captionAfter?: string
  mainCaption?: string
  /** A CSS length ("600px"), defaulting to full width as in the source. */
  width?: string
}

/** The Hugo template's own defaults, which are French regardless of page language. */
const DEFAULT_ALT_BEFORE = 'Avant restauration'
const DEFAULT_ALT_AFTER = 'Après restauration'

/** Below this the "before" caption is clipped away; above 100 minus this, the "after" one. */
const CAPTION_EDGE = 10

export function BeforeAfter({
  before,
  after,
  altBefore = DEFAULT_ALT_BEFORE,
  altAfter = DEFAULT_ALT_AFTER,
  captionBefore,
  captionAfter,
  mainCaption,
  width = '100%',
}: BeforeAfterProps) {
  const [position, setPosition] = useState(50)

  const sizes = width.endsWith('px') ? `(max-width: ${width}) 100vw, ${width}` : '100vw'

  return (
    <div className={styles.reveal} style={{ width }}>
      <div className={styles.comparison}>
        <ContentImage src={after} alt={altAfter} sizes={sizes} />
        <ContentImage
          className={styles.before}
          src={before}
          alt={altBefore}
          sizes={sizes}
          style={{ clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)` }}
        />

        <input
          type="range"
          className={styles.slider}
          min={0}
          max={100}
          value={position}
          aria-label={`${altBefore} / ${altAfter}`}
          onChange={(event) => setPosition(Number(event.target.value))}
        />

        <div className={styles.handle} style={{ left: `${position}%` }}>
          <span className={styles.handleIcon}>↔</span>
        </div>

        {captionBefore && (
          <div
            className={`${styles.caption} ${styles.beforeCaption}`}
            style={{ opacity: position > CAPTION_EDGE ? 1 : 0 }}
          >
            {captionBefore}
          </div>
        )}
        {captionAfter && (
          <div
            className={`${styles.caption} ${styles.afterCaption}`}
            style={{ opacity: position < 100 - CAPTION_EDGE ? 1 : 0 }}
          >
            {captionAfter}
          </div>
        )}
      </div>

      {mainCaption && <p className={styles.mainCaption}>{mainCaption}</p>}
    </div>
  )
}
