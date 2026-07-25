import {
  MalformedTagError,
  UnbalancedShortcodeError,
  UnknownShortcodeError,
} from './report.ts'

/**
 * Hugo shortcodes to MDX JSX.
 *
 * The shortcode universe is closed and verified: exactly six names occur across all 170
 * content files. Five map to components; `ref` is a Hugo builtin handled separately because
 * it is structurally different (a positional argument sitting inside markdown link syntax).
 *
 * Anything else raises. A shortcode passed through unrecognised would leave a literal
 * `{{<` in the output, which is a build error later and a much harder one to trace back
 * here than a failure at migration time.
 */

interface SelfClosingSpec {
  kind: 'self'
  component: string
  /** Source parameter name to JSX prop name. Identity unless the names genuinely differ. */
  props: Record<string, string>
}

interface PairedSpec {
  kind: 'paired'
  component: string
  props: Record<string, string>
}

type Spec = SelfClosingSpec | PairedSpec

/**
 * Prop names come from the Hugo templates in layouts/shortcodes/, not from guesswork.
 *
 * Note that `class` means two different things depending on the shortcode, which is why it
 * cannot be renamed uniformly: on image-modal it is a BEM modifier appended to
 * `enlargeable-image--`, so it becomes `variant`; on navbutton and fleximages it is a raw
 * class list concatenated into the element's class attribute, so it becomes `className`.
 *
 * Several params are supported by the templates but never used by any content
 * (`srcset`, `button-text`, `direction`, `captionBefore`, `captionAfter`, fleximages'
 * `class`/`style`). They are accepted anyway so that content authored before cutover does
 * not fail the migration.
 */
const REGISTRY: Record<string, Spec> = {
  'image-modal': {
    kind: 'self',
    component: 'ImageModal',
    props: {
      src: 'src',
      alt: 'alt',
      caption: 'caption',
      width: 'width',
      height: 'height',
      title: 'title',
      'button-url': 'buttonUrl',
      'button-text': 'buttonText',
      srcset: 'srcSet',
      class: 'variant',
    },
  },
  navbutton: {
    kind: 'self',
    component: 'NavButton',
    props: {
      url: 'url',
      text: 'text',
      direction: 'direction',
      class: 'className',
    },
  },
  'before-after': {
    kind: 'self',
    component: 'BeforeAfter',
    props: {
      before: 'before',
      after: 'after',
      altBefore: 'altBefore',
      altAfter: 'altAfter',
      mainCaption: 'mainCaption',
      captionBefore: 'captionBefore',
      captionAfter: 'captionAfter',
      width: 'width',
    },
  },
  gallery: { kind: 'paired', component: 'Gallery', props: {} },
  fleximages: {
    kind: 'paired',
    component: 'FlexImages',
    props: { class: 'className', style: 'style' },
  },
}

type Node =
  | { type: 'text'; value: string }
  | { type: 'call'; component: string; props: [string, string][] }
  | { type: 'block'; component: string; props: [string, string][]; children: Node[] }

/**
 * Matches both closing spellings the corpus uses: `{{< /name >}}` (92 occurrences) and
 * `{{</ name >}}` (8). The optional slash is captured after leading whitespace is consumed,
 * so both reduce to one token shape and nothing downstream needs to know there were two.
 *
 * The lazy body is safe because no parameter value ever contains a literal `>` or `"`
 * (verified across all 2,290 parameter values), so the first `>}}` always terminates the
 * tag it belongs to. Multi-line calls fall out for free since the body may span newlines.
 */
const TAG = /\{\{<\s*(\/?)\s*([\s\S]*?)>\}\}/g

const NAMED_PARAM = /([A-Za-z_][-A-Za-z0-9_]*)\s*=\s*"([^"]*)"/g

interface RawTag {
  closing: boolean
  name: string
  params: [string, string][]
}

function readTag(closing: string, body: string, file: string): RawTag {
  const trimmed = body.trim()
  const nameMatch = /^([A-Za-z_][-A-Za-z0-9_]*)/.exec(trimmed)
  if (!nameMatch || nameMatch[1] === undefined) {
    throw new MalformedTagError(`Cannot read shortcode name from {{< ${trimmed} >}}`, file)
  }
  const name = nameMatch[1]
  const rest = trimmed.slice(name.length)

  const params: [string, string][] = []
  for (const match of rest.matchAll(NAMED_PARAM)) {
    if (match[1] === undefined || match[2] === undefined) continue
    params.push([match[1], match[2]])
  }
  return { closing: closing === '/', name, params }
}

