<script setup lang="ts">
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
const shownLevels = ref<string[]>([]);

const shouldGetLiveLogs = ref(false);

const liveLogsInterval = ref<NodeJS.Timeout | null>(null);

const timelinePeriodOptions = [
  {
    label: "5 minutes",
    value: 300,
  },
  {
    label: "1 hour",
    value: 3600,
  },
  {
    label: "1 day",
    value: 86400,
  },
];

const levelOptions = [
  {
    label: "Debug",
    value: "debug",
  },
  {
    label: "Trace",
    value: "trace",
  },
  {
    label: "Info",
    value: "info",
  },
  {
    label: "Warn",
    value: "warn",
  },
  {
    label: "Error",
    value: "error",
  },
  {
    label: "Fatal",
    value: "fatal",
  },
  {
    label: "Time",
    value: "time",
  },
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
}

const filteredLogsData = computed(() => {
  if (shownLevels.value.length === 0) {
    return logsData.value;
  }

  return logsData.value.filter((log) => shownLevels.value.includes(log.level));
});

const onTimelinePeriodChange = async (value: number) => {
  if (value === 0) {
    // Live
    return;
  }

  if (value === timelinePeriod.value) {
    return;
  }

  timelinePeriod.value = value;

  loading.value = true;

  await $fetch(`/api/applications/${appid}/channels/${channelid}`, {
    headers: useRequestHeaders(["cookie"]),
    query: {
      period: value,
    },
  })
    .then((res) => {
      console.log("onTimelinePeriodChange", res);
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
      if (res.logs.length === 0) {
        return;
      }

      // Add the new logs to the beginning of the array
      logsData.value = [
        ...(res.logs as unknown as LogEvent[]),
        ...(logsData.value as unknown as LogEvent[]),
      ];

      // Keep only the last 1500 logs
      if (logsData.value.length > 1500) {
        logsData.value = logsData.value.slice(0, 1500);
      }
    })
    .catch(() => {
      push.error("Failed to fetch channel data.");
    })
    .finally(() => {
      liveLogsLoading.value = false;
    });
};

const setLiveLogs = async (value: boolean) => {
  if (!value) {
    if (liveLogsInterval.value) {
      clearInterval(liveLogsInterval.value);
    }
    return;
  }

  liveLogsInterval.value = setInterval(async () => {
    // Get the timestamp of the last log
    const lastLogId = logsData.value.length > 0 ? logsData.value[0].id : 0;
    const lastLogTimestamp =
      logsData.value.length > 0 ? dayjs(logsData.value[0].created).unix() : 0;

    await getLiveLogs(lastLogId, lastLogTimestamp);
  }, 2000);
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    push.success("Copied to clipboard.");
  });
};

onMounted(() => {
  channelUrl.value = `${window.location.origin}/api/log/${channelid}`;
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
          <span> Click to copy channel collection endpoint </span>
        </n-tooltip>
      </n-flex>
    </div>

    <div class="h-full border-t p-2">
      <n-layout has-sider>
        <n-layout-sider
          bordered
          content-style="padding: 10px 24px 24px 24px"
          show-trigger="arrow-circle"
        >
          <n-collapse
            :default-expanded-names="['Timeline', 'Live', 'Level']"
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

                    <span>
                      {{ shownLevels.length }}
                    </span>
                  </n-button>
                </div>
              </template>
            </n-collapse-item>
          </n-collapse>
        </n-layout-sider>

        <n-layout class="">
          <n-layout-header bordered>
            <div class="mx-3 flex space-x-2 px-3 pb-2 pt-1">
              <div class="w-[17px]"></div>
              <div class="w-[166px]">Time</div>
              <div class="w-[72px]">Status</div>
              <div class="flex-1">Message</div>
              <TransitionFade>
                <n-tag
                  round
                  :bordered="false"
                  type="info"
                  v-if="shouldGetLiveLogs"
                >
                  Loading new logs
                  <template #icon>
                    <Icon name="svg-spinners:6-dots-scale-middle" />
                  </template>
                </n-tag>
              </TransitionFade>
            </div>
          </n-layout-header>
          <n-layout-content class="px-3 py-2">
            <n-spin :show="loading">
              <div
                class="mx-1 flex cursor-pointer items-center space-x-2 rounded-md px-3 py-1 font-mono text-sm transition-all hover:bg-gray-100"
                :class="{
                  'bg-slate-100': index % 2 === 0 && shownLevels.length === 0,
                  'bg-blue-50': log.level === 'info' && shownLevels.length > 0,
                  'bg-red-50': log.level === 'error',
                  'bg-red-100': log.level === 'fatal',
                  'bg-yellow-50': log.level === 'warn',
                }"
                v-for="(log, index) in filteredLogsData"
                :key="log.id"
              >
                <div class="flex w-[17px] items-center justify-center">
                  <Icon
                    name="ic:round-warning"
                    size="20"
                    v-if="log.level === 'warn'"
                    class="text-yellow-500"
                  />
                  <Icon
                    name="ph:info-fill"
                    size="20"
                    v-if="log.level === 'info'"
                    class="text-blue-500"
                  />
                  <Icon
                    name="clarity:error-solid"
                    size="20"
                    v-if="log.level === 'error'"
                    class="text-red-500"
                  />
                  <Icon
                    name="icon-park-solid:error"
                    size="12"
                    v-if="log.level === 'fatal'"
                    class="text-red-500"
                  />
                  <Icon
                    name="mingcute:time-fill"
                    size="20"
                    v-if="log.level === 'time'"
                    class="text-green-500"
                  />
                </div>
                <div class="w-[166px]">
                  {{ $dayjs(log.created).format("MMM DD HH:mm:ss.SSS") }}
                </div>
                <div class="w-[72px]">
                  {{ log.level }}
                </div>
                <div class="flex-1">{{ log.message }}</div>
              </div>
            </n-spin>
          </n-layout-content>
        </n-layout>
      </n-layout>
    </div>
  </main>
</template>
