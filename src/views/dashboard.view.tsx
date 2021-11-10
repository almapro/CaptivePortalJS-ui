import {
	Add as AddIcon,
	Delete as DeleteIcon,
	Upload as UploadIcon,
	HomeWork as HomeWorkIcon,
    Router as RouterIcon,
} from '@mui/icons-material';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useTitle } from 'react-use';
import Captor from 'sigma/core/captors/captor';
import { Settings as SigmaSettings } from 'sigma/settings';
import getNodeProgramImage from "sigma/rendering/webgl/programs/node.image";
import { MouseCoords, NodeDisplayData } from 'sigma/types';
import { appContext } from '../App';
import { AddNode, AttachWifiToBuilding, ContextMenu, FloatingActions, NodeType, AttachWifiToRouter, Settings, ConfirmAction } from '../components';
import { Attributes } from 'graphology-types';
import { useSigma, useSetSettings, useLoadGraph, useRegisterEvents } from 'react-sigma-v2';
import circlepack from 'graphology-layout/circlepack';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import Graph from 'graphology';
import { useSnackbar } from "notistack"
import _ from 'lodash';
import { Neo4jError } from 'neo4j-driver';
import { SpringSupervisor } from '../layout-spring';
import RouterSvgIcon from '../images/Router.svg';
import WifiSvgIcon from '../images/Wifi.svg';
import HotspotSvgIcon from '../images/Hotspot.svg';
import ClientSvgIcon from '../images/Client.svg';
import BuildingSvgIcon from '../images/Building.svg';
import HouseSvgIcon from '../images/House.svg';
import FloorSvgIcon from '../images/Floor.svg';

export type ClickNode = {
	node: string
	captor: Captor
	event: MouseCoords
}

export type RelationType = 'BROADCASTS' | 'ATTACHED_TO' | 'KNOWS' | 'OWNS' | 'HAS_FLOOR';

export type NodeStructure = {
	id: string
	node_type: NodeType
	label: string
}

