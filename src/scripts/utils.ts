import {
  BASE_FEES_BPS,
  ETH,
  ETH_PRICE_DENOMINATOR,
  USDC,
  USDC_PRICE_DENOMINATOR,
} from "./constants";
import { component, prices, showPositionInfoModal, sharePositionModal } from "./stores";
import Home from '../routes/Home.svelte';
import Positions from '../routes/Positions.svelte';
import User from '../routes/User.svelte';
import Leaderboard from '../routes/Leaderboard.svelte';
import Staking from "../routes/Staking.svelte";
import Pooling from "../routes/Pooling.svelte";
import { get } from "svelte/store";

export function numberWithCommas(x: number) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function priceFormatter(price: number, currency: string = ETH) {
  const precision = currency == ETH ? 3 : 2;
  return +(price / getPriceDenominator(currency)).toFixed(precision);
}

export function getUPL(position: any, latestPrice: any) {
  let upl = 0;
  if (position.price * 1 == 0) return 0;

  if (latestPrice) {
    if (position.isLong) {
      // upl = size * (markPrice - openPrice) / openPrice
      upl =
        ((+position.size / getPriceDenominator(position.asset)) *
          (latestPrice * 1 - (+position.price / getPriceDenominator(ETH)) * 1)) /
        (+position.price / getPriceDenominator(ETH));
    } else {
      // size * (openPrice - markPrice) / openPrice
      upl =
        ((+position.size / getPriceDenominator(position.asset)) *
          ((+position.price / getPriceDenominator(ETH)) * 1 - latestPrice * 1)) /
        (+position.price / getPriceDenominator(ETH));
    }
    // TODO: Add interest
    // let interest = await getInterest(position);
    // upl += interest;
  }
  return upl;
}

export function calculateUPLs(_positions: any[], prices: any[]) {
  for (const position of _positions) {
    const upl = getUPL(position, prices[position.market][0]);
    if (upl == undefined) continue;
    position.markPrice = prices[position.market][0];
    position.upl = upl;
    position.uplInDollars =
      position.asset == ETH ? upl * prices["ETH-USD"][0] : upl;
    position.marginInDollars =
      position.asset == ETH
        ? (position.margin * prices["ETH-USD"][0]) / getPriceDenominator(ETH)
        : position.margin / getPriceDenominator(USDC);
    position.sizeInDollars =
      position.asset == ETH
        ? (position.size * prices["ETH-USD"][0]) / getPriceDenominator(ETH)
        : position.size / getPriceDenominator(USDC);
    position.uplPercent = (
      (100 * upl) /
      (+position.margin / getPriceDenominator(position.asset))
    ).toFixed(2);
  }
}

export const addDollarInfoToData = (_positions: any[], prices: any[]) => {
  const newData = []
  for (const position of _positions) {
    const newPos = {...position}
    newPos.leverage = newPos.size / newPos.margin;
    if (newPos.market !== '-') {
      newPos.markPrice = prices[newPos.market][0]
    };
    if (newPos.asset != ETH && newPos.asset != USDC) {
      newPos.asset = ETH;
    }
    newPos.marginInDollars =
      newPos.asset == ETH
        ? (newPos.margin * prices["ETH-USD"][0]) / getPriceDenominator(ETH)
        : newPos.margin / getPriceDenominator(USDC);
    newPos.sizeInDollars =
      newPos.asset == ETH
        ? (newPos.size * prices["ETH-USD"][0]) / getPriceDenominator(ETH)
        : newPos.size / getPriceDenominator(USDC);
    newData.push(newPos);
  }
  return newData;
}

async function fetchMarketData(market: string): Promise<any> {
	const params = {
			market: market,
			resolution: "86400",
			end: Math.floor(Date.now() / 1000)
	};

	return fetchCandlesFromPyth(params, true);
}

const getMarket = async (m: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const ohlcData = get(prices);
      const marketDataExists = ohlcData[m as any];
    
      if (!marketDataExists) {
        let data = await fetchMarketData(m);
          if (Array.isArray(data)) {
              data = data[0];
          }
          prices.update(x => ({ ...x, [m]: data }));
          resolve(data)
      }
    } catch(err) {
      reject(err)
    }
  })
}

