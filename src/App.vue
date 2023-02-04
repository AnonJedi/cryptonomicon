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
        <price-history-graph
          :ticker="selectedTicker"
          :key="selectedTicker.Symbol"
          @close="selectedTicker = null"
        />
      </template>
    </div>
  </div>
</template>

<script>
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
import PriceHistoryGraph from "./components/PriceHistoryGraph.vue";

const LS_RESTORE_KEY = "cryptonomicon-tickers";
const ITEMS_PER_PAGE = 6;

export default {
  name: "App",

  components: {
    SearchTicker,
    LoadingOverlay,
    TickersFilters,
    TickerCard,
    PriceHistoryGraph,
  },

  data() {
    return {
      ticker: null,
      tickers: [],
      selectedTicker: null,
      coinListLoading: true,
      coinList: {},
      suggestions: [],
      searchError: undefined,
      filter: "",
      page: 1,
    };
  },

  created() {
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
  },

  beforeUnmount() {
    this.tickers.forEach(({ Symbol }) => {
      unsubscribeFromTickerUpdate(Symbol, this.updatePriceForTicker);
    });

    stopUpdatingPrices();
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

    paramsToSave() {
      return {
        filter: this.filter,
        page: this.page,
      };
    },
  },

  methods: {
    updatePriceForTicker(tickerName, price, notFound = false) {
      const tickerToUpdate = this.tickers.find((t) => t.Symbol === tickerName);
      if (!tickerToUpdate) {
        return;
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
