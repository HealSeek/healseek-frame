# @healseek/components

Framework-level UI compositions live here; the shadcn-vue primitives remain
unchanged in `packages/ui-kit/shadcn-vue`.

## HlsWorkbench

`HlsWorkbench` composes the framework `VideoPlayer` with a playlist resolver,
seek timeline, two segment-snapping range handles, original-fragment inspector
and a 50-row paginated fragment list. Import from `@healseek/components` or
`@healseek/components/hls-workbench`. It has no application endpoint, persistence,
rule scope or business-specific authorization behavior.

```vue
<HlsWorkbench
  :manifest="{
    text: mediaPlaylist,
    url: originalMediaUrl,
    playbackUrl: authorizedOriginalUrl,
  }"
  :ranges="filters"
  :markers="insertions"
  :active="drawerOpen"
  @select-range="addFilter"
  @select-insertion="chooseInsertionTime"
  @fragment-change="inspectFragment"
  @retry="refreshPlaybackSource"
/>
```

`disabled` makes rule editing read-only while retaining playback and seeking;
`active=false` stops media, dragging and pending playlist requests. The application supplies the episode's **original**
media or master playlist. `url` resolves relative resource references; optional
`playbackUrl` is its playable unprocessed URL (e.g. an application-signed proxy).
Media playlists are parsed locally without a network request. A master playlist
automatically loads its first media variant and offers a quality selector.
Relative variant paths use the master URL, while segment/key/map paths use the
selected media playlist's final URL, including redirects. Nested masters are
followed up to five levels, with loop detection and a 30-second overall limit.
The default browser loader omits credentials and referrers; playlists and media
must permit CORS. No application request client or authentication headers are used.

Supply `loadManifest(url, { signal }): Promise<HlsManifestSource>` to load child
playlists through an application adapter. Respect the abort signal and return
the final playlist URL as `url`; return a leaf-specific `playbackUrl` if playback
requires a signed gateway. The initial master's `playbackUrl` is deliberately
not inherited by child variants, so automatic quality switching cannot make
the player diverge from the inspected timeline. A host may resolve authorized
media on its backend and supply the resulting playlist without fetching an
untrusted upstream URL directly in the browser.

`retry` forwards the inner player's retry request without arguments. A host
owning expiring playback URLs can use this event to refresh `manifest` with a
new authorized playback URL. The inner player also retries its current source;
it does not wait for an asynchronous host refresh. The component does not renew
credentials or request an application-specific playback session itself.

`player-error(VideoPlayerError)` forwards the inner player's complete error,
including initialization stage and original `cause`. The existing string `error`
event continues to report playlist resolution/parsing failures only.

The timeline places the start handle above the seek slider and the end handle
below it. Only the current selection on the middle track is highlighted; the
outer tracks remain neutral. Each track has its own pointer target, so seeking
and selecting stay aligned even when a host gives the tracks different widths.
Dragging the seek slider previews continuously. Dragging either range handle
snaps to whole-segment boundaries; arrow keys move one boundary and Home/End
move to the first/last valid boundary while retaining at least one segment.
`select-range({ startSeconds, endSeconds })` fires only on confirmation.
`select-insertion(seconds)` uses the next original segment edge at or after the
current frame, including zero or the final duration. `ranges`/`markers` only draw existing rules; the
component does not edit or persist them. `range-label`, `insertion-label` and
`selection-help` slots adapt the generic actions to a host workflow.

`fragment-change` emits an `HlsFragment` (or `undefined` after invalidation),
including its index, lossless decimal media-sequence string, timing, original
URI, resolved URL and `rawText`. The raw text includes the effective KEY, MAP,
MAP encryption key and discontinuity context without rewriting source lines.
It renders as escaped text and copies only after a user click. The exposed
`HlsWorkbenchApi` provides `seek`, `getSelection` and `getCurrentFragment`.
Seeks before metadata are queued, source changes discard stale pending seeks,
and window blur, deactivation or unmount release dragging listeners. Deactivation
and unmount also release player resources.

The exported helpers `parseHlsManifest`, `parseHlsMasterManifest`,
`resolveHlsManifest`, `findHlsFragment` and `snapHlsBoundary` support host validation
and loading. The synchronous media parser accepts BOM/CRLF,
relative HTTP(S) references and identity AES-128/fMP4 context. It rejects live,
master playlists (use the resolver first), byte ranges, LL-HLS,
DRM, missing/incomplete fragments, manifests over 4 MiB, more than 50,000
fragments and accumulated durations over seven days. It performs no transcoding
or media validation and does not create thumbnails. Masters requiring separate
audio/subtitle renditions remain unsupported by this editing timeline. See
`apps/playwright/src/components/HlsWorkbenchExample.vue` for a generic example.

## CodeEditor

`CodeEditor` is a generic CodeMirror 6 editor. Import it from
`@healseek/components/code-editor` (or `@healseek/components`). The engine and language
parsers load asynchronously when the component mounts; no CDN, worker service,
application API, or code execution is involved.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { CodeEditor } from "@healseek/components/code-editor";

const source = ref('export const message = "Hello";');
</script>

<template>
  <CodeEditor
    v-model="source"
    language="javascript"
    :height="360"
    aria-label="JavaScript 源码"
  />
</template>
```

The string `modelValue` uses `update:modelValue`. `language` accepts `javascript`
(default), `typescript`, `json`, or `text`. `height` accepts a pixel number
(default `320`) or a CSS length. `lineWrapping` defaults to true. `readOnly`
prevents edits while keeping selection, copying, focus and searching available;
`disabled` also removes the editor from the tab order. `placeholder`, `id`,
`name`, `ariaLabel`, `ariaLabelledby`, `ariaDescribedby`, `ariaInvalid`,
`ariaRequired`, and `dataFormRoot` are
forwarded to the actual editable element. `name` identifies the editor; it is
not a native form input, so native FormData users must serialize their model.

The editor provides line numbers, syntax highlighting, local JavaScript/TypeScript
completion, bracket matching, Tab
indentation, undo/redo, code folding and Ctrl/⌘+F search. Escape then Tab moves
keyboard focus out of the editor. Syntax colors and the search panel follow the
document's light/dark theme. `focus` and `blur` forward native focus events,
`ready` signals engine initialization, and `error` reports a failed engine load.
The exposed `CodeEditorApi` contains `focus()`.

Prop changes reconfigure the existing view. Parent value synchronization updates
only the changed text span, keeps selection/history in unchanged text, and
neither echoes a model event nor adds a new undo entry. Unmount destroys the
view and theme observer; late imports cannot revive it. Loading or failed
imports have accessible status/error feedback.

Use the same component directly in a framework form schema; validation,
submission, reset and disabling remain controlled by `useForm`:

```ts
import { markRaw } from "vue";
import { CodeEditor } from "@healseek/components/code-editor";

const schema = [
  {
    fieldName: "source",
    label: "源码",
    component: markRaw(CodeEditor),
    defaultValue: "export const enabled = true;",
    componentProps: { language: "javascript", height: 320 },
    rules: "required",
  },
];
```

## VideoPlayer

`VideoPlayer` wraps Artplayer 5.4.0 and Hls.js 1.7.3 without any application API,
authorization header or playback reporting. Import it from `@healseek/components`
or the smaller `@healseek/components/video-player` entry. The player and HLS decoder
are dynamically imported only when an active player has a non-empty source.

```vue
<script setup lang="ts">
import {
  VideoPlayer,
  type VideoPlayerMetadata,
  type VideoPlayerOptions,
  type VideoPlayerSubtitle,
} from "@healseek/components/video-player";

const options: VideoPlayerOptions = {
  muted: false,
  // Quality variants should use the same transport as src.
  quality: [{ html: "1080P", url: "/video/1080.m3u8", default: true }],
};
const subtitle: VideoPlayerSubtitle = {
  url: "/subtitles/example.vtt",
  type: "vtt",
  name: "简体中文",
};
function metadata(value: VideoPlayerMetadata) {
  console.info(value.duration, value.width, value.height);
}
</script>

<template>
  <VideoPlayer
    src="/video/1080.m3u8"
    poster="/video/poster.jpg"
    title="视频预览"
    :active="true"
    :options="options"
    :subtitle="subtitle"
    @loadedmetadata="metadata"
  />
