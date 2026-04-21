<script setup lang="ts">
defineProps<{
  logCount: number;
  pendingCount: number;
  isLive: boolean;
  searchTerm: string;
}>();

const emit = defineEmits<{
  "update:searchTerm": [value: string];
  flushPending: [];
}>();
</script>

<template>
  <div class="sticky top-0 z-10 border-b border-slate-200 bg-white">
    <!-- Pending flush banner -->
    <Transition name="banner-fade">
      <button
        v-if="pendingCount > 0"
        @click="emit('flushPending')"
        class="w-full bg-blue-500 py-1 text-center text-xs font-medium text-white transition-colors hover:bg-blue-600"
      >
        ▲ {{ pendingCount }} new log{{ pendingCount !== 1 ? "s" : "" }} (click
        to load)
      </button>
    </Transition>

    <!-- Toolbar row -->
    <div class="flex items-center gap-3 px-4 py-2">
      <n-input
        :value="searchTerm"
        @update:value="emit('update:searchTerm', $event)"
        placeholder="Search messages..."
        size="small"
        clearable
        class="max-w-xs"
      >
        <template #prefix>
          <Icon name="ph:magnifying-glass" size="14" class="text-slate-400" />
        </template>
      </n-input>

      <div class="ml-auto flex items-center gap-2 text-xs text-slate-500">
        <Icon name="la:list" size="14" />
        <span>{{ logCount }} logs</span>
      </div>

      <n-tag v-if="isLive" round :bordered="false" type="success" size="small">
        Live
        <template #icon>
          <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
        </template>
      </n-tag>
    </div>
  </div>
</template>

<style scoped>
.banner-fade-enter-active,
.banner-fade-leave-active {
  transition: all 0.15s ease;
  overflow: hidden;
}
.banner-fade-enter-from,
.banner-fade-leave-to {
  opacity: 0;
  max-height: 0;
}
.banner-fade-enter-to,
.banner-fade-leave-from {
  opacity: 1;
  max-height: 40px;
}
</style>
