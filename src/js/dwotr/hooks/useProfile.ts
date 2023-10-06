import { useEffect, useState } from 'react';
import profileManager from '../ProfileManager';
import { ProfileMemory } from '../model/ProfileRecord';
import { UID } from '@/utils/UniqueIds';
import { useIsMounted } from './useIsMounted';


export const useProfile = (profileId: UID, loadOnDefault = false) => {
  const [profile, setProfile] = useState<ProfileMemory>();
  const isMounted = useIsMounted();


  useEffect(() => {
    let profile = profileManager.getMemoryProfile(profileId);

    setProfile(profile);

    let onEvent = (profile: ProfileMemory) => {
      if(!isMounted()) return;

      setProfile({...profile});
    }

    // Subscribe to profile updates
    profileManager.onEvent.add(profileId, onEvent);

    if(profile.isDefault && loadOnDefault) 
      profileManager.once(profileId); // Load from relay
    

    return () => {
      // Unsubscribe from profile updates
      profileManager.onEvent.remove(profileId, onEvent);
    }

  }, [profileId, loadOnDefault]);

  return { profile };
};