</template>
```

The public props are `src`, `poster`, `title`, `type` (`auto`, `hls` or `native`),
`active` (defaults to true), `subtitle` and `options`. `auto` recognizes `.m3u8`
in paths and encoded query URLs; use `hls` for extensionless manifest endpoints. Hls.js uses
MediaSource when supported and falls back to native HLS on Safari/iOS. Ordinary
media uses the browser decoder. DASH/FLV engines, DRM, parser/proxy services and
application-specific reports are outside this component. Unsupported media
produces a readable error and a manual reload action.

The default controls provide play/pause, progress, volume, settings, playback
speed, aspect ratio, fullscreen, web fullscreen, picture-in-picture, hotkeys and
screenshots, with Chinese Artplayer labels. Artplayer `options` also supports
subtitles, quality, live mode, language, themes and other native options.
Autoplay defaults to false. Browser support and cross-origin resource headers
still determine available PIP/fullscreen/codec/canvas capabilities. Screenshot
failures are caught and emit a non-fatal `warning`; playback continues.

Use `subtitle` for external captions that can change during playback. It takes
`{ url, type?, name?, encoding? }`; `type` supports VTT, SRT and ASS and can be
inferred from a URL extension, including signed URLs. UTF-8 is the default
encoding. ASS is converted to plain text cues: its positioning, fonts, effects
and styling are not rendered. Caption text is escaped instead of interpreted as
trusted HTML. Subtitle URLs must allow browser cross-origin fetching.

Changing `subtitle` retains the player, current time and playing state. An empty
URL removes external captions; when `subtitle` is omitted, `options.subtitle` is
used as a fallback. The settings menu adds caption visibility and a -10 to +10
second offset control when captions are loaded (`options.subtitleOffset=false`
disables the offset control). Previous caption requests are cancelled and stale
results are ignored. Fetch, conversion and track failures emit
`warning({ code: "subtitle", ... })` and show a brief notice without pausing video
or switching to the player error screen. A previously loaded caption remains
until a replacement is ready. Use the `subtitle` prop rather than changing
`options.subtitle` when switching captions without resetting playback.

Source, poster, type or option updates recreate the instance. `active=false`,
KeepAlive deactivation and unmount release both player and decoder, detach media
and prevent late imports/events from reviving an older source. KeepAlive
activation recreates the current source. Pause before setting `active=false`
is unnecessary. The component owns `container`, `url`, `type` and `customType`;
these cannot override the source through either TypeScript or runtime options.

Events: `ready(Artplayer)`, `error(VideoPlayerError)`, `warning(VideoPlayerError)`,
`loadedmetadata({ duration, width, height })`,
`timeupdate({ currentTime, duration })`, `play`, `pause`, `ended` and `retry`.
`duration` follows the browser value and can be `Infinity` for live streams;
applications that report finite durations must validate it. Diagnostics remain
in the error payload's `cause`; source URLs/tokens are never rendered as errors.
Initialization failures identify `stage` as `player-load` (Artplayer import),
`player-init` (constructor/options), `player-setup` (controls/events), or
`hls-load` (HLS decoder import/setup). The player displays a safe stage code and
a corresponding recovery message; raw exceptions remain in the event payload.
The exposed `VideoPlayerApi` provides `getInstance`, `play`, `pause`, `seek`,
`screenshot` and `retry`. `getInstance()` exposes Artplayer for advanced controls;
use the props to change the source so decoder cleanup remains deterministic.

## Button, Input and Textarea

Import the public control compositions from `@healseek/components` or the smaller
`@healseek/components/controls` entry. They compose the unchanged ui-kit primitives
and apply the new-api control sizes, focus/invalid rings, dark theme and disabled
states. Native attributes, listeners and input models are forwarded unchanged.
Button defaults to `type="button"`; use an explicit `type="submit"` for a form
submission. `as`/`asChild` still support links and other primitive semantics.

Use `icon="lucide:plus"` for a decorative leading icon, or the `icon` named slot
for a custom SVG/component (the slot takes precedence). The optional `suffix`
slot adds a trailing icon. These slots set new-api's `data-icon` markers for the
size-aware padding, and hide decorative content from the accessible name; retain
visible action text, or provide `aria-label` on an icon-only button.

```vue
<Button icon="lucide:plus" size="sm">新增</Button>
<Button variant="outline">
  <template #icon><Download /></template>
  导出
  <template #suffix><ChevronDown /></template>
</Button>
```

`asChild` delegates content ownership to its single child. Put icons inside that
child link/component instead of using the outer icon props/slots; this preserves
the link root, native attributes and routing behavior without a sibling wrapper.

The composition owns size/variant classes once, rather than combining two CVA
size presets or forcing CSS padding. Callers may override `h-auto`, `p-0`,
`px-0` and wrapping through `class` for composite controls. Add
`data-icon="inline-start"` or `data-icon="inline-end"` to a text button's icon
when the reference's reduced padding on that side is wanted; unmarked SVGs do
not alter padding. Icon-only buttons retain their explicit `icon*` sizes.

`ResultPage` supports success, error, warning, info and HTTP result states
with primary/secondary action events. Default title, description and secondary
action copy uses `common.result.<status>.*` locale keys; explicit props remain
authoritative.

## PasswordInput

`PasswordInput` is the framework composition equivalent of new-api's
`web/src/components/password-input.tsx`. It keeps the value masked by default,
provides a ghost icon button to switch between `password` and `text`, and
disables both controls together. The toggle is `type="button"` so it never
submits a surrounding form; its accessible name defaults to
`Toggle password visibility` and can be changed with `toggleAriaLabel`.

```vue
<PasswordInput
  v-model="password"
  autocomplete="current-password"
  aria-describedby="password-help"
/>
```

Native input attributes and listeners (`id`, `name`, `autocomplete`, `aria-*`,
focus/blur and keyboard handlers) are forwarded to the real input. The
component owns `type`, even if a stale `type` attribute is supplied by a form
schema. `class` styles the `relative rounded-md` wrapper like new-api;
`inputClass` is available when a caller needs to style the native input itself.
The public model is `string | number` for compatibility with the shadcn Input,
while password form fields conventionally use strings.

## DataPanel

`DataPanel` is a framework-level surface for content that can be loading,
failed, empty, or ready. It keeps the existing `toolbar`, `empty`, `footer` and
`fixedHeight` contracts while composing the shared `LoadingState`, `ErrorState`
and `EmptyState` implementations so those states use the same new-api density,
surface and accessibility behavior as the rest of the framework.

State priority is deterministic: `loading` renders first, then a non-null
`error`, then `empty`, and finally the default content slot. This means a stale
empty flag cannot hide an active request error, and callers do not need to
coordinate mutually exclusive flags themselves. The panel sets `aria-busy` on
the root while loading and marks each state surface with a `data-slot` value:
`data-panel-loading`, `data-panel-error` or `data-panel-empty`.

Use `errorText`, `retryText` and `showRetry` to configure the default error
state. The `retry` event is emitted when the retry action is activated. The
`#error` slot receives `{ error, retry }`, so a caller can keep the original
error object for diagnostics while owning the action UI. The `#loading` slot
replaces the default loading state; `#empty` continues to replace the default
empty state. Toolbar and footer slots remain outside the state content and are
preserved in all four states.

## DataTable

`DataTable` is the presentation layer. It supports stable row keys, controlled
selection, current-page select-all/indeterminate state, hidden columns,
formatters, loading, empty, error/retry and optional `DataTablePagination`.
Table content is wrapped in the new-api channel-style
`data-slot="data-table-surface"` surface (`overflow-hidden rounded-lg border`);
the toolbar remains outside that surface while the inner table container owns
horizontal scrolling. This keeps loading, empty, error, pagination and pinned
cell backgrounds inside one consistent boundary without requiring business
pages to add another border.
The table viewport accepts CSS `height` and `maxHeight` values and keeps
horizontal scrolling available for narrow screens. The default
`rowKey` is `id`; every row must provide a non-empty string or finite number
through that field or through a `rowKey` function. Missing or duplicate keys
throw an error instead of silently falling back to the row index, which keeps
selection and Vue DOM identity stable when sorting or replacing data.
Selection checkbox aria labels use `common.selectCurrentPage` and
`common.selectRow`; the selection model remains caller-owned.
Rows use the new-api muted surface contract: selected rows use `bg-muted`,
while hover blends `muted` and `background` with the same color-mix token;
pinned cells preserve the corresponding surface while scrolling.
Desktop headers use `h-10 px-2` and cells use `p-2`, matching the new-api table
density; mobile card slots keep their caller-owned spacing.
Sortable columns use the new-api ghost `h-8` header trigger with
`data-popup-open:bg-accent`, current-state sort icons, and a keyboard-friendly
menu for ascending, descending and hiding the column. Set
`hideable: false` on a column that must remain visible; the visibility
normalizer always retains non-hideable columns and at least one configurable
column. The menu emits the existing `update:sort`, `sort-change` and
`update:columnVisibility` events, so server sorting and caller-owned state stay
unchanged.
The default error and retry copy uses `common.errorLoading` and `common.retry`
locale keys; explicit `errorText` and error slots remain authoritative.

