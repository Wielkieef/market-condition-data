const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

const SYMBOLS = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  ALTCOINS: ['DOGEUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT', 'BNBUSDT']
};

async function fetchFunding(symbol) {
  const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  return parseFloat(data[0].fundingRate);
}

function interpret(rate) {
  if (rate > 0.0001) return 'Bullish';
  if (rate < -0.0001) return 'Bearish';
  return 'Neutral';
}

app.get('/funding', async (req, res) => {
  try {
    const btcRate = await fetchFunding(SYMBOLS.BTC);
    const ethRate = await fetchFunding(SYMBOLS.ETH);
    const altRates = await Promise.all(SYMBOLS.ALTCOINS.map(fetchFunding));
    const altAvg = altRates.reduce((a, b) => a + b, 0) / altRates.length;

    res.json({
      updated: new Date().toISOString(),
      BTC: { funding: (btcRate * 100).toFixed(3), sentiment: interpret(btcRate) },
      ETH: { funding: (ethRate * 100).toFixed(3), sentiment: interpret(ethRate) },
      ALTCOINS: { funding: (altAvg * 100).toFixed(3), sentiment: interpret(altAvg) }
    });
  } catch (err) {
    res.status(500).json({ error: '❌ Problem z proxy: ' + err.message });
  }
});

app.get('/', (req, res) => res.send('Funding Proxy działa 🚀'));
app.listen(PORT, () => console.log(`Proxy działa na porcie ${PORT}`));
