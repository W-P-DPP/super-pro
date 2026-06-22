import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  getCurrentProjectGlobalConfig,
  type PublicGlobalConfigDto,
} from '@/api/modules/global-config';

type GlobalConfigLoadStatus = 'idle' | 'loading' | 'success' | 'error';

type GlobalConfigContextValue = {
  status: GlobalConfigLoadStatus;
  data: PublicGlobalConfigDto;
  errorMessage: string;
  reload: () => void;
};

const EMPTY_GLOBAL_CONFIG: PublicGlobalConfigDto = {};

const GlobalConfigContext = createContext<GlobalConfigContextValue>({
  status: 'idle',
  data: EMPTY_GLOBAL_CONFIG,
  errorMessage: '',
  reload: () => {},
});

export function GlobalConfigProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<GlobalConfigLoadStatus>('idle');
  const [data, setData] = useState<PublicGlobalConfigDto>(EMPTY_GLOBAL_CONFIG);
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadGlobalConfig() {
      setStatus('loading');
      setErrorMessage('');

      try {
        const nextConfig = await getCurrentProjectGlobalConfig({
          forceRefresh: reloadSeed > 0,
        });

        if (!active) {
          return;
        }

        setData(nextConfig);
        setStatus('success');
      } catch (error) {
        if (!active) {
          return;
        }

        setData(EMPTY_GLOBAL_CONFIG);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : '获取项目全局配置失败');
      }
    }

    void loadGlobalConfig();

    return () => {
      active = false;
    };
  }, [reloadSeed]);

  const value = useMemo<GlobalConfigContextValue>(
    () => ({
      status,
      data,
      errorMessage,
      reload: () => setReloadSeed((current) => current + 1),
    }),
    [data, errorMessage, status],
  );

  return (
    <GlobalConfigContext.Provider value={value}>
      {children}
    </GlobalConfigContext.Provider>
  );
}

export function useGlobalConfig() {
  return useContext(GlobalConfigContext);
}
