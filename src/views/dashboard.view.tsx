import {
	Add as AddIcon,
	Delete as DeleteIcon,
	Upload as UploadIcon,
	HomeWork as HomeWorkIcon,
	Router as RouterIcon,
	Flag as FlagIcon,
	PinDrop as PinDropIcon,
	Wifi as WifiIcon,
	SignalWifiBad as SignalWifiBadIcon,
} from '@mui/icons-material';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useTitle } from 'react-use';
import Captor from 'sigma/core/captors/captor';
import { Settings as SigmaSettings } from 'sigma/settings';
import getNodeProgramImage from "sigma/rendering/webgl/programs/node.image";
import { MouseCoords, NodeDisplayData } from 'sigma/types';
import { appContext } from '../App';
import {
	AddNode,
	AttachWifiToBuilding,
	ContextMenu,
	FloatingActions,
	AttachWifiToRouter,
	Settings,
	ConfirmAction,
	AttachRouterToBuilding,
	AddClientTo,
	AddWifiProbe,
	RemoveWifiProbe,
	ConvertWifiProbeToStation,
	UploadWifiHandshake,
	ClientConnectToRouter,
} from '../components';
import { Attributes } from 'graphology-types';
import { useSigma, useSetSettings, useRegisterEvents } from 'react-sigma-v2';
import circlepack from 'graphology-layout/circlepack';
// import forceAtlas2 from 'graphology-layout-forceatlas2';
import { useSnackbar } from "notistack"
import _ from 'lodash';
import { Neo4jError, Node } from 'neo4j-driver';
import { SpringSupervisor } from '../layout-spring';
import { Neo4jSigmaGraph, NodeType } from '../neo4j-sigma-graph';

export type ClickNode = {
	node: string
	captor: Captor
	event: MouseCoords
}

