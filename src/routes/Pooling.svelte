<!-- svelte-ignore a11y-click-events-have-key-events -->
<script lang='ts'>
  import { onMount } from "svelte";
  import { prices } from "../scripts/stores";
  import { numberWithCommas } from "../scripts/utils";
  import { getUserPoolStats } from "../scripts/web3";
  import { SPINNER_ICON } from "../scripts/icons";
  import { ETH_PRICE_DENOMINATOR, USDC_PRICE_DENOMINATOR } from "../scripts/constants";

  let data: any[] = [];
  let loading: boolean;
  let sortBy: string = 'id';
  let sortOrder = 'desc';
  onMount(async () => {
    data = await getUserPoolStats()
    for (const user of data) {
      user.poolEthDeposited = Number((+user.poolEthDeposited / ETH_PRICE_DENOMINATOR).toFixed(3))
      user.poolEthWithdrawn = Number((+user.poolEthWithdrawn / ETH_PRICE_DENOMINATOR).toFixed(3))
      user.poolEthTaxPaid = Number((+user.poolEthTaxPaid / ETH_PRICE_DENOMINATOR).toFixed(3))
      user.poolUsdcDeposited = Number((+user.poolUsdcDeposited / USDC_PRICE_DENOMINATOR).toFixed(2))
      user.poolUsdcWithdrawn = Number((+user.poolUsdcWithdrawn / USDC_PRICE_DENOMINATOR).toFixed(2))
      user.poolUsdcTaxPaid = Number((+user.poolUsdcTaxPaid / USDC_PRICE_DENOMINATOR).toFixed(2))
      user.totalDeposited = Number((user.poolEthDeposited * $prices['ETH-USD'][0] + user.poolUsdcDeposited).toFixed(2));
      user.totalWithdrawn = Number((user.poolEthWithdrawn * $prices['ETH-USD'][0] + user.poolUsdcWithdrawn).toFixed(2));
      user.totalTaxPaid = Number((user.poolEthTaxPaid * $prices['ETH-USD'][0] + user.poolUsdcTaxPaid).toFixed(2));
    }
  });

  $: changeSort = (_sortBy: string) => {
    if (sortBy == _sortBy) {
      sortOrder = sortOrder == 'desc' ? 'asc' : 'desc';
      data = data.reverse();
    } else {
      sortBy = _sortBy;
      sortOrder = 'desc';
      if (_sortBy == 'market' || _sortBy == 'type') {
        data = data.sort((a, b) => b[_sortBy].localeCompare(a[_sortBy]));
      } else {
        data = data.sort((a, b) => b[_sortBy] - a[_sortBy]);
      }
    }
  };
</script>

{#if loading || !data.length}
  <div class="empty">
    <div class="loading-icon">{@html SPINNER_ICON}</div>
  </div>
  <div style="background: var(--rich-black-fogra);">
    <center><h1 class="loading-title">Fetching Sorted Data</h1></center>
  </div>
{:else}
  <div class="positions-container">
    <div class="history">
      <div class="columns">
        <div class="column column-product" on:click={() => changeSort('id')}>
          Address <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'id' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-claimed" on:click={() => changeSort('totalDeposited')}>
          Deposited <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'totalDeposited' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-claimed" on:click={() => changeSort('totalWithdrawn')}>
          Withdrawn <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'totalWithdrawn' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-claimed" on:click={() => changeSort('totalTaxPaid')}>
          Tax Paid <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'totalTaxPaid' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
      </div>
    </div>
    <div class="trades-list no-scrollbar" id="history-list">
      {#if data?.length == 0}
        <div class="empty">No trades to show.</div>
      {:else}
        {#each data as user}
          <div
            class="trade"
            data-intercept="true"
            on:click|stopPropagation={() => {window.location.href = `/#/user/${user.id}`}}
          >
            <div class="column column-product" title={user.id}>
              {user.id.substr(0, 5) + '...' + user.id.substr(39)}
            </div>
            <div class="column column-claimed" title={`Ξ${user.poolEthDeposited} + $${user.poolUsdcDeposited}`}>
              ${numberWithCommas(user.totalDeposited)}
            </div>
            <div class="column column-claimed" title={`Ξ${user.poolEthWithdrawn} + $${user.poolUsdcWithdrawn}`}>
              ${numberWithCommas(user.totalWithdrawn)}
            </div>
            <div class="column column-claimed neg" title={`Ξ${user.poolEthTaxPaid} + $${user.poolUsdcTaxPaid}`}>
              ${numberWithCommas(user.totalTaxPaid)}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}

<style>
  .positions-container {
    max-width: 100%;
    overflow-x: scroll;
  }

  .history {
    background-color: var(--eerie-black);
    min-width: 1000px;
  }
  .trades-list {
    min-width: 1000px;
  }
  .empty {
    background: var(--rich-black-fogra);
  }
  .loading-title {
    margin: 0;
    padding: 0.67em 0;
  }
  .columns {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 var(--base-padding);
    color: var(--sonic-silver);
    font-size: 90%;
    border-bottom: 1px solid var(--jet-dim);
  }
  .trade {
    display: flex;
    align-items: center;
    height: 48px;
    cursor: pointer;
    padding: 0 var(--base-padding);
    border-bottom: 1px solid var(--jet-dim);
    background-color: var(--rich-black);
    color: var(--silver-chalice);
  }
  .trade:hover {
    background-color: var(--jet-dim);
  }
  .column {
    cursor: pointer;
  }
  .column-product {
    width: 25%;
  }
  .column-claimed {
    width: 25%;
  }
</style>