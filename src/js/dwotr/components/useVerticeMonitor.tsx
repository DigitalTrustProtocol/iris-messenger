import { useEffect, useState } from "preact/hooks";
import graphNetwork, { TrustScoreEvent } from "../GraphNetwork";
import { MonitorItem } from "../model/MonitorItem";
import { Vertice } from "../model/Graph";


const useVerticeMonitor = (id: number, options?: any, option?: any) => {
    
    const [state, setState] = useState({id, options, option});

    useEffect(() => {
        if (!id) return;
        let eventID = TrustScoreEvent.getEventId(id);

        function findOption(item: MonitorItem) {
            let vertice = graphNetwork.g.vertices[item.id] as Vertice;
            if(!vertice) return;
            let option = graphNetwork.findOption(vertice, options);
            setState((prevState) => ({ ...prevState, ...item, option }));
            
        }

        const cb = (e: any) => {
            let item = e.detail as MonitorItem;
            if (item.id != id)
                return;

            findOption(item);
        }

        graphNetwork.addVerticeMonitor(id);
        document.addEventListener(eventID, cb);

        // Call manually the graphNetwork.resolveTrust the first time
        let eventItem = new TrustScoreEvent(id, new MonitorItem(id));
        if (eventItem?.detail) 
            findOption(eventItem.detail);   

        return () => {
            graphNetwork.removeVerticeMonitor(id);
            document.removeEventListener(eventID, cb);
        }
    }, [id]);

    return state;
}

export default useVerticeMonitor;

