# RichTextEditor

Generic HTML-string editor in the core composition layer. It uses Tiptap 3.32.0, the original ui-kit primitives, and the existing new-api control classes. Business fields and requests belong to consumers.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { RichTextEditor } from "@healseek/components/rich-text";

const html = ref("<p>Existing content</p>");
const session = ref("document-1:open-1");
</script>

<template>
  <RichTextEditor
    v-model="html"
    :reset-key="session"
    aria-label="正文"
    :min-height="240"
    :max-height="400"
  />
</template>
```

- The model stays an HTML string. Mount, external fill, focus, and switching editing modes do not emit a normalized replacement. Only user document changes emit `update:modelValue`.
- Set `resetKey` when opening a different entity or starting a new edit session, including when its HTML is identical. External model replacements and session changes destroy the previous editor and undo history. Ordinary model echoes retain the selection and history.
- Unsupported markup or attributes open in **HTML 源码** mode. Its original string is retained, and visual mode stays unavailable until the source fits the supported schema. This avoids silently dropping an existing table or custom formatting.
- The visual toolbar supports basic text formatting, headings, lists, quotations, links, and undo/redo. Existing safe image URLs render; uploads, data URLs, drag/drop files, Markdown image insertion, and an asset platform are deliberately outside this component.
- `disabled` and `readonly` prevent model writes. Validation ARIA attributes reach the actual editable surface or source textarea. Each instance has a separate editor and generated control/link IDs.
- The visual surface removes executable markup and rejects unsafe link/image schemes, including on HTML paste. Source editing is not trusted HTML rendering: saved content must still be sanitized and authorized by the server. The component does not render raw source with `v-html`.

Focused tests use the real Vue editor and ProseMirror state in happy-dom. They verify model preservation, selection-based formatting/linking, history isolation, source mode, unsafe paste, lifecycle, and locked controls. Real browser checks remain necessary for layout, selection gestures, and keyboard interaction.
