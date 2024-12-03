<script setup lang="ts">
const user = useUser();

if (user.value) {
  navigateTo("/applications");
}
</script>

<template>
  <main>
    <section
      class="mx-auto flex max-w-screen-xl flex-col justify-between gap-6 px-4 sm:gap-10 md:gap-16 md:px-8 lg:flex-row"
    >
      <div
        class="flex flex-col justify-center sm:text-center lg:py-12 lg:text-left xl:w-5/12 xl:py-24"
      >
        <h1
          class="mb-4 text-4xl font-bold text-black sm:text-5xl md:mb-4 md:text-5xl"
        >
          A better log watcher...
        </h1>

        <h2>Coming soon!</h2>
      </div>
    </section>
  </main>
</template>
