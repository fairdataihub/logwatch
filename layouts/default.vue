<script setup lang="ts">
const devMode = process.env.NODE_ENV === "development";

const route = useRoute();

const appid = ref<string | null>(null);
const channelid = ref<string | null>(null);

const allApplications = ref<
  {
    label: string;
    value: string;
  }[]
>([]);

const allChannels = ref<
  {
    label: string;
    value: string;
  }[]
>([]);

const { data: applications, error } = await useFetch("/api/applications", {
  headers: useRequestHeaders(["cookie"]),
});

if (applications.value) {
  allApplications.value = applications.value.map((app) => {
    return {
      label: app.name,
      value: app.id,
    };
  });
}

const selectedApplication = computed(() => {
  return allApplications.value.find((app) => app.value === appid.value);
});

const selectedChannel = computed(() => {
  return allChannels.value.find((channel) => channel.value === channelid.value);
});

watchEffect(() => {
  const aid = route.params.appid as string;
  const cid = route.params.channelid as string;

  if (aid) {
    appid.value = aid;
  }

  if (cid) {
    channelid.value = cid;

    if (applications.value) {
      const app = applications.value.find((app) => app.id === aid);

      if (app) {
        allChannels.value = app.channels.map((channel) => {
          return {
            label: channel.name,
            value: channel.id,
          };
        });
      }
    }
  }
});

const updateAppRoute = (value: string) => {
  channelid.value = null;
  if (value) {
    navigateTo(`/applications/${value}`);
  } else {
    navigateTo("/");
  }
};

const updateChannelRoute = (value: string) => {
  if (appid.value && value) {
    navigateTo(`/applications/${appid.value}/channels/${value}`);
  } else if (appid.value) {
    navigateTo(`/applications/${appid.value}`);
  } else {
    navigateTo("/");
  }
};
</script>

<template>
  <div
    class="relative mx-auto flex h-full min-h-screen w-full flex-col"
    :class="{ 'debug-screens': devMode }"
  >
    <div class="relative z-20 mx-auto w-full border-b px-5">
      <header class="mb-2 flex items-center justify-between pb-2 pt-4">
        <nav class="items-center">
          <n-flex>
            <NuxtLink
              href="/"
              aria-label="logo"
              class="inline-flex items-center gap-2.5"
            >
              <img
                src="https://www.svgrepo.com/show/227168/log-wood.svg"
                alt="logwatch"
                class="h-8 w-8"
              />

              <span class="text-xl font-bold"> logwatch </span>
            </NuxtLink>

            <TransitionFade>
              <n-flex v-if="appid">
                <svg
                  fill="none"
                  shape-rendering="geometricPrecision"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1"
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  class="h-8 w-8 text-slate-300"
                >
                  <path d="M16.88 3.549L7.12 20.451"></path>
                </svg>

                <n-popselect
                  v-model:value="appid"
                  :options="allApplications"
                  @update:value="updateAppRoute"
                >
                  <NuxtLink
                    :href="`/applications/${appid}`"
                    class="flex items-center font-medium transition-all hover:text-slate-700"
                  >
                    {{
                      selectedApplication
                        ? selectedApplication.label
                        : "Unknown Application"
                    }}
                  </NuxtLink>
                </n-popselect>
              </n-flex>
            </TransitionFade>

            <TransitionFade>
              <n-flex v-if="channelid">
                <svg
                  fill="none"
                  shape-rendering="geometricPrecision"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1"
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  class="h-8 w-8 text-slate-300"
                >
                  <path d="M16.88 3.549L7.12 20.451"></path>
                </svg>

                <n-popselect
                  v-model:value="channelid"
                  :options="allChannels"
                  v-if="channelid"
                  @update:value="updateChannelRoute"
                >
                  <NuxtLink
                    :href="`/applications/${appid}/channels/${channelid}`"
                    class="flex items-center font-medium transition-all hover:text-slate-700"
                  >
                    {{
                      selectedChannel
                        ? selectedChannel.label
                        : "Unknown Channel"
                    }}
                  </NuxtLink>
                </n-popselect>
              </n-flex>
            </TransitionFade>
          </n-flex>
        </nav>

        <nav class="hidden items-center gap-4 lg:flex">
          <NuxtLink
            href="/applications"
            class="font-medium transition-all hover:text-slate-700"
          >
            Applications
          </NuxtLink>

          <NuxtLink
            href="https://github.com/megasanjay/logwatch"
            class="font-medium transition-all hover:text-slate-700"
          >
            <div class="flex items-center">
              GitHub
              <Icon name="gridicons:external" size="15" class="ml-1" />
            </div>
          </NuxtLink>

          <div>
            <ProfileStatus />
          </div>
        </nav>
      </header>
    </div>

    <div class="relative z-10 grow">
      <slot />
    </div>
  </div>
</template>
