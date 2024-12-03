<script setup lang="ts">
import type { FormInst } from "naive-ui";

definePageMeta({
  middleware: ["protected"],
});

const route = useRoute();

const { appid } = route.params as { appid: string };

const newChannelModal = ref(false);
const submitLoading = ref(false);

const formRef = ref<FormInst | null>(null);
const formValue = reactive({
  name: "",
  description: "",
});
const rules = {
  name: [{ required: true, message: "Name is required", trigger: "blur" }],
};

const searchTerm = ref("");

const { data: application, error } = await useFetch(
  `/api/applications/${appid}`,
  {
    headers: useRequestHeaders(["cookie"]),
  },
);

if (error.value) {
  push.error("Failed to fetch application.");

  await navigateTo("/applications");
}

const allChannels = computed(() => {
  if (!application.value) return [];

  if (!searchTerm.value) return application.value.channels;

  return application.value?.channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchTerm.value.toLowerCase()),
  );
});

const createChannel = () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      const body = {
        name: formValue.name,
        description: formValue.description,
      };

      submitLoading.value = true;

      await $fetch(`/api/applications/${appid}`, {
        method: "POST",
        headers: useRequestHeaders(["cookie"]),
        body: JSON.stringify(body),
      })
        .then((res) => {
          if ("channel" in res) {
            application.value?.channels.push(res.channel);
            push.success("Channel created successfully.");

            newChannelModal.value = false;

            formValue.name = "";
            formValue.description = "";
          } else {
            push.error("Failed to create channel.");
          }
        })
        .catch((err) => {
          console.log(err);
          push.error("Failed to create channel.");
        })
        .finally(() => {
          submitLoading.value = false;
        });
    } else {
      console.log(errors);
      push.error("Please fill in the required fields.");
    }
  });
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    push.success("Copied to clipboard.");
  });
};

// if the `/` key is pressed, focus the search input
const keypressHandler = (e: KeyboardEvent) => {
  if (e.key === "/") {
    e.preventDefault();
    const searchInput = document.querySelector(
      "input[placeholder='Search...']",
    );

    if (searchInput instanceof HTMLInputElement) {
      searchInput.focus();
    }
  }
};

onMounted(() => {
  window.addEventListener("keypress", keypressHandler);
});

onBeforeUnmount(() => {
  window.removeEventListener("keypress", keypressHandler);
});
</script>

<template>
  <main class="px-3">
    <div
      class="flex w-full items-center justify-between bg-white px-6 py-3 pt-6"
    >
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Channels</h1>
        <p class="text-sm text-slate-600">Manage your channels.</p>
      </div>

      <n-button color="black" @click="newChannelModal = true">
        <template #icon>
          <Icon name="mdi:plus" />
        </template>
        Create a new channel
      </n-button>

      <n-modal v-model:show="newChannelModal" transform-origin="center">
        <n-card
          style="width: 600px"
          title="Create New Channel"
          :bordered="true"
          size="huge"
          aria-modal="true"
        >
          <template #header-extra>
            <n-button @click="newChannelModal = false">
              <template #icon>
                <Icon name="mdi:close" />
              </template>
            </n-button>
          </template>

          <n-form ref="formRef" :model="formValue" :rules="rules">
            <n-form-item label="Channel Name" path="name">
              <n-input
                v-model:value="formValue.name"
                placeholder="Staging"
                maxlength="100"
                show-count
                clearable
                data-1p-ignore
              />
            </n-form-item>

            <n-form-item label="Description" path="description">
              <n-input
                v-model:value="formValue.description"
                placeholder="The staging environment for the app"
                type="textarea"
                maxlength="256"
                show-count
                clearable
              />
            </n-form-item>
          </n-form>

          <template #footer>
            <n-button
              type="primary"
              @click="createChannel"
              color="black"
              :loading="submitLoading"
            >
              <template #icon>
                <Icon name="mdi:plus" />
              </template>

              Create channel
            </n-button>
          </template>
        </n-card>
      </n-modal>
    </div>

    <n-divider />

    <n-flex vertical class="px-4">
      <n-input
        placeholder="Search..."
        size="large"
        class="mb-4"
        v-model:value="searchTerm"
      >
        <template #prefix>
          <Icon name="iconamoon:search-duotone" size="20" class="mr-2" />
        </template>
        <template #suffix>
          <n-flex>
            <Icon name="iconamoon:sign-division-slash-bold" />
          </n-flex>
        </template>
      </n-input>

      <n-card v-for="channel in allChannels || []" :key="channel.id">
        <n-flex align="center" justify="space-between">
          <NuxtLink
            :to="`/applications/${application?.id}/channels/${channel.id}`"
            class="text-base text-blue-500 transition-all hover:text-blue-600 hover:underline"
          >
            {{ channel.name }}
          </NuxtLink>
          <n-flex>
            <n-tooltip trigger="hover">
              <template #trigger>
                <n-tag
                  type="primary"
                  @click="copyToClipboard(channel.id)"
                  class="cursor-copy"
                  >{{ channel.id }}</n-tag
                >
              </template>
              <span> Click to copy channel ID </span>
            </n-tooltip>

            <NuxtLink
              :to="`/applications/${application?.id}/channels/${channel.id}/settings`"
            >
              <n-button size="small" type="primary">
                <template #icon>
                  <Icon name="ic:round-settings" />
                </template>
                Settings
              </n-button>
            </NuxtLink>
          </n-flex>
        </n-flex>

        <p class="min-h-[20px] text-sm text-gray-500">
          {{ channel.description }}
        </p>
      </n-card>
    </n-flex>
  </main>
</template>
