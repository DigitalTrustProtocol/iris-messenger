import { Event, Filter } from 'nostr-tools';
import {
  OnEvent,
  ReplaceableKinds,
  StreamKinds,
  FeedOptions,
} from './WOTPubSub';
import getRelayPool from '@/nostr/relayPool';

import { ID, STR, UID } from '@/utils/UniqueIds';
import eventManager from '../EventManager';
import Relays from '@/nostr/Relays';
import { getNostrTime } from '../Utils';
import blockManager from '../BlockManager';



class RelaySubscription {
  until = getNostrTime();

  subscribedAuthors = new Set<UID>();


  logging = false;

  subCount = 0;
  subs = new Map<number, () => void>();

  #subCounter = 0;


  metrics = {
    Count: 0,
    SubscribedAuthors: 0,
    Subscriptions: 0,
    Callbacks: 0,
    Profiles: 0,
    NoteEvents: 0,
    ContactEvents: 0,
    ReactionEvents: 0,
    TrustEvents: 0,
  };


  // Continuously subscribe to authors and most kinds of events.
  // This is used to keep the relay connection alive and constantly getting new events.
  // Used the for WoT context. Following and trusted authors are subscribed to.
  mapAuthors(authorIds: Set<UID> | Array<UID>, since = this.until+1, kinds = [...StreamKinds, ...ReplaceableKinds]) : Array<number> {
    let authors: Array<string> = [];

    for (let id of authorIds) {
      if (this.subscribedAuthors.has(id)) continue;
      this.subscribedAuthors.add(id);
      authors.push(STR(id) as string);
    }

    if (authors.length === 0) return [];


    // Batch authors into chunks, so size limits are not hit.
    let batchs = this.#batchArray(authors, 100);
    let subs: Array<number> = [];

    for (let batch of batchs) {

      let filter = 
        {
          authors: batch,
          kinds,
          since,
        } as Filter;

      let options = {
        filter
      } as FeedOptions;

      subs.push(this.map(options));
    }

    return subs;
  }


  async onceAuthors(authorIds: Set<UID> | Array<UID>, since = 0, until = this.until, kinds = [...StreamKinds, ...ReplaceableKinds]) : Promise<boolean[]> {
    let authors: Array<string> = [];
    let timeOut = 30000;

    for (let id of authorIds) {
      authors.push(STR(id) as string);
    }

    if (authors.length === 0) return Promise.resolve([]);

    // Batch authors into chunks, so size limits are not hit.
    let batchs = this.#batchArray(authors, 100);
    let subs: Array<Promise<boolean>> = [];

    for (let batch of batchs) {
      let filter = 
        {
          authors: batch,
          kinds,
          since,
          until,
        } as Filter;

      let options = {
        filter
      } as FeedOptions;

      subs.push(this.Once(options, timeOut));
    }

    let results = await Promise.all(subs);

    return results;
  }


  // A Once subscription is used to get a batch of events by an author.
  // Return a true value when done and false if timed out.
  async getEventsByAuthor(
    authors: Array<string>,
    kinds: Array<number>,
    onEvent?: OnEvent,
    limit?: number | undefined,
    since?: number | undefined,
    until?: number | undefined,
  ): Promise<boolean> {
    let filter = 
      {
        authors,
        kinds,
        since,
        until,
        limit,
      } as Filter;
    

    return this.getEventsByFilters(filter, onEvent);
  }


  // A Once subscription is used to get a batch of events by ids.
  // Return a true value when done and false if timed out.
  async getEventsById(
    ids: Array<string>,
    kinds?: Array<number>,
    onEvent?: OnEvent,
    limit?: number | undefined,
    since?: number | undefined,
    until?: number | undefined,
  ): Promise<Array<Event>> {
    let filter = 
      {
        ids,
        kinds,
        since,
        until,
        limit,
      } as Filter;
    
    let events: Array<Event> = [];

    const cb = (event: Event, afterEose: boolean, url: string | undefined) => {
      events.push(event);
      onEvent?.(event, afterEose, url);
    };

    await this.getEventsByFilters(filter, cb);

    return events;
  }

  async getEventsByFilters(
    filter: Filter,
    cb?: OnEvent,
  ): Promise<boolean> {
    let options = {
      filter,
      onEvent: cb,
    } as FeedOptions;

    return this.Once(options);
  }