export const DashboardView = () => {
	useTitle('Dashboard - Captive Portal JS');
	const { driver, setSigma, theme, database, createDatabaseIndexesAndConstraints } = useContext(appContext);
	const { enqueueSnackbar } = useSnackbar();
	const sigma = useSigma();
	setSigma(sigma);
	const [mouseMove, setMouseMove] = useState(false);
	/**
	 * Drag'n'Drop
	 */
	useEffect(() => {
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
	const loadGraph = useLoadGraph();
	const addNodeToGraph = (node: any, node_type: NodeType, graph: Graph) => {
		const data: any = { node_type, type: 'image' };
		switch (node_type) {
			case 'WIFI':
				data.image = WifiSvgIcon;
				data.label = `${node.essid} - ${node.bssid}`;
				data.essid = node.essid;
				data.bssid = node.bssid;
				break;
			case 'HOTSPOT':
				data.image = HotspotSvgIcon;
				data.label = `${node.essid} - ${node.bssid}`;
				data.essid = node.essid;
				data.bssid = node.bssid;
				break;
			case 'BUILDING':
			case 'HOUSE':
				data.image = node_type === 'BUILDING' ? BuildingSvgIcon : HouseSvgIcon;
				data.label = node.name;
				data.name = node.name;
				break;
			case 'FLOOR':
				data.image = FloorSvgIcon;
				data.label = `Floor ${node.number}`;
				data.number = node.number;
				break;
			case 'ROUTER':
				data.image = RouterSvgIcon;
				data.label = `${node.ip} - ${node.mac}`;
				data.ip = node.ip;
				data.mac = node.mac;
				break;
			case 'CLIENT':
				data.image = ClientSvgIcon;
				data.label = node.mac ? `${node.ip} - ${node.mac}` : node.ip;
				data.ip = node.ip;
				data.mac = node.mac;
				break;
		}
		if (!graph.hasNode(node.id)) {
			graph.addNode(node.id, data);
		}
	}
	const addEdgeToGraph = (source: string, destination: string, label: RelationType, graph: Graph) => {
		if (!graph.hasEdge(source, destination)) {
			graph.addEdge(source, destination, { label });
		}
	}
	const createGraph = async () => {
		if (driver) {
			const graph = new Graph();
			const session = driver.session({ database });
			const txc = session.beginTransaction();
			const wifis = await txc.run(`MATCH (w:Wifi) RETURN w`);
			wifis.records.forEach(async record => {
				const wifi = record.toObject().w.properties;
				addNodeToGraph(wifi, 'WIFI', graph);
			});
			const hotspots = await txc.run(`MATCH (h:Hotspot) RETURN h`);
			hotspots.records.forEach(async record => {
				const hotspot = record.toObject().h.properties;
				addNodeToGraph(hotspot, 'HOTSPOT', graph);
			});
			const wifisAttachedToHouses = await txc.run(`MATCH r = (:Wifi)-[:ATTACHED_TO]-(:Building) RETURN r`);
			wifisAttachedToHouses.records.forEach(async record => {
				const relation = record.toObject().r;
				const wifi = relation.start.properties;
				const house = relation.end.properties;
				addNodeToGraph(wifi, 'WIFI', graph);
				addNodeToGraph(house, 'HOUSE', graph);
				addEdgeToGraph(wifi.id, house.id, 'ATTACHED_TO', graph);
			});
			const wifisAttachedToFloors = await txc.run(`MATCH r = (:Wifi)-[:ATTACHED_TO]-(:Floor) RETURN r`);
			wifisAttachedToFloors.records.forEach(async record => {
				const relation = record.toObject().r;
				const wifi = relation.start.properties;
				const floor = relation.end.properties;
				addNodeToGraph(wifi, 'WIFI', graph);
				addNodeToGraph(floor, 'FLOOR', graph);
				addEdgeToGraph(wifi.id, floor.id, 'ATTACHED_TO', graph);
			});
			const buildingsHasFloor = await txc.run(`MATCH r = (:Building)-[:HAS_FLOOR]-(:Floor) RETURN r`);
			buildingsHasFloor.records.forEach(async record => {
				const relation = record.toObject().r;
				const building = relation.start.properties;
				const floor = relation.end.properties;
				addNodeToGraph(building, 'BUILDING', graph);
				addNodeToGraph(floor, 'FLOOR', graph);
				addEdgeToGraph(building.id, floor.id, 'HAS_FLOOR', graph);
			});
			const houses = await txc.run(`MATCH (h:Building { type: 'HOUSE' }) RETURN h`);
			houses.records.forEach(async record => {
				const house = record.toObject().h.properties;
				addNodeToGraph(house, 'HOUSE', graph);
			});
			const routers = await txc.run(`MATCH (r:Router) RETURN r`);
			routers.records.forEach(async record => {
				const router = record.toObject().r.properties;
				addNodeToGraph(router, 'ROUTER', graph);
			});
			const routersBroadcastWifis = await txc.run(`MATCH r = (:Router)-[:BROADCASTS]-(:Wifi) RETURN r`);
			routersBroadcastWifis.records.forEach(async record => {
				const relation = record.toObject().r;
				const router = relation.start.properties;
				const wifi = relation.end.properties;
				addNodeToGraph(router, 'ROUTER', graph);
				addNodeToGraph(wifi, 'WIFI', graph);
				addEdgeToGraph(router.id, wifi.id, 'BROADCASTS', graph);
			});
			circlepack.assign(graph, { hierarchyAttributes: ['node_type'] });
			const sensibleSettings = forceAtlas2.inferSettings(graph);
			forceAtlas2(graph, { iterations: 50, settings: sensibleSettings });
			forceAtlas2.assign(graph, 50);
			new SpringSupervisor(graph, { isNodeFixed: (n) => graph.getNodeAttribute(n, "highlighted") }).start();
			await session.close();
			loadGraph(graph);
			sigma.refresh();
		}
	}
	const createGraphCallback = useCallback(createGraph, [loadGraph, driver,  database, sigma]);
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
	const handleNodeRightClick = (e: ClickNode) => {
		const nodeType: NodeType = sigma.getGraph().getNodeAttribute(e.node, 'node_type');
		const items: [JSX.Element, string, (id: string) => void][] = [];
		switch (nodeType) {
			case 'WIFI':
				const graph = sigma.getGraph();
				const edgesEndpoints = graph.edges().map(edge => [graph.extremities(edge), graph.getEdgeAttribute(edge, 'label')]);
				let attachedToBuilding = false;
				let attachedToRouter = false;
				edgesEndpoints.forEach(([extremities, label]) => {
					if (_.includes(extremities, e.node)) {
						const node_type: NodeType = graph.getNodeAttribute(_.filter(extremities, n => n !== e.node)[0], 'node_type');
						if (!attachedToRouter) attachedToRouter = label === 'BROADCASTS' && node_type === 'ROUTER';
						if (!attachedToBuilding) attachedToBuilding = label === 'ATTACHED_TO' && (node_type === 'HOUSE' || node_type === 'FLOOR');
					}
				});
				items.push([<AddIcon />, 'Add a client', async id => {
					//
				}]);
				items.push([<UploadIcon />, 'Upload a handshake file', async id => {
					//
				}]);
				items.push([<HomeWorkIcon />, `${attachedToBuilding ?  'Deattach from' : 'Attach to'} a building`, async id => {
					if (driver) {
						if (attachedToBuilding) {
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
				items.push([<RouterIcon />, `${attachedToRouter ?  'Deattach from' : 'Attach to'} a router`, id => {
					if (driver) {
						if (attachedToRouter) {
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
		}
		if (nodeType !== 'FLOOR') items.push([<DeleteIcon />, 'Delete node', id => {
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
	const handleNodeRightClickCallback = useCallback(handleNodeRightClick, [setMenu, driver, sigma, enqueueSnackbar, createGraphCallback, database]);
	const [hoveredNode, setHoveredNode] = useState<string | null>(null);
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
		sigma.addListener('rightClickNode', handleNodeRightClickCallback);
		createGraphCallback();
		registerEvents({
			enterNode: e => setHoveredNode(e.node),
			leaveNode: () => setHoveredNode(null),
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
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
				const graph = sigma.getGraph();
				const newData: Attributes = { ...data, highlighted: data.highlighted || false, size: 15 };
				if (hoveredNode && !mouseMove) {
					if (node === hoveredNode || graph.neighbors(hoveredNode).includes(node)) {
						newData.highlighted = true;
					} else {
						newData.color = `#121212`;
						newData.highlighted = false;
					}
				}
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
	const [showAddNode, setShowAddNode] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showAttachWifiToBuilding, setShowAttachWifiToBuilding] = useState(false);
	const [showAttachWifiToRouter, setShowAttachWifiToRouter] = useState(false);
	const [toBeAttachedWifiId, setToBeAttachedWifiId] = useState('');
	const [showConfirmAction, setShowConfirmAction] = useState(false);
	const [confirmActionName, setConfirmActionName] = useState('');
	const [confirmActionTitle, setConfirmActionTitle] = useState('');
	const [confirmActionQuestion, setConfirmActionQuestion] = useState('');
	const [confirmAction, setConfirmAction] = useState<() => void>(() => {});
	return (
		<>
			<FloatingActions showAddNode={() => setShowAddNode(true)} showSettings={() => setShowSettings(true)} />
			<Settings show={showSettings} close={() => setShowSettings(false)}/>
			<AddNode onDone={createGraphCallback} show={showAddNode} close={() => setShowAddNode(false)}/>
			<AttachWifiToBuilding wifiId={toBeAttachedWifiId} onDone={createGraphCallback} show={showAttachWifiToBuilding} close={() => { setShowAttachWifiToBuilding(false); setToBeAttachedWifiId(''); }}/>
			<AttachWifiToRouter wifiId={toBeAttachedWifiId} onDone={createGraphCallback} show={showAttachWifiToRouter} close={() => { setShowAttachWifiToRouter(false); setToBeAttachedWifiId(''); }}/>
			<ConfirmAction close={() => { setShowConfirmAction(false); setConfirmAction(() => {}); }} actionName={confirmActionName} actionTitle={confirmActionTitle} actionQuestion={confirmActionQuestion} onConfirm={confirmAction} show={showConfirmAction} />
			<ContextMenu open={menu.show} closeMenu={() => setMenu({ ...menu, show: false })} node={menu.node} x={menu.x} y={menu.y} items={menu.items} />
		</>
	)
}
