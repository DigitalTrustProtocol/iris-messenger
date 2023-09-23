import { Event, Filter, getEventHash, getSignature } from 'nostr-tools';
import PubSub, { Unsubscribe } from '../../nostr/PubSub';
import Relays from '../../nostr/Relays';
import { EntityType } from '../model/Graph';
import Key from '../../nostr/Key';
import getRelayPool from '@/nostr/relayPool';
import eventManager from '../EventManager';
import { STR, UID } from '@/utils/UniqueIds';
import { getNostrTime } from '../Utils';

export type OnEvent = (event: Event, afterEose: boolean, url: string | undefined) => void;

// Wot Custom
export const Trust1Kind: number = 32010;
export const MuteKind: number = 10000;
export const BlockKind: number = 16462;
export const FlagKind: number = 16463;

// Nostr
export const MetadataKind: number = 0; // Metadata
export const TextKind: number = 1; // Text
export const RecommendRelayKind: number = 2; // RecommendRelay
export const ContactsKind: number = 3; // Contacts
export const EncryptedDirectMessageKind: number = 4; // EncryptedDirectMessage
export const EventDeletionKind: number = 5; // EventDeletion
export const RepostKind: number = 6; // Repost
export const ReactionKind: number = 7; // Like
export const BadgeAwardKind: number = 8; // BadgeAward
export const ChannelCreationKind: number = 40; // ChannelCreation
export const ChannelMetadataKind: number = 41; // ChannelMetadata
export const ChannelMessageKind: number = 42; // ChannelMessage
export const ChannelHideMessageKind: number = 43; // ChannelHideMessage
export const ChannelMuteUserKind: number = 44; // ChannelMuteUser
export const BlankKind: number = 255; // Blank
export const ReportKind: number = 1984; // Report
export const ZapRequestKind: number = 9734; // ZapRequest
export const ZapKind: number = 9735; // Zap
export const RelayListKind: number = 10002; // RelayList
export const ClientAuthKind: number = 22242; // ClientAuth
export const HttpAuthKind: number = 27235; // HttpAuth
export const ProfileBadgeKind: number = 30008; // ProfileBadge
export const BadgeDefinitionKind: number = 30009; // BadgeDefinition
export const ArticleKind: number = 30023; // Article
export const FileMetadataKind: number = 1063; // FileMetadata

export interface EntityItem {
  pubkey: string;
  entityType: EntityType;
}

type NostrKind = number;

// Subscribe to trust events, mutes, blocks, etc

// Subscribe to trusted entities = every kind
// Subscribe to followed entities = every kind

// Temporarily subscribe to
// 3rd Profiles :
// - Followers / following = kind 3
// - Ignore kind: Trust1, mutes, blocks, flags, etc

// Notes:
// - likes, comments, zaps.

export const FlowKinds = [TextKind, RepostKind, ReactionKind, ReportKind, ZapKind, EventDeletionKind];
export const StaticKinds = [MetadataKind, ContactsKind, ZapRequestKind, RelayListKind, Trust1Kind];
  

class WOTPubSub {
  // The idea is that we are only interested in events that are less than 2 weeks old, per default. 
  // Fetching older events can be done by request etc.
  // FlowSince applies primarily to FlowKinds. With StaticKinds we are interested in all events, as they are few.
  flowSince = getNostrTime() - (60 * 60 * 24 * 14); // 2 weeks ago, TODO: make this configurable

  subscriptionId = 0;
  unsubs = new Map<number, any>();


  subscribedAuthors = new Set<UID>();

  metrics = {
    Count: 0,
    SubscribedAuthors: 0,
    Subscriptions: 0,
    Callbacks: 0,
  };

  updateRelays(urls: Array<string> | undefined) {
    if (!urls) return;
  }


  // Do we need to break up hugh subscriptions into smaller ones? YES
  subscribeAuthors(
    authorIDs: Set<UID> | Array<UID>
  ) {
    let authors: Array<string> = [];

    for(let id of authorIDs) {
      if(this.subscribedAuthors.has(id)) continue;
      this.subscribedAuthors.add(id);
      authors.push(STR(id));
    }

    if(authors.length === 0) return;

    // Batch authors into 1000 chunks, so subscribe can handle it
    let batchs = this.batchArray(authors, 10);

    for(let batch of batchs) {
    
      let filters = [{
        authors: batch,
        kinds: FlowKinds,
        since: this.flowSince,
      },
      {
        authors: batch,
        kinds: StaticKinds,
        since: 0,
      }] as Array<Filter>;
  
      // Need to delay the subscribe, otherwise relayPool will merge all the subscriptions into one. (I believe)
      setTimeout(() => {
        let r = this.subscribeFilter(filters, eventManager.eventCallback);
        this.subscriptionId ++;
        this.unsubs.set(this.subscriptionId, r);
      }, 0);
    }
  }


  unsubscribeFlow(authorIDs: Set<UID> | Array<UID>) {
    // TODO: unsubscribe authors, currently its unknown how to do this effectly without unsubscribing all authors
    // workaround: unsubscribe all authors and subscribe again with the same authors
    // Or subscribe each author individually and keep track of the subscriptions, but this is not optimal and the number of subscriptions can be huge

  }

  batchArray(arr: Array<any>, batchSize: number = 1000) {
    const batchedArr: Array<any> = [];
    
    for (let i = 0; i < arr.length; i += batchSize) {
      batchedArr.push(arr.slice(i, i + batchSize));
    }
    
    return batchedArr;
  }

  subscribeFilter(
    filters: Array<any>,
    cb: OnEvent,
  ): Unsubscribe {
    let relays = Relays.enabledRelays();

    const unsub = getRelayPool().subscribe(
      filters,
      relays,
      (event: Event, afterEose: boolean, url: string | undefined) => {
        setTimeout(() => {
          this.metrics.Callbacks++;
          cb(event, afterEose, url);
        }, 0);
      },
      0,
      undefined,
      {
        // Options
        // enabled relays
        defaultRelays: Relays.enabledRelays(),
      },
    );

    return unsub;
  }

  publishTrust(
    entityPubkey: string,
    val: number,
    content: string | undefined,
    context: string | undefined,
    entityType: EntityType,
    timestamp?: number,
  ) {
    let event = eventManager.createTrustEvent(
      entityPubkey,
      val,
      content,
      context,
      entityType,
      timestamp,
    ) as Event;

    this.sign(event);

    console.log('Publishing trust event', event);

    PubSub.publish(event);
  }

  sign(event: Partial<Event>) {
    if (!event.sig) {
      if (!event.tags) {
        event.tags = [];
      }
      event.content = event.content || '';
      event.created_at = event.created_at || Math.floor(Date.now() / 1000);
      event.pubkey = Key.getPubKey();
      event.id = getEventHash(event as Event);
      event.sig = getSignature(event as Event, Key.getPrivKey());
    }
    if (!(event.id && event.sig)) {
      console.error('Invalid event', event);
      throw new Error('Invalid event');
    }
  }

  publish(event: Event | Partial<Event>) {
    getRelayPool().publish(event, Array.from(Relays.enabledRelays()));
  }

  getMetrics() {
    this.metrics.Count = Relays.enabledRelays().length;
    this.metrics.SubscribedAuthors = this.subscribedAuthors.size;
    this.metrics.Subscriptions = this.unsubs.size;

    return this.metrics;
  }
}

const wotPubSub = new WOTPubSub();

export default wotPubSub;
