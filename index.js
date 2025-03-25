const express = require('express');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Symbole z Binance
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

// Pobierz funding rate
async function fetchFunding(symbol) {
  const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
  const response = await fetch(url);

  console.log(`🔁 Odpowiedź Binance dla ${symbol}:`, response.status);

  if (!response.ok) {
    throw new Error(`❌ Błąd pobierania danych z Binance dla ${symbol}: HTTP ${response.status}`);
  }

  const data = await response.json();

  console.log(`📦 Zawartość odpowiedzi dla ${symbol}:`, data);

  if (!Array.isArray(data) || data.length === 0 || !data[0].fundingRate) {
    throw new Error(`❌ Brak danych fundingRate dla ${symbol}`);
  }

  return parseFloat(data[0].fundingRate);
}

// Główna logika API
app.get('/', async (req, res) => {
  try {
    console.log('⏳ Pobieram dane z Binance...');

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

    const filePath = path.join(__dirname, 'market-condition.json');
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));

    console.log('✅ Dane zapisane do pliku:', filePath);
    res.json(result);
  } catch (err) {
    console.error('❌ Błąd podczas pobierania danych:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Start serwera
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
