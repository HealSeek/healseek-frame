# @healseek/composables

The package exposes framework controllers for toast, modal and drawer flows.

`useModal` and `useDrawer` return a component/controller tuple. Both
controllers support typed payloads and typed results, close reasons, async
confirm loading, and `waitForResult()`. `OverlayStack` coordinates nested
layers, z-index allocation, top-layer ownership and opener focus restoration.
It also supports reference-counted body locking for independent consumers;
Modal/Drawer hosts opt out because their Reka primitives already share a single
DOM scroll lock with Select popups. This prevents one lock from restoring the
other lock's `hidden` value after the last host closes.

Framework Select controls inherit the nearest host's owner through
`@healseek/shared/overlay`, including when rendered in external form components.
Their body portal uses a reserved layer above that host's content and below the
next main backdrop. Opening another host or closing the owner closes its popup;
it does not raise the popup above every dialog. Reka retains responsibility for
focus scopes and Escape/outside dismissal, so the first Escape closes the Select
and later presses close the Modal/Drawer. Disabled dismissal and loading state
cannot fall through to an implicit API close.

Business forms remain in the application and return values through the
controller contract; applications need no custom host or popup z-index.

`ModalOptions` also accepts `contentHeight`, `initialFocus`, `headerClass`,
`titleClass`,
`descriptionClass`, `bodyClass`, and `footerClass`. `ModalHost` keeps the
header/footer fixed while the body remains the scroll container.
`DrawerApi` inherits the same layout and initial-focus options for bottom and
right-side DrawerHost instances.

Host class overrides are merged with `cn`: a consumer's `overflow-hidden` or
`p-0 sm:p-0` replaces the default scroll/padding utilities on that slot. A
footer with no standard actions and no custom footer slot is omitted; custom
footer content remains available when `showCancel` and `showConfirm` are false.

The standard confirm button has a decorative Check icon. Set `confirmIcon`
in `useModal` / `useDrawer` options (or `api.setState`) to a semantic Lucide
name such as `lucide:save`, or `''` to omit it. Async confirmation temporarily
replaces that icon with the loading spinner; it does not add a second icon.
Custom footer slots retain ownership of their own buttons and icons.

The Modal uses a popover surface, foreground ring and 100ms fade/zoom, bounded
by the dynamic viewport and safe-area insets. A right Drawer fills narrow
viewports and uses the desktop width bound from `sm` upward; its fade plus
2.5rem directional motion lasts 200ms. Both honor reduced motion and preserve
the existing focus, Escape, outside-click and typed result contracts. Footer
buttons use the public core Button composition; business forms keep ownership
of submission and close guards.
