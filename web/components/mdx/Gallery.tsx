import { GalleryScope } from './gallery-context'
import styles from './gallery.module.css'

/**
 * CSS Grid wrapper for a group of images. Ports layouts/shortcodes/gallery.html.
 *
 * Stays a server component: `children` are rendered by the server and slotted into the
 * client scope, so nothing about the images themselves moves to the client.
 *
 * `data-gallery-root` is the click-time scoping hook — ImageModal walks up to the nearest
 * one to decide which images the modal can navigate between. It is a data attribute rather
 * than the CSS class because the class name is now module-hashed, and behaviour should not
 * break the next time the styles are refactored.
 */
export function Gallery({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.photoGallery} data-gallery-root="">
      <GalleryScope>{children}</GalleryScope>
    </div>
  )
}
