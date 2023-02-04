<template>
  <div
    @click="$emit('select', ticker)"
    class="overflow-hidden shadow rounded-lg border-4 cursor-pointer"
    :class="{
      'border-transparent': !isSelected,
      'border-purple-800': isSelected,
      'bg-red-100': ticker.notFound,
      'bg-white': !ticker.notFound,
    }"
  >
    <div class="px-4 py-5 sm:p-6 text-center">
      <dt class="text-sm font-medium text-gray-500 truncate">
        {{ ticker.Symbol }} - USD
      </dt>
      <dd class="mt-1 text-3xl font-semibold text-gray-900">
        {{ formatPrice(ticker.price) }}
      </dd>
    </div>
    <div class="w-full border-t border-gray-200"></div>
    <button
      @click.stop="$emit('delete', ticker)"
      class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
    >
      <trash-bin-icon />Удалить
    </button>
  </div>
</template>

<script>
import TrashBinIcon from "./icons/TrashBinIcon.vue";

export default {
  components: {
    TrashBinIcon,
  },

  props: {
    ticker: {
      type: Object,
      require: true,
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
  },

  emits: {
    delete: (ticker) => typeof ticker === "object",
    select: (ticker) => typeof ticker === "object",
  },

  methods: {
    formatPrice(price) {
      if (isNaN(price)) {
        return "-";
      }
      return price > 1 ? price.toFixed(2) : price.toPrecision(2);
    },
  },
};
</script>