export async function getPrices(market: string, currentUrl=window.location.href) {
	if (!market) return;

	try {
			let marketData: any;

			if (market === 'all') {
          var markets = Object.keys(BASE_FEES_BPS);
          await Promise.all(markets.map(getMarket));
			} else {
					marketData = await fetchMarketData(market);
					prices.update(x => ({ ...x, [market]: marketData }));
			}

			return marketData;
	} catch (error) {
			console.error('/ticker GET error', market, error);
	}
}


function getMarketType(symbol: string) {
	const cryptoSymbols = new Set([
		'1INCH', 'AAVE', 'ACM', 'ADA', 'AKT', 'ALGO', 'ALICE', 'ALPACA', 'ALPINE', 'AMB', 'AMP', 'ANC', 'ANKR', 'APE', 'APT', 'AR', 'ARB', 'ARG', 'ARKM', 'ASR', 'ASTR', 'ATLAS', 'ATM', 'ATOM', 'AURORA', 'AUTO', 'AVAX', 'AXL', 'AXS', 'BAL', 'BAND', 'BAR', 'BAT', 'BCH', 'BETH', 'BIFI', 'BLUR', 'BNB', 'BNX', 'BOBA', 'BONK', 'BOO', 'BRZ', 'BSOL', 'BSV', 'BSW', 'BTC', 'BTT', 'BUSD', 'C98', 'CAKE', 'CANTO', 'CBETH', 'CEL', 'CELO', 'CELR', 'CETUS', 'CFX', 'CHR', 'CHZ', 'CITY', 'COMP', 'CORE', 'COW', 'CRO', 'CRV', 'CTSI', 'CUSD', 'CVX', 'DAI', 'DAR', 'DOGE', 'DOT', 'DYDX', 'EGLD', 'ENJ', 'ENS', 'EOS', 'ETC', 'ETH', 'EURC', 'EVMOS', 'FDUSD', 'FET', 'FIDA', 'FIL', 'FLOKI', 'FLOW', 'FTM', 'FTT', 'FXS', 'GAL', 'GALA', 'GF', 'GLMR', 'GMT', 'GMX', 'GNO', 'GNS', 'GRAIL', 'GRT', 'GT', 'GUSD', 'HBAR', 'HFT', 'HNT', 'HT', 'ICP', 'IDEX', 'IMX', 'INJ', 'INTER', 'IOTA', 'ITA', 'JITOSOL', 'JST', 'JTO', 'JUV', 'KAVA', 'KCS', 'KLAY', 'KNC', 'KSM', 'LAZIO', 'LDO', 'LEO', 'LINK', 'LRC', 'LST', 'LTC', 'LUNA', 'LUNC', 'LUSD', 'MANA', 'MASK', 'MATIC', 'MAV', 'MBOX', 'MEAN', 'MEME', 'MINA', 'MIR', 'MKR', 'MNDE', 'MNGO', 'MNT', 'MSOL', 'MTR', 'MTRG', 'NEAR', 'NEON', 'NFT', 'NTRN', 'OG', 'OKB', 'OMG', 'OMI', 'ONE', 'OP', 'ORCA', 'ORDI', 'OSMO', 'OUSD', 'PAXG', 'PENDLE', 'PEOPLE', 'PEPE', 'PERP', 'POL', 'POR', 'PORT', 'PORTO', 'PRIME', 'PSG', 'PYTH', 'PYUSD', 'QNT', 'RACA', 'RAY', 'RDNT', 'RETH', 'RLB', 'RNDR', 'RON', 'RPL', 'RUNE', 'SAMO', 'SAND', 'SANTOS', 'SBR', 'SCNSOL', 'SEI', 'SFP', 'SHIB', 'SKL', 'SLND', 'SLP', 'SMR', 'SNX', 'SNY', 'SOL', 'SPA', 'SPELL', 'SRM', 'STETH', 'STORJ', 'STSOL', 'STX', 'SUI', 'SUN', 'SUSHI', 'SWEAT', 'TBTC', 'TENET', 'THETA', 'THG', 'TIA', 'TLM', 'TON', 'TRB', 'TRX', 'TURBOS', 'TUSD', 'TWT', 'UMA', 'UNI', 'UNIBOT', 'USDC', 'USDD', 'USDP', 'USDT', 'USTC', 'VAI', 'VELA', 'VET', 'VIC', 'WAVES', 'WBTC', 'WEMIX', 'WIN', 'WLD', 'WOJAK', 'WOM', 'WOO', 'WSTETH', 'XAUT', 'XLM', 'XMR', 'XPRT', 'XRD', 'XRP', 'XTZ', 'XVS', 'XWG', 'YFI', 'ZBC', 'ZEC', 'ZEN', 'ZIL', 'ZRX', 'MANTA', 'JUP', 'DYM', 'PYTH', 'WIF'
	]);

	const equitySymbols = new Set([
		'AAPL', 'AI', 'AMC', 'AMGN', 'AMZN', 'ARKK', 'AXP', 'BA', 'BLK', 'CAT', 'COIN', 'CPNG', 'CRM', 'CSCO', 'CVX', 'DIS', 'DOW', 'EEM', 'EFA', 'GE', 'GLD', 'GME', 'GOOG', 'GOVT', 'GS', 'HD', 'HON', 'HYG', 'IBM', 'INTC', 'IVV', 'IWM', 'JNJ', 'JPM', 'KO', 'MCD', 'META', 'MINT', 'MMM', 'MRK', 'MSFT', 'MSTR', 'NFLX', 'NKE', 'NVDA', 'PG', 'QQQ', 'SHV', 'SPY', 'TLT', 'TRV', 'TSLA', 'UNH', 'USO', 'V', 'VOO', 'VZ', 'WBA', 'WMT', 'XLE'
	]);

	const fxSymbols = new Set([
		'AUD', 'EUR', 'GBP', 'NZD', 'CAD', 'CHF', 'CNH', 'HKD', 'JPY', 'MXN', 'NOK', 'SEK', 'SGD', 'ZAR'
	]);

	const metalSymbols = new Set(['XAG', 'XAU']);

	// Extraire le symbole de base (avant le "/")
	var baseSymbol = symbol.split('-')[0];


    // Determine the market type based on the base symbol
    if (cryptoSymbols.has(baseSymbol)) {
			return "Crypto";
	} else if (equitySymbols.has(baseSymbol)) {
			return "Equity.US";
	} else if (fxSymbols.has(baseSymbol)) {
			return "FX";
	} else if (metalSymbols.has(baseSymbol)) {
			return "Metal";
	} else {
			// If the first part of the symbol is unknown, check the second part
			baseSymbol = symbol.split('-')[1];
			if (cryptoSymbols.has(baseSymbol)) {
					return "Crypto";
			} else if (equitySymbols.has(baseSymbol)) {
					return "Equity.US";
			} else if (fxSymbols.has(baseSymbol)) {
					return "FX";
			} else if (metalSymbols.has(baseSymbol)) {
					return "Metal";
			} else {
					return "Unknown"; // Or handle the error
			}
	}
}


