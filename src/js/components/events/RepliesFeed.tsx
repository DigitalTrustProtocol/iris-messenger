import { useEffect, useRef, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import useFeed from '@/dwotr/hooks/useFeed';
import { FeedOptions } from '@/dwotr/network/WOTPubSub';
import { Filter, Event } from 'nostr-tools';
import EventComponent from './EventComponent';
import noteManager from '@/dwotr/NoteManager';
import { ID } from '@/utils/UniqueIds';
import eventManager from '@/dwotr/EventManager';
import { RepliesCursor } from '@/dwotr/network/RepliesCursor';
import followManager from '@/dwotr/FollowManager';
import Key from '@/nostr/Key';
import replyManager from '@/dwotr/ReplyManager';

type RepliesFeedProps = {
  event: Event;
  showReplies: number;
  standalone?: boolean;
};

export const RepliesFeed = ({ event, showReplies, standalone }: RepliesFeedProps) => {
  const [filterOption, setFilterOption] = useState<FeedOptions>();

  const { events, hasMore, hasRefresh, loadMore, refresh } = useFeed(filterOption);

  useEffect(() => {
    let opt = {
      id: 'repliesFeed' + event.id, // Unique ID for this feed
      name: 'Replies',
      filter: {
        '#e': [event.id],
        kinds: [1],
        limit: 1000,
        //until: getNostrTime(), // Load events from now
        //since: event.created_at, // Replies cannot be created before the note
      } as Filter,
    } as FeedOptions;

    let cursor = new RepliesCursor(opt);

    // Preload replies to the cursor buffer, if any
    cursor.buffer = replyManager.getEventReplies(ID(event.id));

    opt.cursor = () => cursor;

    setFilterOption(opt);
  }, [event.id, showReplies]);

  return (
    <>
      <InfiniteScroll
        dataLength={events.length} //This is important field to render the next data
        next={loadMore}
        hasMore={hasMore}
        loader={
          <div className="justify-center items-center flex w-full mt-4 mb-4">
            <div className="loading">🔄</div>
          </div>
        }
        endMessage={
          <p style={{ textAlign: 'center' }}>
            <b>No more notes</b>
          </p>
        }
        // below props only if you need pull down functionality

        refreshFunction={refresh}
        pullDownToRefresh
        pullDownToRefreshThreshold={50}
        pullDownToRefreshContent={
          <h3 style={{ textAlign: 'center' }}>&#8595; Pull down to refresh</h3>
        }
        releaseToRefreshContent={
          <h3 style={{ textAlign: 'center' }}>&#8593; Release to refresh</h3>
        }
      >
        {events.map((event) => {
          return (
            <EventComponent
              key={`${event.id}RC`}
              id={event.id}
              isReply={true}
              isQuoting={!standalone}
              showReplies={1}
              event={event}
            />
          );
        })}
      </InfiniteScroll>
    </>
  );
};