  // A Once subscription is used to get events by options.
  // Return a true value when done and false if timed out.
  async Once(options: FeedOptions, timeOut: number = 3000): Promise<boolean> {

    let timer: NodeJS.Timeout;
    let stopWatch = Date.now();

    let subCounter = ++this.#subCounter;
    let relays = Relays.enabledRelays();
    let slowRelays = new Set<string>(relays);

    if(this.logging)
      console.log("RelaySubscription:Once:Called", " - Sub:", subCounter);


    let promise = new Promise<boolean>((resolve, _) => {

      let state ={
        closed: false
      } 

      timer = setTimeout(() => {
        state.closed = true;
        options.onClose?.(subCounter);
        if(this.logging) 
          console.log('RelaySubscription:Once:Timeout', relays.length, 'relays', Date.now() - stopWatch, 'ms', " - Slow Relays:", slowRelays.size, slowRelays, " - Sub:", subCounter);

        unsub?.();
        resolve(false);
      }, timeOut);

      let tries = 0;

      const onEvent = this.#createOnEvent(options?.onEvent);

      const onEose = (relayUrl: string, minCreatedAt: number) => {
       
        if (slowRelays.has(relayUrl)) 
          slowRelays.delete(relayUrl);

        if (relays.includes(relayUrl)) 
          tries++;

       if(this.logging)
          console.log('RelaySubscription:Once:onEose', relayUrl, `${tries}/${relays.length}`, " - Sub:", subCounter);
        
        let allEosed = tries === relays.length;
        options.onEose?.(allEosed, relayUrl, minCreatedAt);

        if (allEosed) {
          if(this.logging) 
            console.log('RelaySubscription:Once:Done', relays.length, 'relays', Date.now() - stopWatch, 'ms', " - Sub:", subCounter);

          state.closed = true;
          clearTimeout(timer);
          options.onClose?.(subCounter);
          unsub?.();
          resolve(true);
        }
      };

      let unsub = getRelayPool().subscribe([options.filter], relays, onEvent, undefined, onEose, {
        allowDuplicateEvents: false,
        allowOlderEvents: false,
        logAllEvents: false,
        unsubscribeOnEose: true,
        //dontSendOtherFilters: true,
        //defaultRelays: string[]
      });
    });

    

    return promise;
  }

  // A Continues subscription is used to get events by options.
    // Return a unsubribe number value, used to unsubscribe.
  map(options: FeedOptions) : number {
    let relayIndex = new Map<string, number>();

    let relays = Relays.enabledRelays();

    let state ={
      closed: false
    } 

    const onEvent = this.#createOnEvent(options?.onEvent);

    const onEose = (relayUrl: string, minCreatedAt: number) => {
      relayIndex.set(relayUrl, 0);
      let allEosed = [...relayIndex.values()].every((v) => v === 0);

      options.onEose?.(allEosed, relayUrl, minCreatedAt);
    };

    let unsub = getRelayPool().subscribe([options.filter], relays, onEvent, undefined, onEose, {
      allowDuplicateEvents: false,
      allowOlderEvents: false,
      logAllEvents: false,
      unsubscribeOnEose: false,
      //dontSendOtherFilters: true,
      //defaultRelays: string[]
    });

    let subId = ++this.subCount;

    let userUnsub = () => {
      state.closed = true;
      options.onClose?.(subId);
      unsub?.();
    };

    this.subs.set(subId, userUnsub);
    return this.subCount;
  }

  // A Continues subscription is used to get replaceable events by options.
  // Return a unsubribe number value, used to unsubscribe.
  On(options: FeedOptions) : number {
    let relayIndex = new Map<string, number>();

    let relays = Relays.enabledRelays();

    let state ={
      closed: false
    } 

    const onEvent = this.#createOnEvent(options?.onEvent);

    const onEose = (relayUrl: string, minCreatedAt: number) => {
      relayIndex.set(relayUrl, 0);
      let allEosed = [...relayIndex.values()].every((v) => v === 0);

      options.onEose?.(allEosed, relayUrl, minCreatedAt);
      if(allEosed) {
        state.closed = true;
        options.onClose?.(0);
        unsub?.();
      }
    };

    let unsub = getRelayPool().subscribe([options.filter], relays, onEvent, undefined, onEose, {
      allowDuplicateEvents: false,
      allowOlderEvents: false,
      logAllEvents: false,
      unsubscribeOnEose: false,
      //dontSendOtherFilters: true,
      //defaultRelays: string[]
    });

    this.subs.set(++this.subCount, unsub);
    return this.subCount;
  }

  off(id: number) {
    this.subs.get(id)?.();
    this.subs.delete(id);
  }

  offAll() {
    for(let unsub of this.subs.values()) {
      unsub();
    }
    this.subs.clear();
  }


  #batchArray(arr: Array<any>, batchSize: number = 1000) {
    const batchedArr: Array<any> = [];

    for (let i = 0; i < arr.length; i += batchSize) {
      batchedArr.push(arr.slice(i, i + batchSize));
    }

    return batchedArr;
  }


  #createOnEvent(userOnEvent?: OnEvent) {

    let subCounter = this.#subCounter;

    const onEvent = (event: Event, afterEose: boolean, url: string | undefined) => {

      if(this.logging)
        console.log('RelaySubscription:onEvent', url, " - Eose:", afterEose, " - ID:", event.id, " - Sub:", subCounter);

      if(!event) return;

      let authorId = ID(event.pubkey);
      if (blockManager.isBlocked(authorId)) return;

      let id = ID(event.id);
      if(eventManager.seen(id)) { // Skip verify and eventHandle on seen events
        if(this.logging)
          console.log('RelaySubscription:onEvent:seen - ID:', event.id, " - Sub:", subCounter);
        //if(!state?.closed)
        userOnEvent?.(event, afterEose, url);
      }; 

      // By waiting with verifying the event until its a new event, saves a lot of time.
      if(!eventManager.verify(event)) return; // Skip events that are not valid.

      eventManager.eventCallback(event).then((_) => {
        //if(!state?.closed)
          userOnEvent?.(event, afterEose, url);
      });
    }
    return onEvent;
  }

  getMetrics() {
    this.metrics.Count = Relays.enabledRelays().length;
    this.metrics.SubscribedAuthors = this.subscribedAuthors.size;
    this.metrics.Subscriptions = this.subs.size;

    return this.metrics;
  }

}

const relaySubscription = new RelaySubscription();
export default relaySubscription;
