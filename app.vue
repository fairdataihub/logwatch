<template>
  <NaiveConfig :theme-config="themeConfig">
    <Notivue v-slot="item">
      <NotivueSwipe :item="item">
        <Notifications :item="item" :theme="pastelTheme" />
      </NotivueSwipe>
    </Notivue>

    <NuxtLoadingIndicator color="#be185d" :height="5" />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </NaiveConfig>
</template>

<script setup lang="ts">
import { pastelTheme } from "notivue";
import { faker } from "@faker-js/faker";

const themeConfig = {
  dark: {}, // Theme options applied on dark mode
  light: {}, // Theme options applied on light mode
  mobile: {}, // Theme options applied on mobile only
  mobileOrTablet: {}, // Theme options applied on mobile and tablet
  shared: {
    common: {
      primaryColor: "#1e8b71",
      primaryColorHover: "#26ae8d",
      primaryColorPressed: "#229d7f",
    },
    Tree: {
      fontSize: "17px",
    },
  }, // Common theme options
};

useHead({
  title: "logwatch",
  bodyAttrs: {
    class: "test",
  },
  link: [
    { href: "/favicon.ico", rel: "icon", type: "image/x-icon" },
    {
      href: "/apple-touch-icon.png",
      rel: "apple-touch-icon",
      sizes: "180x180",
    },
    {
      href: "/favicon-16x16.png",
      rel: "icon",
      sizes: "16x16",
      type: "image/png",
    },
    {
      href: "/favicon-32x32.png",
      rel: "icon",
      sizes: "32x32",
      type: "image/png",
    },
    {
      color: "#5bbad5",
      href: "/safari-pinned-tab.svg",
      rel: "mask-icon",
    },
    {
      href: "/site.webmanifest",
      rel: "manifest",
    },
  ],
  meta: [
    {
      name: "description",
      content:
        "lorem ipsum dolor sit amet, consectetur adipiscing elit. sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    },
    {
      name: "msapplication-TileColor",
      content: "#2b5797",
    },
    {
      name: "theme-color",
      content: "#ffffff",
    },
  ],
});

useSeoMeta({
  title: "logwatch",
  description:
    "lorem ipsum dolor sit amet, consectetur adipiscing elit. sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  ogDescription:
    "lorem ipsum dolor sit amet, consectetur adipiscing elit. sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  ogImage:
    "https://images.unsplash.com/photo-1543332164-6e82f355badc?q=80&w=2970&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  ogTitle: "logwatch",
  twitterCard: "summary_large_image",
});

onMounted(() => {
  // Set an interval to log events for the app
  setInterval(async () => {
    // Log an event on a random chance
    if (Math.random() < 0.75) {
      return;
    }

    console.log("Logging event");

    const body: any = {};

    // Switch between text and json
    const type = faker.helpers.arrayElement(["text", "json"]);
    const threadID = faker.number.int(5);
    const level = faker.helpers.arrayElement([
      "info",
      "warn",
      "error",
      "debug",
      "trace",
      "fatal",
      "time",
    ]);

    if (type === "text") {
      body.message = faker.lorem.sentence();
    } else {
      body.message = JSON.stringify({
        message: faker.lorem.sentence(),
        level,
        thread: threadID,
        timestamp: new Date().toISOString(),
      });
    }

    body.level = level;
    body.type = type;
    body.thread = threadID;

    await $fetch("/api/log/cm3jkbc6s00083wcqf4xzybql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }, 4000);
});
</script>
