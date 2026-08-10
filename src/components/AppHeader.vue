<script setup lang="ts">
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <header>
    <button
      class="theme-toggle"
      :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="toggleTheme"
    >
      {{ isDark ? '☀' : '☾' }}
    </button>
    <p class="eyebrow">Texas Workforce Commission · Work Search Record</p>
    <h1>Work Search Log</h1>
    <p class="sub">
      Keep this for your entire benefit year. TWC may request it for any week, at any time.
    </p>
    <div class="stamp">Verifiable Record</div>
  </header>
</template>

<style scoped>
header {
  padding: 28px 20px 18px;
  border-bottom: 3px double var(--brass);
  background: var(--paper-2);
  position: relative;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brass);
  margin: 0 0 6px;
}
h1 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 28px;
  margin: 0 0 4px;
  color: var(--green-deep);
  letter-spacing: -0.01em;
}
.sub {
  font-size: 12px;
  color: var(--muted);
  margin: 0;
  line-height: 1.5;
  max-width: 46ch;
}
.stamp {
  position: absolute;
  top: 22px;
  right: 56px;
  border: 2px solid var(--stamp);
  color: var(--stamp);
  padding: 6px 10px;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transform: rotate(2deg);
  border-radius: 3px;
  font-weight: 600;
  background: rgba(122, 59, 50, 0.05);
}
@media (max-width: 480px) {
  .stamp {
    display: none;
  }
}
.theme-toggle {
  position: absolute;
  top: 22px;
  right: 18px;
  width: 30px;
  height: 30px;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--card);
  color: var(--brass);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.theme-toggle:hover {
  border-color: var(--brass);
}
</style>
