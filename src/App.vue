<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <loading-overlay v-if="coinListLoading" />

    <div class="container">
      <search-ticker
        ref="searchTicker"
        @add-ticker="add"
        @reset-error="searchError = undefined"
        :coinList="coinList"
        :error="searchError"
      />

      <template v-if="tickers.length > 0">
        <hr class="w-full border-t border-gray-600 my-4" />
        <tickers-filters
          :filter="filter"
          :hasNextPage="hasNextPage"
          :hasPrevPage="hasPrevPage"
          @filter-change="handleFilterChange"
          @prev-page="page -= 1"
          @next-page="page += 1"
        />

        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <ticker-card
            v-for="t in paginatedTickers"
            :key="t.Symbol"
            :ticker="t"
            :isSelected="selectedTicker === t"
            @select="selectTicker"
            @delete="deleteTicker"
          />
        </dl>
      </template>

      <template v-if="selectedTicker">
        <hr class="w-full border-t border-gray-600 my-4" />
        <section class="relative">
          <h3 class="text-lg leading-6 font-medium text-gray-900 my-8">
            {{ selectedTicker.Symbol }} - USD
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
            @click="selectedTicker = null"
            type="button"
            class="absolute top-0 right-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              xmlns:xlink="http://www.w3.org/1999/xlink"
              xmlns:svgjs="http://svgjs.com/svgjs"
              version="1.1"
              width="30"
              height="30"
              x="0"
              y="0"
              viewBox="0 0 511.76 511.76"
              style="enable-background: new 0 0 512 512"
              xml:space="preserve"
            >
              <g>
                <path
                  d="M436.896,74.869c-99.84-99.819-262.208-99.819-362.048,0c-99.797,99.819-99.797,262.229,0,362.048    c49.92,49.899,115.477,74.837,181.035,74.837s131.093-24.939,181.013-74.837C536.715,337.099,536.715,174.688,436.896,74.869z     M361.461,331.317c8.341,8.341,8.341,21.824,0,30.165c-4.16,4.16-9.621,6.251-15.083,6.251c-5.461,0-10.923-2.091-15.083-6.251    l-75.413-75.435l-75.392,75.413c-4.181,4.16-9.643,6.251-15.083,6.251c-5.461,0-10.923-2.091-15.083-6.251    c-8.341-8.341-8.341-21.845,0-30.165l75.392-75.413l-75.413-75.413c-8.341-8.341-8.341-21.845,0-30.165    c8.32-8.341,21.824-8.341,30.165,0l75.413,75.413l75.413-75.413c8.341-8.341,21.824-8.341,30.165,0    c8.341,8.32,8.341,21.824,0,30.165l-75.413,75.413L361.461,331.317z"
                  fill="#718096"
                  data-original="#000000"
                ></path>
              </g>
            </svg>
          </button>
        </section>
      </template>
    </div>
  </div>
</template>

<script>
import debounce from "lodash.debounce";

import {
  stopUpdatingPrices,
  getListOfCoins,
  startUpdatingPrices,
  subscribeToTickerUpdate,
  unsubscribeFromTickerUpdate,
} from "./api";
import SearchTicker from "./components/SearchTicker.vue";
import LoadingOverlay from "./components/LoadingOverlay.vue";
import TickersFilters from "./components/TickersFilters.vue";
import TickerCard from "./components/TickerCard.vue";

const LS_RESTORE_KEY = "cryptonomicon-tickers";
const ITEMS_PER_PAGE = 6;

