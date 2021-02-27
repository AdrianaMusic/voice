/* eslint-disable @typescript-eslint/dot-notation */
import { Readable } from 'stream';
import { mocked } from 'ts-jest/utils';
import { once } from 'events';
import { AudioPlayer } from '../..';
import { addAudioPlayer as _addAudioPlayer } from '../../DataStore';
import { AudioPlayerState, AudioPlayerStatus, createAudioPlayer, NoSubscriberBehavior } from '../AudioPlayer';
import type { AudioResource } from '../AudioResource';
import { silence } from './util';
jest.mock('../../DataStore');

const addAudioPlayer = mocked(_addAudioPlayer, false);

function createFakeAudioResource(): AudioResource {
	return {
		pipeline: [],
		playStream: Readable.from(silence()),
	};
}

function* singleSilence() {
	yield Buffer.from([0xf8, 0xff, 0xfe]);
}

class NeverReadyStream extends Readable {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	public _read() {}
}

describe('State transitions', () => {
	let player: AudioPlayer;

	beforeAll(() => {
		addAudioPlayer.mockImplementation((player) => player);
	});

	afterEach(() => {
		player.stop();
		addAudioPlayer.mockReset();
	});

	test('Idle -> Playing -> Idle (via .stop())', () => {
		const resource = createFakeAudioResource();
		player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
		expect(addAudioPlayer).toHaveBeenCalledTimes(0);
		expect(player.state.status).toBe(AudioPlayerStatus.Idle);
		player.play(resource);
		expect(resource.audioPlayer).toBe(player);
		expect(player.state.status).toBe(AudioPlayerStatus.Playing);
		expect(addAudioPlayer).toHaveBeenCalledTimes(1);
		expect(player.stop()).toBe(true);
		expect(player.state.status).toBe(AudioPlayerStatus.Idle);
	});

	test('Idle -> Playing -> Idle (via stream end)', () => {
		const resource: AudioResource = {
			pipeline: [],
			playStream: Readable.from(singleSilence()),
		};
		player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
		expect(player.state.status).toBe(AudioPlayerStatus.Idle);
		player.play(resource);
		expect(resource.audioPlayer).toBe(player);

		expect(player.state.status).toBe(AudioPlayerStatus.Playing);
		expect(player.checkPlayable()).toBe(true);

		resource.playStream.destroy();
		expect(player.checkPlayable()).toBe(false);
		expect(player.state.status).toBe(AudioPlayerStatus.Idle);

		expect(addAudioPlayer).toHaveBeenCalledTimes(1);
	});

	test('Idle -> Playing -> Idle (missed too many frames)', async () => {
		const resource: AudioResource = {
			pipeline: [],
			playStream: new NeverReadyStream(),
		};
		player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play, maxMissedFrames: 1 } });
		expect(player.state.status).toBe(AudioPlayerStatus.Idle);
		player.play(resource);
		expect(resource.audioPlayer).toBe(player);

		expect(player.state.status).toBe(AudioPlayerStatus.Playing);
		expect(player.checkPlayable()).toBe(true);

		const stateChange: Promise<AudioPlayerState[]> = once(player, 'stateChange');

		player['_stepPrepare']();

		const [oldState] = await stateChange;
		expect(oldState.status === AudioPlayerStatus.Playing && oldState.missedFrames === 1).toBe(true);
		expect(player.checkPlayable()).toBe(false);
		expect(player.state.status).toBe(AudioPlayerStatus.Idle);

		expect(addAudioPlayer).toHaveBeenCalledTimes(1);
	});
});
