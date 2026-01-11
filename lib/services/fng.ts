

export interface FearAndGreedData {
    value: number;
    value_classification: string;
    timestamp: string;
}

export async function fetchFearAndGreedIndex(): Promise<FearAndGreedData> {
    const res = await fetch('/api/fng');

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch Fear & Greed Index from Proxy');
    }

    const json = await res.json();

    // CMC V3 structure usually: { data: { value, value_classification, ... } }
    // Adapting to our internal interface
    const data = json.data;

    if (!data) {
        throw new Error('Invalid data format from CMC');
    }

    return {
        value: Math.round(data.value), // Ensure integer
        value_classification: data.value_classification,
        timestamp: data.update_time || new Date().toISOString()
    };
}