Use the optional `toolbar` slot for controls above the table and the `actions`
slot for a per-row action column. The toolbar exposes `selectedKeys`, `loading`,
`error`, `retry`, `sort`, `columnPinning`, `setColumnPinning`, `page` and `pageSize`; row actions expose `row`,
`index` and `rowKey`; the singular `action` slot name is accepted as an alias.
The action column and its loading/empty/error colspan are omitted when no
action slot is supplied.

`useDataTable` owns application-provided server query state. Its `fetcher`
receives `{ page, pageSize, sort, filters }` and an `AbortSignal`; it does not
know Axios, a response envelope or a business batch API. A request sequence
guard prevents a late response from replacing newer results. The default
selection policy is current-page selection; applications that need cross-page
selection must own that policy outside the component.

`DataTablePagination` composes the ui-kit Pagination primitives while keeping
the existing `page`, `pageSize`, `total`, `update:page` and `update:pageSize`
contract. It owns only page clamping and presentation; query synchronization
and data fetching remain with `useDataTable` or the caller.
Its full layout follows the new-api total/rows-per-page/first-prev-pages-next-last
density; `compact` provides the mobile total/current-page/previous-next layout.
The default page-size choices are `10`, `20`, `30`, `40`, `50` and `100`. The
full layout uses the framework `Select` primitive for page-size changes, so it
does not fall back to a browser-native select. Inside a framework Drawer or
Modal, its portalled page-size menu inherits that host's popup layer and closes
when the host closes or is covered by another overlay. No per-page z-index is
required, and ui-kit primitives remain unchanged. When `DataTablePage` is rendered
inside `SectionPage`, pagination is placed in the page footer host by default
(`paginationInFooter=true`). This keeps the controls fixed below the scrollable
content area while the table or card list scrolls. Set `paginationInFooter` to
`false` when a caller intentionally needs pagination inside the data surface;
when no `SectionPage` footer host is available, the component renders an inline
fallback below its content. A custom `#table` slot that binds the supplied table
props also receives the page and page-size listeners; inline pagination updates
the owning page without requiring additional event handlers.

For channel-style administration pages, compose `DataTablePage` with
`DataTableToolbar`, `DataTableViewOptions` and `DataTableRowActions`. The
toolbar owns presentation of debounced search, faceted filters, refresh/reset
actions and column visibility; the application still owns the filter values and
calls `useDataTable.setFilters()`. `DataTableViewOptions` accepts a caller-owned
storage key for column visibility; its default trigger is the new-api
`查看`/`View` action and the reset-columns item is opt-in through `showReset`.
`DataTableRowActions` accepts typed row
actions with visible/disabled/loading predicates and an optional permission
callback. `DataTablePage` provides separate `table` and `mobile` slots so the
same query, pagination and selection state can render as a desktop table and a
mobile card list. For the canonical shared state contract, pass `rows` and
`columns` once (plus `loading`, `error`, `selected-keys`, `selection-scope`,
`pagination`, `page`, `page-size`, `total`, `sort` and `row-key` as needed).
When no `table` slot is supplied, the page renders `DataTable` from that source;
the automatic `DataTableMobileCardList` receives the same rows,
loading/error/empty state and selection keys below the mobile breakpoint when
`mobileCards` is enabled. Explicit `card` view still uses `DataTableCardGrid`.
`update:selectedKeys`, `selection-change`, page, sort and retry events are
forwarded from the built-in table and card/list views.
Custom `table` and `mobile` slots receive the shared source and update helpers
as slot props, so advanced table configuration can still stay in the caller.
Set `enable-view-mode-toggle` to expose the new-api table/card
segmented control. `default-view-mode` chooses the uncontrolled initial mode,
`view-mode` makes the state controlled, and `view-mode-storage-key` persists a
per-table choice as the literal `table` or `card` value. The component emits
`update:viewMode`; card mode renders the `mobile` slot across all widths.
`card-rows`, `card-columns`, `card-selected-keys` and related `card-*` props
remain available as a legacy card-only contract. They are bridged to the shared
events for compatibility; new pages should use the shared source instead.
`card-cell-{key}` slots forward into the generic cell slots, while `card` and
`card-actions` override row content and actions. DataTable and DataTableCardGrid
share the new-api state semantics: loading has one polite status announcement,
errors expose one alert with a retry action, and empty content exposes one
polite status region.
Channel fields, API calls and edit dialogs remain application code.

`DataTableViewModeToggle` is also available as a standalone controlled control.
It exposes `modelValue`, `update:modelValue`, and `change`, with `role="group"`,
`aria-pressed` buttons, new-api `bg-muted/60`/`rounded-lg` density, and tooltip
labels for the table and card choices.

`DataTable` also accepts `columnPinning` as a record keyed by column id/key:

```ts
const columnPinning = { name: "left", actions: "right" } as const;
```

Pinned headers and cells use sticky offsets calculated from visible columns.
The special `selection` and `actions` ids can pin the built-in checkbox and
row-action columns. `columnPinningStorageKey` restores and persists the
uncontrolled state; mobile card slots do not apply pinning.
`DataTableBulkActions` is a business-neutral selection toolbar. It renders only
when `selectedCount` is greater than zero, emits `clear-selection`, and accepts
the action buttons through the `actions` or default slot. `placement="floating"`
shows the new-api-style bottom toolbar; `placement="inline"` keeps it in the
normal layout flow. The floating toolbar uses the new-api hover scale,
transition, backdrop, border and rounded surface classes; the clear control
also exposes a tooltip. Escape and arrow/Home/End keys operate on the toolbar
buttons without taking ownership of the batch operation itself.
Toolbar labels, live-region announcements, and clear-selection hints use the
framework global i18n `common.*` keys with Chinese fallbacks; explicit
`entityName` and action slots remain caller-owned. A selection announcement is
placed in the `role=status` live region when the count changes and is cleared
after three seconds, matching new-api without repeating stale state.

`DataTableRowActions` accepts `iconOnly` and `ariaLabel` for the new-api
static row-action pattern. Icon-only actions use the `icon-sm` ghost button
contract; dropdown actions preserve `permission`, `visible`, `loading` and
`variant="destructive"` state ownership with the caller.

`StaticRowActions` is the direct new-api static composition: an edit
`icon-sm` ghost button and an ellipsis menu with a `w-48` destructive delete
item. It accepts `editLabel`, `deleteLabel`, `menuLabel`, optional edit/delete
callbacks, independent disabled props, `contentClass`, and `modal`; it emits
`edit`, `delete`, and `menu-open-change` as well. It has no row type, request,
permission, or business dependency, so callers can use it in a channel-style
table or provide their own authorization before rendering.

## LiveLog and follow-tail

The useFollowTail composable and LiveLog component keep auto-scroll in the
view layer. They watch an item collection, pause when the user scrolls away
from the bottom, and expose a follow-latest action to resume. They do not know
how items are fetched or which SSE/WebSocket transport produced them.
LiveLog defaults use the global `common.noLogs` and `common.followLatest`
locale keys; an explicit `emptyText` remains authoritative.

## Charts

