<script setup lang="ts">
definePageMeta({
  middleware: ["protected"],
});
const user = useUser();
</script>

<template>
  <section class="mx-auto max-w-screen-xl p-4">
    <n-flex vertical>
      <h1>Profile</h1>

      <p>This is all the information we know about you.</p>
    </n-flex>

    <n-divider />

    <n-flex vertical size="large">
      <n-card title="GitHub Username">
        <NuxtLink :to="`https://github.com/${user?.username}`" target="_blank">
          {{ user?.username }}
        </NuxtLink>
      </n-card>

      <n-card title="GitHub ID">
        <p class="m-0">
          {{ user?.githubId }}
        </p>
      </n-card>
    </n-flex>
  </section>
</template>
