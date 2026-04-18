import { useEffect, useRef } from 'react';
import { init, type EChartsOption } from 'echarts';

type EChartPanelProps = {
  option: EChartsOption;
  className?: string;
};

export function EChartPanel({ option, className }: EChartPanelProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!elementRef.current) {
      return;
    }

    const chart = init(elementRef.current);
    chart.setOption(option);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [option]);

  return <div ref={elementRef} className={className ?? 'h-64 w-full'} />;
}
