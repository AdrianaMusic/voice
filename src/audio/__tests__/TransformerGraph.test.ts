import { Edge, findPipeline, StreamType, TransformerType } from '../TransformerGraph';

const noConstraint = () => true;

function reducePath(pipeline: Edge[]) {
	const streams = [pipeline[0].from.type];
	for (const edge of pipeline.slice(1)) {
		streams.push(edge.from.type);
	}
	streams.push(pipeline[pipeline.length - 1].to.type);
	return streams;
}

describe('findPipeline', () => {
	const isVolume = (edge: Edge) => edge.type === TransformerType.InlineVolume;
	const containsVolume = (edges: Edge[]) => edges.some(isVolume);

	test.each([StreamType.Arbitrary, StreamType.OggOpus, StreamType.WebmOpus, StreamType.Raw])(
		'%s maps to opus',
		(type) => {
			const path = reducePath(findPipeline(type, noConstraint));
			expect(path.length).toBeGreaterThanOrEqual(2);
			expect(path[0]).toBe(type);
			expect(path.pop()).toBe(StreamType.Opus);
		},
	);

	test('opus (no constraints) is unchanged', () => {
		expect(findPipeline(StreamType.Opus, noConstraint)).toHaveLength(0);
	});

	test('Volume constraint is respected', () => {
		expect(findPipeline(StreamType.Arbitrary, noConstraint).some(isVolume)).toBe(false);
		expect(findPipeline(StreamType.Arbitrary, containsVolume).some(isVolume)).toBe(true);
	});
});
