export const WATCHLIST = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
    'DOGEUSDT', 'ADAUSDT', 'SHIBUSDT', 'AVAXUSDT', 'TONUSDT',
    'DOTUSDT', 'LINKUSDT', 'BCHUSDT', 'NEARUSDT', 'MATICUSDT',
    'LTCUSDT', 'PEPEUSDT', 'ICPUSDT', 'UNIUSDT', 'APTUSDT',
    'ARBUSDT', 'RNDRUSDT', 'HBARUSDT', 'FILUSDT', 'ETCUSDT',
    'STXUSDT', 'IMXUSDT', 'KASUSDT', 'WIFUSDT', 'FLOKIUSDT',
    'BONKUSDT', 'SUIUSDT', 'VETUSDT', 'OPUSDT', 'TAOUSDT',
    'GRTUSDT', 'AAVEUSDT', 'ALGOUSDT', 'THETAUSDT', 'OMUSDT',
    'RUNEUSDT', 'EGLDUSDT', 'FETUSDT', 'SANDUSDT', 'MKRUSDT',
    'FANTOMUSDT', 'SEIUSDT', 'TIAUSDT', 'JUPUSDT', 'LDOUSDT'
];

// Helper to format names nicely
const formatName = (symbol: string) => {
    const s = symbol.replace('USDT', '');
    return s.charAt(0) + s.slice(1).toLowerCase();
};

export const SYMBOL_MAP: Record<string, { id: string, name: string }> = {};
// Auto-generate map
WATCHLIST.forEach(s => {
    SYMBOL_MAP[s] = { id: s.toLowerCase(), name: formatName(s) };
});

// Override specific names
Object.assign(SYMBOL_MAP, {
    'BTCUSDT': { id: 'bitcoin', name: 'Bitcoin' },
    'ETHUSDT': { id: 'ethereum', name: 'Ethereum' },
    'SOLUSDT': { id: 'solana', name: 'Solana' },
    'DOGEUSDT': { id: 'dogecoin', name: 'Dogecoin' }
});