`ChartCard` is the framework entry point for Chart.js-backed charts. It accepts
the `line`, `bar`, `pie`, `doughnut` and `radar` types exposed by the ui-kit,
uses the active `chart-1..5` theme tokens, and provides consistent loading,
error/retry and empty states. A dataset with no data points is treated as
empty and does not mount Chart.js. Pass application-owned Chart.js `data` and
`options`; use the `actions`, `footer` and `legend` props/slots for page-level
composition. `ChartCard` does not fetch metrics or define business aggregation
rules.
Pass an optional `id` to produce a stable `data-chart="chart-{id}"` root and
`data-slot="chart"` marker for theme selectors, test locators and resize
verification. The chart root keeps `min-w-0`, centered layout and `text-xs`
density while height remains caller-controlled; `aria-label` and `role="img"`
are forwarded by ChartCard.
The optional `config` maps dataset keys or labels to `{ label, color }`; when
`legend` is omitted, ChartCard derives the legend from this config and falls
back to the active `chart-1..5` tokens. Explicit `legend` remains authoritative.
Each config entry may also provide `theme: { light, dark }`; the ui-kit selects
the value from the document root theme and falls back to `color`.

## JsonField

`JsonField` keeps JSON-backed form values readable for end users. Visual mode
edits top-level key/value rows, JSON mode edits the formatted string, and both
use the same `v-model` string. `template` provides a one-click backfill and the
formatted template is also used as the JSON-mode placeholder; pass `placeholder`
to override it. `valueType` can be `string`, `number`, or `any`, and
`parse-error` reports an invalid raw draft without discarding it. It can be
passed as a component object in a `FormFieldSchema`; the form owns the field
path and submission lifecycle, while `JsonField` owns JSON serialization and
visual editing.
Switching modes does not emit a value update or reserialize untouched values;
formatting requires an explicit format action, and `valueType` conversion
applies when editing visual rows. Invalid JSON and valid non-object roots (arrays, scalars or
`null`) stay in the JSON editor, including when loaded from an external value.
The latter show a visual-mode limitation notice without emitting `parse-error`:
they remain valid JSON, but cannot be represented as object key/value rows.
Visual inputs use `keyLabel`/`valueLabel` and their row number as accessible names.
The optional `value` scoped slot receives `row`, `index`, `label`, `disabled`
and `updateValue(string)`. Compose a searchable selector there for references
while keeping JSON serialization, literal keys and the raw JSON editor intact.
Default labels, placeholders, mode actions, empty text and field action
labels use the global `common.json*`/`common.*` locale keys; explicit props
remain authoritative.
When the component receives form attributes such as `id`, `name`,
`aria-describedby`, `aria-invalid` or `data-form-root`, JsonField forwards them
to the actual JsonCodeEditor textarea in JSON mode while retaining the
`data-form-root` marker on both composition surfaces. This keeps labels and
validation tied to the native control instead of the visual composition
container. The visual editor follows new-api's compact `space-y-2` layout,
`h-10 w-10` row actions and `h-24` dashed empty surface. JsonCodeEditor keeps
the `rounded-lg` bordered surface, `h-8` toolbar and disabled overlay while
preserving invalid drafts.

## Select option hierarchy

`SelectBox` and `SearchSelect` accept recursive options:

```ts
const options: SelectOption[] = [
  {
    label: "云服务",
    children: [
      { label: "OpenAI", value: "openai" },
      { label: "Claude", value: "claude" },
    ],
  },
];
```

A node with `children` is rendered as a non-selectable group label. Top-level
parents create separate SelectGroup boundaries, nested labels retain their
depth, and only leaf nodes with `value` can be selected. Leaf `icon`,
`description`, and `disabled` metadata are rendered in the item while the
selected value and form backfill remain stable. `SelectBox` uses the new-api
compact `h-8 rounded-lg` trigger, anchor-width popup, ring/shadow surface,
focus token and compact label/item spacing; `allowClear`, disabled and
overlay-owner behavior remain caller-compatible. `MultiSelect` is
the chip-style multi-value composition from new-api. Its bordered control
keeps the chips and a keyboard-searchable input in one row, uses the new-api
`bg-muted`/`rounded-sm` chip surface and exposes the same focus ring, hint
marker and `+N more` density pattern. Pass `id` to associate the native input
with a form label. `renderSelectedSummary(values)` or the `selected-summary`
slot can replace the chip list with a compact caller-owned summary while
keeping input and popup behavior unchanged. It supports search, disabled
options, optional custom creation, batch comma/newline input, bounded visible
chips, icon/hint text and copyable chips while keeping selection state
caller-owned. Option icons use Iconify names such as `lucide:cloud` and remain
decorative through `aria-hidden`.
Nested labels are indented by depth; `SearchSelect` now reuses the Combobox
input surface from new-api, so the selected label and search query share one
control while descendant paths remain visible. Existing flat options keep
their behavior.
Searchable single and multi-select inputs disable browser form-history
autocomplete so native suggestions do not cover the component's option list.
Their `aria-autocomplete="list"` state still describes that option list.
Default SelectBox/SearchSelect placeholder, search and empty-result text uses
the global `common.select*` locale keys; explicit props remain authoritative.

## DataTable column sizing

DataTable columns can opt into resizing with `resizable`, `minSize`, and
`maxSize`. Bind `v-model:column-sizing` for a controlled map keyed by column
id/key and pass `column-sizing-storage-key` to persist widths. Resizing is
desktop table behavior; mobile card slots continue to use the same rows and
selection state. Persisted sizing is migrated against the current column
schema and min/max bounds; removed columns and invalid widths are discarded
and written back. Column pinning storage follows the same current-schema
filtering for left/right sticky offsets. The resize handle is a keyboard
focusable vertical separator like new-api: ArrowLeft/ArrowRight change the
width by 10px (50px with Shift), while Enter/Space and double-click auto-size
from the rendered column content. Pointer dragging remains supported.

When `DataTable` has no rows, it renders `DataTableEmpty` with the new-api
Database icon, `common.noData` title, `common.noDataDescription` description,
and a 400px table cell surface. Use `emptyTitle`, `emptyDescription`, and
`emptyIcon` to customize the framework state, `empty-action` for an action,
or the existing `empty` slot when a caller needs to replace the whole cell.

## Status states

`StatusBadge` follows the new-api status-badge contract. Use `variant` with
`type="badge" | "text" | "underline"`, `size="sm" | "md" | "lg"`,
`label`/`icon`, `showDot`, `pulse`, `copyable`, `copyText`, or `autoColor`.
The legacy `status`/`text` props remain supported and use the same new-api
color and sizing classes. Copyable badges expose a `copy` event after the
clipboard write succeeds and can be activated with Enter or Space.
Copyable badges also expose a focus-visible ring for keyboard users; badges
with `copyable=false` remain non-focusable.

`statusPresets` exports the new-api `active`, `inactive`, `invited`,
`suspended` and `pending` display presets. `StatusPresetName` types those map
keys; the existing `StatusPreset` variant union remains compatible with
legacy callers. The presets only contain `variant`/`label` (and `pulse` for
pending); callers still decide how a domain value maps to a preset and whether
the badge is copyable.

`StatusBadgeList` renders a bounded list of badge slots, a neutral `+N`
overflow badge, and an `empty` slot. It owns only layout and display limits;
the caller owns the item meaning and actions.

`StatusBadgeTypeProvider` and `provideStatusBadgeType` mirror new-api's
`StatusBadgeTypeContext` for Vue subtrees. A provider's `type` (`badge`,
`text`, or `underline`) supplies the default for nested badges; an explicit
`type` on a badge always wins. The provider is presentational only and does
not change status colors, copy behavior, or business state mapping.

`EmptyState` keeps its existing `actionText`/`action` event and `actions` slot;
it follows the new-api default Database icon, “暂无数据” title, 300px minimum
height, `w-full`/`gap-4`/`rounded-xl`/`border-dashed`/`p-6` surface and compact
title/content density while retaining `bordered`, `size`, and the singular
`action` slot. `bordered` adds the visible dashed border; without it the
surface keeps the same style contract but has no extra visible border.
Empty and error surfaces use motion-safe FadeIn classes and respect the user's
reduced-motion preference. Default empty/error/loading text is read from the framework global i18n
keys (`common.noData`, `common.error`, `common.retry`, `common.loading`) with
the existing Chinese strings as fallback; explicit text props always win.
`ErrorState` follows the same new-api `w-full`/`min-h-[300px]`/`gap-4`/
`rounded-xl`/`border-dashed`/`p-6` surface, compact title, icon media and action content density
as `EmptyState`. It provides retry/action events and slots with an alert role. Set `showRetry` (or
provide `retryText`) to render its outline retry button; without an explicit
retry capability no retry button is shown, matching new-api's optional
`onRetry` callback. `LoadingState`
uses the new-api 200px loading block density and supports block and inline
layouts, `sm`/`md`/`lg` sizes, an optional message, and `aria-busy`/`aria-live`
attributes. The loader is decorative so the outer state region owns the single
status role; it spins by default and stops under `prefers-reduced-motion`.
Inline loading only renders the message when the caller provides one, matching
new-api; block loading keeps the localized default message. These components render state only and
do not fetch data or own retry logic.