async function fetchCandlesFromPyth(params: any, returnLastOnly = false) {
	// Mise à jour de la carte de mappage de résolution
	const resolutionMap: any = {
			"60": "1",
			"300": "5",
			"900": "15",
			"3600": "60",
			"14400": "240",
			"86400": "1D"
	};
	const pythResolution = resolutionMap[params.resolution.toString()] || params.resolution;

	// Mappage de la résolution à l'intervalle de temps (en secondes)
	const timeIntervalMap: any = {
			"60": 86400,
			"300": 2 * 86400,
			"900": 6 * 86400,
			"3600": 24 * 86400,
			"14400": 96 * 86400,
			"86400": 576 * 86400
	};

	var timeInterval = timeIntervalMap[params.resolution.toString()] || 86400;
	var startTimestamp = params.end - timeInterval; // Soustraire l'intervalle en secondes du timestamp de fin
	var endTimestamp = params.end || Math.floor(Date.now() / 1000); // Utiliser le timestamp de fin s'il est fourni

	// Ajuster le timestamp de début pour obtenir le dernier ensemble de données si demandé
	var startTimestamp = returnLastOnly ? endTimestamp - 86400 : endTimestamp - timeInterval;


	var marketType = getMarketType(params.market);
	//console.log('markettype', marketType);
	var convertedSymbol = `${marketType}.${params.market.replace("-", "/")}`;
	var pythSymbol = encodeURIComponent(convertedSymbol);

	var pythEndpoint = `https://benchmarks.pyth.network/v1/shims/tradingview/history?symbol=${pythSymbol}&resolution=${pythResolution}&from=${startTimestamp}&to=${params.end}`;
	//console.log("pythEndpoint", pythEndpoint);
	var response = await fetch(pythEndpoint);
	var pythData = await response.json();

	let json = [];
	if (pythData.s === "ok") {
    if (pythData.t.length == 0) {
      json.push([0]);
    }
    for (let i = 0; i < pythData.t.length; i++) {
        json.push([pythData.c[i].toString()]);
    }
	}

	return json;
}

