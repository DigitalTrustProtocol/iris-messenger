import { memo } from 'preact/compat';
import { Event } from 'nostr-tools';
import { useState } from 'preact/hooks';


import Events from '../../nostr/Events';
import Key from '../../nostr/Key';
//import localState from '../../state/LocalState.ts';
import { translate as t } from '../../translations/Translation.mjs';
import Helpers from '../../utils/Helpers';
import Block from '../buttons/Block';
import Copy from '../buttons/Copy';
import FollowButton from '../buttons/Follow';
import Dropdown from '../Dropdown';
import Modal from '../modal/Modal';

import EventRelaysList from './EventRelaysList';
import muteManager from '@/dwotr/MuteManager';
import { ID } from '@/utils/UniqueIds';
import eventManager from '@/dwotr/EventManager';

interface EventDropdownProps {
  event?: Event;
  onTranslate?: (text: string) => void;
  id: string;
}

const EventDropdown = (props: EventDropdownProps) => {
  const { event, id } = props;

  const [muted, setMuted] = useState<boolean>(false); // TODO setMuted
  const [showingDetails, setShowingDetails] = useState(false);
  const [bechUrl, _] = useState<string>(`https://iris.to/${Key.toNostrBech32Address(id, 'note')}` || '');


  const closeModal = () => setShowingDetails(false);

  const onBlock = () => {
    // TODO hide msg
  };

  const onDelete = (e: any) => {
    e.preventDefault();
    if (confirm('Delete message?')) {
      const hexId = Key.toNostrHexAddress(id);
      if (hexId) {
        Events.publish({
          kind: 5,
          content: 'deleted',
          tags: [['e', hexId]],
        });
        // TODO hide
      }
    }
  };

  const onMute = (e) => {
    e.preventDefault();

    if(!props.event) return;
    let id = ID(props.event.id);
    muteManager.onMute(id, !muted, false, true);
    setMuted(!muted)
    // TODO: Popup box to confirm mute
  };

  const report = (e) => {
    e.preventDefault();
    if (confirm('Publicly report and hide message?')) {
      const hexId = Key.toNostrHexAddress(props.id);
      if (hexId && props.event) {
        Events.publish({
          kind: 5,
          content: 'reported',
          tags: [
            ['e', hexId],
            ['p', props.event.pubkey],
          ],
        });
        // this.setState({ msg: null });
      }
    }
  };

  const translate = (e: any) => {
    e.preventDefault();
    props.event &&
      Helpers.translateText(props.event.content).then((res) => {
        props.onTranslate?.(res);
      });
  };

  const onBroadcast = (e: any) => {
    // republish message on nostr
    e.preventDefault();
    const hexId = Key.toNostrHexAddress(id);
    if (hexId) {
      const event = eventManager.eventIndex.get(ID(hexId));
      if (event) {
        // TODO indicate to user somehow
        console.log('broadcasting', hexId, event);
        Events.publish(event);
      }
    }
  };


  return (
    <div>
      <Dropdown>
        <Copy className="btn btn-sm" key={`${id!}copy_link`} text={t('copy_link')} copyStr={bechUrl} />
        <Copy
          className="btn btn-sm"
          key={`${id!}copy_id`}
          text={t('copy_note_ID')}
          copyStr={Key.toNostrBech32Address(id, 'note') || ''}
        />
        <a className="btn btn-sm" href="#" onClick={onMute}>
          {muted ? t('unmute_notifications') : t('mute_notifications')}
        </a>
        {event ? (
          <>
            <a className="btn btn-sm" href="#" onClick={onBroadcast}>
              {t('resend_to_relays')}
            </a>
            <a className="btn btn-sm" href="#" onClick={translate}>
              {t('translate')}
            </a>
            <Copy
              className="btn btn-sm"
              key={`${id!}copyRaw`}
              text={t('copy_raw_data')}
              copyStr={JSON.stringify(event, null, 2)}
            />
            {Key.isMine(event.pubkey) ? (
              <a className="btn btn-sm" href="#" onClick={onDelete}>
                {t('delete')}
              </a>
            ) : (
              <>
                <a className="btn btn-sm" href="#" onClick={report}>
                  {t('report_public')}
                </a>
                <FollowButton className="btn btn-sm" id={event?.pubkey} />
                <Block
                  className="btn btn-sm"
                  onClick={onBlock}
                  id={event?.pubkey}
                  showName={true}
                />
              </>
            )}
            <a
              className="btn btn-sm"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowingDetails(true);
              }}
            >
              {t('event_detail')}
            </a>
          </>
        ) : (
          <></>
        )}
      </Dropdown>
      {event && showingDetails && (
        <Modal showContainer onClose={closeModal}>
          <EventRelaysList event={event} />
          <button className="btn btn-sm btn-primary mt-4" onClick={closeModal}>
            {t('done')}
          </button>
        </Modal>
      )}
    </div>
  );
};

export default memo(EventDropdown);
