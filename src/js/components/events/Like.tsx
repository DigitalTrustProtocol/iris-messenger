import { useEffect, useState } from 'react';
import { HeartIcon as HeartIconFull } from '@heroicons/react/24/solid';
import { Event } from 'nostr-tools';
import { route } from 'preact-router';

import { getEventReplyingTo } from '@/nostr/utils';

import Key from '../../nostr/Key';
import Name from '../user/Name';

import EventComponent from './EventComponent';
import reactionManager from '@/dwotr/ReactionManager';
import { ID, STR } from '@/utils/UniqueIds';
import eventManager from '@/dwotr/EventManager';

type Props = {
  event: Event;
};

const messageClicked = (e: MouseEvent, likedId: string) => {
  const target = e.target as HTMLElement;
  if (['A', 'BUTTON', 'TEXTAREA', 'IMG', 'INPUT'].find((tag) => target.closest(tag))) {
    return;
  }
  if (window.getSelection()?.toString()) {
    return;
  }
  e.stopPropagation();
  route(`/${Key.toNostrBech32Address(likedId, 'note')}`);
};

export default function Like(props: Props) {
  const [allLikes, setAllLikes] = useState<string[]>([]);
  const replyTo = getEventReplyingTo(props.event);
  if(!replyTo) return null;

  const replyToEvent = eventManager.eventIndex.get(ID(replyTo));
  if (!replyToEvent) {
    return null;
  }

  const authorIsYou = Key.isMine(replyToEvent?.pubkey);
  const mentioned = replyToEvent?.tags?.find((tag) => tag[0] === 'p' && Key.isMine(tag[1]));
  const likeText = authorIsYou
    ? 'liked your note'
    : mentioned
    ? 'liked a note where you were mentioned'
    : 'liked a note';

  useEffect(() => {
    if (replyTo) {
      // return Events.getLikes(likedId, (likedBy: Set<string>) => {
      //   setAllLikes(Array.from(likedBy));
      // });
      setAllLikes([...reactionManager.getLikes(ID(replyTo))].map((id) => STR(id) as string));
    }
  }, [replyTo]);

  if (!replyTo) {
    return null;
  }

  const userLink = `/${Key.toNostrBech32Address(props.event.pubkey, 'npub')}`;
  return (
    <div key={props.event.id}>
      <div onClick={(e) => messageClicked(e, replyTo)}>
        <div className="flex gap-1 items-center text-sm text-neutral-500 px-2 pt-2">
          <i className="like-btn text-iris-red">
            <HeartIconFull width={18} />
          </i>
          <span>
            <a href={userLink}>
              <Name pub={props.event.pubkey} />
            </a>
            {allLikes.length > 1 && <> and {allLikes.length - 1} others </>} {likeText}
          </span>
        </div>
        <EventComponent key={replyTo + props.event.id} id={replyTo} fullWidth={false} />
      </div>
    </div>
  );
}
