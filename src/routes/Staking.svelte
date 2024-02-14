<!-- svelte-ignore a11y-click-events-have-key-events -->
<script lang='ts'>
  import { onMount } from "svelte";
  import { prices } from "../scripts/stores";
  import { getPriceDenominator, numberWithCommas } from "../scripts/utils";
  import { getRewards, getStakingFeeShare, getTotalPinguStaked, getUnclaimedStakingRewards } from "../scripts/web3";
  import { SPINNER_ICON } from "../scripts/icons";
  import { ETH, ETH_PRICE_DENOMINATOR, USDC, USDC_PRICE_DENOMINATOR } from "../scripts/constants";

  $: data = [] as any;
  let loading: boolean;
  let sortBy: string = 'pinguStaked';
  let sortOrder = 'desc';
  $: totalPinguStaked = 0;
  $: volumePerDay = 50;
  $: pinguStaked = 100000;
  $: stakingFeeShare = 0;
  $: earningsPerDay = ((volumePerDay * 10**6) * 0.06 * 0.01 * (stakingFeeShare * 0.01 * 0.01) * (pinguStaked / totalPinguStaked)).toFixed(2);
  onMount(async () => {
    totalPinguStaked = await getTotalPinguStaked();
    stakingFeeShare = await getStakingFeeShare();
    data = await getRewards()
    for (const user of data) {
      user.pinguStaked = user.capStaked
      user.stakingRevenueEth = Number((+user.stakingRevenueEth / ETH_PRICE_DENOMINATOR).toFixed(3))
      user.stakingRevenueUsdc = Number((+user.stakingRevenueUsdc / USDC_PRICE_DENOMINATOR).toFixed(2))
      user.totalClaimed = Number((user.stakingRevenueEth * $prices['ETH-USD'][0] + user.stakingRevenueUsdc).toFixed(2));
      user.pinguStaked = Number((+user.pinguStaked / ETH_PRICE_DENOMINATOR).toFixed(2))
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

  const fetchUnclaimedRewards = async (e: any, user: any, index: number) => {
    e.stopPropagation();
    let {eth, usdc} = await getUnclaimedStakingRewards(user.id)
    eth = Number(((eth / getPriceDenominator(ETH))).toFixed(3))
    usdc = Number((usdc / getPriceDenominator(USDC)).toFixed(1))
    const total = eth * $prices['ETH-USD'][0] + usdc;
    user.ethUnclaimed = eth;
    user.usdcUnclaimed = usdc;
    user.totalUnclaimed = Number(total.toFixed(2));
    user.netEarnings = Number((user.totalClaimed + user.totalUnclaimed).toFixed(2));
    data[index] = user;
  }
</script>

{#if loading || !data.length}
  <div class="empty">
    <div class="loading-icon">{@html SPINNER_ICON}</div>
  </div>
  <div style="background: var(--rich-black-fogra);">
    <center><h1 class="loading-title">Fetching Sorted Data</h1></center>
  </div>
{:else}
  <div class='top-bar'>
    <div class='top-text'>
      Assuming a volume of $<input type='number' bind:value={volumePerDay} class='inline-input' min={0} max={999} style="width: 50px"> M /day 
      and you staking <input type='number' bind:value={pinguStaked} class='inline-input pingu-staked' min={0} max={100000000} step={1000}> Pingu<br/>
      you will make ${numberWithCommas(+earningsPerDay)} /day (${numberWithCommas(+(+earningsPerDay * 365).toFixed(2))} /year).
    </div>
  </div>
  <div class="positions-container">
    <div class="history">
      <div class="columns">
        <div class="column column-product" on:click={() => changeSort('id')}>
          Address <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'id' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-claimed can-compress" on:click={() => changeSort('stakingRevenueEth')}>
          ETH Claimed <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'stakingRevenueEth' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-claimed can-compress" on:click={() => changeSort('stakingRevenueUsdc')}>
          USDC Claimed <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'stakingRevenueUsdc' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-claimed" on:click={() => changeSort('totalClaimed')}>
          Total Claimed <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'totalClaimed' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-claimed" on:click={() => changeSort('totalUnclaimed')}>
          Total Unclaimed <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'totalUnclaimed' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-claimed" on:click={() => changeSort('netEarnings')}>
          Net Earnings <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'netEarnings' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-claimed" on:click={() => changeSort('pinguStaked')}>
          Pingu Staked <span class={sortOrder == 'asc' ? 'pos' : 'neg'}
          >{sortBy == 'pinguStaked' ? (sortOrder == 'asc' ? '↑' : '↓') : ''}</span
        >
        </div>
        <div class="column column-close" />
      </div>
    </div>
    <div class="trades-list no-scrollbar" id="history-list">
      {#if data?.length == 0}
        <div class="empty">No trades to show.</div>
      {:else}
        {#each data as user, index}
          <div
            class="trade"
            data-intercept="true"
            on:click|stopPropagation={() => {window.location.href = `/#/user/${user.id}`}}
          >
            <div class="column column-product" title={user.id}>
              {user.id.substr(0, 5) + '...' + user.id.substr(39)}
            </div>
            <div class="column column-claimed can-compress">
              Ξ{numberWithCommas(user.stakingRevenueEth)}
            </div>
            <div class="column column-claimed can-compress">
              ${numberWithCommas(user.stakingRevenueUsdc)}
            </div>
            <div class="column column-claimed">
              ${numberWithCommas(user.totalClaimed)}
            </div>
            <div class="column column-claimed">
              {#if user.totalUnclaimed}
                ${numberWithCommas(user.totalUnclaimed)}
              {:else}
                <span class="button" on:click={(e) => fetchUnclaimedRewards(e, user, index)}>Click to fetch</span>
              {/if}
            </div>
            <div class="column column-claimed">
              {#if user.netEarnings}
                ${numberWithCommas(user.netEarnings)}
              {:else}
                <span class="button" on:click={(e) => fetchUnclaimedRewards(e, user, index)}>Click to fetch</span>
              {/if}
            </div>
            <div class="column column-claimed pos">
              {numberWithCommas(user.pinguStaked)}
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
    width: 20%;
  }
  .column-claimed {
    width: 20%;
  }
  .column-claimed .button {
    border: 3px solid var(--primary);
    border-radius: 10px;
    padding: 5px;
    cursor: crosshair;
  }
  .top-bar {
    padding: 10px;
  }
  .top-text {
    color: white;
    text-align: center;
    padding: 20px;
    background: var(--eerie-black);
  }
  .inline-input {
    background: var(--eerie-black);
    color: var(--primary);
    outline: none;
    border: none;
    max-width: fit-content;
    padding: 0 0 0 5px;
    width: 60px;
  }

  .inline-input.pingu-staked {
    width: 100px; 
  }
  input[type="number"] {
    /* Always display the up and down arrows */
    -webkit-appearance: none;
    appearance: none;
  }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    /* Custom styles for the arrows */
    opacity: 1;
    height: auto;
    background-color: var(--primary);
  }

  @media (max-width: 1000px) {
    .can-compress {
      display: none;
    }
  }
</style>