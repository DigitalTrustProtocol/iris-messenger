import Key from "@/nostr/Key";
import { BECH32, ID, STR } from "@/utils/UniqueIds";
import { useEffect, useState } from "preact/hooks"

function createKeyData(str: string | undefined, prefix: string = 'npub') {
  const myPubKey = Key.getPubKey();
  const uid = ID(str || myPubKey);
  const hexKey = STR(uid);
  const bech32Key = BECH32(uid, prefix);
  return {
    key: str,
    uid,
    bech32Key,
    hexKey,
    isMe: hexKey === myPubKey,
    myPubKey
  };
}

export function useKey(str: string | undefined, prefix: string = 'npub') {
  const [keyData, setKeyData] = useState(createKeyData(str, prefix));

  const setKey = (str: string | undefined) => {
    const data = createKeyData(str, prefix);
    setKeyData(data);
  };

  useEffect(() => {
    setKey(str);
  }, [str]);

  return {...keyData, setKey};
}