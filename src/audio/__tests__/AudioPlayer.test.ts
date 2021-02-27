import { Readable } from 'stream';
import { AudioPlayer } from '../..';
import { deleteAudioPlayer } from '../../DataStore';
import { AudioPlayerStatus, createAudioPlayer, NoSubscriberBehavior } from '../AudioPlayer';
import type { AudioResource } from '../AudioResource';
import { silence } from './util';

test('Correct state at creation', () => {
	const player = createAudioPlayer();
	expect(player.state.status).toBe(AudioPlayerStatus.Idle);
});

function createFakeAudioResource(): AudioResource {
	return {
		pipeline: [],
		playStream: Readable.from(silence()),
	};
}

describe('State transitions', () => {
	let player: AudioPlayer;
	afterEach(() => {
		player.stop();
		deleteAudioPlayer(player);
	});

	test('Idle -> Playing -> Idle (via .stop())', () => {
		const resource = createFakeAudioResource();
		player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
		expect(player.state.status).toBe(AudioPlayerStatus.Idle);
		player.play(resource);
		expect(resource.audioPlayer).toBe(player);
		expect(player.state.status).toBe(AudioPlayerStatus.Playing);
		expect(player.stop()).toBe(true);
		expect(player.state.status).toBe(AudioPlayerStatus.Idle);
	});
});