export default {
  name: "App",

  components: { SearchTicker, LoadingOverlay, TickersFilters, TickerCard },

  data() {
    return {
      ticker: null,
      tickers: [],
      selectedTicker: null,
      graph: [],
      graphHistorySize: 1,
      coinListLoading: true,
      coinList: {},
      suggestions: [],
      searchError: undefined,
      filter: "",
      page: 1,
    };
  },

  created() {
    this.debouncedCalculateGraphHistory = debounce(
      this.calculateGraphHistorySize,
      300
    );

    const restoredTickers = localStorage.getItem(LS_RESTORE_KEY);
    if (restoredTickers) {
      this.tickers = JSON.parse(restoredTickers);

      this.tickers.forEach((t) => {
        subscribeToTickerUpdate(t.Symbol, this.updatePriceForTicker);
      });
    }

    const filterParams = new URLSearchParams(window.location.search);
    this.filter = filterParams.get("filter") ?? "";
    const rawPage = parseInt(filterParams.get("page"));
    this.page = isNaN(rawPage) ? 1 : rawPage;
  },

  async mounted() {
    this.coinList = await getListOfCoins();
    this.coinListLoading = false;

    startUpdatingPrices();

    window.addEventListener("resize", this.debouncedCalculateGraphHistory);
  },

  beforeUnmount() {
    this.tickers.forEach(({ Symbol }) => {
      unsubscribeFromTickerUpdate(Symbol, this.updatePriceForTicker);
    });

    stopUpdatingPrices();
    window.removeEventListener("resize", this.debouncedCalculateGraphHistory);
  },

  watch: {
    tickers() {
      localStorage.setItem(LS_RESTORE_KEY, JSON.stringify(this.tickers));
    },

    filter() {
      this.page = 1;
    },

    paramsToSave({ filter, page }) {
      const url = new URL(window.location);
      url.searchParams.set("filter", filter);
      url.searchParams.set("page", page);

      history.pushState(null, "", url);
    },

    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },

    selectedTicker() {
      this.graph = [];
    },

    graph() {
      if (this.graph.length === 1) {
        this.$nextTick(this.calculateGraphHistorySize);
      }
    },
  },

  computed: {
    filteredTickers() {
      return this.tickers.filter((t) =>
        t.Symbol.includes(this.filter.toUpperCase())
      );
    },

    startIndex() {
      return (this.page - 1) * ITEMS_PER_PAGE;
    },

    endIndex() {
      return this.page * ITEMS_PER_PAGE;
    },

    paginatedTickers() {
      return this.filteredTickers.slice(this.startIndex, this.endIndex);
    },

    hasPrevPage() {
      return this.page > 1;
    },

    hasNextPage() {
      return this.endIndex < this.filteredTickers.length;
    },

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

    paramsToSave() {
      return {
        filter: this.filter,
        page: this.page,
      };
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

    updatePriceForTicker(tickerName, price, notFound = false) {
      const tickerToUpdate = this.tickers.find((t) => t.Symbol === tickerName);
      if (!tickerToUpdate) {
        return;
      }

      if (this.selectedTicker?.Symbol === tickerName) {
        this.graph = [
          ...this.graph,
          {
            price,
            id: Date.now(),
          },
        ];
      }

      tickerToUpdate.price = price;
      tickerToUpdate.notFound = notFound;
    },

    add(ticker) {
      const tickerName = ticker.toUpperCase().trim();

      if (!tickerName) {
        return;
      }

      if (this.tickers.some((t) => t.Symbol === tickerName)) {
        this.searchError = "Такой тикер уже добавлен";
        return;
      }

      const newTicker = {
        Symbol: tickerName,
        price: "-",
      };

      subscribeToTickerUpdate(tickerName, this.updatePriceForTicker);
      this.$refs.searchTicker.ticker = "";
      this.tickers = [...this.tickers, newTicker];
      this.suggestions = [];
    },

    deleteTicker(tickerToRemove) {
      if (this.selectedTicker === tickerToRemove) {
        this.selectedTicker = null;
      }

      this.tickers = this.tickers.filter((t) => {
        if (t === tickerToRemove) {
          clearInterval(t.pollRequestId);
          return false;
        }
        return true;
      });

      unsubscribeFromTickerUpdate(
        tickerToRemove.Symbol,
        this.updatePriceForTicker
      );
    },

    handleFilterChange(filter) {
      this.filter = filter;
    },

    selectTicker(ticker) {
      this.selectedTicker = ticker;
    },
  },
};
</script>
