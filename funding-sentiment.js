const fs = require('fs');
const path = require('path');
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

async function fetchFunding(symbol) {
  const url = `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
  const response = await fetch(url);
  console.log(`📦 Odpowiedź Binance dla ${symbol}:`, response.status);

  const data = await response.json();

  if (!data || !Array.isArray(data) || data.length === 0 || data[0].fundingRate === undefined) {
    throw new Error(`❌ Brak danych fundingRate dla ${symbol}`);
  }

  return parseFloat(data[0].fundingRate);
}

// Główna funkcja
async function run() {
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

    console.log('✅ Dane zinterpretowane:', result);

    // Absolutna ścieżka do zapisu
    const filePath = path.join(__dirname, 'market-condition.json');
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log('✅ Zapisano plik:', filePath);

  } catch (err) {
    console.error('❌ Błąd podczas pobierania danych:', err);
    process.exit(1);
  }
}

run();
