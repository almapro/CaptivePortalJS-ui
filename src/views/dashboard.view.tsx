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
import { Settings } from 'sigma/settings';
import { MouseCoords, NodeDisplayData, PartialButFor } from 'sigma/types';
import { appContext } from '../App';
import { AddNode, AttachWifiToBuilding, ContextMenu, FloatingActions, NodeType } from '../components';
import SvgToDataURL from 'svg-to-dataurl';
import { Attributes, NodeKey } from 'graphology-types';
import { useSigma, useSetSettings, useLoadGraph } from 'react-sigma-v2';
import circlepack from 'graphology-layout/circlepack';
import Graph from 'graphology';
import { useSnackbar } from "notistack"
import _ from 'lodash';

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
	const { driver, setSigma, darkMode, theme, database, createDatabaseIndexesAndConstraints } = useContext(appContext);
	const { enqueueSnackbar } = useSnackbar();
	const sigma = useSigma();
	setSigma(sigma);
	const setSigmaSettings = useSetSettings();
	const loadGraph = useLoadGraph();
	const addNodeToGraph = (node: any, node_type: NodeType, graph: Graph) => {
		const data: any = { node_type };
		switch (node_type) {
			case 'WIFI':
				data.label = node.essid;
				data.essid = node.essid;
				data.bssid = node.bssid;
				break;
			case 'HOTSPOT':
				data.label = node.essid;
				data.essid = node.essid;
				data.bssid = node.bssid;
				break;
			case 'BUILDING':
			case 'HOUSE':
				data.label = node.name;
				data.name = node.name;
				break;
			case 'FLOOR':
				data.label = `Floor ${node.number}`;
				data.number = node.number;
				break;
			case 'ROUTER':
				data.label = node.ip;
				data.ip = node.ip;
				data.mac = node.mac;
				break;
			case 'CLIENT':
				data.label = node.ip;
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
			loadGraph(graph);
			await session.close();
		}
	}
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
	const labelRenderer = async (ctx: CanvasRenderingContext2D, data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">) => {
		let node_type = '';
		if (sigma) {
			const WifiSvgIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#fff"><path d="M0 0h24v24H0V0zm0 0h24v24H0V0z" fill="none"/><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>`;
			const BuildingSvgIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#fff"><path d="M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2z" /></svg>`;
			const HouseSvgIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#fff"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg>`;
			const RouterSvgIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#fff"><path d="m20.2 5.9.8-.8C19.6 3.7 17.8 3 16 3s-3.6.7-5 2.1l.8.8C13 4.8 14.5 4.2 16 4.2s3 .6 4.2 1.7zm-.9.8c-.9-.9-2.1-1.4-3.3-1.4s-2.4.5-3.3 1.4l.8.8c.7-.7 1.6-1 2.5-1 .9 0 1.8.3 2.5 1l.8-.8zM19 13h-2V9h-2v4H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2zM8 18H6v-2h2v2zm3.5 0h-2v-2h2v2zm3.5 0h-2v-2h2v2z" /></svg>`;
			const FloorSvgIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#fff"><path d="m11.99 18.54-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z" /></svg>`;
			const ClientSvgIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#fff"><path d="M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z" /></svg>`;
			const HotspotSvgIcon = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#fff"><path d="M12 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 2c0-3.31-2.69-6-6-6s-6 2.69-6 6c0 2.22 1.21 4.15 3 5.19l1-1.74c-1.19-.7-2-1.97-2-3.45 0-2.21 1.79-4 4-4s4 1.79 4 4c0 1.48-.81 2.75-2 3.45l1 1.74c1.79-1.04 3-2.97 3-5.19zM12 3C6.48 3 2 7.48 2 13c0 3.7 2.01 6.92 4.99 8.65l1-1.73C5.61 18.53 4 15.96 4 13c0-4.42 3.58-8 8-8s8 3.58 8 8c0 2.96-1.61 5.53-4 6.92l1 1.73c2.99-1.73 5-4.95 5-8.65 0-5.52-4.48-10-10-10z" /></svg>`;
			node_type = sigma.getGraph().getNodeAttributes(data.key).node_type;
			const { x, y } = data;
			const img = new Image(24, 24);
			let imgData = '';
			switch (node_type) {
				case 'WIFI':
					imgData = SvgToDataURL(WifiSvgIcon);
					break;
				case 'CLIENT':
					imgData = SvgToDataURL(ClientSvgIcon);
					break;
				case 'BUILDING':
					imgData = SvgToDataURL(BuildingSvgIcon);
					break;
				case 'HOUSE':
					imgData = SvgToDataURL(HouseSvgIcon);
					break;
				case 'FLOOR':
					imgData = SvgToDataURL(FloorSvgIcon);
					break;
				case 'HOTSPOT':
					imgData = SvgToDataURL(HotspotSvgIcon);
					break;
				case 'ROUTER':
					imgData = SvgToDataURL(RouterSvgIcon);
					break;
			}
			img.id = data.key;
			img.src = imgData;
			ctx.drawImage(img, x - 12, y - 12);
		}
		if (data.label) {
			ctx.fillStyle = darkMode ? '#fff' : '#000';
			ctx.fillText(data.label, data.x - data.size * 0.75, data.y + (data.size * 2));
			if (node_type === 'WIFI' || node_type === 'HOTSPOT') ctx.fillText(sigma.getGraph().getNodeAttribute(data.key, 'bssid'), data.x - data.size * 2.5, data.y + (data.size * 2) + 15);
			if (node_type === 'ROUTER' || node_type === 'CLIENT') ctx.fillText(sigma.getGraph().getNodeAttribute(data.key, 'mac'), data.x - data.size * 2.5, data.y + (data.size * 2) + 15);
		}
	}
	const labelRendererCallback = useCallback(labelRenderer, [darkMode, sigma]);
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
						const node_type = graph.getNodeAttribute(extremities[1], 'node_type');
						attachedToRouter = label === 'ATTACHED_TO' && node_type === 'ROUTER';
						attachedToBuilding = label === 'ATTACHED_TO' && (node_type === 'HOUSE' || node_type === 'FLOOR');
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
							const session = driver.session({ database });
							await session.run('MATCH (n:Wifi { id: $id })-[r:ATTACHED_TO]-() DELETE r', { id });
							await session.close();
							enqueueSnackbar(`Deattached Wifi (${sigma.getGraph().getNodeAttribute(id, 'essid')}) from Building`, { variant: 'success' });
						} else {
							setShowAttachWifiToBuilding(true);
							setToBeAttachedWifiId(id);
						}
						createGraph();
					}
				}]);
				items.push([<RouterIcon />, `${attachedToRouter ?  'Deattach from' : 'Attach to'} a router`, async id => {
					if (driver) {
						if (attachedToRouter) {
							const session = driver.session({ database });
							await session.run('MATCH (n:Wifi) OPTIONAL MATCH (n)-[r]-(b:Router) WHERE n.id = $id SET n.attached_to_router = false DELETE r', { id });
							await session.close();
							enqueueSnackbar(`Deattached Wifi (${sigma.getGraph().getNodeAttribute(id, 'essid')}) from Router`, { variant: 'success' });
						} else {
							//
						}
						createGraph();
					}
				}]);
				break;
		}
		items.push([<DeleteIcon />, 'Delete node', async id => {
			if (driver) {
				const session = driver.session({ database });
				await session.run('MATCH (n {id: $id}) OPTIONAL MATCH r = (n)--() DELETE r, n', { id });
				enqueueSnackbar('Node deleted successfully', { variant: 'success' });
				await session.close();
				createGraph();
			}
		}]);
		setMenu({
			show: true,
			node: e.node,
			x: e.event.x,
			y: e.event.y,
			items,
		});
	}
	const handleNodeRightClickCallback = useCallback(handleNodeRightClick, [setMenu]);
	useEffect(() => {
		const nodeReducer = (__: NodeKey, data: Attributes): Partial<NodeDisplayData> => {
			return {
				...data,
				size: 15,
			}
		}
		const settings: Partial<Settings> = {
			defaultEdgeColor: theme.palette.primary.main,
			renderLabels: true,
			renderEdgeLabels: true,
			defaultNodeColor: theme.palette.secondary.main,
			labelRenderer: labelRendererCallback,
			hoverRenderer: () => {},
			labelSize: 5,
			nodeReducer,
		}
		setSigmaSettings(settings);
		sigma.addListener('rightClickNode', handleNodeRightClickCallback);
		createGraph();
	}, [sigma, labelRendererCallback, theme, handleNodeRightClickCallback]);
	useEffect(() => {
		if (driver) {
			createDatabaseIndexesAndConstraints(driver.session({ database }));
		}
	}, []);
	const [showAddNode, setShowAddNode] = useState(false);
	const [showAttachWifiToBuilding, setShowAttachWifiToBuilding] = useState(false);
	const [toBeAttachedWifiId, setToBeAttachedWifiId] = useState('');
	return (
		<>
			<FloatingActions showAddNode={() => setShowAddNode(true)} />
			<AddNode onDone={createGraph} show={showAddNode} close={() => setShowAddNode(false)}/>
			<AttachWifiToBuilding wifiId={toBeAttachedWifiId} onDone={createGraph} show={showAttachWifiToBuilding} close={() => { setShowAttachWifiToBuilding(false); setToBeAttachedWifiId(''); }}/>
			<ContextMenu open={menu.show} closeMenu={() => setMenu({ ...menu, show: false })} node={menu.node} x={menu.x} y={menu.y} items={menu.items} />
		</>
	)
}
