<template>
  <section class="relative">
    <h3 class="text-lg leading-6 font-medium text-gray-900 my-8">
      {{ ticker.Symbol }} - USD
    </h3>
    <div
      ref="graph"
      class="flex items-end border-gray-600 border-b border-l h-64 overflow-hidden"
    >
      <div
        ref="graphElement"
        v-for="{ price, id } in normalizedGraph"
        :key="id"
        :style="{ height: `${price}%` }"
        class="bg-purple-800 border w-10 shrink-0"
      ></div>
    </div>

    <button
      @click="$emit('close')"
      type="button"
      class="absolute top-0 right-0"
    >
      <cross-icon />
    </button>
  </section>
</template>

<script>
import debounce from "lodash.debounce";

import { subscribeToTickerUpdate, unsubscribeFromTickerUpdate } from "@/api";
import CrossIcon from "./icons/CrossIcon.vue";

const MAX_GRAPH_CAPACITY = 100;

export default {
  components: {
    CrossIcon,
  },

  props: {
    ticker: {
      type: Object,
      require: true,
    },
  },

  emits: {
    close: (value) => value === undefined,
  },

  data() {
    return {
      graph: [],
      graphHistorySize: 1,
    };
  },

  created() {
    this.debouncedCalculateGraphHistory = debounce(
      this.calculateGraphHistorySize,
      300
    );

    subscribeToTickerUpdate(this.ticker.Symbol, this.pushPriceToHistory);
  },

  async mounted() {
    window.addEventListener("resize", this.debouncedCalculateGraphHistory);
  },

  beforeUnmount() {
    unsubscribeFromTickerUpdate(this.ticker.Symbol, this.pushPriceToHistory);
    window.removeEventListener("resize", this.debouncedCalculateGraphHistory);
  },

  computed: {
    normalizedGraph() {
      let min = Number.MAX_VALUE;
      let max = 0;
      this.graph.forEach(({ price }) => {
        if (min > price) {
          min = price;
        }

        if (max < price) {
          max = price;
        }
      });

      if (max === min) {
        return this.graph
          .slice(-1 * this.graphHistorySize)
          .map(({ id }) => ({ price: 50, id }));
      }
      return this.graph
        .slice(-1 * this.graphHistorySize)
        .map(({ price, id }) => ({
          price: (5 + (price - min) * 95) / (max - min),
          id,
        }));
    },
  },

  watch: {
    graph() {
      if (this.graph.length === 1) {
        this.$nextTick(this.calculateGraphHistorySize);
      }
    },
  },

  methods: {
    calculateGraphHistorySize() {
      let { graph, graphElement } = this.$refs;
      if (!graph || !graphElement) {
        return;
      }

      this.graphHistorySize = Math.floor(
        graph.clientWidth / graphElement[0].offsetWidth
      );
    },

    pushPriceToHistory(_, price) {
      this.graph = [
        ...this.graph,
        {
          price,
          id: Date.now(),
        },
      ];

      if (this.graph.length > MAX_GRAPH_CAPACITY) {
        this.graph = this.graph.slice(-1 * MAX_GRAPH_CAPACITY);
      }
    },
  },
};
</script>
