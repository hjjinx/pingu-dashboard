import { PUBLIC_INFURA_KEY } from '$env/static/public'
import { 
  PositionStore as PositionStoreABI, 
  OrderStore as OrderStoreABI,
  Staking as StakingABI,
  StakingStore as StakingStoreABI,
  PoolStore as PoolStoreABI,
} from './abis.js'
import Web3 from 'web3'
import { getPriceDenominator } from './utils.js';
import { ETH, ETH_PRICE_DENOMINATOR, USDC } from './constants.js';

const web3Mainnet = new Web3(new Web3.providers.HttpProvider(`https://mainnet.infura.io/v3/${PUBLIC_INFURA_KEY}`));
const web3 = new Web3(new Web3.providers.HttpProvider(`https://arbitrum-mainnet.infura.io/v3/${PUBLIC_INFURA_KEY}`));

const PositionStoreContractAdd = '0x1b814d7762c24bbe9d107551f64bab8cc0d5a269';
const PositionStoreContract = new web3.eth.Contract(PositionStoreABI, PositionStoreContractAdd);

const OrderStoreContractAdd = '0xc13d6d62cad4b80db29a188ac179a4735a0e8fa1';
const OrderStoreContract = new web3.eth.Contract(OrderStoreABI, OrderStoreContractAdd);

const StakingContractAdd = '0x219b7c8de64d6241e2d579d7dacda6ebe8afe86a';
const StakingContract = new web3.eth.Contract(StakingABI, StakingContractAdd);

const StakingStoreContractAdd = '0x91f24d2dc94b07954042b0e366b400ea527febf4';
const StakingStoreContract = new web3.eth.Contract(StakingStoreABI, StakingStoreContractAdd);

const PoolStoreContractAdd = '0xe270e23dc782072de5c75744e0dcfb75372f2791';
const PoolStoreContract = new web3.eth.Contract(PoolStoreABI, PoolStoreContractAdd);

const GRAPH = 'https://api.studio.thegraph.com/query/43986/pingu-sg/0.0.6'
// const GRAPH = `https://gateway-arbitrum.network.thegraph.com/api/${PUBLIC_GRAPH_KEY}/subgraphs/id/ASonuQLUtjM7UPVyjGh5erZtBByBY2UDFiTBUnoUpmU4`

export const getPositions = async () => {
  let positions = await PositionStoreContract.methods.getPositions(10000, 0).call((error: any) => {
    if (error) {
      console.error(error);
    }
  });
  positions = positions.map((p: any) => ({
    ...p,
    leverage: p.size / p.margin,
    liquidationPrice: p.price / getPriceDenominator(ETH) + ((p.isLong ? -1 : 1) * ((((p.margin * 99 / 100) / getPriceDenominator(p.asset))) * (p.price / getPriceDenominator(ETH))) / (p.size / getPriceDenominator(p.asset))),
  }))

  return positions;
}
export const getUserPositions = async (address: string) => {
  let positions = await PositionStoreContract.methods.getUserPositions(address).call((error: any) => {
    if (error) {
      console.error(error);
    }
  });
  positions = positions.map((p: any) => ({
    ...p,
    leverage: p.size / p.margin,
    liquidationPrice: p.price / getPriceDenominator(ETH) + ((p.isLong ? -1 : 1) * ((((p.margin * 99 / 100) / getPriceDenominator(p.asset))) * (p.price / getPriceDenominator(ETH))) / (p.size / getPriceDenominator(p.asset))),
  }))

  return positions;
}

export const getUserOpenOrders = async (address: string) => {
  let orders = await OrderStoreContract.methods.getUserOrders(address).call((error: any) => {
    if (error) {
      console.error(error);
    }
  });
  return orders
}

export const getUnclaimedStakingRewards = async (address: string) => {
  let ethReward = await StakingContract.methods.getClaimableReward(ETH, address).call((error: any) => {
    if (error) {
      console.error(error);
    }
  });
  let usdcReward = await StakingContract.methods.getClaimableReward(USDC, address).call((error: any) => {
    if (error) {
      console.error(error);
    }
  });
  return {eth: ethReward, usdc: usdcReward}
}

export const getTotalPinguStaked = async () => {
  let totalPinguStaked = await StakingStoreContract.methods.getTotalSupply().call((error: any) => {
    if (error) {
      console.error(error);
    }
  });
  return totalPinguStaked / ETH_PRICE_DENOMINATOR;
}
export const getStakingFeeShare = async () => {
  let stakingFeeShare = await StakingStoreContract.methods.feeShare().call((error: any) => {
    if (error) {
      console.error(error);
    }
  });
  return stakingFeeShare;
}

export const getUserPooledAmount = async (address: string, asset: string) => {
  let userPooledAmount = await PoolStoreContract.methods.getUserBalance(asset, address).call((error: any) => {
    if (error) {
      console.error(error);
    }
  });
  return userPooledAmount;
}

