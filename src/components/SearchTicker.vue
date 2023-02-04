<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Тикер</label
        >

        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="ticker"
            @keydown="$emit('reset-error')"
            @keydown.enter="add"
            @input="debouncedHandleSearchChange"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
          />
        </div>

        <div
          v-if="suggestions.length"
          class="flex bg-white p-1 rounded-md shadow-md flex-wrap"
        >
          <span
            v-for="s in suggestions"
            :key="s.symbol"
            @click="handleSuggestionClick(s)"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
          >
            {{ s.Symbol }}
          </span>
        </div>

        <div v-if="error" class="text-sm text-red-600">
          {{ error }}
        </div>
      </div>
    </div>

    <app-button @click="add" class="my-4"><plus-icon />Добавить</app-button>
  </section>
</template>

<script>
import debounce from "lodash.debounce";

import PlusIcon from "./icons/PlusIcon.vue";
import AppButton from "./AppButton.vue";

const MAX_SUGGESTION_OPTIONS = 4;
const SEARCH_DEBOUNCE_TIME = 300;

export default {
  name: "SearchTicker",

  components: {
    PlusIcon,
    AppButton,
  },

  props: ["coinList", "error"],

  data() {
    return {
      ticker: "",
      suggestions: [],
    };
  },

  created() {
    this.debouncedHandleSearchChange = debounce(
      this.handleSearchChange,
      SEARCH_DEBOUNCE_TIME
    );
  },

  watch: {
    ticker() {
      if (!this.ticker) {
        this.suggestions = [];
      }
    },
  },

  methods: {
    add() {
      this.$emit("add-ticker", this.ticker);
    },

    handleSuggestionClick(newCoin) {
      this.ticker = newCoin.Symbol;
      this.$emit("add-ticker", this.ticker);
    },

    handleSearchChange() {
      this.$emit("reset-error");
      const value = this.ticker.toUpperCase();

      if (!value) {
        this.suggestions = [];
        return;
      }

      const fullMatch = [];
      const startsWith = [];
      const partialMatch = [];

      Object.values(this.coinList).forEach((c) => {
        if (c.Symbol === value) {
          fullMatch.push(c);
          return;
        }

        if (c.Symbol.startsWith(value)) {
          startsWith.push(c);
          return;
        }

        if (
          c.Symbol.includes(value) ||
          c.FullName.toUpperCase().includes(value)
        ) {
          partialMatch.push(c);
        }
      });

      this.suggestions = [...fullMatch, ...startsWith, ...partialMatch].slice(
        0,
        MAX_SUGGESTION_OPTIONS
      );
    },
  },
};
</script>
