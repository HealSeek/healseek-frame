/**
 * Framework-level controller composables.
 *
 * The tuple APIs follow the controller pattern used by vue-vben-admin:
 * `[Form, formApi]` and `[Modal, modalApi]`. Components stay owned by the
 * framework packages, while pages only coordinate state through the API.
 */
export { useForm } from '@healseek/forms'
export { DrawerApi, useDrawer } from './drawer'
export type { DrawerCloseReason, DrawerController, DrawerOptions, DrawerOutcome, DrawerSide, DrawerState } from './drawer'
export { ModalApi, useModal } from './modal'
export type { ModalCloseReason, ModalOptions, ModalOutcome, ModalState } from './modal'
export { OverlayStack, overlayStack } from './overlay'
export type { OverlayEntryOptions, OverlayHandle, OverlayStackOptions } from './overlay'
export { toast, useToast } from './toast'
export type { ToastApi } from './toast'
