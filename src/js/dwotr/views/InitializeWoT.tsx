import { useEffect, useState } from 'preact/hooks';
import graphNetwork from '../GraphNetwork';
import Key from '../../nostr/Key';
import Modal from '@/components/modal/Modal';
import { useKey } from '../hooks/useKey';
import StatusIcon, { Status } from '../components/StatusIcon';
import profileManager from '../ProfileManager';
import muteManager from '../MuteManager';
import blockManager from '../BlockManager';
import followManager from '../FollowManager';
import reactionManager from '../ReactionManager';

type InitializeWoTProps = {
  path?: string;
  setInitialized: (val: any) => void;
};

//type loadindState = "waiting" | "loading" | "loaded";

// Show loading page for DWoTR setup, when ready, render the rest of the app
// The user have to be logged in to use the view
const InitializeWoT = (props: InitializeWoTProps) => {
  const { hexKey, uid } = useKey(Key.getPubKey());

  const [graphStatus, setGraphStatus] = useState<Status>('waiting');
  const [profileStatus, setProfileStatus] = useState<Status>('waiting');
  const [muteStatus, setMuteStatus] = useState<Status>('waiting');
  const [blockStatus, setBlockStatus] = useState<Status>('waiting');
  const [followStatus, setFollowStatus] = useState<Status>('waiting');
  const [latestNotes, setLatestNotes] = useState<Status>('waiting');
  const [reactionStatus, setReactionStatus] = useState<Status>('waiting');

  useEffect(() => {
    setGraphStatus('loading');

    graphNetwork.whenReady(() => {
      setGraphStatus('done');

      setProfileStatus('loading');
      profileManager.loadAllProfiles().then(() => {
        setTimeout(() => {
          setProfileStatus('done');

          muteManager.load();
          setMuteStatus('done');

          setBlockStatus('loading');
          blockManager.load().then(() => {
            setTimeout(() => {
              setBlockStatus('done');
            }, 0);
          });
    
        }, 0);
      });

      setFollowStatus('loading');
      followManager.load().then(() => {
        followManager.nostrSubscribeFollowers(uid); // Subscribe to followers of my profile

        // Wait a little before subscribing to the network
        setTimeout(() => {
          followManager.updateNetwork();
          setFollowStatus('done');
        }, 100);
      });

      // Reactions
      setReactionStatus('loading');
      reactionManager.load().then(() => {
        setReactionStatus('done');
      });

      setLatestNotes('loading');
      setLatestNotes('done');
    });

    setTimeout(() => {
      graphNetwork.init(hexKey);
    }, 1);

    return () => {};
  }, []);

  if(graphStatus === "done" && profileStatus === "done" && muteStatus === "done" && blockStatus === "done" && followStatus === "done" && latestNotes === "done" && reactionStatus === "done")
    props.setInitialized(true);

  // Wot Graph
  // Profiles
  // Mutes & Blocks
  // Events and Subscriptions


  return (
    <Modal centerVertically={true} showContainer={true} onClose={() => {}}>
      <h1>Initalizing Application Context</h1>
      <div className="flex flex-col space-y-2 text-base">
        <div className="flex items-center space-x-2">
          <StatusIcon status={graphStatus} />
          <span>WoT network</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={profileStatus} />
          <span>Profiles</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={reactionStatus} />
          <span>Reactions</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={muteStatus} />
          <span>Mutes</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={blockStatus} />
          <span>Blocks</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={followStatus} />
          <span>Follows</span>
        </div>
        <div className="flex items-center space-x-2">
          <StatusIcon status={latestNotes} />
          <span>Notes</span>
        </div>
      </div>
    </Modal>
  );
};

export default InitializeWoT;
