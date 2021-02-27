import { createAudioResource } from '../AudioResource';
import { findPipeline as _findPipeline, StreamType } from '../TransformerGraph';
import { mocked } from 'ts-jest/utils';
import { PassThrough, Readable } from 'stream';
jest.mock('../TransformerGraph');

const findPipeline = mocked(_findPipeline, true);

function* silence() {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	while (true) {
		yield Buffer.from([0xf8, 0xff, 0xfe]);
	}
}

function createPipe(): any {
	const stream = new PassThrough();
	return { stream, transformer: () => stream };
}

function createFakePipeline() {
	const pipes = [createPipe(), createPipe()];
	return pipes;
}

beforeEach(() => {
	findPipeline.mockReset();
});

test('Creates resource', () => {
	findPipeline.mockReturnValueOnce([]);
	const silenceStream = Readable.from(silence());
	const resource = createAudioResource(silenceStream, { inputType: StreamType.Opus, name: 'test' });
	expect(findPipeline.mock.calls).toHaveLength(1);
	expect(findPipeline.mock.calls[0][0]).toBe(StreamType.Opus);
	expect(resource.playStream).toBe(silenceStream);
	expect(resource.name).toBe('test');
});

test('Pipeline order is respected', () => {
	const pipeline = createFakePipeline();
	findPipeline.mockReturnValueOnce(pipeline);
	const resource = createAudioResource('resource');
	expect(resource.pipeline).toBe(pipeline);
});
