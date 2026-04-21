<script setup lang="ts">
import { faker } from "@faker-js/faker";

definePageMeta({
  middleware: ["protected"],
});

const route = useRoute();

const dayjs = useDayjs();

const { appid, channelid } = route.params as {
  appid: string;
  channelid: string;
};

const channelUrl = ref("");

const loading = ref(false);
const liveLogsLoading = ref(false);
const timelinePeriod = ref(300);
const logLimit = ref(750);
const shownLevels = ref<string[]>([]);
const shownTypes = ref<string[]>([]);
const threadMap = ref<Record<number, string>>({});
const shouldGetLiveLogs = ref(false);

const pendingLogs = ref<LogEvent[]>([]);
const searchTerm = ref("");
const logListEl = ref<HTMLElement | null>(null);
const newLogIds = ref<Set<number>>(new Set());

const threadCodes = faker.helpers.shuffle([
  "Alpha",
  "Beta",
  "Charlie",
  "Delta",
  "Echo",
  "Foxtrot",
  "Golf",
  "Hotel",
  "India",
  "Juliet",
  "Kilo",
  "Lima",
  "Mike",
  "November",
  "Oscar",
  "Papa",
  "Quebec",
  "Romeo",
  "Sierra",
  "Tango",
  "Uniform",
  "Victor",
  "Whiskey",
  "X-Ray",
  "Yankee",
  "Zulu",
]);

const liveLogsInterval = ref<NodeJS.Timeout | null>(null);

const logLimitOptions = Array.from({ length: 5 }, (_, i) => i * 250 + 500).map(
  (value) => ({ label: value.toString(), value }),
);

const timelinePeriodOptions = [
  { label: "1 minute", value: 60 },
  { label: "5 minutes", value: 300 },
  { label: "1 hour", value: 3600 },
  { label: "12 hours", value: 43200 },
  { label: "1 day", value: 86400 },
];

const levelOptions = [
  { label: "Debug", value: "debug" },
  { label: "Trace", value: "trace" },
  { label: "Info", value: "info" },
  { label: "Warn", value: "warn" },
  { label: "Error", value: "error" },
  { label: "Fatal", value: "fatal" },
  { label: "Time", value: "time" },
];

const typesOptions = [
  { label: "Text", value: "text" },
  { label: "JSON", value: "json" },
];

const logsData = ref<LogEvent[]>([]);

const { data, error } = await useFetch(
  `/api/applications/${appid}/channels/${channelid}`,
  {
    headers: useRequestHeaders(["cookie"]),
    query: {
      period: timelinePeriod.value,
    },
  },
);

if (error.value) {
  push.error("Failed to fetch channel data.");
  await navigateTo("/applications");
}

if (data.value) {
  logsData.value = data.value.logs as unknown as LogEvent[];

  const uniqueThreadIDs = Array.from(
    new Set(logsData.value.map((log) => log.thread)),
  );

  for (const [idx, threadID] of uniqueThreadIDs.entries()) {
    if (threadMap.value[threadID]) {
      continue;
    }
    threadMap.value[threadID] = `${threadCodes[idx]} [${idx + 1}]`;
  }

  threadMap.value["-1"] = "";
}

/** Applies level, type, and message search filters to the master log array. */
const filteredLogsData = computed(() => {
  let result = logsData.value;

  if (shownLevels.value.length > 0) {
    result = result.filter((log) => shownLevels.value.includes(log.level));
  }

  if (shownTypes.value.length > 0) {
    result = result.filter((log) => shownTypes.value.includes(log.type));
  }

  if (searchTerm.value.trim()) {
    const term = searchTerm.value.toLowerCase();
    result = result.filter((log) => log.message.toLowerCase().includes(term));
  }

  return result;
});

/** Reloads logs from the server when the user picks a different timeline period. */
const onTimelinePeriodChange = async (value: number) => {
  if (value === 0 || value === timelinePeriod.value) return;

  timelinePeriod.value = value;
  loading.value = true;
  pendingLogs.value = [];
  newLogIds.value = new Set();

  await $fetch(`/api/applications/${appid}/channels/${channelid}`, {
    headers: useRequestHeaders(["cookie"]),
    query: { period: value },
  })
    .then((res) => {
      logsData.value = res.logs as unknown as LogEvent[];
    })
    .catch(() => {
      push.error("Failed to fetch channel data.");
      navigateTo("/applications");
    })
    .finally(() => {
      loading.value = false;
    });
};

