# @healseek/tabs

`AppShell` installs and renders the framework tab strip. Applications may
replace it through the `tabs` slot and use `useTabStore()` for tab actions.
Routes control tab behavior with `meta.affix`, `meta.keepAlive` and
`meta.hideInTab`.

## Navigation and actions

- Click a tab to navigate. A cancelled or rejected navigation leaves the
  current tab and its cached form intact.
- Right-click a tab, or use **Tab actions**, to refresh, pin/unpin, maximize,
  open in a new window, or close the current/left/right/other/all tabs.
- Affix tabs, pinned tabs and tabs with `closable: false` survive close
  actions. Unpin a user-pinned tab before closing it. Route affixes cannot
  be unpinned. Bulk-action disabled states use the same rules as the store.
- Drag to reorder within the pinned or normal group. Affixes cannot move;
  cross-group moves and dragging on coarse-pointer devices are disabled.
  The resulting order uses the existing tab persistence.
- Left/right controls and the mouse wheel scroll overflowing tabs. The open
  tabs menu reaches any tab directly. Active tabs remain visible when the
  container resizes; the strip does not introduce a vertical scrollbar.
- Arrow keys, Home and End navigate between tabs; Delete closes a closable
  tab. Middle-click closes it. Double-click toggles workspace maximization.
  Controls expose accessible labels and tooltips; menus support keyboard
  navigation, Escape and viewport collision handling through UI primitives.

## Store API and caching

`useTabStore()` retains its existing methods and exposes `orderedTabs`,
`isClosable(tabOrId)`, `closeLeft(id)`, `closeRight(id)`,
`moveTab(dragId, targetId)` and `clear()`. Closing the last page through the
strip returns to `installTabs({ defaultTabPath })` (or `/` when unspecified)
and keeps the visible page represented. Set a valid accessible home path.
Router leave guards run before the strip removes pages or their state.

Tab identity remains `fullPath`, including query and hash. `AppShell` caches
each tab revision separately, so closing or refreshing one query variant
does not keep a stale instance alive or reset another variant of the same
component. `keepAlive: false` bypasses caching. `useCachedTabNames()` remains
available for custom shells using component-name caching; custom shells
must handle per-tab eviction themselves if they share a component name.

These controls enhance the existing tab strip; they do not change internal
business tabs, authentication storage isolation, route permission policies
or application page layout.
