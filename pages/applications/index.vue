<script setup lang="ts">
import type { FormInst } from "naive-ui";

definePageMeta({
  middleware: ["protected"],
});

const newApplicationModal = ref(false);
const submitLoading = ref(false);

const formRef = ref<FormInst | null>(null);
const formValue = reactive({
  name: "",
  description: "",
});
const rules = {
  name: [{ required: true, message: "Name is required", trigger: "blur" }],
};

const { data: applications, error } = await useFetch("/api/applications", {
  headers: useRequestHeaders(["cookie"]),
});

const createApplication = () => {
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      const body = {
        name: formValue.name,
        description: formValue.description,
      };

      submitLoading.value = true;

      await $fetch("/api/applications", {
        method: "POST",
        headers: useRequestHeaders(["cookie"]),
        body: JSON.stringify(body),
      })
        .then((res) => {
          if ("application" in res) {
            applications.value?.push({ ...res.application, channels: [] });
            push.success("Application created successfully.");

            newApplicationModal.value = false;

            formValue.name = "";
            formValue.description = "";
          } else {
            push.error("Failed to create application.");
          }
        })
        .catch((err) => {
          console.log(err);
          push.error("Failed to create application.");
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
</script>

<template>
  <main class="px-3">
    <div
      class="flex w-full items-center justify-between bg-white px-6 py-3 pt-6"
    >
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Applications</h1>

        <p class="text-sm text-slate-600">
          Manage your applications and their channels.
        </p>
      </div>

      <n-button color="black" @click="newApplicationModal = true">
        <template #icon>
          <Icon name="mdi:plus" />
        </template>
        Create a new application
      </n-button>

      <n-modal v-model:show="newApplicationModal" transform-origin="center">
        <n-card
          style="width: 600px"
          title="Create New Application"
          :bordered="true"
          size="huge"
          aria-modal="true"
        >
          <template #header-extra>
            <n-button @click="newApplicationModal = false">
              <template #icon>
                <Icon name="mdi:close" />
              </template>
            </n-button>
          </template>

          <n-form ref="formRef" :model="formValue" :rules="rules">
            <n-form-item label="Name" path="name">
              <n-input
                v-model:value="formValue.name"
                placeholder="My awesome app"
                maxlength="100"
                show-count
                clearable
              />
            </n-form-item>

            <n-form-item label="Description" path="description">
              <n-input
                v-model:value="formValue.description"
                placeholder="A short description"
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
              @click="createApplication"
              color="black"
              :loading="submitLoading"
            >
              Create
            </n-button>
          </template>
        </n-card>
      </n-modal>
    </div>

    <n-divider />

    <div class="divide divide-y px-5">
      <NuxtLink
        :to="`/applications/${application.id}`"
        v-for="application in applications"
        :key="application.id"
        class="flex min-h-[65px] cursor-pointer items-center px-2 py-3 transition-all hover:bg-slate-100"
      >
        <div class="flex-1">
          <div class="flex flex-col">
            <NuxtLink :to="`/applications/${application.id}`">
              <span
                class="text-blue-500 transition-all hover:text-blue-600 hover:underline"
              >
                {{ application.name }}
              </span>
            </NuxtLink>

            <p class="text-gray-500">{{ application.description }}</p>
          </div>
        </div>

        <n-tag type="info">
          {{
            application.channels.length
              ? `${application.channels.length} channel${application.channels.length > 1 ? "s" : ""}`
              : "No channels added"
          }}
        </n-tag>
      </NuxtLink>
    </div>
  </main>
</template>
