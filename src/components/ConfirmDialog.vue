<script setup lang="ts">
import { ref } from 'vue'
import { useModalDialog } from '../composables/useModalDialog'

withDefaults(
  defineProps<{
    confirmLabel?: string
    cancelLabel?: string
    /** Puts Cancel in the default-focus position, since Enter is the last thing
     *  a destructive dialog should reward. */
    danger?: boolean
  }>(),
  {
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    danger: false,
  },
)

const dialogEl = ref<HTMLDialogElement | null>(null)
const { show, hide, isBackdropClick, onNativeClose } = useModalDialog(dialogEl)

let resolveOpen: ((confirmed: boolean) => void) | null = null

/**
 * Imperative rather than an `open` prop, because the body copy here is a
 * fixed piece of markup (the default slot) that's already reactive to
 * whatever the caller's own state holds — there's nothing to pass down.
 * Mirrors `if (confirm(...))` at the call site: `if (await dialog.open())`.
 */
function open(): Promise<boolean> {
  show()
  return new Promise((resolve) => {
    resolveOpen = resolve
  })
}

function settle(confirmed: boolean) {
  resolveOpen?.(confirmed)
  resolveOpen = null
  hide()
}

function handleNativeClose() {
  onNativeClose(() => settle(false))
}

function handleDialogClick(event: MouseEvent) {
  if (isBackdropClick(event)) settle(false)
}

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
    <dialog
      ref="dialogEl"
      class="panel no-print"
      aria-labelledby="confirm-body"
      @click="handleDialogClick"
      @close="handleNativeClose"
    >
      <p id="confirm-body" class="body"><slot /></p>
      <!-- `autofocus` here isn't the page-load antipattern the lint rule
           guards against: `showModal()`'s own focusing steps look for it
           within the dialog's subtree, so this is what puts a destructive
           dialog's focus on Cancel instead of the browser's default (the
           first focusable element) landing on the confirm button. -->
      <!-- eslint-disable vuejs-accessibility/no-autofocus -->
      <div class="actions">
        <button class="ghost" type="button" :autofocus="danger" @click="settle(false)">
          {{ cancelLabel }}
        </button>
        <button
          :class="danger ? 'danger' : 'primary'"
          type="button"
          :autofocus="!danger"
          @click="settle(true)"
        >
          {{ confirmLabel }}
        </button>
      </div>
      <!-- eslint-enable vuejs-accessibility/no-autofocus -->
    </dialog>
  </Teleport>
</template>

<style scoped>
.panel {
  color: inherit;
  background: var(--card);
  border: 1px solid var(--line);
  border-top: 3px double var(--brass);
  border-radius: 6px;
  padding: 20px;
  width: calc(100% - 40px);
  max-width: 360px;
}
.panel::backdrop {
  background: rgba(0, 0, 0, 0.45);
}
.body {
  font-size: 14px;
  line-height: 1.5;
  margin: 0 0 18px;
}
.actions {
  display: flex;
  gap: 8px;
}
button {
  font: inherit;
  font-size: 14px;
  padding: 8px 14px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--line);
  background: var(--card);
  color: inherit;
  flex: 1;
}
button.ghost:hover {
  border-color: var(--brass);
}
button.primary {
  background: var(--ok);
  border-color: var(--ok);
  color: var(--paper);
  font-weight: 600;
}
button.danger {
  background: var(--warn);
  border-color: var(--warn);
  color: var(--paper);
  font-weight: 600;
}
</style>
