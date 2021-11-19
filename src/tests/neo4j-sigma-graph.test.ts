import Graph from "graphology";
import _ from "lodash";
import { liveToStored, mockSessionFromQuerySet, QuerySpec, storedToLive, wrapCopiedResults } from "neo-forgery";
import { Driver, int, Node, Path, PathSegment } from "neo4j-driver";
import { Neo4jSigmaGraph, NodeType } from "../neo4j-sigma-graph";

describe('Neo4jSigmaGraph', () => {
	let neo4jSigmaGraph = new Neo4jSigmaGraph(new Graph(), ({} as Driver));
	const nodes: Node[] = [
		{
			identity: int(0),
			labels: ['Wifi'],
			properties: {
				id: '0',
				essid: '0',
				bssid: '0'
			}
		},
		{
			identity: int(1),
			labels: ['Router'],
			properties: {
				id: '1',
				ip: '1',
				mac: '1'
			}
		}
	];
	beforeEach(() => {
		neo4jSigmaGraph.getGraph().clear();
	});
	test('should add node to graph', () => {
		neo4jSigmaGraph.addNodeToGraph(nodes[0]);
		neo4jSigmaGraph.addNodeToGraph(nodes[1]);
		expect(neo4jSigmaGraph.getGraph().nodes()).toEqual(['0', '1']);
		expect(neo4jSigmaGraph.getGraph().getNodeAttribute('0', 'node_type')).toBe('WIFI');
		expect(neo4jSigmaGraph.getGraph().getNodeAttribute('1', 'node_type')).toBe('ROUTER');
	});
	test('should add relation path to graph', () => {
		neo4jSigmaGraph.addNodeToGraph(nodes[0]);
		neo4jSigmaGraph.addNodeToGraph(nodes[1]);
		const pathSegments: PathSegment[] = [
			{
				start: nodes[0],
				end: nodes[1],
				relationship: {
					properties: {},
					identity: int(2),
					start: nodes[0].identity,
					end: nodes[1].identity,
					type: 'BROADCASTS'
				}
			}
		];
		const path: Path = { start: nodes[0], end: nodes[1], segments: pathSegments, length: 1 };
		neo4jSigmaGraph.addRelationPathToGraph(path);
		expect(neo4jSigmaGraph.getGraph().edges().length).toBe(1);
	});
	test('should get nodes by label', async () => {
		const label: NodeType = 'WIFI';
		const expected = wrapCopiedResults([
			{
				"keys": [
					"n"
				],
				"length": 1,
				"_fields": [
					{
						"identity": {
							"low": 0,
							"high": 0
						},
						"labels": [
							"Wifi"
						],
						"properties": {
							"attached_to_building": true,
							"attached_to_router": false,
							"id": "2dcb9ca6-c8cc-4164-91ba-10323056dc56",
							"essid": "Test",
							"bssid": "aa:aa:aa:aa:aa:aa"
						}
					}
				],
				"_fieldLookup": {
					"n": 0
				}
			},
			{
				"keys": [
					"n"
				],
				"length": 1,
				"_fields": [
					{
						"identity": {
							"low": 1,
							"high": 0
						},
						"labels": [
							"Wifi"
						],
						"properties": {
							"attached_to_building": true,
							"attached_to_router": false,
							"id": "2e786cd4-5990-483f-88be-cdbc5713eed3",
							"essid": "Testing",
							"bssid": "00:00:00:00:00:00"
						}
					}
				],
				"_fieldLookup": {
					"n": 0
				}
			},
			{
				"keys": [
					"n"
				],
				"length": 1,
				"_fields": [
					{
						"identity": {
							"low": 2,
							"high": 0
						},
						"labels": [
							"Wifi"
						],
						"properties": {
							"attached_to_building": false,
							"id": "8e711e9b-1dda-43d6-a819-bf55e8cd993a",
							"essid": "Shit",
							"bssid": "00-11-22-33-44-55"
						}
					}
				],
				"_fieldLookup": {
					"n": 0
				}
			},
			{
				"keys": [
					"n"
				],
				"length": 1,
				"_fields": [
					{
						"identity": {
							"low": 12,
							"high": 0
						},
						"labels": [
							"Wifi"
						],
						"properties": {
							"id": "4da6c081-bed5-4b6f-87ce-ef2e8139d14b",
							"essid": "Test",
							"bssid": "00-11-22-33-44-55"
						}
					}
				],
				"_fieldLookup": {
					"n": 0
				}
			},
			{
				"keys": [
					"n"
				],
				"length": 1,
				"_fields": [
					{
						"identity": {
							"low": 45,
							"high": 0
						},
						"labels": [
							"Wifi"
						],
						"properties": {
							"id": "556d448f-f612-4b3a-a3db-ee411abbef62",
							"essid": "test",
							"bssid": "00-11-22-33-44-55"
						}
					}
				],
				"_fieldLookup": {
					"n": 0
				}
			}
		]);
		const querySet: QuerySpec[] = [
			{
				name: 'nodes',
				query: `MATCH (n:${_.capitalize(label.toLowerCase())}) RETURN n`,
				output: expected,
			}
		];
		const session = mockSessionFromQuerySet(querySet);
		const result = await neo4jSigmaGraph.getNodesByLabel(label, session);
		expect(result).toEqual(storedToLive(expected).records.map((record: any) => record._fields[0]));
	});
	test('should get node by id', async () => {
		const nodeId = '4da6c081-bed5-4b6f-87ce-ef2e8139d14b';
		const expected = wrapCopiedResults([
			{
				"keys": [
					"n"
				],
				"length": 1,
				"_fields": [
					{
						"identity": {
							"low": 12,
							"high": 0
						},
						"labels": [
							"Wifi"
						],
						"properties": {
							"id": "4da6c081-bed5-4b6f-87ce-ef2e8139d14b",
							"essid": "Test",
							"bssid": "00-11-22-33-44-55"
						}
					}
				],
				"_fieldLookup": {
					"n": 0
				}
			}
		]);
		const querySet: QuerySpec[] = [
			{
				name: 'wifis',
				query: 'MATCH (n { id: $nodeId }) RETURN n',
				params: { nodeId },
				output: expected
			}
		];
		const session = mockSessionFromQuerySet(querySet);
		const result = await neo4jSigmaGraph.getNodeById(nodeId, session);
		expect(result).toEqual(expected.records[0]._fields[0]);
	});
	test('should get relations', async () => {
		const nodeId = '4da6c081-bed5-4b6f-87ce-ef2e8139d14b';
		const expected = wrapCopiedResults([
			{
				"keys": [
					"p",
				],
				"length": 1,
				"_fields": [
					{
						"start": {
							"identity": {
								"low": 12,
								"high": 0
							},
							"labels": [
								"Wifi"
							],
							"properties": {
								"id": "4da6c081-bed5-4b6f-87ce-ef2e8139d14b",
								"essid": "Test",
								"bssid": "00-11-22-33-44-55"
							}
						},
						"end": {
							"identity": {
								"low": 50,
								"high": 0
							},
							"labels": [
								"Client"
							],
							"properties": {
								"mac": "aa-bb-cc-dd-ee-ff",
								"id": "1322692a-406d-481b-ba55-ba4547723f52"
							}
						},
						"segments": [
							{
								"start": {
									"identity": {
										"low": 12,
										"high": 0
									},
									"labels": [
										"Wifi"
									],
									"properties": {
										"id": "4da6c081-bed5-4b6f-87ce-ef2e8139d14b",
										"essid": "Test",
										"bssid": "00-11-22-33-44-55"
									}
								},
								"relationship": {
									"identity": {
										"low": 22,
										"high": 0
									},
									"start": {
										"low": 50,
										"high": 0
									},
									"end": {
										"low": 12,
										"high": 0
									},
									"type": "CONNECTS_TO",
									"properties": {}
								},
								"end": {
									"identity": {
										"low": 50,
										"high": 0
									},
									"labels": [
										"Client"
									],
									"properties": {
										"mac": "aa-bb-cc-dd-ee-ff",
										"id": "1322692a-406d-481b-ba55-ba4547723f52"
									}
								}
							}
						],
						"length": {
							"high": 0,
							"low": 1
						}
					},
				],
				"_fieldLookup": {
					"p": 0,
				}
			}
		]);
		const querySet: QuerySpec[] = [
			{
				name: 'relations',
				query: 'MATCH p = ({ id: $nodeId })-[]-() RETURN p',
				params: { nodeId },
				output: expected
			}
		];
		const session = mockSessionFromQuerySet(querySet);
		const result = await neo4jSigmaGraph.getNodeRelations(nodeId, session);
		expect(liveToStored(result)).toEqual(expected.records[0]._fields);
	});
	test('should get nodes shortest path', async () => {
		const startNodeId = 'e6b02058-41a2-4fae-832e-4df39f0d79c2';
		const endNodeId = '8e711e9b-1dda-43d6-a819-bf55e8cd993a';
		const expected = wrapCopiedResults([
			{
				"keys": [
					"p"
				],
				"length": 1,
				"_fields": [
					{
						"start": {
							"identity": {
								"low": 4,
								"high": 0
							},
							"labels": [
								"Router"
							],
							"properties": {
								"id": "e6b02058-41a2-4fae-832e-4df39f0d79c2",
								"mac": "00-11-22-33-44-55",
								"ip": "192.168.1.1"
							}
						},
						"end": {
							"identity": {
								"low": 2,
								"high": 0
							},
							"labels": [
								"Wifi"
							],
							"properties": {
								"attached_to_building": false,
								"id": "8e711e9b-1dda-43d6-a819-bf55e8cd993a",
								"essid": "Shit",
								"bssid": "00-11-22-33-44-55"
							}
						},
						"segments": [
							{
								"start": {
									"identity": {
										"low": 4,
										"high": 0
									},
									"labels": [
										"Router"
									],
									"properties": {
										"id": "e6b02058-41a2-4fae-832e-4df39f0d79c2",
										"mac": "00-11-22-33-44-55",
										"ip": "192.168.1.1"
									}
								},
								"relationship": {
									"identity": {
										"low": 12,
										"high": 0
									},
									"start": {
										"low": 4,
										"high": 0
									},
									"end": {
										"low": 2,
										"high": 0
									},
									"type": "BROADCASTS",
									"properties": {}
								},
								"end": {
									"identity": {
										"low": 2,
										"high": 0
									},
									"labels": [
										"Wifi"
									],
									"properties": {
										"attached_to_building": false,
										"id": "8e711e9b-1dda-43d6-a819-bf55e8cd993a",
										"essid": "Shit",
										"bssid": "00-11-22-33-44-55"
									}
								}
							}
						],
						"length": 1
					}
				],
				"_fieldLookup": {
					"p": 0
				}
			}
		]);
		const querySet: QuerySpec[] = [
			{
				name: 'shortestPath',
				query: 'MATCH p = shortestPath((n1 { id: $startNodeId })-[*]-(n2 { id: $endNodeId })) RETURN p',
				params: { startNodeId, endNodeId },
				output: expected
			}
		];
		const session = mockSessionFromQuerySet(querySet);
		const result = await neo4jSigmaGraph.getNodesShortestPath(startNodeId, endNodeId, session);
		expect(result).toEqual(storedToLive(expected).records[0]._fields);
	});
});