## TruncatedCell

`TruncatedCell` and `TruncatedText` provide the new-api DataTable long-text
pattern: a constrained `truncate` container and a Tooltip. The cell is not in
the Tab order by default, matching new-api; pass `tabIndex=0` when a caller
needs keyboard focus for the tooltip. The tooltip exposes the full text.
`TruncatedCell` extracts text from string, number, array,
and ordinary VNode slots when `text` is omitted; pass `tooltipContent` to
override the extracted value for plain text, or use the named `tooltip` slot
for rich Vue content such as badges and code fragments. The slot receives
`{ text }` with the extracted tooltip text. Empty text does not create an empty
tooltip. The new-api `cellClassName`, `contentClassName`
and `tooltipClassName` names are also accepted as aliases for the Vue `class`,
`contentClass` and `tooltipClass` props; aliases are merged rather than
replacing existing Vue props.

## Query state synchronization

`useDataTable` accepts an optional `querySync` adapter. Its `read()` method can
restore page, pageSize, sort and filters; its `write(query)` method receives
normalized changes. Its optional `subscribe(listener)` method lets the
application feed browser history/router changes back into the table and is
cleaned up with the composable scope. The adapter belongs to the application and may wrap
vue-router, URLSearchParams or another state store. The framework does not
depend on vue-router or choose URL parameter names.

`DatePicker` uses a stable `YYYY-MM-DD` trigger label like new-api while its
calendar still receives the caller's locale. It accepts optional `minDate`, `maxDate`, and
`locale` props. When omitted, the bounds default to `1900-01-01` and today,
matching new-api; explicit bounds override those defaults. They are converted to
the ui-kit Calendar's DateValue constraints while the trigger keeps the stable
`YYYY-MM-DD` text. `DateTimePicker`
keeps `HH:mm:ss` precision, accepts legacy `HH:mm` input as `:00`, clones
dates before merging the selected day and time, and resets the time to
`00:00:00` when cleared. Disabled state prevents date, time, and clear edits.

When `locale` is omitted, `DatePicker` reads the installed framework i18n
locale and falls back to `en-US`; an explicit locale always wins. Common
new-api aliases such as `zhCN`, `zhTW`, `en` and `cn` are normalised before
being passed to the Calendar, while unsupported BCP-47 values fall back to
`en-US`. This mirrors new-api's language-aware calendar selection without
making date values or business forms depend on the i18n implementation.
The outline trigger exposes `aria-haspopup="dialog"`, `aria-expanded` and a
`data-state` value (`open`/`closed`) so the Reka popover's Enter, Space, Escape
and focus-return behavior remains observable to keyboard and assistive
technology users.
Default DatePicker and DateTimePicker placeholders use
`common.datePickerPlaceholder` and `common.dateTimePickerPlaceholder`; explicit
placeholder props remain authoritative.

`DatePickerField` is the FormFieldSchema-friendly wrapper. Set `type="date"`
or `type="datetime"`; it forwards date constraints, locale, disabled state,
v-model and form attributes such as `id`, `name`, `aria-describedby`, and
`aria-invalid`.

`DateTimePicker` follows the new-api date/time row visuals: a flexible date
trigger with a Chevron icon, a `w-32` seconds-aware time input with the browser
picker indicator hidden, and an outline clear icon button that remains
shrink-0. The standalone `DatePicker` keeps its calendar icon by default;
`triggerIcon="chevron"` is the DateTimePicker composition hook. Value merge,
disabled, locale and FormField contracts remain caller-owned. When a controlled
value falls outside explicit `minDate`/`maxDate`, the date and time controls
expose `aria-invalid`, the time input is disabled, and time edits do not emit a
new out-of-range value. Empty, partial or
out-of-range time drafts never emit a normalized date: the last valid draft is
restored, the input exposes `aria-invalid` and a destructive focus/border token,
and controlled `modelValue` updates clear the invalid state.

`DataTableViewOptions` uses a non-modal dropdown by default, exposes an
optional `modal`/`dropdownContentClass` API and emits `dropdown-open-change`.
It normalizes persisted visibility against the current
column schema, drops unknown/non-boolean entries, and keeps at least one
configurable column visible. Its trigger, menu and optional restore action
expose stable data-slot and aria labels for keyboard and screen-reader tests.
The menu follows new-api's grouped 150px ViewOptions surface, keeps the
outline trigger compact, and hides the restore item by default; pass
`showReset` to expose it.

## FrameworkTooltip / FrameworkPopover

`FrameworkTooltip` and `FrameworkPopover` provide business-neutral overlay
compositions around the existing Reka/shadcn primitives. Both expose a
content-only `trigger` slot and optional `triggerClass`; Tooltip uses direct
as-child trigger semantics so a caller's button or link is not wrapped again.
Tooltip accepts `content` or a `content` slot plus `open`, `defaultOpen`,
`update:open`, `side`, `align`, offsets, `delayDuration`, `disabled`, and
`contentClass`. Omit `open` for the uncontrolled primitive state; bind
`v-model:open` when the caller needs to observe or control focus/hover state.
Popover exposes default
content, `open`/`defaultOpen`, `update:open`, `modal`, `side`, `align`, offsets
and `disabled`; its trigger slot also uses direct as-child semantics and must
provide the interactive root element. The framework root, trigger and content
expose `data-slot="framework-popover"`, `data-slot="framework-popover-trigger"`
and `data-slot="framework-popover-content"`. Its content uses new-api's
`bg-popover`/`text-popover-foreground`, `w-72`, `rounded-lg`, `p-2.5`,
`gap-2.5`, shadow/ring, z-index and side-aware enter/exit animation tokens;
primitive focus, Escape and outside behavior stays owner-controlled.

## FrameworkCalendar

`FrameworkCalendar` wraps the Reka/shadcn Calendar with a new-api aligned
surface (`bg-background`, compact padding and cell radius/size tokens). It
defaults `showOutsideDays` to `true` to match new-api while still allowing
callers to pass `false`. It forwards CalendarRoot date props, `update:modelValue` and
`update:placeholder`, plus `calendar-heading`, `calendar-prev-icon` and
`calendar-next-icon` slots. Date range, disabled and keyboard semantics remain
owned by the Calendar primitive.

`Combobox` accepts nested `SelectOption.children`. Parent entries render as
non-selectable group labels, leaf entries keep their depth/description/icon/
disabled state, and searching a leaf retains the matching parent path. Only
leaf values enter the v-model contract.

Run `pnpm dev` followed by `pnpm verify:primitives` for the repeatable
Calendar/Command/Combobox browser matrix. `PRIMITIVE_MATRIX_URL`,
`PRIMITIVE_MATRIX_USERNAME`, `PRIMITIVE_MATRIX_PASSWORD`, and
`PRIMITIVE_MATRIX_BROWSER` can override the browser executable; set
`PRIMITIVE_MATRIX_ENGINE=firefox` for Firefox. The URL and test account use
the corresponding environment variables as well.

Run `pnpm dev` followed by `pnpm verify:datatable` for the DataTable desktop,
selection, ViewOptions, dark-theme and mobile-card smoke matrix. It accepts
`DATATABLE_MATRIX_URL`, `DATATABLE_MATRIX_USERNAME`, `DATATABLE_MATRIX_PASSWORD`
and `DATATABLE_MATRIX_BROWSER` overrides; set `DATATABLE_MATRIX_ENGINE=firefox`
for Firefox.

Run `pnpm dev` followed by `pnpm verify:sectionpage` for the SectionPage/tabs/
layout scroll matrix. It accepts `SECTIONPAGE_MATRIX_URL`,
`SECTIONPAGE_MATRIX_USERNAME`, `SECTIONPAGE_MATRIX_PASSWORD`, and
`SECTIONPAGE_MATRIX_BROWSER` overrides; set `SECTIONPAGE_MATRIX_ENGINE=firefox`
for Firefox.
The wrapper intentionally uses Vue sticky header and the layout's native scroll
container instead of copying React layout code; title/tab spacing and the
scroll contract are the compatibility target.