export const getPriceDenominator = (asset: string) =>
  asset == ETH ? ETH_PRICE_DENOMINATOR : USDC_PRICE_DENOMINATOR;

export function priceTickFormatter(num: number) {
  const unsignedNum = Math.abs(num);
  if (unsignedNum >= 1000000000) {
    return parseFloat((num / 1000000000).toFixed(1)) + "B";
  } else if (unsignedNum >= 1000000) {
    return parseFloat((num / 1000000).toFixed(1)) + "M";
  } else if (unsignedNum > 999 && unsignedNum < 1000000) {
    return parseFloat((num / 1000).toFixed(1)) + "K";
  } else {
    return parseFloat(num.toFixed(1));
  }
}

export const getPositionXY = (position: any, prices: any) => {
  return {
    x:
      +(
        (position.liquidationPrice - prices[position.market][0]) /
        prices[position.market][0]
      ).toFixed(4),
    y: position.marginInDollars,
  };
};

export const hideModal = () => {
  showPositionInfoModal.set(null);
  sharePositionModal.set(null);
};

export function formatForDisplay(amount: number, fix: number = 0) {
  amount = amount * 1;
  if (!amount || isNaN(amount)) return 0;
  if (!fix && +(amount * 1).toFixed(6) * 1 == Math.round(amount * 1))
    return Math.round(amount);
  if (fix) return (amount * 1).toFixed(fix);
  if (amount * 1 >= 10000 || amount * 1 <= -10000) {
    return Math.round(amount * 1);
  } else if (amount * 1 >= 10 || amount * 1 <= -10) {
    return (amount * 1).toFixed(2);
  } else if (amount * 1 >= 1 || amount * 1 <= -1) {
    return +(amount * 1).toFixed(4);
  } else if (amount * 1 >= 0.01 || amount * 1 <= -0.01) {
    return +(amount * 1).toFixed(5);
  } else {
    return +(amount * 1).toFixed(6);
  }
}

export function loadRoute(path: string) {
  if (!path || path == "/" || path.includes("/home")) {
    component.set(Home);
  } else if (path.includes("/positions")) {
    component.set(Positions);
  } else if (path.includes("/leaderboard")) {
    component.set(Leaderboard);
  } else if (path.includes("/user")) {
    component.set(User);
  } else if (path.includes("/staking")) {
    component.set(Staking);
  } else if (path.includes("/pooling")) {
    component.set(Pooling);
  }
}

export const getOrderType = (orderType: number) => {
  switch (orderType) {
    case 0:
      return 'Market'
    case 1:
      return 'Limit'
    case 2:
      return 'Stop'
    case 3:
      return 'Liquidation'
    default:
     return 'Market'
  }
}

export function formatPnl(pnl: number, isPercent: boolean) {
	let string = '';
	if (pnl == undefined) return string;
	if (pnl > 0) {
		string += '+';
	} else if (pnl > 0) {
		string += '-';
	}
	string += formatForDisplay(pnl, isPercent ? 2 : 0) || 0;
	if (isPercent) string += '%';
	return string;
}

export function timeConverter(timestamp: number) {
  var a = new Date(timestamp);
  var months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var dat = a.getDate();
  var time = dat + ' ' + month + ' ' + year;
  return time;
}

export function formatDate(date: Date) {
  const month = '' + (date.getMonth() + 1);
  const day = '' + date.getDate();
  return `${day}/${month}`;
}