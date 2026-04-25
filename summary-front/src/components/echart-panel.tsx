import { useEffect, useRef } from 'react';
import { init, type ECharts, type EChartsOption } from 'echarts';

type EChartPanelProps = {
  option: EChartsOption;
  className?: string;
};

export function EChartPanel({ option, className }: EChartPanelProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ECharts | null>(null);

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }

    const chart = init(elementRef.current);
    chartRef.current = chart;

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current = null;
      chart.dispose();
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, {
      notMerge: true,
      lazyUpdate: true,
    });
  }, [option]);

  return <div ref={elementRef} className={className ?? 'h-64 w-full'} />;
}
