import { render } from '@testing-library/react';
import type { EChartsOption } from 'echarts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EChartPanel } from './echart-panel';

const echartsMocks = vi.hoisted(() => {
  const resizeMock = vi.fn();
  const disposeMock = vi.fn();
  const setOptionMock = vi.fn();
  const initMock = vi.fn(() => ({
    resize: resizeMock,
    dispose: disposeMock,
    setOption: setOptionMock,
  }));

  return {
    resizeMock,
    disposeMock,
    setOptionMock,
    initMock,
  };
});

vi.mock('echarts', () => ({
  init: echartsMocks.initMock,
}));

describe('EChartPanel', () => {
  afterEach(() => {
    echartsMocks.resizeMock.mockClear();
    echartsMocks.disposeMock.mockClear();
    echartsMocks.setOptionMock.mockClear();
    echartsMocks.initMock.mockClear();
  });

  it('keeps the chart instance and only updates option on rerender', () => {
    const firstOption: EChartsOption = {
      xAxis: { type: 'category', data: ['10:00'] },
      yAxis: { type: 'value' },
      series: [{ id: 'cpu', type: 'line', data: [12] }],
    };

    const nextOption: EChartsOption = {
      xAxis: { type: 'category', data: ['10:00', '10:05'] },
      yAxis: { type: 'value' },
      series: [{ id: 'cpu', type: 'line', data: [12, 18] }],
    };

    const { rerender, unmount } = render(<EChartPanel option={firstOption} />);

    expect(echartsMocks.initMock).toHaveBeenCalledTimes(1);
    expect(echartsMocks.setOptionMock).toHaveBeenNthCalledWith(1, firstOption, {
      notMerge: true,
      lazyUpdate: true,
    });

    rerender(<EChartPanel option={nextOption} />);

    expect(echartsMocks.initMock).toHaveBeenCalledTimes(1);
    expect(echartsMocks.setOptionMock).toHaveBeenNthCalledWith(2, nextOption, {
      notMerge: true,
      lazyUpdate: true,
    });

    unmount();

    expect(echartsMocks.disposeMock).toHaveBeenCalledTimes(1);
  });
});
