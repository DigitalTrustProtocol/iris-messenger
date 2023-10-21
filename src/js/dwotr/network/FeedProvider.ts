import { Event } from 'nostr-tools';
import { Events, ICursor, IEventProvider } from './types';
import { ID, UID } from '@/utils/UniqueIds';

import { FeedOption } from './WOTPubSub';
import { getNostrTime, toNostrUTCstring } from '../Utils';
import contextLoader from './DependencyLoader';

export class FeedProvider {
  id: string = 'default';

  logging = false;

  pageSize = 10;

  viewStart: number = 0;
  viewEnd: number = this.pageSize;
  view: Array<Event> = [];

  buffer: Array<Event> = [];
  seen: Set<UID> = new Set<UID>();

  //peekCursor: ICursor;
  cursor: ICursor;
  eventProvider: IEventProvider;

  loading: boolean = false;
  isDone: boolean = false;

  constructor(_id:string, _cursor: ICursor, _eventProvider: IEventProvider, size = 10) {
    this.id = _id;
    this.cursor = _cursor;
    this.eventProvider = _eventProvider;
    this.pageSize = size;
  }

  hasMore(): boolean {
    if(this.viewEnd < this.buffer.length) return true; // There are more events in the buffer
    if(this.cursor.count() > 0) return true; // There are more events in the cursor
    if(!this.cursor.done) return true; // The cursor is not done

    return false; // There are no more events to load
  }

  isLoading(): boolean {
    return this.loading;
  }

  hasNew(): boolean {
    return this.eventProvider.count() > 0;
  }

  load() {
    this.viewStart = 0;
    this.viewEnd = 0;

    if (this.logging) console.log('FeedProvider:load:START');

    this.mapNew(); // Subscribe to new events

    // Return what we have in the buffer right now
    this.#loadToBuffer(false); // Don't call the cursor's relays, we want to load the buffer with what we have in memory
    return this.#increaseView();
  }

  mapNew() {
    let feedOptions = this.eventProvider.feedOptions;

    let since = this.#getUntil(this.buffer) ?? this.cursor.until; // Ensure is that only the new events are loaded
    if(!since)
      since = getNostrTime(); // If no events are in the buffer, load the latest events

    let options = {
      ...feedOptions,
      filter: { ...feedOptions.filter, since, until: undefined, limit: undefined },
      filterFn: (event: Event) => {
        if (feedOptions?.filterFn && !feedOptions.filterFn?.(event)) return false; // Filter out events that don't match the filterFn, undefined means match
        if (this.seen.has(ID(event.id))) return false; // Filter out events that have already been seen
        this.seen.add(ID(event.id));
        return true;
      },
    } as FeedOption;

    if (this.logging)
      console.log(
        'FeedProvider:mapNew',
        ' - Since:',
        toNostrUTCstring(since),
        ' - Options:',
        options,
      );

    this.eventProvider.map(options);
  }

  off(): void {
    this.eventProvider.off();
  }

  // Unsubscribe
  unmount(): void {
    this.off();
  }

  mergeNew(): Array<Event> {
    let events = this.eventProvider.take(this.eventProvider.count());

    this.#sort(events);

    this.buffer = [...events, ...this.buffer];

    this.viewStart = 0;
    this.viewEnd = this.pageSize;

    let view = this.buffer.slice(this.viewStart, this.viewEnd);

    return view;
  }

  


  // Gets called by the UI once when it needs more events, therefore be sure to return new events
  // If no new events are returned, the UI will stop calling this method
  // If no new events are available, return the current view
  async nextPage(): Promise<Array<Event>> {
    
    if (!this.hasMore()) return this.view; // No more events to load

    let neededLength = this.viewEnd + this.pageSize;

    if (neededLength > this.buffer.length) {
      // Only load more if the buffer is running low
      let deltaItems = await this.#loadToBuffer(true);
      await contextLoader.resolve(deltaItems);
    }

    this.isDone = this.cursor.done && this.cursor.count() == 0;

    return this.#increaseView();
  }

  #increaseView() {
    let neededLength = this.viewEnd + this.pageSize;

    this.viewEnd = neededLength > this.buffer.length ? this.buffer.length : neededLength;
    //if(this.viewEnd < this.buffer.length) this.viewEnd = this.buffer.length; // Make sure we don't go over the buffer length

    this.view = this.buffer.slice(this.viewStart, this.viewEnd);
    return this.view;
  }

  async #loadToBuffer(callCursor = true): Promise<Array<Event>> {

    this.loading = true;
    let remaning = this.pageSize;
    let filteredItems: Array<Event> = [];

    let requestCount = 0; // Safety net

    while (remaning > 0) {
      if (this.pageSize > this.cursor.count() && !this.cursor.done && callCursor) {
        await this.cursor.load();
      }

      let event = this.cursor.pop();
      if (event) {
        if (this.seen.has(ID(event.id))) continue;
        this.seen.add(ID(event.id));
        filteredItems.push(event);
        remaning--;
      } else {
        if(requestCount++ >= 10) break; // Safety net
      }

      if ((this.cursor.done || !callCursor) && this.cursor.count() == 0) break; // No more events to load and cursor is done.
    }
    this.loading = false;

    //this.#sort(filteredItems);
    this.buffer.push(...filteredItems);

    return filteredItems;
  }

  #sort(items: Array<Event>) {
    items.sort((a, b) => b.created_at - a.created_at);
  }

  #timeLogger() {
    let items: String[] = [];
    let since = new Date(this.cursor.since * 1000);
    let until = new Date(this.cursor.until! * 1000);

    items.push(' - Since:');
    items.push(since.toLocaleString());

    items.push(' - Until:');
    items.push(until.toLocaleString());

    let span = (this.cursor.until! - this.cursor.since) * 1000;
    let spanMin = Math.floor(span / 1000 / 60);
    items.push(' - Span:');
    items.push(spanMin + ' minutes');

    let delta = this.cursor.delta * 1000;
    let deltaMin = Math.floor(delta / 1000 / 60);
    items.push(' - Delta:');
    items.push(deltaMin + ' minutes');

    return items;
  }

  #getSince(list: Events): number | undefined {
    if (list.length == 0) return;
    return list[list.length - 1].created_at;
  }

  #getUntil(list: Events): number | undefined {
    if (list.length == 0) return;
    return list[0].created_at;
  }
}
