<script setup lang="ts">
const props = defineProps<{ log: LogEvent }>()

const dayjs = useDayjs()
const viewMode = ref<'formatted' | 'raw'>('formatted')

const parsed = computed(() => {
  if (!props.log.raw) return null
  try {
    return JSON.parse(props.log.raw)
  } catch {
    return { error: 'Could not parse JSON', original: props.log.raw }
  }
})

const viewOptions = [
  { label: 'Formatted', value: 'formatted' },
  { label: 'Stringified', value: 'raw' },
]
</script>

<template>
  <div class="border-t border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm">
    <div class="mb-3 flex items-center justify-between">
      <span class="text-xs uppercase tracking-wide text-slate-500">{{ log.level }}</span>
      <div class="flex items-center gap-3">
        <div v-if="parsed" class="flex rounded border border-slate-200 text-xs overflow-hidden">
          <button
            v-for="opt in viewOptions"
            :key="opt.value"
            @click="viewMode = opt.value as 'formatted' | 'raw'"
            class="px-2 py-0.5 transition-colors"
            :class="viewMode === opt.value
              ? 'bg-slate-200 text-slate-700'
              : 'text-slate-400 hover:text-slate-600'"
          >
            {{ opt.label }}
          </button>
        </div>
        <span class="text-xs text-slate-400">
          {{ dayjs(log.created).format('MMMM DD HH:mm:ss.SSS [GMT]Z') }}
        </span>
      </div>
    </div>

    <p class="mb-3 text-slate-700">{{ log.message }}</p>

    <template v-if="parsed">
      <VueJsonPretty
        v-if="viewMode === 'formatted'"
        :data="parsed"
        show-line
        :deep="2"
        highlight-selected-node
        collapsed-on-click-brackets
        :show-double-quotes="false"
      />
      <pre v-else class="overflow-x-auto whitespace-pre-wrap break-all text-xs text-slate-700">{{ log.raw }}</pre>
    </template>
    <span v-else class="text-xs text-slate-400">No JSON content</span>
  </div>
</template>