Run `pnpm dev` followed by `pnpm verify:overlays` for the Drawer/Modal desktop,
mobile, focus, Escape and outside-click matrix. It accepts `OVERLAY_MATRIX_URL`,
`OVERLAY_MATRIX_USERNAME`, `OVERLAY_MATRIX_PASSWORD`, and
`OVERLAY_MATRIX_BROWSER` overrides; set `OVERLAY_MATRIX_ENGINE=firefox` for
Firefox.

When used in a FormFieldSchema, pass JsonField as the component object and use
componentProps for valueType/template. The form renderer owns modelValue,
update:modelValue, disabled state, validation ARIA attributes and reset/submit
lifecycle; JsonField owns JSON parsing and draft preservation.
`JsonField` accepts `nested` for recursive visual editing. Object paths use dot
notation and array entries use bracket indexes; switching to JSON mode still
edits the same draft string, and serialization reconstructs the nested object.
For `valueType="number"`, empty values retain the existing zero conversion, but
non-finite input remains in the visual draft and emits `parse-error` instead of
being serialized as `null`.

`JsonCodeEditor` follows the new-api header spacing and reports clipboard
success/failure through the framework toaster without discarding the draft. Its
`textareaRef` callback exposes the inner textarea for focus management;
`ariaInvalid` overrides the automatic JSON validity attribute when a form owns
the validation state, and `heightClassName` can replace the fixed `height`
style for theme/layout utility classes. `id`, `name`, `ariaDescribedby` and
`dataFormRoot` are forwarded to the textarea, while `parse-error` keeps the
invalid draft visible for correction. The line-number layer follows textarea
scrollTop and removes its scroll listener on unmount, matching new-api's long
text editor behavior.

`DataTableRowActions` exposes a stable `data-action-key` for each inline and
dropdown action. A loading action is disabled, announces `aria-busy`, and
shows a spinner even when the caller did not provide an icon; callback and
permission ownership remain with the caller. The dropdown accepts
`dropdownAriaLabel`, `dropdownContentClass`, and `dropdownModal`, and emits
`dropdown-open-change` so callers can coordinate focus or overlay state.
The default dropdown aria-label uses the global `common.moreActions` locale key
with a Chinese fallback; `dropdownAriaLabel` remains caller-authoritative.

`DataTableToolbar` follows the new-api toolbar composition. Existing search,
faceted filters, refresh, reset and column visibility props remain compatible;
set `showSearch=false` for lists that support faceted filters without text search.
Optional `custom-search`, `additional-search`, `expandable`, `pre-actions`,
`left-actions`, `view-toggle` and `actions` slots add caller-owned controls.
The built-in refresh button is opt-in (`showRefresh` defaults to `false`) so a
page can provide its own refresh action through `pre-actions` without getting a
duplicate control. The desktop action cluster keeps reset/search/view controls,
column visibility and expand in the same right-aligned order as new-api.
The default search uses a plain Input surface with no decorative search icon;
desktop widths follow `sm:w-[200px] lg:w-[240px]`, while mobile keeps the
input flexible. Clear, debounce and IME behavior remain unchanged.
`onSearch` switches to explicit form mode and `searchLoading` renders the
loading state. `collapsibleOnMobile` wraps the filter row in
`DataTableMobileFilterPanel`, which keeps action buttons available while the
filters collapse behind an accessible expand/collapse trigger. The toolbar
does not own requests, URL state or business filter semantics.
Toolbar search, clear, reset, refresh, search-action and expand/collapse
labels use the global `common.*` locale keys; explicit `searchPlaceholder`
and caller slots remain authoritative.
`FacetedFilter` uses the same global locale defaults for its trigger, empty
results, clear action and selected-count suffix; explicit text props remain
authoritative.
When `collapsibleOnMobile` is enabled, the mobile filter panel is visible only
below the small-screen breakpoint; the ordinary toolbar remains the desktop
rendering. This keeps the same query and slot state across responsive layouts.

`DrawerLayout` composes the existing Drawer primitive with a fixed header,
scrollable body and optional footer. Its right-side layout follows the
new-api side-drawer surface (`h-dvh`, `w-full` with a `sm:max-w-md` desktop
bound, no extra shadow, backdrop-blurred header/footer, overscroll-contained
body). The bottom drawer keeps `max-h-[80dvh]` and `mt-24` so it does not cover
the page content on open. It accepts `bottom`/`right` side, title, description,
`actions`/`footer` slots and class overrides; callers still own open state and
business actions.

`DrawerSection`, `DrawerSectionHeader` and `DrawerSwitchItem` provide the
business-neutral section compositions from new-api's `drawer-layout.ts`.
Sections remove their final divider/padding through `last-*` utilities;
headers support title, description, icon/icon tone and an actions slot; switch
items keep descriptive content and the control slot in separate hit areas.
They only own layout and theme classes, so preference state and button
behavior remain with the caller.

`Combobox` is the generic single-value searchable selector. It accepts the
same option shape as `SelectBox`, renders a new-api-style InputGroup with a
lightweight trigger button, and keeps the search input in the control instead
of moving it into the popup. With no selected value, typing opens the popup;
with a selected value, the closed input shows the label and the trigger opens
search mode. It supports disabled options and an optional `allowCustomValue`
Enter path. Options can also provide `description` and `icon`; search matches
both labels and values, `openOnFocus` controls whether focus opens the popup,
and `showSelectedIcon` controls the selected check mark. `popupClass`, `id`,
`name` and the aria props are forwarded to the public input contract. Escape
restores the current model value; multi-select chips remain a separate
composition.

When the popup is open, the input exposes `aria-haspopup="listbox"`,
`aria-autocomplete="list"`, `aria-controls` and an `aria-activedescendant`
that points at the actual listbox and highlighted leaf. Arrow navigation skips disabled leaves;
Enter selects the highlighted leaf and restores focus to the input, while
+Escape closes the popup without replacing the current value. Parent options
+remain non-selectable labels, and filtering keeps every matching parent path.

### ApiSelect: API-backed searchable options

`ApiSelect` composes the same Combobox input, popup, keyboard handling and overlay
ownership. The application supplies an `api({ search, signal })` loader returning
`Promise<SelectOption[]>`; the framework does not assume endpoints or response
envelopes. Import `ApiSelectLoader` for a typed adapter:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ApiSelect, type ApiSelectLoader } from "@healseek/components";

const providerId = ref<string>();
const loadProviders: ApiSelectLoader = async ({ signal }) => {
  const response = await fetch("/api/providers", { signal });
  if (!response.ok) throw new Error("Cannot load providers");
  const body = (await response.json()) as {
    items: { id: string; name: string }[];
  };
  return body.items.map((item) => ({ label: item.name, value: item.id }));
};
</script>

<template>
  <ApiSelect
    v-model="providerId"
    :api="loadProviders"
    placeholder="选择提供商"
  />
