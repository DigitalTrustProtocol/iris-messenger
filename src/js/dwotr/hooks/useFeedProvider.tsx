import { useCallback, useEffect, useRef, useState } from 'react';

import { FeedOption } from '../network/provider';
import { DataProvider } from '../network/provider/DataProvider';
import { NoteContainer } from '../model/ContainerTypes';
import { ProviderStatus } from '../network/provider';

const useFeedProvider = (opt: FeedOption | undefined, batchSize = 15) => {
  const [containers, setContainers] = useState<NoteContainer[]>([]);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [hasNew, setHasNew] = useState<boolean>(false);
  const [status, setStatus] = useState<ProviderStatus>('idle');
  const batchLoaded = useRef<Array<boolean>>([]);

  const dataProvider = useRef<DataProvider>(); // Make sure to get the same provider for the same feedId
  const intervalRef = useRef<any>(undefined);
  const loading = useRef<boolean>(false);
  const mounted = useRef<boolean>(false);

  // Loading events from memory
  useEffect(() => {
    if (!opt) return; // The options may not be ready yet
    mounted.current = true;

    let listener = {
      onStatusChanged: (status: ProviderStatus) => {
        setStatus(status);
      }
    }

    dataProvider.current = DataProvider.getProvider(opt, listener, batchSize); // Make sure to get the same provider for the same feedId
    dataProvider.current!.mount();    
    dataProvider.current!.preLoad();

    let list = dataProvider.current!.getBuffer();
    setContainers(list);

    if(list.length < dataProvider.current!.batchSize) 
       loadMore(); 

    // Check regularly for new events
    intervalRef.current = setInterval(() => {
      setHasNew(!!dataProvider.current?.hasNew());
    }, 3000);

    return () => {
      mounted.current = false;
      dataProvider.current?.unmount();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [opt]);


  const loadMore = useCallback((e?: any, cb?: (list: NoteContainer[]) => void) => {
    if (!dataProvider.current || !mounted.current) return;
    if (loading.current == true) {
      return;
    } 
    loading.current = true; // Prevent multiple loads from happening at once

    dataProvider.current?.nextPage().then((items) => {
      if (!dataProvider.current || !mounted.current) return 0;
      setContainers(dataProvider.current.getBuffer());
      setHasMore(!dataProvider.current.isDone());
      loading.current = false;
      cb?.(items);
    });

  }, []);

  // Load events in front of the event list
  const reset = useCallback((): void => {
    if (!dataProvider.current || !mounted.current) return;
    //if (!dataProvider.current?.hasNew()) return;

    dataProvider.current.reset();
    dataProvider.current.preLoad();
    setHasMore(!dataProvider.current?.isDone());
    setHasNew(false); // wait a bit before showing the new events

    loadMore();

    setContainers(dataProvider.current!.getBuffer());
  }, []);

  return { containers, status, hasMore, hasNew, batchLoaded: batchLoaded.current, loadMore, reset };
};

export default useFeedProvider;
