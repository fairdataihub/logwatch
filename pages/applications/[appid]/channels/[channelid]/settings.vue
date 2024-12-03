<script setup lang="ts">
definePageMeta({
  middleware: ["protected"],
});

const route = useRoute();

const { appid, channelid } = route.params as {
  appid: string;
  channelid: string;
};

const saveLoading = ref(false);
const channelName = ref("");
const channelDescription = ref("");

const { data, error } = await useFetch(
  `/api/applications/${appid}/channels/${channelid}`,
  {
    headers: useRequestHeaders(["cookie"]),
  },
);

if (error.value) {
  push.error("Failed to fetch channel.");

  await navigateTo(`/applications/${appid}`);
}

if (data.value) {
  channelName.value = data.value?.channel.name;
  channelDescription.value = data.value?.channel.description;
}

const saveChannelSettings = async () => {
  saveLoading.value = true;

  await $fetch(`/api/applications/${appid}/channels/${channelid}`, {
    method: "PUT",
    headers: useRequestHeaders(["cookie"]),
    body: JSON.stringify({
      name: channelName.value,
      description: channelDescription.value,
    }),
  })
    .then((res) => {
      if ("channel" in res) {
        push.success("Channel settings saved successfully.");

        window.location.reload();
      } else {
        push.error("Failed to save channel settings.");
      }
    })
    .catch(() => {
      push.error("Failed to save channel settings.");
    })
    .finally(() => {
      saveLoading.value = false;
    });
};
</script>

<template>
  <main class="px-3">
    <div
      class="flex w-full items-center justify-between bg-white px-6 py-3 pt-6"
    >
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
        <p class="text-sm text-slate-600">Manage your app channel here</p>
      </div>

      <n-button
        type="primary"
        size="large"
        color="black"
        :loading="saveLoading"
        :disabled="channelName.trim() === ''"
        @click="saveChannelSettings"
      >
        <template #icon>
          <Icon name="ic:round-save" />
        </template>
        Save
      </n-button>
    </div>

    <n-divider />

    <n-flex vertical :size="[20, 40]" class="px-6">
      <n-flex vertical>
        <p class="text-sm">Channel Name</p>

        <n-input
          v-model:value="channelName"
          placeholder="Channel Name"
          class="w-full"
          size="large"
        />
      </n-flex>

      <n-flex vertical>
        <p class="text-sm">Channel Description</p>

        <n-input
          v-model:value="channelDescription"
          placeholder="Channel Description"
          class="w-full"
          type="textarea"
          size="large"
        />

        <template #action>
          <div class="flex items-center justify-end"></div>
        </template>
      </n-flex>
    </n-flex>
  </main>
</template>
