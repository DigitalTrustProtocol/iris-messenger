import { useState } from 'react';
import { route } from 'preact-router';

import Key from '../../nostr/Key';
import { translate as t } from '../../translations/Translation.mjs';
import Block from '../buttons/Block';
import Copy from '../buttons/Copy';
import Dropdown from '../Dropdown';
import Show from '../helpers/Show';
import QRModal from '../modal/QRModal';

import Name from './Name';
import Trust from '@/dwotr/components/buttons/Trust';
import Distrust from '@/dwotr/components/buttons/Distrust';

const ProfileDropdown = ({ hexPub, npub, rawDataJson, isMyProfile }) => {
  async function viewAs(event) {
    event.preventDefault();
    route('/');
    Key.login({ rpub: hexPub });
  }

  const [showQrCode, setShowQrCode] = useState<boolean>(false);

  return (
    <>
      <Dropdown>
        <Copy
          className="btn btn-sm"
          key={`${hexPub}copyLink`}
          text={t('copy_link')}
          copyStr={window.location.href}
        />
        <Copy
          className="btn btn-sm"
          key={`${hexPub}copyNpub`}
          text={t('copy_user_ID')}
          copyStr={npub}
        />
        <button className="btn btn-sm" onClick={() => setShowQrCode(true)}>
          {t('show_qr_code')}
        </button>
        <Show when={rawDataJson}>
          <Copy
            className="btn btn-sm"
            key={`${hexPub}copyData`}
            text={t('copy_raw_data')}
            copyStr={rawDataJson}
          />
        </Show>
        <Show when={!isMyProfile && !Key.getPrivKey()}>
          <button className="btn btn-sm" onClick={viewAs}>
            {t('view_as') + ' '}
            <Name pub={hexPub} hideBadge={true} />
          </button>
        </Show>
        <Show when={!isMyProfile}>
          <>
            <Block className="btn btn-sm" id={hexPub} />
            <Trust className="btn btn-sm" id={hexPub} />
            <Distrust className="btn btn-sm" id={hexPub} />
          </>
        </Show>
      </Dropdown>
      <Show when={showQrCode}>
        <QRModal pub={hexPub} onClose={() => setShowQrCode(false)} />
      </Show>
    </>
  );
};

export default ProfileDropdown;
