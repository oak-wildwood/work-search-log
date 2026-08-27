<template>
  <div class="empty">
    <div class="mark">✎</div>
    <p>No activities logged yet.</p>
    <p class="hint">Add your first one in the form below — it only takes a minute.</p>
  </div>
</template>

<style scoped>
.empty {
  text-align: center;
  padding: 36px 16px;
  color: var(--muted);
  border: 1px dashed var(--line);
  border-radius: 6px;
}
.mark {
  font-family: var(--font-display);
  font-size: 22px;
  color: var(--brass);
  margin-bottom: 6px;
}
.empty p {
  margin: 2px 0;
  font-size: 14px;
}
.hint {
  font-size: 13px;
  font-style: italic;
}
</style>
