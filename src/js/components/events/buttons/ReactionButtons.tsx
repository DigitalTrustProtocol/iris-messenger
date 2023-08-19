import { ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import { memo } from 'preact/compat';
import { useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';

import Show from '@/components/helpers/Show.tsx';
import localState from '@/LocalState.ts';

import Events from '../../../nostr/Events';
import Key from '../../../nostr/Key';
import ReactionsList from '../ReactionsList';

import { CheckCorrect, FlagMarkSolid } from '../../../dwotr/components/Icons';
import graphNetwork from '../../../dwotr/GraphNetwork';
import { EntityType } from '../../../dwotr/model/Graph';
import TrustScore from '../../../dwotr/model/TrustScore';
import Like from './Like';
import Repost from './Repost';
import Zap from './Zap';

let settings: any = {};
localState.get('settings').on((s) => (settings = s));

const ReactionButtons = (props) => {
  const [state, setState] = useState({
    replyCount: 0,
  });

  const [score, setScore] = useState({
    trusted: false,
    distrusted: false,
  });

  const event = props.event;
  const wot = props.wot;

  useEffect(() => {
    return Events.getThreadRepliesCount(event.id, handleThreadReplyCount);
  }, [event]);

  useEffect(() => {
    const v = wot?.vertice;
    const s = v?.score as TrustScore;
    setScore((prevState) => ({
      ...prevState,

      trusted: s?.isDirectTrusted(),
      distrusted: s?.isDirectDistrusted(),
    }));
  }, [wot]); // Everytime the wot changes, its a new object

  function trustBtnClicked(e) {
    e.preventDefault();
    e.stopPropagation();

    setScore((prevState) => {
      let val = !prevState.trusted ? 1 : 0;
      graphNetwork.publishTrust(event.id, val, EntityType.Item);

      return {
        ...prevState,
        trusted: !prevState.trusted,
        distrusted: false,
      };
    });
  }

  function distrustBtnClicked(e) {
    e.preventDefault();
    e.stopPropagation();

    setScore((prevState) => {
      let val = !prevState.distrusted ? -1 : 0;
      graphNetwork.publishTrust(event.id, val, EntityType.Item);

      return {
        ...prevState,
        trusted: false,
        distrusted: !prevState.distrusted,
      };
    });
  }
  const handleThreadReplyCount = (threadReplyCount) => {
    setState((prevState) => ({
      ...prevState,
      replyCount: threadReplyCount,
    }));
  };

  function replyBtnClicked() {
    if (props.standalone) {
      document.querySelector('textarea')?.focus();
    } else {
      route(`/${Key.toNostrBech32Address(props.event.id, 'note')}`);
    }
  }

  function trustBtns() {
    return (
      <>
        <a
          className={`btn-ghost trust-btn btn-sm flex-1 justify-center hover:bg-transparent btn content-center gap-2 rounded-none ${
            score.trusted ? 'trusted' : 'hover:trusted text-neutral-500'
          }`}
          onClick={(e) => trustBtnClicked(e)}
          title={score.trusted ? 'Trusted' : 'Trust'}
        >
          {score.trusted ? (
            <CheckCorrect size={18} fill="green" stroke="currentColor" />
          ) : (
            <CheckCorrect size={18} fill="none" stroke="currentColor" />
          )}
          {(!props.standalone && wot?.vertice?.score?.renderTrustCount()) || ''}
        </a>
        <a
          className={`btn-ghost trust-btn btn-sm flex-1 justify-center hover:bg-transparent btn content-center gap-2 rounded-none ${
            score.distrusted ? 'distrusted' : 'hover:distrusted text-neutral-500'
          }`}
          onClick={(e) => distrustBtnClicked(e)}
          title={score.distrusted ? 'Distrusted' : 'Distrust'}
        >
          {score.distrusted ? (
            <FlagMarkSolid size={18} fill="red" stroke="currentColor" />
          ) : (
            <FlagMarkSolid size={18} fill="none" stroke="currentColor" />
          )}
          {(!props.standalone && wot?.vertice?.score?.renderDistrustCount()) || ''}
        </a>
      </>
    );
  }

  return (
    <>
      {props.standalone && <ReactionsList event={props.event} wot={wot} />}
      <div className="flex gap-4">
        <a
          className="btn-ghost btn-sm hover:bg-transparent hover:text-iris-blue btn content-center gap-2 rounded-none text-neutral-500"
          onClick={() => replyBtnClicked()}
        >
          <ChatBubbleOvalLeftIcon width={18} />
          <span>{state.replyCount || ''}</span>
        </a>
        <Show when={settings.showReposts !== false}>
          <Repost event={props.event} />
        </Show>
        <Show when={settings.showLikes !== false}>
          <Like event={props.event} />
        </Show>
        <Show when={settings.showZaps !== false}>
          <Zap event={props.event} />
        </Show>
        {trustBtns()}
      </div>
    </>
  );
};

export default memo(ReactionButtons);