export const getUserHistory = async (address: string) => {
  let orders: any[] = []
  let skipped = 0
  const call = async (skip: number) => {
    let _orders = await fetch(GRAPH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
            query {
              orders(
                skip: ${skip},
                first: 1000,
                orderBy: blockTimestamp,
                orderDirection: desc,
                where: {
                  user: "${address}"
                }
                subgraphError: deny
              ) {
                id
                type
                user
                asset
                market
                margin
                size
                price
                fee
                isLong
                pnl
                pnlUsd
                orderId
                blockNumber
                blockTimestamp
                transactionHash
              }
            }
          `,
      }),
    }).then(res => res.json())
    orders.push(..._orders?.data?.orders)
    if (_orders?.data?.orders?.length == 1000) {
      skipped += 1000
      await call(skipped)
    }
  }
  await call(skipped)
  return orders;  
}

export const getUserStats = async (address: string) => {
  try {
    let data = await fetch(GRAPH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
            query {
              user(id: "${address}", subgraphError: deny) {
                id
                numOrdersEth
                volumeEth
                numLiquidationsEth
                liquidationMarginEth
                liquidationVolumeEth
                pnlEth
                totalFeesEth
                poolFeesEth
                stakingFeesEth
                treasuryFeesEth
                keeperFeesEth
                numOrdersUsdc
                volumeUsdc
                numLiquidationsUsdc
                liquidationMarginUsdc
                liquidationVolumeUsdc
                pnlUsdc
                totalFeesUsdc
                poolFeesUsdc
                stakingFeesUsdc
                treasuryFeesUsdc
                keeperFeesUsdc
                stakingRevenueEth
                stakingRevenueUsdc
                capStaked
                poolEthDeposited
                poolEthWithdrawn
                poolEthTaxPaid
                poolUsdcDeposited
                poolUsdcWithdrawn
                poolUsdcTaxPaid
              }
            }
          `,
      }),
    }).then(res => res.json())
    return data?.data?.user
  } catch (err) {
    console.log(err)
    return null
  }
}

export const getUsers = async () => {
  let users: any[] = []
  let skipped = 0
  const call = async (skip: number) => {
    let _users = await fetch(GRAPH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
              users(
              skip: ${skip}
              first: 1000
              orderBy: lastTradedOn
              orderDirection: desc
              subgraphError: deny
              where: {lastTradedOn_gte: 1}
            ) {
              id
              numOrdersEth
              volumeEth
              numLiquidationsEth
              liquidationMarginEth
              liquidationVolumeEth
              pnlEth
              totalFeesEth
              poolFeesEth
              stakingFeesEth
              treasuryFeesEth
              keeperFeesEth
              numOrdersUsdc
              volumeUsdc
              numLiquidationsUsdc
              liquidationMarginUsdc
              liquidationVolumeUsdc
              pnlUsdc
              totalFeesUsdc
              poolFeesUsdc
              stakingFeesUsdc
              treasuryFeesUsdc
              keeperFeesUsdc
              lastTradedOn
            }
          }
          `,
      }),
    }).then(res => res.json())
    users.push(..._users?.data?.users)
    if (_users?.data?.users?.length == 1000) {
      skipped += 1000
      await call(skipped)
    }
  }
  await call(skipped)
  return users;  
}

export const getRewards = async () => {
  let users: any[] = []
  let skipped = 0
  const call = async (skip: number) => {
    let _users = await fetch(GRAPH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
              users(
                skip: ${skip}
                first: 1000
                orderBy: capStaked
                orderDirection: desc
                subgraphError: deny
                where: {capStaked_gte: 1}
              ) {
                id
                stakingRevenueEth
                stakingRevenueUsdc
                capStaked
              }
            }
          `,
      }),
    }).then(res => res.json())
    users.push(..._users?.data?.users)
    if (_users?.data?.users?.length == 1000) {
      skipped += 1000
      await call(skipped)
    }
  }
  await call(skipped)
  return users;  
}

export const resolveEns = async (ensName: string) => {
  return web3Mainnet.eth.ens.getAddress(ensName)
}

export const getDaysData = async () => {
  let days: any[] = []
  let skipped = 0
  const call = async (skip: number) => {
    let _days = await fetch(GRAPH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            dayDatas(
              skip: ${skip}
              first: 1000
              orderBy: id
              orderDirection: asc
              subgraphError: deny
            ) {
              id
              volumeEth
              volumeUsdc
              numOrdersEth
              numOrdersUsdc
              numLiquidationsEth
              liquidationMarginEth
              liquidationVolumeEth
              numLiquidationsUsdc
              liquidationMarginUsdc
              liquidationVolumeUsdc
              traderPnlEth
              traderPnlUsdc
              totalFeesEth
              poolFeesEth
              stakingFeesEth
              treasuryFeesEth
              keeperFeesEth
              totalFeesUsdc
              poolFeesUsdc
              stakingFeesUsdc
              treasuryFeesUsdc
              keeperFeesUsdc
            }
          }
        `,
      }),
    }).then(res => res.json())
    days.push(..._days?.data?.dayDatas)
    if (_days?.data?.dayDatas?.length == 1000) {
      skipped += 1000
      await call(skipped)
    }
  }
  await call(skipped)
  return days;
}

export const getUserPoolStats = async () => {
  let users: any[] = []
  let skipped = 0
  const call = async (skip: number) => {
    let _users = await fetch(GRAPH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
              users(
                skip: ${skip}
                first: 1000
                orderBy: id
                orderDirection: desc
                subgraphError: deny
                where: { or: [{ poolEthDeposited_gt: 0 }, { poolUsdcDeposited_gt: 0 }]}
              ) {
                id
                poolEthDeposited
                poolEthWithdrawn
                poolEthTaxPaid
                poolUsdcDeposited
                poolUsdcWithdrawn
                poolUsdcTaxPaid
              }
            }
          `,
      }),
    }).then(res => res.json())
    users.push(..._users?.data?.users)
    if (_users?.data?.users?.length == 1000) {
      skipped += 1000
      await call(skipped)
    }
  }
  await call(skipped)
  return users;  
}