/** Assigns a human-readable label (e.g. "Alpha [1]") to any thread ID not yet tracked. */
const updateThreadMap = (logs: LogEvent[]) => {
  const uniqueThreadIDs = Array.from(new Set(logs.map((log) => log.thread)));

  for (const [idx, threadID] of uniqueThreadIDs.entries()) {
    if (threadMap.value[threadID]) continue;
    threadMap.value[threadID] = `${threadCodes[idx]} [${idx + 1}]`;
  }

  threadMap.value["-1"] = "";
};

/** Moves buffered live logs into the visible list and scrolls to the top. */
const flushPendingLogs = () => {
  const incoming = pendingLogs.value;
  newLogIds.value = new Set(incoming.map((l) => l.id));
  logsData.value = [...incoming, ...logsData.value].slice(0, logLimit.value);
  pendingLogs.value = [];
  nextTick(() => logListEl.value?.scrollTo({ top: 0, behavior: "smooth" }));
  setTimeout(() => { newLogIds.value = new Set(); }, 2000);
};

/**
 * Fetches logs newer than lastLogId and queues them in pendingLogs.
 * Auto-flushes immediately if the user is already scrolled to the top.
 */
const getLiveLogs = async (lastLogId: number, lastLogTimestamp: number) => {
  liveLogsLoading.value = true;

  await $fetch(`/api/applications/${appid}/channels/${channelid}/live`, {
    headers: useRequestHeaders(["cookie"]),
    query: {
      ...(lastLogId && { lastLogId }),
      ...(lastLogTimestamp && { lastLogTimestamp }),
    },
  })
    .then((res) => {
      if (res.logs.length === 0) return;

      const incoming = res.logs as unknown as LogEvent[];
      pendingLogs.value = [...incoming, ...pendingLogs.value].slice(0, logLimit.value);

      const allLogs = [...pendingLogs.value, ...logsData.value];
      updateThreadMap(allLogs);

      const isAtTop = (logListEl.value?.scrollTop ?? 0) < 50;
      if (isAtTop) flushPendingLogs();
    })
    .catch(() => {
      push.error("Failed to fetch live logs.");
    })
    .finally(() => {
      liveLogsLoading.value = false;
    });
};

/**
 * Starts or stops the 2-second live polling interval.
 * Uses Math.max across all known IDs to avoid re-fetching already-seen logs.
 */
const setLiveLogs = async (value: boolean) => {
  if (!value) {
    flushPendingLogs();
    if (liveLogsInterval.value) {
      clearInterval(liveLogsInterval.value);
    }
    return;
  }

  liveLogsInterval.value = setInterval(async () => {
    const allKnown = [...pendingLogs.value, ...logsData.value];

    const lastLogId =
      allKnown.length > 0 ? Math.max(...allKnown.map((l) => l.id)) : 0;

    const lastLogTimestamp =
      allKnown.length > 0
        ? Math.max(...allKnown.map((l) => dayjs(l.created).unix()))
        : 0;

    await getLiveLogs(lastLogId, lastLogTimestamp);
  }, 2000);
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    push.success("Copied to clipboard.");
  });
};

const onLogListScroll = () => {
  if (pendingLogs.value.length > 0 && (logListEl.value?.scrollTop ?? 0) < 50) {
    flushPendingLogs();
  }
};

onMounted(() => {
  channelUrl.value = `${window.location.origin}/api/log/${channelid}`;
  logListEl.value?.addEventListener('scroll', onLogListScroll, { passive: true });
});

onUnmounted(() => {
  logListEl.value?.removeEventListener('scroll', onLogListScroll);
});
</script>

