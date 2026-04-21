<script setup lang="ts">
const props = defineProps<{ log: LogEvent }>()

const dayjs = useDayjs()

const parsed = computed(() => {
  if (!props.log.raw) return null
  try {
    return JSON.parse(props.log.raw)
  } catch {
    return { error: 'Could not parse JSON', original: props.log.raw }
  }
})
</script>

<template>
  <div class="border-t border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm">
    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs uppercase tracking-wide text-slate-500">{{ log.level }}</span>
      <span class="text-xs text-slate-400">
        {{ dayjs(log.created).format('MMMM DD HH:mm:ss.SSS [GMT]Z') }}
      </span>
    </div>
    <p class="mb-3 text-slate-700">{{ log.message }}</p>
    <VueJsonPretty
      v-if="parsed"
      :data="parsed"
      show-line
      :deep="2"
      highlight-selected-node
      collapsed-on-click-brackets
      :show-double-quotes="false"
    />
    <span v-else class="text-xs text-slate-400">No JSON content</span>
  </div>
</template>
