<script setup lang="ts">
const props = defineProps<{
  log: LogEvent
  threadLabel: string
  isNew?: boolean
}>()

const dayjs = useDayjs()

const isOpen = ref(false)

const levelBorderClass = computed(() => {
  switch (props.log.level) {
    case 'info':  return 'border-l-blue-400'
    case 'warn':  return 'border-l-yellow-400'
    case 'error': return 'border-l-red-400'
    case 'fatal': return 'border-l-red-600'
    case 'time':  return 'border-l-green-400'
    default:      return 'border-l-slate-200'
  }
})

const levelBgClass = computed(() => {
  switch (props.log.level) {
    case 'info':  return 'bg-blue-50/50'
    case 'warn':  return 'bg-yellow-50/50'
    case 'error': return 'bg-red-50/50'
    case 'fatal': return 'bg-red-100/60'
    default:      return ''
  }
})

const relativeTime = computed(() => dayjs(props.log.created).fromNow())
const isJson = computed(() => props.log.type === 'json')
</script>

<template>
  <div
    class="relative border-l-[3px] border-b border-b-slate-100/80 transition-colors"
    :class="[levelBorderClass, levelBgClass]"
  >
    <!-- New log highlight overlay — fades out without touching the row's bg color -->
    <div
      v-if="isNew"
      class="pointer-events-none absolute inset-0 animate-new-log bg-blue-200/50"
    />

    <div
      class="relative grid items-center gap-2 px-3 py-1.5 font-mono text-sm hover:bg-black/[0.03]"
      :class="{ 'cursor-pointer': isJson }"
      style="grid-template-columns: 20px 90px 52px 1fr auto 20px"
      @click="isJson ? (isOpen = !isOpen) : undefined"
    >
      <!-- Level icon -->
      <div class="flex justify-center">
        <Icon name="ic:round-warning"      size="15" v-if="log.level === 'warn'"  class="text-yellow-500" />
        <Icon name="ph:info-fill"          size="15" v-else-if="log.level === 'info'"  class="text-blue-500" />
        <Icon name="clarity:error-solid"   size="15" v-else-if="log.level === 'error'" class="text-red-500" />
        <Icon name="icon-park-solid:error" size="11" v-else-if="log.level === 'fatal'" class="text-red-600" />
        <Icon name="mingcute:time-fill"    size="15" v-else-if="log.level === 'time'"  class="text-green-500" />
      </div>

      <!-- Relative time with full timestamp on hover -->
      <n-tooltip trigger="hover">
        <template #trigger>
          <span class="truncate text-xs text-slate-500 select-none">{{ relativeTime }}</span>
        </template>
        {{ dayjs(log.created).format('MMM DD HH:mm:ss.SSS') }}
      </n-tooltip>

      <!-- Level text -->
      <span class="text-xs uppercase tracking-wide text-slate-500">{{ log.level }}</span>

      <!-- Message -->
      <span class="truncate text-slate-800">{{ log.message }}</span>

      <!-- Thread badge -->
      <n-tag v-if="threadLabel" size="small" :bordered="false" type="info" class="!text-[10px] !px-1.5">
        {{ threadLabel }}
      </n-tag>
      <span v-else />

      <!-- Type icon -->
      <Icon name="si:json-fill"    v-if="isJson" size="15" class="text-pink-400" />
      <Icon name="dashicons:text"  v-else         size="15" class="text-slate-300" />
    </div>

    <!-- Inline JSON expansion -->
    <Transition name="log-expand">
      <LogDetail v-if="isOpen && isJson" :log="log" />
    </Transition>
  </div>
</template>

<style scoped>
@keyframes new-log {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
.animate-new-log {
  animation: new-log 2s ease-out forwards;
}

.log-expand-enter-active,
.log-expand-leave-active {
  transition: all 0.18s ease;
  overflow: hidden;
}
.log-expand-enter-from,
.log-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.log-expand-enter-to,
.log-expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
