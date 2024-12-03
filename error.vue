<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps({
  error: {
    default: null,
    required: true,
    type: Object as PropType<NuxtError>,
  },
});

const statusCode = props.error?.statusCode ?? 500;

console.log("error.data", props.error);

const showNotAuthorizedError = ref(false);
const requestClosed = ref(false);

if (props.error) {
  const errorCode = props.error.statusMessage ?? "Something went wrong";

  if (statusCode === 403) {
    showNotAuthorizedError.value = true;
  } else if (statusCode === 400) {
    if (errorCode === "request-closed") {
      requestClosed.value = true;

      push.error({
        title: "Request closed",
        message: "This request has been closed. You can't edit it anymore.",
      });
    }
  } else {
    push.error({
      title: "Something went wrong",
    });

    throw new Error("Failed to fetch details from the database");
  }
}
</script>

<template>
  <NuxtLayout name="default">
    <main
      class="grid place-items-center px-6 text-center text-lg text-slate-700 lg:px-8"
    >
      <img
        src="/assets/images/404.svg"
        alt="Page not found"
        class="mx-auto w-96"
      />

      <h1 class="mt-4 text-2xl font-bold">
        {{ error.statusCode }}
      </h1>

      <n-flex vertical size="large">
        <n-flex vertical size="large">
          <h1 class="text-5xl font-bold" v-if="showNotAuthorizedError">
            You are not authorized to view this page
          </h1>
          <h1 class="text-5xl font-bold" v-else>Something went wrong</h1>

          <p class="text-lg" v-if="showNotAuthorizedError">
            You are not authorized to view this page. Please contact the
            administrator.
          </p>
          <p class="text-lg" v-else>
            The page you are looking for might have been removed or is
            temporarily unavailable.
          </p>
        </n-flex>
      </n-flex>
    </main>
  </NuxtLayout>
</template>
