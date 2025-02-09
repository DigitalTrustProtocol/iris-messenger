import React, { useMemo } from 'react';

import CreateNoteForm from '@/components/create/CreateNoteForm';
import OnboardingNotification from '@/components/onboarding/OnboardingNotification';
import { getEventReplyingTo, isRepost } from '@/nostr/utils';
import { translate as t } from '@/translations/Translation.mjs';
import { RouteProps } from '@/views/types.ts';
import View from '@/views/View.tsx';
import { FeedOption } from '@/dwotr/network/provider';
import FeedVirtual from '@/dwotr/components/feed/FeedVirtual';

const Global: React.FC<RouteProps> = () => {
  const filterOptions = useMemo(
    () => [
      {
        id: 'global',
        name: t('posts'),
        filter: { kinds: [1, 6], limit: 10 },
        filterFn: (event) => !getEventReplyingTo(event) || isRepost(event),
        eventProps: { showRepliedMsg: true },
        mergeReposts: true,
      } as FeedOption,
      {
        id: 'global-replies',
        name: t('posts_and_replies'),
        filter: { kinds: [1, 6], limit: 5 },
        eventProps: { showRepliedMsg: true, fullWidth: false },
        mergeReposts: true,
      } as FeedOption,
    ],
    [],
  );

  return (
    <View>
      <div className="flex flex-row">
        <div className="flex flex-col w-full">
          <OnboardingNotification />
          <div className="hidden md:block px-4">
            <CreateNoteForm autofocus={false} placeholder={t('whats_on_your_mind')} />
          </div>
          <FeedVirtual filterOptions={filterOptions} />
        </div>
      </div>
    </View>
  );
};

export default Global;
