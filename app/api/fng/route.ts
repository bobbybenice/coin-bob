import { NextResponse } from 'next/server';

export async function GET() {
    const apiKey = process.env.COINMARKETCAP_API_KEY;

    if (!apiKey) {
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    try {
        const res = await fetch('https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest', {
            headers: {
                'X-CMC_PRO_API_KEY': apiKey,
                'Accept': 'application/json',
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('CMC API Error:', res.status, errorData);
            return NextResponse.json({ error: `CMC API Error: ${res.status}` }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error proxying F&G request:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
