import { Candle, IndicatorResult } from '../../types';

interface ADXResult {
    adx: number;
    pdi: number;
    mdi: number;
}

export function calculateADX(candles: Candle[], period: number = 14): IndicatorResult<ADXResult> {
    if (candles.length < (period * 2)) { // Need enough data for smoothing
        return { value: { adx: 0, pdi: 0, mdi: 0 }, signal: 'neutral' };
    }

    const trs: number[] = [];
    const dmPlus: number[] = [];
    const dmMinus: number[] = [];

    for (let i = 1; i < candles.length; i++) {
        const curr = candles[i];
        const prev = candles[i - 1];

        const tr = Math.max(
            curr.high - curr.low,
            Math.abs(curr.high - prev.close),
            Math.abs(curr.low - prev.close)
        );
        trs.push(tr);

        const upMove = curr.high - prev.high;
        const downMove = prev.low - curr.low;

        if (upMove > downMove && upMove > 0) dmPlus.push(upMove);
        else dmPlus.push(0);

        if (downMove > upMove && downMove > 0) dmMinus.push(downMove);
        else dmMinus.push(0);
    }

    // Initial SMA for first Period
    let trSmooth = trs.slice(0, period).reduce((a, b) => a + b, 0);
    let dmPlusSmooth = dmPlus.slice(0, period).reduce((a, b) => a + b, 0);
    let dmMinusSmooth = dmMinus.slice(0, period).reduce((a, b) => a + b, 0);

    // Initial ADX Calculation Steps requires iterating through the rest of the array
    // to build up the smoothed averages properly.

    // Better approach: Calculate arrays of smoothed values
    const trSmoothArr: number[] = [trSmooth];
    const dmPlusSmoothArr: number[] = [dmPlusSmooth];
    const dmMinusSmoothArr: number[] = [dmMinusSmooth];

    for (let i = period; i < trs.length; i++) {
        trSmooth = trSmooth - (trSmooth / period) + trs[i];
        dmPlusSmooth = dmPlusSmooth - (dmPlusSmooth / period) + dmPlus[i];
        dmMinusSmooth = dmMinusSmooth - (dmMinusSmooth / period) + dmMinus[i];

        trSmoothArr.push(trSmooth);
        dmPlusSmoothArr.push(dmPlusSmooth);
        dmMinusSmoothArr.push(dmMinusSmooth);
    }

    // Calculate DX
    const dxValues: number[] = [];
    for (let i = 0; i < trSmoothArr.length; i++) {
        const pdi = (dmPlusSmoothArr[i] / trSmoothArr[i]) * 100;
        const mdi = (dmMinusSmoothArr[i] / trSmoothArr[i]) * 100;

        const sum = pdi + mdi;
        const diff = Math.abs(pdi - mdi);
        const dx = sum === 0 ? 0 : (diff / sum) * 100;
        dxValues.push(dx);
    }

    // Calculate ADX (SMA of DX)
    if (dxValues.length < period) {
        return { value: { adx: 0, pdi: 0, mdi: 0 }, signal: 'neutral' };
    }

    // We need starting ADX at index (period - 1) of dxValues
    let smoothedAdx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < dxValues.length; i++) {
        smoothedAdx = ((smoothedAdx * (period - 1)) + dxValues[i]) / period;
    }

    // Final PDI/MDI for metadata
    const lastPdi = (dmPlusSmoothArr[dmPlusSmoothArr.length - 1] / trSmoothArr[trSmoothArr.length - 1]) * 100;
    const lastMdi = (dmMinusSmoothArr[dmMinusSmoothArr.length - 1] / trSmoothArr[trSmoothArr.length - 1]) * 100;

    return {
        value: {
            adx: smoothedAdx,
            pdi: lastPdi,
            mdi: lastMdi
        },
        signal: 'neutral',
        metadata: { period }
    };
}