export const DashboardView = () => {
	useTitle('Dashboard - Captive Portal JS');
	const {
		driver,
		setSigma,
		theme,
		database,
		createDatabaseIndexesAndConstraints,
		startNode,
		setStartNode,
		startNodeSearch,
		setStartNodeSearch,
		endNode,
		setEndNode,
		endNodeSearch,
		setEndNodeSearch,
		isFindPath,
		setIsFindPath,
		hoveredNode,
		setHoveredNode,
		setHoveredNodeLabel,
		selectedNode,
		setSelectedNode,
		setSelectedNodeLabel,
	} = useContext(appContext);
	const { enqueueSnackbar } = useSnackbar();
	const sigma = useSigma();
	const [neo4jSigmaGraph, setNeo4jSigmaGraph] = useState(new Neo4jSigmaGraph(sigma.getGraph(), driver, { database }));
	const [mouseMove, setMouseMove] = useState(false);
	/**
	 * Drag'n'Drop
	 */
	useEffect(() => {
		setSigma(sigma);
		let isDragging = false;
		let draggedNode = '';
		sigma.on('downNode', ({ node }) => {
			setMouseMove(true);
			isDragging = true;
			draggedNode = node;
			sigma.getGraph().setNodeAttribute(node, 'highlighted', true);
			sigma.getCamera().disable();
		});
		sigma.getMouseCaptor().on("mousemove", (e) => {
			if (!isDragging || !draggedNode) return;

			// Get new position of node
			const pos = sigma.viewportToGraph(e);

			sigma.getGraph().setNodeAttribute(draggedNode, "x", pos.x);
			sigma.getGraph().setNodeAttribute(draggedNode, "y", pos.y);
		});
		// On mouse up, we reset the autoscale and the dragging mode
		sigma.getMouseCaptor().on("mouseup", () => {
			setMouseMove(false);
			if (draggedNode) {
				sigma.getGraph().removeNodeAttribute(draggedNode, "highlighted");
			}
			isDragging = false;
			draggedNode = '';
			sigma.getCamera().enable();
		});
		// Disable the autoscale at the first down interaction
		sigma.getMouseCaptor().on("mousedown", () => {
			if (!sigma.getCustomBBox()) sigma.setCustomBBox(sigma.getBBox());
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const setSigmaSettings = useSetSettings();
	const createGraph = async () => {
		const graph = sigma.getGraph();
		graph.clear();
		neo4jSigmaGraph.setGraph(graph);
		const addNodeAndRelationsPaths = async (node: Node) => {
			neo4jSigmaGraph.addNodeToGraph(node);
			const paths = await neo4jSigmaGraph.getNodeRelations(node.properties.id);
			paths.forEach(neo4jSigmaGraph.addRelationPathToGraph);
		}
		(await neo4jSigmaGraph.getNodesByLabel('WIFI')).forEach(node => addNodeAndRelationsPaths(node));
		(await neo4jSigmaGraph.getNodesByLabel('ROUTER')).forEach(node => addNodeAndRelationsPaths(node));
		(await neo4jSigmaGraph.getNodesByLabel('CLIENT')).forEach(node => addNodeAndRelationsPaths(node));
		(await neo4jSigmaGraph.getNodesByLabel('BUILDING')).forEach(node => addNodeAndRelationsPaths(node));
		(await neo4jSigmaGraph.getNodesByLabel('FLOOR')).forEach(node => addNodeAndRelationsPaths(node));
		(await neo4jSigmaGraph.getNodesByLabel('HOTSPOT')).forEach(node => addNodeAndRelationsPaths(node));
		(await neo4jSigmaGraph.getNodesByLabel('HOUSE')).forEach(node => addNodeAndRelationsPaths(node));
		(await neo4jSigmaGraph.getNodesByLabel('WIFIPROBE')).forEach(node => addNodeAndRelationsPaths(node));
		circlepack.assign(neo4jSigmaGraph.getGraph(), { hierarchyAttributes: ['node_type'] });
		// const sensibleSettings = forceAtlas2.inferSettings(neo4jSigmaGraph.getGraph());
		// forceAtlas2(neo4jSigmaGraph.getGraph(), { iterations: 50, settings: sensibleSettings });
		new SpringSupervisor(neo4jSigmaGraph.getGraph(), { isNodeFixed: (n) => neo4jSigmaGraph.getGraph().getNodeAttribute(n, "highlighted") }).start();
		sigma.refresh();
	}
	const createGraphCallback = useCallback(createGraph, [neo4jSigmaGraph, sigma]);
	const [menu, setMenu] = useState<{
		show: boolean,
		node: string,
		x: number,
		y: number,
		items: [JSX.Element, string, (id: string) => void][]
	}>({
		show: false,
		node: '',
		x: 0,
		y: 0,
		items: [],
	});
	const [foundPath, setFoundPath] = useState(false);
	const handleNodeRightClick = (e: ClickNode) => {
		const graph = sigma.getGraph();
		const nodeType: NodeType = graph.getNodeAttribute(e.node, 'node_type');
		const items: [JSX.Element, string, (id: string) => void][] = [];
		items.push([<FlagIcon />, 'Set as a start node', id => {
			setIsFindPath(true);
			setStartNode(id);
			setStartNodeSearch(graph.getNodeAttribute(id, 'label'));
		}]);
		items.push([<PinDropIcon />, 'Set as an end node', id => {
			setIsFindPath(true);
			setEndNode(id);
			setEndNodeSearch(graph.getNodeAttribute(id, 'label'));
		}]);
		const edgesEndpoints = graph.edges().map(edge => [graph.extremities(edge), graph.getEdgeAttribute(edge, 'label')]);
		switch (nodeType) {
			case 'WIFI':
				let wifiAttachedToBuilding = false;
				let wifiAttachedToRouter = false;
				edgesEndpoints.forEach(([extremities, label]) => {
					if (_.includes(extremities, e.node)) {
						const node_type: NodeType = graph.getNodeAttribute(_.filter(extremities, n => n !== e.node)[0], 'node_type');
						if (!wifiAttachedToRouter) wifiAttachedToRouter = label === 'BROADCASTS' && node_type === 'ROUTER';
						if (!wifiAttachedToBuilding) wifiAttachedToBuilding = label === 'ATTACHED_TO' && (node_type === 'HOUSE' || node_type === 'FLOOR');
					}
				});
				if (!foundPath) items.push([<AddIcon />, 'Add a client', id => {
					setShowAddClientTo(true);
					setAddClientToRouter(false);
					setAddClientToId(id);
				}]);
				items.push([<UploadIcon />, 'Upload a handshake file', id => {
					setShowUploadWifiHandshake(true);
					setUploadWifiHandshakeWifiId(id);
				}]);
				if (!foundPath) items.push([<HomeWorkIcon />, `${wifiAttachedToBuilding ?  'Deattach from' : 'Attach to'} a building`, async id => {
					if (driver) {
						if (wifiAttachedToBuilding) {
							setShowConfirmAction(true);
							setConfirmActionName('Deattach');
							setConfirmActionTitle('Deattach node');
							setConfirmActionQuestion(`Are you sure you want to deattach node (${sigma.getGraph().getNodeAttribute(id, 'label')})?`);
							setConfirmAction(() => () => {
								const session = driver.session({ database });
								session.run('MATCH ({ id: $id })-[r:ATTACHED_TO]-() DELETE r', { id })
									.then(() => { enqueueSnackbar(`Deattached Wifi (${sigma.getGraph().getNodeAttribute(id, 'essid')}) from Building`, { variant: 'success' }); })
									.catch(err => { enqueueSnackbar((err as Neo4jError).message, { variant: 'error' }); })
									.finally(() => { session.close(); createGraphCallback(); });
							});
						} else {
							setShowAttachWifiToBuilding(true);
							setToBeAttachedWifiId(id);
						}
						createGraphCallback();
					}
				}]);
				if (!foundPath) items.push([<RouterIcon />, `${wifiAttachedToRouter ?  'Deattach from' : 'Attach to'} a router`, id => {
					if (driver) {
						if (wifiAttachedToRouter) {
							setShowConfirmAction(true);
							setConfirmActionName('Deattach');
							setConfirmActionTitle('Deattach node');
							setConfirmActionQuestion(`Are you sure you want to deattach node (${sigma.getGraph().getNodeAttribute(id, 'label')})?`);
							setConfirmAction(() => () => {
								const session = driver.session({ database });
								session.run('MATCH ({ id: $id })-[r:BROADCASTS]-() DELETE r', { id })
									.then(() => { enqueueSnackbar(`Deattached Wifi (${sigma.getGraph().getNodeAttribute(id, 'essid')}) from Router`, { variant: 'success' }); })
									.catch(err => { enqueueSnackbar((err as Neo4jError).message, { variant: 'error' }); })
									.finally(() => { session.close(); createGraphCallback(); });
							});
						} else {
							setShowAttachWifiToRouter(true);
							setToBeAttachedWifiId(id);
							createGraphCallback();
						}
					}
				}]);
				break;
			case 'WIFIPROBE':
				if (!foundPath) items.push([<WifiIcon />, 'Convert to wifi station', id => {
					setShowConvertWifiProbe(true);
					setConvertWifiProbeProbeId(id);
				}]);
				break;
			case 'ROUTER':
				let routerAttachedToBuilding = false;
				edgesEndpoints.forEach(([extremities, label]) => {
					if (_.includes(extremities, e.node)) {
						const node_type: NodeType = graph.getNodeAttribute(_.filter(extremities, n => n !== e.node)[0], 'node_type');
						if (!routerAttachedToBuilding) routerAttachedToBuilding = label === 'ATTACHED_TO' && (node_type === 'HOUSE' || node_type === 'FLOOR');
					}
				});
				if (!foundPath) items.push([<AddIcon />, 'Add a client', id => {
					setShowAddClientTo(true);
					setAddClientToRouter(true);
					setAddClientToId(id);
				}]);
				if (!foundPath) items.push([<HomeWorkIcon />, `${routerAttachedToBuilding ?  'Deattach from' : 'Attach to'} a building`, async id => {
					if (driver) {
						if (routerAttachedToBuilding) {
							setShowConfirmAction(true);
							setConfirmActionName('Deattach');
							setConfirmActionTitle('Deattach node');
							setConfirmActionQuestion(`Are you sure you want to deattach node (${sigma.getGraph().getNodeAttribute(id, 'label')})?`);
							setConfirmAction(() => () => {
								const session = driver.session({ database });
								session.run('MATCH ({ id: $id })-[r:ATTACHED_TO]-() DELETE r', { id })
									.then(() => { enqueueSnackbar(`Deattached Router (${sigma.getGraph().getNodeAttribute(id, 'label')}) from Building`, { variant: 'success' }); })
									.catch(err => { enqueueSnackbar((err as Neo4jError).message, { variant: 'error' }); })
									.finally(() => { session.close(); createGraphCallback(); });
							});
						} else {
							setShowAttachRouterToBuilding(true);
							setToBeAttachedRouterId(id);
						}
						createGraphCallback();
					}
				}]);
				break;
			case 'CLIENT':
				let clientHasWifiProbes = false;
				let clientConnectedToRouter = false;
				let clientRouterLabel = '';
				edgesEndpoints.forEach(([extremities, label]) => {
					if (_.includes(extremities, e.node)) {
						const node_type: NodeType = graph.getNodeAttribute(_.filter(extremities, n => n !== e.node)[0], 'node_type');
						if (!clientHasWifiProbes) clientHasWifiProbes = (label === 'KNOWS' && node_type === 'WIFIPROBE') || (label === 'CONNECTS_TO' && node_type === 'WIFI');
						if (!clientConnectedToRouter) {
							clientConnectedToRouter = label === 'CONNECTS_TO' && node_type === 'ROUTER';
							clientRouterLabel = graph.getNodeAttribute(_.filter(extremities, n => n !== e.node)[0], 'label');
						}
					}
				});
				if (!foundPath) {
					items.push([<WifiIcon />, 'Add a wifi probe', id => {
						setShowAddWifiProbe(true);
						setAddWifiProbeClientId(id);
					}]);
					if (clientHasWifiProbes) items.push([<SignalWifiBadIcon />, 'Remove wifi probe', id => {
						setShowRemoveWifiProbe(true);
						setRemoveWifiProbeClientId(id);
					}]);
					items.push([<RouterIcon />, `${!clientConnectedToRouter ? 'Connect to a' : 'Disconnect from'} router`, id => {
						if (clientConnectedToRouter) {
							setShowConfirmAction(true);
							setConfirmActionName('Disconnect');
							setConfirmActionTitle('Disconnect client from router');
							setConfirmActionQuestion(`Are you sure you want to client (${sigma.getGraph().getNodeAttribute(id, 'label')}) from router (${clientRouterLabel})?`);
							setConfirmAction(() => () => {
								if (driver) {
									const session = driver.session({ database });
									session.run('MATCH (n {id: $id})-[r:CONNECTS_TO]-(:Router) DELETE r REMOVE n.ip', { id })
										.then(() => { enqueueSnackbar('Client disconnected successfully', { variant: 'success' }); })
										.catch(err => { enqueueSnackbar((err as Neo4jError).message, { variant: 'error' }); })
										.finally(() => { session.close(); createGraphCallback(); });
								}
							});
						} else {
							setShowClientConnectToRouter(true);
							setClientConnectToRouterClientId(id);
						}
					}]);
				}
				break;
		}
		if (nodeType !== 'FLOOR')
			items.push([<DeleteIcon />, 'Delete node', id => {
				setShowConfirmAction(true);
				setConfirmActionName('Delete');
				setConfirmActionTitle('Delete node');
				setConfirmActionQuestion(`Are you sure you want to delete node (${sigma.getGraph().getNodeAttribute(id, 'label')})?`);
				setConfirmAction(() => () => {
					if (driver) {
						const session = driver.session({ database });
						session.run('MATCH (n {id: $id}) OPTIONAL MATCH (n)-[r]-() DELETE r, n', { id })
							.then(() => { enqueueSnackbar('Node deleted successfully', { variant: 'success' }); })
							.catch(err => { enqueueSnackbar((err as Neo4jError).message, { variant: 'error' }); })
							.finally(() => { session.close(); createGraphCallback(); });
					}
				});
			}]);
		setMenu({
			show: true,
			node: e.node,
			x: e.event.x,
			y: e.event.y,
			items,
		});
	}
	const handleNodeRightClickCallback = useCallback(handleNodeRightClick, [setMenu, driver, sigma, enqueueSnackbar, createGraphCallback, database, foundPath, setEndNode, setEndNodeSearch, setIsFindPath, setStartNode, setStartNodeSearch]);
	useEffect(() => {
		sigma.addListener('rightClickNode', handleNodeRightClickCallback);
		return () => {
			sigma.removeAllListeners('rightClickNode');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [foundPath]);
	const registerEvents = useRegisterEvents();
	useEffect(() => {
		const nodeReducer = (__: string, data: Attributes): Partial<NodeDisplayData> => ({
			...data,
			size: 15,
		});
		const settings: Partial<SigmaSettings> = {
			defaultNodeType: 'image',
			defaultEdgeColor: theme.palette.primary.main,
			renderLabels: true,
			renderEdgeLabels: true,
			defaultNodeColor: theme.palette.secondary.main,
			labelSize: 10,
			labelWeight: 'bold',
			labelGridCellSize: 0,
			edgeLabelSize: 10,
			nodeReducer,
			nodeProgramClasses: {
				image: getNodeProgramImage(),
			},
		}
		setSigmaSettings(settings);
		createGraphCallback();
		registerEvents({
			enterNode: e => {
				setHoveredNode(e.node);
				setHoveredNodeLabel(sigma.getGraph().getNodeAttribute(e.node, 'label'));
			},
			leaveNode: () => {
				setHoveredNode(null);
				setHoveredNodeLabel('');
			},
			clickNode: e => {
				if (selectedNode && selectedNode !== e.node) {
					sigma.getGraph().removeNodeAttribute(selectedNode, 'highlighted');
				}
				setSelectedNode(selectedNode === e.node ? null : e.node);
				setSelectedNodeLabel(selectedNode === e.node ? '' : sigma.getGraph().getNodeAttribute(e.node, 'label'));
				sigma.getGraph().setNodeAttribute(e.node, 'highlighted', selectedNode !== e.node);
			},
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	useEffect(() => {
		if (driver) {
			setNeo4jSigmaGraph(new Neo4jSigmaGraph(sigma.getGraph(), driver, { database }));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [driver]);
	useEffect(() => {
		setSigmaSettings({
			defaultNodeType: 'image',
			defaultEdgeColor: theme.palette.primary.main,
			renderLabels: true,
			renderEdgeLabels: true,
			defaultNodeColor: theme.palette.secondary.main,
			labelSize: 10,
			labelWeight: 'bold',
			labelGridCellSize: 0,
			edgeLabelSize: 10,
			nodeProgramClasses: {
				image: getNodeProgramImage(),
			},
			nodeReducer: (node, data) => {
				const newData: Attributes = { ...data, highlighted: data.highlighted || false, size: 15 };
				try {
					const graph = sigma.getGraph();
					if (hoveredNode && !mouseMove) {
						if (node === hoveredNode || graph.neighbors(hoveredNode).includes(node)) {
							newData.highlighted = true;
						} else {
							newData.color = `#121212`;
							newData.highlighted = false;
						}
					}
				} catch(__) {}
				return newData;
			},
			edgeReducer: (edge, data) => {
				const graph = sigma.getGraph();
				const newData = { ...data, hidden: false };
				if (hoveredNode && !graph.extremities(edge).includes(hoveredNode) && !mouseMove) {
					newData.hidden = true;
				}
				return newData;
			},
		});
		registerEvents({
			enterNode: e => {
				setHoveredNode(e.node);
				setHoveredNodeLabel(sigma.getGraph().getNodeAttribute(e.node, 'label'));
			},
			leaveNode: () => {
				setHoveredNode(null);
				setHoveredNodeLabel('');
			},
			clickNode: e => {
				if (selectedNode && selectedNode !== e.node) {
					sigma.getGraph().removeNodeAttribute(selectedNode, 'highlighted');
				}
				setSelectedNode(selectedNode === e.node ? null : e.node);
				setSelectedNodeLabel(selectedNode === e.node ? '' : sigma.getGraph().getNodeAttribute(e.node, 'label'));
				sigma.getGraph().setNodeAttribute(e.node, 'highlighted', selectedNode !== e.node);
			},
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hoveredNode, setSigmaSettings, sigma, theme, mouseMove]);
	useEffect(() => {
		if (driver) {
			createDatabaseIndexesAndConstraints(driver.session({ database }));
		}
		return () => {
			sigma.getGraph().clear();
			sigma.removeAllListeners('rightClickNode');
			sigma.getMouseCaptor().removeAllListeners('mousemove');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const findPathBetweenNodes = async (startNode: string, endNode: string) => {
		if (driver) {
			try {
				const graph = sigma.getGraph();
				neo4jSigmaGraph.setGraph(graph);
				const paths = await neo4jSigmaGraph.getNodesShortestPath(startNode, endNode);
				if (paths.length === 0) {
					enqueueSnackbar(`There's no path between (${startNodeSearch}) and (${endNodeSearch})`, { variant: 'warning' });
					return;
				}
				graph.clear();
				paths.forEach(neo4jSigmaGraph.addRelationPathToGraph);
				circlepack.assign(neo4jSigmaGraph.getGraph(), { hierarchyAttributes: ['node_type'] });
				// const sensibleSettings = forceAtlas2.inferSettings(neo4jSigmaGraph.getGraph());
				// forceAtlas2(neo4jSigmaGraph.getGraph(), { iterations: 50, settings: sensibleSettings });
				new SpringSupervisor(neo4jSigmaGraph.getGraph(), { isNodeFixed: (n) => neo4jSigmaGraph.getGraph().getNodeAttribute(n, "highlighted") }).start();
				sigma.refresh();
				setFoundPath(true);
			} catch (__) {}
		}
	}
	useEffect(() => {
		if (startNode && endNode && isFindPath) {
			findPathBetweenNodes(startNode, endNode);
		} else {
			if (foundPath || !isFindPath) {
				setFoundPath(false);
				createGraphCallback();
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [startNode, endNode, isFindPath]);
	const [showAddNode, setShowAddNode] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showAttachWifiToBuilding, setShowAttachWifiToBuilding] = useState(false);
	const [showAttachWifiToRouter, setShowAttachWifiToRouter] = useState(false);
	const [toBeAttachedWifiId, setToBeAttachedWifiId] = useState('');
	const [showAttachRouterToBuilding, setShowAttachRouterToBuilding] = useState(false);
	const [toBeAttachedRouterId, setToBeAttachedRouterId] = useState('');
	const [showConfirmAction, setShowConfirmAction] = useState(false);
	const [confirmActionName, setConfirmActionName] = useState('');
	const [confirmActionTitle, setConfirmActionTitle] = useState('');
	const [confirmActionQuestion, setConfirmActionQuestion] = useState('');
	const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
	const [showAddClientTo, setShowAddClientTo] = useState(false);
	const [addClientToRouter, setAddClientToRouter] = useState(false);
	const [addClientToId, setAddClientToId] = useState('');
	const [showAddWifiProbe, setShowAddWifiProbe] = useState(false);
	const [addWifiProbeClientId, setAddWifiProbeClientId] = useState('');
	const [showRemoveWifiProbe, setShowRemoveWifiProbe] = useState(false);
	const [removeWifiProbeClientId, setRemoveWifiProbeClientId] = useState('');
	const [showConvertWifiProbe, setShowConvertWifiProbe] = useState(false);
	const [convertWifiProbeProbeId, setConvertWifiProbeProbeId] = useState('');
	const [showUploadWifiHandshake, setShowUploadWifiHandshake] = useState(false);
	const [uploadWifiHandshakeWifiId, setUploadWifiHandshakeWifiId] = useState('');
	const [showClientConnectToRouter, setShowClientConnectToRouter] = useState(false);
	const [clientConnectToRouterClientId, setClientConnectToRouterClientId] = useState('');
	return (
		<>
			<FloatingActions showAddNode={() => setShowAddNode(true)} showSettings={() => setShowSettings(true)} onDoneImporting={createGraphCallback} />
			<Settings onDone={createGraphCallback} show={showSettings} close={() => setShowSettings(false)}/>
			<AddNode onDone={createGraphCallback} show={showAddNode} close={() => setShowAddNode(false)}/>
			<AttachWifiToBuilding wifiId={toBeAttachedWifiId} onDone={createGraphCallback} show={showAttachWifiToBuilding} close={() => { setShowAttachWifiToBuilding(false); setToBeAttachedWifiId(''); }}/>
			<AttachRouterToBuilding routerId={toBeAttachedRouterId} onDone={createGraphCallback} show={showAttachRouterToBuilding} close={() => { setShowAttachRouterToBuilding(false); setToBeAttachedRouterId(''); }}/>
			<AttachWifiToRouter wifiId={toBeAttachedWifiId} onDone={createGraphCallback} show={showAttachWifiToRouter} close={() => { setShowAttachWifiToRouter(false); setToBeAttachedWifiId(''); }}/>
			<ConfirmAction close={() => { setShowConfirmAction(false); setConfirmAction(() => {}); }} actionName={confirmActionName} actionTitle={confirmActionTitle} actionQuestion={confirmActionQuestion} onConfirm={confirmAction} show={showConfirmAction} />
			<ContextMenu open={menu.show} closeMenu={() => setMenu({ ...menu, show: false })} node={menu.node} x={menu.x} y={menu.y} items={menu.items} />
			<AddClientTo toBeAddedToId={addClientToId} onDone={createGraphCallback} show={showAddClientTo} close={() => { setShowAddClientTo(false); setAddClientToId(''); }} addToRouter={addClientToRouter}/>
			<AddWifiProbe show={showAddWifiProbe} onDone={createGraphCallback} close={() => { setShowAddWifiProbe(false); setAddWifiProbeClientId(''); }} clientId={addWifiProbeClientId} />
			<RemoveWifiProbe show={showRemoveWifiProbe} onDone={createGraphCallback} close={() => { setShowRemoveWifiProbe(false); setRemoveWifiProbeClientId(''); }} clientId={removeWifiProbeClientId} />
			<ConvertWifiProbeToStation show={showConvertWifiProbe} onDone={createGraphCallback} close={() => { setShowConvertWifiProbe(false); setConvertWifiProbeProbeId(''); }} probeId={convertWifiProbeProbeId} />
			<UploadWifiHandshake show={showUploadWifiHandshake} onDone={createGraphCallback} close={() => { setShowUploadWifiHandshake(false); setUploadWifiHandshakeWifiId(''); }} wifiId={uploadWifiHandshakeWifiId} />
			<ClientConnectToRouter clientId={clientConnectToRouterClientId} show={showClientConnectToRouter} onDone={createGraphCallback} close={() => { setShowClientConnectToRouter(false); setClientConnectToRouterClientId(''); }} />
		</>
	)
}