</template>
```

An empty selector loads only when opened and refreshes on reopen. A nonempty
initial model loads once to resolve its label. The default filters the returned
list locally by label/ID. For server-side filtering use `remote` and read `search`
in the loader; `debounce` defaults to 250 ms. Map or page the endpoint's results in
the application adapter; no pagination or arbitrary typed IDs are assumed.

Loading feedback, empty feedback and a retry button are built in. Supply
`loadingText`, `emptyText`, `errorText` or `retryText` to customize them;
`load-error` exposes a failed request for application handling. Closing,
disabling and unmounting cancel pending work, and stale responses are ignored
even if a loader ignores its signal. Filtering/loading never emit a model change.
A previously resolved selected label remains visible when a remote search no
longer includes it, without adding it to the new results. The exposed `reload()`
method refreshes the current search. The selector supports the same input `id`,
`name`, aria props, `popupClass`, `openOnFocus` and `showSelectedIcon` as Combobox.
See `apps/playwright/src/components/ApiSelectExample.vue` for local and remote
search examples with a cancellable simulated API.

## Tabs

`Tabs`, `TabsList`, `TabsTrigger` and `TabsContent` wrap the Reka UI tabs
primitive. The root accepts the controlled/uncontrolled value props and emits
the normal update event; triggers support disabled state, keyboard focus and
active styling, while content panels stay associated through their `value`.
Orientation styling uses Reka's actual `data-orientation` attribute for both
horizontal and vertical layouts. The wrapper only owns layout and theme classes; page titles, URL state and
business actions remain caller-owned.

## ResponsiveCardList

`ResponsiveCardList` provides a reusable mobile card grid for the same rows as
a desktop DataTable. It owns responsive layout, stable row keys, loading and
empty slots, and optional page/persistent row selection. In selectable mode the
`card` slot receives `selected`, `toggleRow`, and `rowKey`; the default card
renders row checkboxes and a current-page select-all control.
Page scope clears selected keys that leave the current rows; persistent scope
keeps them across row replacement, matching DataTable selection semantics.
Default loading, empty and selection aria copy uses the global `common.*`
locale keys; explicit `emptyText` and caller slots remain authoritative.

`DataTableCardGrid` is the new-api-style generic card fallback for table/card
view modes. It accepts the same rows and `DataTableColumn` definitions, uses
`value`/`formatter`, supports `mobileTitle`, `mobileBadge`, `mobileHidden` and
`mobileOrder` metadata, and exposes `card`, `card-actions` and `cell-{key}` slots. It owns
responsive grid density, loading skeletons, empty state, selected surfaces and
page/persistent selection without knowing anything about a business API. Its
default `rowKey` is `id`; every row must resolve to a non-empty string or finite
number, and keys must be unique. A missing or invalid key throws the stable
row-key error used by `DataTable`; duplicate keys throw the unique-key error.
Rendered string identities are also unique, so numeric `1` and string `'1'`
cannot collide in Vue's DOM keys when rows are reordered.

`DataTableMobileCardList` is the mobile list composition used by
`DataTablePage` when `mobileCards` is enabled without a custom `mobile` slot.
It keeps the same rows, columns, selection, pagination, state slots and cell
metadata as `DataTableCardGrid`, but renders one bordered, divided list with
the new-api row density and background token. Selectable lists expose a
current-page checkbox with indeterminate state and row checkboxes; page and
persistent selection scopes retain the same stable-key semantics as
`DataTable`. Compact (`mobileTitle`/`mobileBadge`) and fallback rows use
separate loading skeletons, while empty, error/retry and pagination states
remain caller-configurable. Explicit card view continues to use
`DataTableCardGrid`, and a custom `mobile` slot still takes precedence.

## PageFooter

`PageFooter` provides a reusable semantic footer with default/actions slots and
compact or sticky variants. It owns only layout and styling; page actions remain
caller-owned.

`PageFooterPortal` can be placed inside `SectionPage` content to render
pagination or action content into the page's stable new-api footer host,
keeping it outside the content scroll container. The host owns the
`bg-background`, top border, responsive `px/py` spacing and `empty:hidden`
surface; callers can pass a plain row or a `PageFooter`. Direct `SectionPage`
`footer` slots remain supported.

`SectionPage` keeps the existing sticky title behavior while matching the
new-api title weight (`font-bold`), responsive action spacing and content
padding. Its optional `tabs` slot is rendered inside the same sticky header,
so tabs do not add a second top offset or move the independent content scroll
layer. Its title header has no extra bottom border, matching new-api's
borderless page title surface; content cards and footer hosts remain caller or
framework composition concerns.

## ChartCard tooltip

`ChartCard` accepts optional `tooltipLabel`/`tooltipItems` and a `tooltip` slot;
without a custom slot it renders the shared ui-kit `ChartTooltip` composition
with the new-api border, rounded surface, min-width, indicator colors, spacing,
foreground tokens and shadow. `ChartLegend` uses the same new-api centered,
wrapping legend density and square indicator treatment. The slot receives the
normalized label/items model and is only rendered for a loaded non-empty chart.
Chart.js options and actual hover wiring remain caller-owned.
The ChartCard also installs a Chart.js external tooltip adapter: hovered label,
dataset name, color and formatted value are normalized into the same tooltip
slot/model, while the existing props remain a static fallback. Loading, empty
and error states never mount the chart or tooltip.
The shared tooltip formats numeric values with the browser locale (for example,
`2400` becomes `2,400`) and preserves string values such as `98%` verbatim.
Default loading/error/empty/retry labels use the framework i18n
`common.chartLoading`, `common.chartError`, `common.chartEmpty` and
`common.retry` keys with Chinese fallbacks; explicit `errorText` and
`emptyText` props remain authoritative.

## Accordion

`Accordion`, `AccordionItem`, `AccordionHeader`, `AccordionTrigger` and
`AccordionContent` wrap the Reka UI accordion primitive. The root supports
single or multiple values, controlled or uncontrolled state, `collapsible`,
disabled items and orientation; content exposes a region labelled by its
trigger. The wrapper owns layout, border and focus styles while callers own
business content and persistence.

## Alert

`Alert`, `AlertTitle`, `AlertDescription` and `AlertAction` provide a semantic
`role="alert"` surface with `default` and `destructive` variants. The action
slot is positioned by the composition; callers own the button behavior and
whether the alert is persistent, transient or connected to request state.

## Card

`Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`,
`CardDescription` and `CardContent` provide a composable surface with
`size="default" | "sm"`. Slots own the content and actions; the wrapper owns
surface, spacing, footer and theme classes.

## Table

`Table` renders an optional horizontal overflow container around the native
`table`; `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`,
`TableCell` and `TableCaption` provide styled structural slots. Pass
`withContainer=false` when an outer layout already owns scrolling; sorting,
pagination and row data remain the responsibility of DataTable or the caller.

## Pagination

`Pagination`, `PaginationContent`, `PaginationItem`, `PaginationLink`,
`PaginationPrevious`, `PaginationNext` and `PaginationEllipsis` provide a
semantic navigation structure. Links expose active page and standard anchor
attributes; page calculation, routing and request state remain caller-owned.

## Empty primitives

The existing `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription`,
`EmptyMedia` and `EmptyContent` primitives are exported from the ui-kit root.
Use `EmptyMedia` with `variant="icon"` for the new-api icon surface; data loading
and retry behavior belongs to framework compositions such as `EmptyState`.

## Slider

`Slider` wraps Reka UI's accessible slider root with track, range and one or
more thumbs. It forwards min/max/step, orientation, disabled and controlled or
uncontrolled values; callers own form binding and persistence.

## Spinner

`Spinner` is the shared loading indicator with `role="status"`, an accessible
label, `animate-spin` and configurable `strokeWidth`/class. Loading state
ownership and cancellation remain with the caller.

## Toggle

`Toggle` wraps Reka UI's pressed control with default/outline variants and
`default`/`sm`/`lg` sizes. It forwards controlled or uncontrolled pressed state,
disabled semantics, aria attributes and keyboard behavior.

## ButtonGroup

`ButtonGroup`, `ButtonGroupText` and `ButtonGroupSeparator` compose connected
controls with horizontal/vertical orientation, group semantics and focus
layering. Button actions, input values and form submission remain caller-owned.

## AspectRatio

`AspectRatio` provides a responsive ratio container with a `ratio` prop and
slot content. It delegates sizing semantics to Reka UI while callers own media,
overlays and loading behavior.

## Menubar

`Menubar`, `MenubarMenu`, `MenubarTrigger`, `MenubarContent`, `MenubarGroup`,
`MenubarItem`, `MenubarLabel` and `MenubarSeparator` wrap Reka UI's top-level
menu semantics. Advanced exports add portals, submenus, checkbox/radio items
and shortcuts. Keyboard navigation, focus and open state come from Reka UI;
business actions remain caller-owned.

## Resizable

`ResizablePanelGroup`, `ResizablePanel` and `ResizableHandle` provide a small
pointer/keyboard-adjustable split layout. Direction, default/min/max sizes and
separator focus are framework concerns. Pass `storageKey` to persist panel
percentages across reloads; panel content remains caller-owned.

## Carousel

`Carousel`, `CarouselContent`, `CarouselItem`, `CarouselPrevious` and
`CarouselNext` provide a native scroll-snap carousel with horizontal/vertical
orientation, keyboard navigation and accessible slide controls. Pass `loop` to
wrap previous/next and keyboard navigation at the ends. `autoplayInterval`
adds optional looped autoplay and pauses on hover/focus or reduced motion;
third-party plugins remain separate follow-up concerns.

## ContextMenu

`ContextMenu` exposes the reusable right-click menu composition from the ui-kit:
`ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`,
`ContextMenuCheckboxItem`, `ContextMenuRadioGroup`, `ContextMenuRadioItem`,
`ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent`,
`ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`, and
`ContextMenuItemIndicator`. The wrappers keep Reka UI's `modelValue` and
`update:modelValue` contracts for checkbox/radio state, while `inset` and
`variant="destructive"` provide the new-api menu styling. Menu content and
business actions remain owned by the caller.

## CommandMenu

`CommandMenu` composes the ui-kit command primitives into a reusable command
palette. It accepts business-neutral groups and items, supports controlled or
uncontrolled `open` state, search, empty results, shortcut labels and disabled
items, and emits the selected item and group through `select`.

```ts
const groups = [
  {
    id: "navigation",
    label: "导航",
    items: [{ id: "overview", label: "运营概览", shortcut: "G O" }],
  },
] satisfies CommandMenuGroup[];
```

Use `v-model:open` when the caller owns visibility. `closeOnSelect` defaults to
`true`; set it to `false` when a selection should leave the palette open. The
dialog content follows new-api's top-third, rounded-xl, p-0 command surface;
the palette root uses the `bg-popover`/`text-popover-foreground`, `rounded-xl`,
and `p-1` tokens, while the input, list, group, item, empty, and shortcut parts
use the corresponding new-api density, muted active state, scroll, and focus
tokens. `contentClass` is applied to the actual DialogContent element.
`item` slot receives `{ item, group }`, the `group` slot can replace a complete
group, and the default slot can append additional ui-kit command content. The
component does not know about routing, permissions, i18n, API requests or
application stores. The framework composition keeps the existing shadcn-vue
primitive boundary and scopes the new-api surface adjustments to CommandMenu,
so using CommandMenu does not change unrelated Select or Combobox surfaces.
Default title, description, placeholder and empty-result copy uses the global
`common.commandTitle`, `common.commandDescription`, `common.commandPlaceholder`
and `common.commandEmpty` keys; explicit props remain authoritative.

## ColorPicker

`ColorPicker` combines the installed Reka color primitives with the framework's
input, button and portalled popover styles. It supports pointer and keyboard
selection, a saturation/brightness area, a hue slider, HEX input and presets.
It does not use the browser's native color dialog or modify ui-kit source.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ColorPicker } from "@healseek/components/color-picker";
const theme = ref("#c2410c");
</script>

<template>
  <ColorPicker v-model="theme" :clearable="false" aria-label="主题颜色" />
</template>
```

