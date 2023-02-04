<template>
  <div
    class="fixed w-100 h-100 opacity-80 bg-purple-800 inset-0 z-50 flex items-center justify-center"
  >
    <app-spinner />
  </div>
</template>

<script>
import AppSpinner from "./icons/AppSpinner.vue";

export default {
  components: {
    AppSpinner,
  },
};
</script>