/** `prop={"value"}` rather than `prop="value"`. */
function renderProps(props: [string, string][]): string {
  // A JSX string attribute decodes HTML entities; a JSX expression does not. Values here
  // contain bare ampersands in query strings and no entities at all, so the expression form
  // preserves them exactly while the attribute form risks a silent rewrite.
  return props.map(([name, value]) => ` ${name}={${JSON.stringify(value)}}`).join('')
}

function render(nodes: Node[], indent = ''): string {
  return nodes
    .map((node) => {
      if (node.type === 'text') return node.value
      if (node.type === 'call') return `<${node.component}${renderProps(node.props)} />`
      const inner = render(node.children, indent)
      return `<${node.component}${renderProps(node.props)}>${inner}</${node.component}>`
    })
    .join('')
}

function mapProps(spec: Spec, raw: [string, string][], name: string, file: string): [string, string][] {
  return raw.map(([key, value]) => {
    const prop = spec.props[key]
    if (prop === undefined) {
      throw new MalformedTagError(`Shortcode "${name}" has no parameter "${key}"`, file)
    }
    return [prop, value] as [string, string]
  })
}

/**
 * Builds the node tree with an explicit stack.
 *
 * A stack is required rather than a convenience: `butterbuttbutler.md` opens `fleximages`
 * at line 23 and again at line 59 before closing either, then closes twice. Pairing each
 * open with the textually nearest close would match the outer open to the inner close and
 * silently produce wrongly nested output. Last-opened-first-closed is the only pairing that
 * survives a repeated name.
 */
export function transformShortcodes(
  body: string,
  ctx: { file: string },
): string {
  const root: Node[] = []
  const stack: { component: string; props: [string, string][]; children: Node[]; name: string }[] = []
  const target = (): Node[] => {
    const top = stack[stack.length - 1]
    return top ? top.children : root
  }

  let cursor = 0
  for (const match of body.matchAll(TAG)) {
    const index = match.index
    if (match[1] === undefined || match[2] === undefined) continue

    if (index > cursor) {
      target().push({ type: 'text', value: body.slice(cursor, index) })
    }
    cursor = index + match[0].length

    const tag = readTag(match[1], match[2], ctx.file)
    const spec = REGISTRY[tag.name]
    if (!spec) {
      throw new UnknownShortcodeError(
        `Unrecognised shortcode "${tag.name}" — it would be emitted as a literal {{< into MDX`,
        ctx.file,
      )
    }

    if (tag.closing) {
      const top = stack.pop()
      if (!top) {
        throw new UnbalancedShortcodeError(`Closing "${tag.name}" with nothing open`, ctx.file)
      }
      if (top.name !== tag.name) {
        throw new UnbalancedShortcodeError(
          `Closing "${tag.name}" but "${top.name}" is open`,
          ctx.file,
        )
      }
      target().push({
        type: 'block',
        component: top.component,
        props: top.props,
        children: top.children,
      })
      continue
    }

    const props = mapProps(spec, tag.params, tag.name, ctx.file)

    if (spec.kind === 'self') {
      target().push({ type: 'call', component: spec.component, props })
      continue
    }
    stack.push({ component: spec.component, props, children: [], name: tag.name })
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1]
    throw new UnbalancedShortcodeError(`Unclosed shortcode "${unclosed?.name}"`, ctx.file)
  }

  if (cursor < body.length) {
    root.push({ type: 'text', value: body.slice(cursor) })
  }

  return render(root)
}

/**
 * `{{< ref "photos/portraits.md" >}}` only ever appears inside markdown link syntax, so it
 * is resolved by substitution before tokenising rather than modelled as a node. It takes a
 * positional argument, never nests, and produces a URL rather than an element, so giving it
 * a place in the tree would force every consumer to handle a case that cannot occur.
 */
export function resolveRefLinks(
  body: string,
  resolve: (target: string) => string | undefined,
  file: string,
): string {
  return body.replace(
    /\{\{<\s*ref\s+"([^"]+)"\s*>\}\}/g,
    (_whole, target: string) => {
      const url = resolve(target)
      if (url === undefined) {
        throw new MalformedTagError(`Cannot resolve {{< ref "${target}" >}}`, file)
      }
      return url
    },
  )
}
