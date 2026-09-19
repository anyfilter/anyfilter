import { useEffect, useState } from 'react';

type Subscribed<T> =
  | { status: 'loading' }
  | { status: 'ready'; value: T }
  | { status: 'error'; message: string };

export function useSubscribedValue<T>(
  load: () => Promise<T>,
  subscribe: (listener: (value: T) => void) => () => void,
): Subscribed<T> {
  const [state, setState] = useState<Subscribed<T>>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribe((value) => {
      if (active) setState({ status: 'ready', value });
    });
    load()
      .then((value) => {
        if (active) setState({ status: 'ready', value });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [load, subscribe]);

  return state;
}