The model is a HEX string. `#RGB`, `#RRGGBB` and `#RRGGBBAA` are accepted;
updates use lowercase six-digit HEX, with two alpha digits when `showAlpha`
is enabled and the color is translucent. With `showAlpha: false` (default),
selection is opaque. An empty string represents a cleared value. HEX edits
commit on Enter or blur; invalid drafts restore the previous color and never
replace the model. Wheel scrolling does not change the color.

| Prop                    | Default    | Behavior                                                   |
| ----------------------- | ---------- | ---------------------------------------------------------- |
| `presets`               | ten colors | Normalized and deduplicated HEX colors; `[]` hides presets |
| `showAlpha`             | `false`    | Show opacity slider and preserve alpha                     |
| `clearable`             | `true`     | Allow clearing the current value                           |
| `disabled` / `readonly` | `false`    | Prevent opening, editing and clearing                      |
| `placeholder`           | `选择颜色` | Text shown for an empty value                              |
| `name`                  | —          | Submit the model through a hidden native form input        |

`change(value)` accompanies committed model updates and `open-change(open)`
reports popup changes. Component refs expose `open()` and `close()`. Standard
attributes such as `id`, `aria-label`, `aria-describedby` and `aria-invalid`
reach the trigger. Modal/drawer owner state closes covered popups and keeps
their z-index above the owner. `normalizeHexColor(value)` is exported for
validating stored values; invalid external values show the empty placeholder.

`useForm` supports `ColorPicker` / `color-picker`, nested fields and direct
component objects. Ordinary optional/required rules validate HEX format;
explicit Zod rules remain application-owned. See the **表单与选择** demo for
alpha, disabled, readonly, form reset and modal examples.

## IconPicker

`IconPicker` selects an Iconify name such as `lucide:home`. It provides a preview,
search, paginated icon grid, clear action, keyboard navigation and input/icon
triggers. Import it from `@healseek/components` or
`@healseek/components/icon-picker`; import icon rendering and registration from
`@healseek/shared/icons`. Iconify is a runtime dependency of the shared package,
so applications do not need to install another copy of `@iconify/vue`.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { IconPicker } from "@healseek/components";
import { Icon } from "@healseek/shared/icons";

const icon = ref("lucide:home");
</script>

<template>
  <IconPicker v-model="icon" placeholder="选择图标" />
  <Icon v-if="icon" :icon="icon" />
</template>
```

The picker starts with a registered local collection, including the framework's
bundled Lucide set, which works offline. Its library selector also offers public
online collections; these are requested only when selected. Pass `sources: []`
to offer local collections alone. `icons` restricts the local choices to an
explicit list of already registered names. `pageSize` controls icons per page;
`type="icon"` uses a compact trigger. `disabled`, `readonly` and `clearable`
control editing. The picker emits only the selected string; storage and business
validation belong to the application.

### Local collections

Register application-bundled, trusted IconifyJSON once during startup. The
registry is reactive, so mounted pickers discover collections registered later.
SVG bodies can come from trusted build-time assets or a generated IconifyJSON
file. The `body` is SVG markup without the enclosing `svg` element; width and
height describe its viewBox. Registration does not sanitize untrusted uploads.

```ts
import { registerIconCollection } from "@healseek/shared/icons";
import appIcons from "./assets/app-icons.json";

registerIconCollection(appIcons, { title: "应用图标" });
// app-icons.json: { prefix: 'my-app', icons: { logo: { body: '...' } } }
// The selected value is my-app:logo.
```

### Online collections and self-hosted providers

`createIconifySource` loads a collection's catalog only when requested. Rendering
uses the same registered Iconify provider. These requests are separate from the
application's authenticated business client and do not receive its access token.
The source must permit browser cross-origin requests.

```ts
import { createIconifySource, type IconPickerSource } from "@healseek/components";
import { addAPIProvider } from "@healseek/shared/icons";

const publicSources = [
  createIconifySource({ prefix: "mdi", label: "Material Design" }),
  createIconifySource({ prefix: "tabler", label: "Tabler" }),
];

// Configure once at startup. The provider must serve both the collection
// catalog and Iconify SVG data endpoints; replace this example with your host.
addAPIProvider("company", {
  resources: ["https://icons.example.com"],
  path: "/",
});
const companySources: IconPickerSource[] = [
  createIconifySource({
    provider: "company",
    prefix: "brand",
    label: "品牌图标",
  }),
];
// <IconPicker v-model="icon" :sources="companySources" />
// A company icon is saved as @company:brand:logo.
```

For another online library, supply an `IconPickerSource` adapter with `id`,
`label` and `load({ signal }): Promise<string[]>`. Respect the abort signal,
return deduplicated Iconify names, and register their icon bodies or matching
provider before rendering. This keeps provider response formats outside the
component. Failed loads expose retry instead of silently appearing empty.

### Schema-driven forms and overlays

`useForm` accepts `component: 'IconPicker'`. The control's value is a string;
the form retains its normal row shape, e.g. `{ icon: [{ value: 'lucide:home' }] }`.
Pass picker props through `componentProps`, and use normal form `rules` for validation.
The picker follows the framework overlay owner so its panel stays above the
containing modal or drawer and closes when that owner becomes inactive.

```ts
const [Form, formApi] = useForm({
  schema: [
    {
      component: "IconPicker",
      fieldName: "icon",
      label: "图标",
      defaultValue: "lucide:home",
      rules: "required",
      componentProps: { clearable: true },
    },
  ],
});
```

See `apps/playwright/src/components/IconPickerExample.vue` for local, online,
custom collection, compact trigger and modal/form examples. The self-hosted
provider snippet is configuration guidance and does not make a demo request to
the example hostname.
