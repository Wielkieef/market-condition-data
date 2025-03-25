const fs = require('fs');
const fetch = require('node-fetch');

// Używane symbole z Binance
const SYMBOLS = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  ALTCOINS: ['DOGEUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'BNBUSDT']
};

// Interpretacja funding rate
function interpret(rate) {
  const value = parseFloat(rate);
  if (value > 0.0001) return 'Bullish';
  if (value < -0.0001) return 'Bearish';
  return 'Neutral';
}

// Pobierz funding rate z Binance
async function fetchFunding(symbol) {
  const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
  const response = await fetch(url);
  const data = await response.json();
  return parseFloat(data[0].fundingRate);
}

async function run() {
  try {
    const btcRate = await fetchFunding(SYMBOLS.BTC);
    const ethRate = await fetchFunding(SYMBOLS.ETH);

    const altRates = await Promise.all(SYMBOLS.ALTCOINS.map(fetchFunding));
    const altAvg = altRates.reduce((sum, r) => sum + r, 0) / altRates.length;

    const result = {
      updated: new Date().toISOString(),
      BTC: {
        funding: (btcRate * 100).toFixed(3),
        sentiment: interpret(btcRate)
      },
      ETH: {
        funding: (ethRate * 100).toFixed(3),
        sentiment: interpret(ethRate)
      },
      ALTCOINS: {
        funding: (altAvg * 100).toFixed(3),
        sentiment: interpret(altAvg)
      }
    };

    fs.writeFileSync('market-condition.json', JSON.stringify(result, null, 2));
    console.log('✅ Zapisano market-condition.json');
  } catch (err) {
    console.error('❌ Błąd pobierania danych:', err);
  }
}

run();