<template>
  <main>
    <div class="flex w-full items-center justify-between bg-white px-6 py-6">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ data?.channel.name }}
      </h1>

      <n-flex>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-tag
              round
              :bordered="false"
              type="primary"
              @click="copyToClipboard(channelUrl)"
            >
              {{ channelUrl }}
              <template #icon>
                <Icon name="solar:copy-bold" />
              </template>
            </n-tag>
          </template>
          <span>Click to copy channel collection endpoint</span>
        </n-tooltip>
      </n-flex>
    </div>

    <div class="h-full border-t">
      <n-layout has-sider>
        <n-layout-sider
          bordered
          content-style="padding: 10px 16px 24px 16px"
          show-trigger="arrow-circle"
          :width="200"
        >
          <n-collapse
            :default-expanded-names="[
              'Timeline',
              'Live',
              'Level',
              'Limit',
              'Type',
            ]"
            :trigger-areas="['main', 'arrow']"
          >
            <n-collapse-item title="Live" name="Live">
              <n-switch
                v-model:value="shouldGetLiveLogs"
                size="large"
                @update:value="setLiveLogs"
                :loading="liveLogsLoading"
              >
                <template #icon>
                  <Icon name="meteocons:lightning-bolt-fill" />
                </template>
              </n-switch>
            </n-collapse-item>

            <n-collapse-item title="Timeline" name="Timeline">
              <n-select
                v-model:value="timelinePeriod"
                :options="timelinePeriodOptions"
                :on-update:value="onTimelinePeriodChange"
                :loading="loading"
              />
            </n-collapse-item>

            <n-collapse-item title="Limit" name="Limit">
              <n-select
                v-model:value="logLimit"
                :options="logLimitOptions"
                :disabled="!shouldGetLiveLogs"
              />
            </n-collapse-item>

            <n-collapse-item title="Level" name="Level">
              <n-checkbox-group v-model:value="shownLevels">
                <n-flex vertical>
                  <n-checkbox
                    v-for="level in levelOptions"
                    :key="level.value"
                    :value="level.value"
                  >
                    {{ level.label }}
                  </n-checkbox>
                </n-flex>
              </n-checkbox-group>

              <template #header-extra>
                <div class="h-[28px] w-[62px]">
                  <n-button
                    quaternary
                    round
                    size="small"
                    @click="shownLevels = []"
                    v-show="shownLevels.length > 0"
                  >
                    <template #icon>
                      <Icon name="lets-icons:close-ring" />
                    </template>
                    <span>{{ shownLevels.length }}</span>
                  </n-button>
                </div>
              </template>
            </n-collapse-item>

            <n-collapse-item title="Type" name="Type">
              <n-checkbox-group v-model:value="shownTypes">
                <n-flex vertical>
                  <n-checkbox
                    v-for="type in typesOptions"
                    :key="type.value"
                    :value="type.value"
                  >
                    {{ type.label }}
                  </n-checkbox>
                </n-flex>
              </n-checkbox-group>

              <template #header-extra>
                <div class="h-[28px] w-[62px]">
                  <n-button
                    quaternary
                    round
                    size="small"
                    @click="shownTypes = []"
                    v-show="shownTypes.length > 0"
                  >
                    <template #icon>
                      <Icon name="lets-icons:close-ring" />
                    </template>
                    <span>{{ shownTypes.length }}</span>
                  </n-button>
                </div>
              </template>
            </n-collapse-item>
          </n-collapse>
        </n-layout-sider>

        <n-layout>
          <LogToolbar
            :log-count="filteredLogsData.length"
            :pending-count="pendingLogs.length"
            :is-live="shouldGetLiveLogs"
            v-model:searchTerm="searchTerm"
            @flush-pending="flushPendingLogs"
          />
          <n-layout-content>
            <n-spin :show="loading">
              <div
                ref="logListEl"
                class="overflow-y-auto"
                style="height: calc(100vh - 165px)"
              >
                <div
                  class="sticky top-0 z-10 grid items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-slate-400"
                  style="grid-template-columns: 20px 90px 52px 1fr auto 20px"
                >
                  <div />
                  <span>Time</span>
                  <span>Level</span>
                  <span>Message</span>
                  <span>Thread</span>
                  <div />
                </div>
                <LogRow
                  v-for="log in filteredLogsData"
                  :key="log.id"
                  :log="log"
                  :thread-label="threadMap[log.thread] || ''"
                  :is-new="newLogIds.has(log.id)"
                />
                <div
                  v-if="filteredLogsData.length === 0 && !loading"
                  class="py-16 text-center text-sm text-slate-400"
                >
                  No logs to display
                </div>
              </div>
            </n-spin>
          </n-layout-content>
        </n-layout>
      </n-layout>
    </div>
  </main>
</template>
