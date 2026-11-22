// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@healseek/uikit-shadcnui'

describe('AlertDialog public primitives', () => {
    it('publishes all confirmation primitives from the root entry', () => {
        expect(AlertDialog).toBeTruthy()
        expect(AlertDialogContent).toBeTruthy()
        expect(AlertDialogTitle).toBeTruthy()
        expect(AlertDialogDescription).toBeTruthy()
        expect(AlertDialogAction).toBeTruthy()
        expect(AlertDialogCancel).toBeTruthy()
    })
})
