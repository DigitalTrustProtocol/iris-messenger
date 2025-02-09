import { useEffect, useRef, useState } from 'preact/hooks';
import { formatValue } from '../components/Display/HtmlFormatValue';
import followManager from '../FollowManager';
import profileManager from '../ProfileManager';
import eventManager from '../EventManager';
import Header from '@/components/header/Header';
import reactionManager from '../ReactionManager';
import graphNetwork from '../GraphNetwork';
import noteManager from '../NoteManager';
import relaySubscription from '../network/RelaySubscription';
import relayListManager from '../RelayListManager';
import serverManager from '../ServerManager';

type TestDataProps = {
  path?: string;
};

class Metrics {
  Graph: any = {};
  Profiles: any = {};
  Events: any = {};
  Follow: any = {};
  Relays: any = {};
  Reactions: any = {}; 
  Notes: any = {};
  Subscriptions: any = {};
  RelayLists: any = {};
  RecommendRelays: any = {};
}

const useMetrics = (): { data: Metrics; time: number } => {
  const [data, setData] = useState<Metrics>(new Metrics());

  const intervalRef = useRef<any>(undefined);

  const initialData = useRef<Metrics>();
  const time = useRef<number>(Date.now());


  useEffect(() => {
    // Load data update every second

    const intervalRun = (): Metrics => {
      let d = new Metrics();

      d.Graph = graphNetwork.getMetrics();
      d.Profiles = profileManager.getMetrics();
      d.Events = eventManager.getMetrics();
      d.Follow = followManager.getMetrics();
      d.Reactions = reactionManager.getMetrics();
      d.Notes = noteManager.getMetrics();
      d.Subscriptions = relaySubscription.getMetrics();
      d.Relays = serverManager.getMetrics();
      d.RelayLists = relayListManager.getMetrics();
      d.RecommendRelays = relayListManager.getMetrics();

      return d;
    };

    intervalRef.current = setInterval(() => {
      let d = intervalRun(); // Check for new events
      setData(d);
      time.current = Date.now();
    }, 1000);

    initialData.current = intervalRun(); // Load events on first render
    setData(initialData.current);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return { data, time: time.current };
};

const MetricsView = (props: TestDataProps) => {
  const { data, time } = useMetrics();


  let groups = Object.keys(data).map((key) => {
    let group = data[key];
    let items = Object.keys(group).map((key) => {
      return { name: key, value: group[key] };
    });

    return { name: key, value: items };
  });

  const renderGroup = (name: string, items: any[]) => {
    return (
      <div className="flex flex-col border-2 rounded-lg border-white p-4">
        <div className="px-4 py-2 text-left text-sm font-bold">{name}</div>

        {items?.map((item) => (
          <div className="flex justify-between p-2 text-sm">
            <span className="whitespace-nowrap">{item.name}</span>&nbsp;
            <span className="flex-grow text-right">{formatValue(item.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  const content = () => (
    <>
      Dianogstics - {new Date(time).toLocaleString()}
      <div className="flex flex-row flex-wrap">
      {groups?.map((group) => renderGroup(group.name, group.value))}
      </div>

    </>
  );




  return (
    <>
      <Header />
      <div className="flex justify-between mb-4">
        <span className="text-2xl font-bold">
          <span style={{ flex: 1 }} className="ml-1">
            Settings
          </span>
        </span>
      </div>
      <hr className="-mx-2 opacity-10 my-2" />
      {content()}
    </>
  );
};

export default MetricsView;
