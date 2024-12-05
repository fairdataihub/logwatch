<script setup lang="ts">
import { generate, count } from "random-words";

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

const showDrawer = ref(false);
const drawerContent = ref({
  level: "",
  message: "",
  type: "",
  created: new Date(),
});

const loading = ref(false);
const liveLogsLoading = ref(false);
const timelinePeriod = ref(300);
const logLimit = ref(750);
const shownLevels = ref<string[]>([]);
const shownTypes = ref<string[]>([]);
const threadMap = ref<Record<number, string>>({});
const shouldGetLiveLogs = ref(false);

const liveLogsInterval = ref<NodeJS.Timeout | null>(null);

// Generate log limit options with a range of 500 to 1500 with a step of 250
const logLimitOptions = Array.from({ length: 5 }, (_, i) => i * 250 + 500).map(
  (value) => ({ label: value.toString(), value }),
);

const timelinePeriodOptions = [
  {
    label: "1 minute",
    value: 60,
  },
  {
    label: "5 minutes",
    value: 300,
  },
  {
    label: "1 hour",
    value: 3600,
  },
  { label: "12 hours", value: 43200 },
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

const typesOptions = [
  {
    label: "Text",
    value: "text",
  },
  {
    label: "JSON",
    value: "json",
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

  const uniqueThreadIDs = Array.from(
    new Set(logsData.value.map((log) => log.thread)),
  );

  for (const threadID of uniqueThreadIDs) {
    if (threadMap.value[threadID]) {
      continue;
    }
    threadMap.value[threadID] = generate() as string;
  }

  threadMap.value["-1"] = "";
}

const filteredLogsData = computed(() => {
  if (shownLevels.value.length === 0) {
    if (shownTypes.value.length === 0) {
      return logsData.value;
    } else {
      return logsData.value.filter((log) =>
        shownTypes.value.includes(log.type),
      );
    }
  } else {
    if (shownTypes.value.length === 0) {
      return logsData.value.filter((log) =>
        shownLevels.value.includes(log.level),
      );
    } else {
      return logsData.value.filter(
        (log) =>
          shownLevels.value.includes(log.level) &&
          shownTypes.value.includes(log.type),
      );
    }
  }
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
      if (logsData.value.length > logLimit.value) {
        logsData.value = logsData.value.slice(0, logLimit.value);
      }

      // Update thread map
      const uniqueThreadIDs = Array.from(
        new Set(logsData.value.map((log) => log.thread)),
      );

      for (const threadID of uniqueThreadIDs) {
        if (threadMap.value[threadID]) {
          continue;
        }
        threadMap.value[threadID] = generate() as string;
      }

      threadMap.value["-1"] = "";
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

const expandJson = (id: number) => {
  const log = logsData.value.find((log) => log.id === id);

  if (!log || log.type !== "json") {
    return;
  }

  drawerContent.value.level = log.level;
  drawerContent.value.message = log.message;
  drawerContent.value.type = log.type;
  drawerContent.value.created = log.created;

  try {
    drawerContent.value.message = JSON.parse(log.message);
  } catch (e: any) {
    console.error(e);
    drawerContent.value.message = JSON.parse(
      JSON.stringify({
        error: "Check the console for more details",
        status: "Could not parse JSON",
        original: log.message,
      }),
    );
  }

  showDrawer.value = true;
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

    <div class="h-full border-t">
      <n-layout has-sider>
        <n-layout-sider
          bordered
          content-style="padding: 10px 24px 24px 24px"
          show-trigger="arrow-circle"
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

                    <span>
                      {{ shownLevels.length }}
                    </span>
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

                    <span>
                      {{ shownTypes.length }}
                    </span>
                  </n-button>
                </div>
              </template>
            </n-collapse-item>
          </n-collapse>
        </n-layout-sider>

        <n-layout class="p-2" id="drawer-target">
          <n-layout-header bordered>
            <div class="mx-3 flex space-x-2 px-3 pb-2 pt-1">
              <div class="w-[17px]"></div>
              <div class="w-[166px]">Time</div>
              <div class="w-[72px]">Status</div>
              <div class="flex-1">Message</div>
              <ClientOnly>
                <div class="flex items-center space-x-1">
                  <Icon name="la:list" />
                  <span class="mr-2 text-xs">
                    {{ filteredLogsData.length || 0 }} logs
                  </span>
                </div>
              </ClientOnly>
              <div v-if="shouldGetLiveLogs">
                <n-divider vertical />
              </div>
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
                @click="expandJson(log.id)"
                class="mx-1 flex items-center space-x-2 rounded-md px-3 py-1 font-mono text-sm transition-all hover:bg-gray-100 hover:bg-opacity-90"
                :class="{
                  'cursor-pointer': log.type === 'json',
                  'bg-slate-100/60':
                    index % 2 === 0 && shownLevels.length === 0,
                  'bg-blue-50': log.level === 'info' && shownLevels.length > 0,
                  '!bg-red-50': log.level === 'error',
                  '!bg-red-100': log.level === 'fatal',
                  '!bg-yellow-50': log.level === 'warn',
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

                <div class="w-[72px]">{{ log.level }}</div>

                <div class="flex-1 break-words">
                  {{ log.message }}
                </div>

                <div class="px-1 text-[10px] text-pink-600">
                  {{ threadMap[log.thread] || "" }}
                </div>

                <Icon
                  name="si:json-fill"
                  v-if="log.type === 'json'"
                  size="20"
                  class="text-pink-500 transition-all hover:text-pink-700"
                />
                <Icon
                  v-else
                  name="dashicons:text"
                  size="20"
                  class="text-pink-500 transition-all hover:text-pink-700"
                />
              </div>
            </n-spin>
          </n-layout-content>
        </n-layout>
      </n-layout>
    </div>

    <n-drawer
      v-model:show="showDrawer"
      :min-width="600"
      :width="600"
      placement="right"
      to="#drawer-target"
      resizable
    >
      <n-drawer-content title="Info" closable>
        <n-list>
          <n-list-item>
            <div class="flex items-center justify-between space-x-2">
              <div class="font-semibold">Level</div>
              <n-flex align="center">
                <p class="capitalize">
                  {{ drawerContent.level }}
                </p>
                <Icon
                  name="ic:round-warning"
                  size="20"
                  v-if="drawerContent.level === 'warn'"
                  class="text-yellow-500"
                />
                <Icon
                  name="ph:info-fill"
                  size="20"
                  v-if="drawerContent.level === 'info'"
                  class="text-blue-500"
                />
                <Icon
                  name="clarity:error-solid"
                  size="20"
                  v-if="drawerContent.level === 'error'"
                  class="text-red-500"
                />
                <Icon
                  name="icon-park-solid:error"
                  size="12"
                  v-if="drawerContent.level === 'fatal'"
                  class="text-red-500"
                />
                <Icon
                  name="mingcute:time-fill"
                  size="20"
                  v-if="drawerContent.level === 'time'"
                  class="text-green-500"
                />
              </n-flex>
            </div>
          </n-list-item>
          <n-list-item>
            <div class="flex items-center justify-between space-x-2">
              <div class="font-semibold">Time</div>

              <p class="font-mono text-sm capitalize">
                {{
                  $dayjs(drawerContent.created).format(
                    "MMMM DD HH:mm:ss.SSS [GMT]Z",
                  )
                }}
              </p>
            </div>
          </n-list-item>
          <n-list-item>
            <n-flex vertical>
              <div class="flex items-center justify-between space-x-2">
                <div class="font-semibold">Content</div>
              </div>

              <div>
                <VueJsonPretty
                  :data="drawerContent.message"
                  show-line
                  :deep="1"
                  highlight-selected-node
                  collapsed-on-click-brackets
                  :show-double-quotes="false"
                />
              </div>
            </n-flex>
          </n-list-item>
        </n-list>
      </n-drawer-content>
    </n-drawer>
  </main>
</template>
