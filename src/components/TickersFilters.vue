<template>
  <app-button v-if="hasPrevPage" @click="$emit('prev-page')" class="my-4 mr-3">
    Назад
  </app-button>

  <app-button v-if="hasNextPage" @click="$emit('next-page')" class="my-4">
    Вперёд
  </app-button>

  <div class="max-w-xs">
    <label for="wallet" class="block text-sm font-medium text-gray-700"
      >Фильтр</label
    >
    <div class="mt-1 relative rounded-md shadow-md">
      <input
        :value="filter"
        @input="handleFilterChange"
        type="text"
        name="filter"
        id="filter"
        class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
      />
    </div>
  </div>
</template>

<script>
import AppButton from "./AppButton.vue";

export default {
  components: {
    AppButton,
  },

  props: {
    hasNextPage: {
      type: Boolean,
      require: true,
    },
    hasPrevPage: {
      type: Boolean,
      require: true,
    },
    filter: {
      type: String,
    },
  },

  emits: {
    "next-page": (v) => v === undefined,
    "prev-page": (v) => v === undefined,
    "filter-change": (filter) => typeof filter === "string",
  },

  methods: {
    handleFilterChange(event) {
      this.$emit("filter-change", event.target.value);
    },
  },
};
</script>
