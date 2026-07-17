/**
 * DojoPop news feed for the embedded Cordn web client at dojopop.live/chat-app.
 *
 * Replaces upstream Cordn release notes. Edit `newsReleases` to publish
 * DojoPop announcements (practice pipeline, wiki, schools, chat, etc.).
 */

export interface NewsRelease {
	id: string;
	createdAt: number;
	title: string;
	body: string;
	align?: 'left' | 'center' | 'right';
	version?: number;
	donation?: Partial<DonationConfig> | false;
}

export interface DonationConfig {
	eyebrow: string;
	body: string;
	ctaLabel: string;
	lnAddress: string;
	recipientPubkey: string;
	dialogTitle: string;
	dialogDescription: string;
}

export type NewsFeedItemKind = 'release' | 'donation';

export interface NewsFeedItem {
	id: string;
	kind: NewsFeedItemKind;
	createdAt: number;
	version: number;
	title?: string;
	body: string;
	align?: 'left' | 'center' | 'right';
	donation?: DonationConfig;
}

/** Unused on DojoPop builds — all releases set `donation: false`. */
export const DEFAULT_DONATION: DonationConfig = {
	eyebrow: 'Support DojoPop',
	body: 'DojoPop membership helps fund relays, Blossom storage, and the practice platform.',
	ctaLabel: 'Join',
	lnAddress: '',
	recipientPubkey: 'b3d8544ddd5896f75ef66c210f5c0d6ded9f7925163ebcbc89e678bdc1e48c6a',
	dialogTitle: 'Support DojoPop',
	dialogDescription: 'Visit dojopop.live/join for membership options.'
};

export const newsReleases: NewsRelease[] = [
	{
		id: 'dojopop-news-2026-07-09-global-chat',
		createdAt: Date.UTC(2026, 6, 9),
		version: 1,
		title: 'DojoPop Global chat is live',
		body: '- 🥋 **DojoPop Global** — encrypted group chat for practitioners is open at [dojopop.live/chat](https://dojopop.live/chat).\n- Request to join from the chat UI; a group admin approves join requests.\n- Messages are MLS-encrypted end-to-end; the coordinator only orders opaque blobs.\n- Practice videos, schools, and the [Tenshinryu wiki](https://wiki.tenshinryu.xyz) stay on the main site — this feed is for DojoPop product news only.',
		donation: false
	},
	{
		id: 'dojopop-news-welcome',
		createdAt: Date.UTC(2026, 6, 8),
		version: 1,
		align: 'center',
		title: 'Welcome to DojoPop',
		body: 'Proof-of-practice on Nostr for martial artists. Film your training, share on the open web, and connect with your dojo — [dojopop.live](https://dojopop.live).',
		donation: false
	}
];

export function getNewsFeedItems(): NewsFeedItem[] {
	return [...newsReleases]
		.sort((a, b) => a.createdAt - b.createdAt)
		.flatMap((release) => {
			const items: NewsFeedItem[] = [
				{
					id: release.id,
					kind: 'release',
					createdAt: release.createdAt,
					version: release.version ?? 1,
					title: release.title,
					body: release.body,
					align: release.align ?? 'left'
				}
			];
			if (release.donation !== false) {
				const donation: DonationConfig = { ...DEFAULT_DONATION, ...release.donation };
				items.push({
					id: `${release.id}:donation`,
					kind: 'donation',
					createdAt: release.createdAt,
					version: 0,
					body: donation.body,
					donation
				});
			}
			return items;
		});
}
