import {
	Box,
	Button,
	ButtonGroup,
	Fab,
	Autocomplete,
	TextField,
	IconButton,
	Grid,
	Tooltip,
	Paper,
	Collapse,
	List,
	ListItem,
	InputAdornment,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Tabs,
	Tab,
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { FC, useContext, useState, useEffect, FormEvent } from 'react';
import {
	ZoomIn as ZoomInIcon,
	ZoomOut as ZoomOutIcon,
	Search as SearchIcon,
	Add as AddIcon,
	Settings as SettingsIcon,
	Timeline as TimelineIcon,
	ExpandLess as ExpandLessIcon,
	ExpandMore as ExpandMoreIcon,
	Visibility as VisibilityIcon,
	VisibilityOff as VisibilityOffIcon,
	Refresh as RefreshIcon,
	UploadFile as UploadFileIcon,
	Download as DownloadIcon,
} from '@mui/icons-material';
import { appContext } from '../App';
import { useSigma } from 'react-sigma-v2';
import Graph from 'graphology';
import { NodeType, RelationType } from '../neo4j-sigma-graph';
import _ from 'lodash';
import { useSnackbar } from 'notistack';
import { Neo4jError, int } from 'neo4j-driver';
import { v4 } from 'uuid';
import { parse } from 'csv-parse/lib/index';

export type FloatingActionsProps = {
	showAddNode: () => void
	showSettings: () => void
	onDoneImporting: () => void
}

export type WifiteCrackedWPA = {
	type: "WPA"
	date: number
	essid: string
	bssid: string
	key: string
	handshake_file: string
}

export type WifiteCrackedWPS = {
	type: "WPS"
	date: number
	essid: string
	bssid: string
	pin: string
	psk: string
}

export const FloatingActions: FC<FloatingActionsProps> = ({ showAddNode, showSettings, onDoneImporting }) => {
	const { enqueueSnackbar } = useSnackbar();
	const {
		theme,
		search,
		setSearch,
		foundNode,
		setFoundNode,
		isFindPath,
		setIsFindPath,
		startNode,
		setStartNode,
		startNodeSearch,
		setStartNodeSearch,
		endNode,
		setEndNode,
		endNodeSearch,
		setEndNodeSearch,
		hoveredNode,
		hoveredNodeLabel,
		selectedNode,
		selectedNodeLabel,
		driver,
		database,
	} = useContext(appContext);
	const sigma = useSigma();
	const graph = sigma.getGraph();
	const useStyles = makeStyles({
		floatingActionsBottom: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			bottom: theme.spacing(2),
			right: theme.spacing(2),
		},
		floatingActionsBottomLeft: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			bottom: theme.spacing(2),
			left: theme.spacing(2),
		},
		floatingSearchAndFind: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			top: theme.spacing(2),
			left: theme.spacing(2),
			display: 'flex',
		},
		floatingActionsTop: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			top: theme.spacing(2),
			right: theme.spacing(2),
		},
	});
	const classes = useStyles();
	const [values, setValues] = useState<{ id: string, label: string }[]>([]);
	const [startValues, setStartValues] = useState<{ id: string, label: string }[]>([]);
	const [endValues, setEndValues] = useState<{ id: string, label: string }[]>([]);
	const findMatchingNodes = (searchString: string, graph: Graph) => {
		const foundMatchingNodes: { id: string, label: string }[] = []
		graph.forEachNode((id, attributes) => {
			if (attributes.label && attributes.label.toLowerCase().includes(searchString.toLowerCase())) {
				foundMatchingNodes.push({ id, label: attributes.label });
			}
		});
		return foundMatchingNodes;
	}
	useEffect(() => {
		const newValues: { id: string, label: string }[] = [];
		if (!foundNode && search.length > 0) {
			newValues.push(...findMatchingNodes(search, graph));
		}
		setValues(newValues);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search]);
	useEffect(() => {
		const newValues: { id: string, label: string }[] = [];
		if (!startNode && startNodeSearch.length > 0) {
			newValues.push(...findMatchingNodes(startNodeSearch, graph));
		}
		if (endNode) setStartValues(newValues.filter(node => node.id !== endNode));
		else setStartValues(newValues);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [startNodeSearch]);
	useEffect(() => {
		const newValues: { id: string, label: string }[] = [];
		if (!endNode && endNodeSearch.length > 0) {
			newValues.push(...findMatchingNodes(endNodeSearch, graph));
		}
		if (startNode) setEndValues(newValues.filter(node => node.id !== startNode));
		else setEndValues(newValues);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [endNodeSearch]);
	useEffect(() => {
		if (!foundNode) return;
		sigma.getGraph().setNodeAttribute(foundNode, 'highlighted', true);
		const nodeDisplayData = sigma.getNodeDisplayData(foundNode);
		if (nodeDisplayData) {
			sigma.getCamera().animate(nodeDisplayData, {
				easing: "linear",
				duration: 500,
			});
		}
		return () => {
			sigma.getGraph().setNodeAttribute(foundNode, 'highlighted', false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [foundNode]);
	const handleSearchChange = (searchString: string) => {
		const valueItem = values.find(value => value.label === searchString);
		if (valueItem) {
			setSearch(valueItem.label);
			setValues([]);
			setFoundNode(valueItem.id);
		} else {
			setFoundNode(null);
			setSearch(searchString);
		}
	}
	const handleStartNodeSearchChange = (searchString: string) => {
		const valueItem = startValues.find(value => value.label === searchString);
		if (valueItem) {
			setStartNodeSearch(valueItem.label);
			setStartValues([]);
			setStartNode(valueItem.id);
		} else {
			setStartNode(null);
			setStartNodeSearch(searchString);
		}
	}
	const handleEndNodeSearchChange = (searchString: string) => {
		const valueItem = endValues.find(value => value.label === searchString);
		if (valueItem) {
			setEndNodeSearch(valueItem.label);
			setEndValues([]);
			setEndNode(valueItem.id);
		} else {
			setEndNode(null);
			setEndNodeSearch(searchString);
		}
	}
	const handleZoomOut = () => {
		sigma.getCamera().animatedUnzoom(2);
	}
	const handleZoomIn = () => {
		sigma.getCamera().animatedZoom(2);
	}
	const handleZoomReset = () => {
		sigma.getCamera().animatedReset();
	}
	const [expandNodeInfo, setExpandNodeInfo] = useState(true);
	type NodePropertyInfoType = { nodeId: string,  label: string, value: string, secondaryAction?: JSX.Element, pin?: boolean, password?: boolean, toggleShowPassword?: () => void };
	const [nodePropertiesInfo, setNodePropertiesInfo] = useState<NodePropertyInfoType[]>([]);
	const [showPasswordFields, setShowPasswordFields] = useState<string[]>([]);
	const [showPinFields, setShowPinFields] = useState<string[]>([]);
	useEffect(() => {
		const asyncCallback = async () => {
			if (!hoveredNode && !selectedNode) {
				setNodePropertiesInfo([]);
				return;
			}
			const graph = sigma.getGraph();
			const generateNodePropertiesInfoFromNode = async (node: string) => {
				const newNodePropertiesInfo: NodePropertyInfoType[] = [];
				if (driver) {
					const session = driver.session({ database });
					const properties = graph.getNodeAttributes(node);
					const node_type: NodeType = properties.node_type;
					const nodeId = properties.id;
					switch(node_type) {
						case 'WIFI':
							newNodePropertiesInfo.push({ nodeId, label: 'ESSID', value: properties.essid });
							newNodePropertiesInfo.push({ nodeId, label: 'BSSID', value: properties.bssid });
							if (properties.password) newNodePropertiesInfo.push({ nodeId, label: 'Password', value: properties.password, password: true, toggleShowPassword: () => setShowPasswordFields(prev => {
								if (_.includes(prev, properties.id)) return prev.filter(i => i !== properties.id);
								return [ ...prev, properties.id ];
							}), });
							if (properties.pin) newNodePropertiesInfo.push({ nodeId, label: 'Pin', value: properties.pin, pin: true, toggleShowPassword: () => setShowPinFields(prev => {
								if (_.includes(prev, properties.id)) return prev.filter(i => i !== properties.id);
								return [ ...prev, properties.id ];
							}), });
							const wifiClientsCount = await session.run('MATCH (:Wifi { id: $nodeId })<-[]-(c:Client) RETURN DISTINCT c', { nodeId });
							newNodePropertiesInfo.push({ nodeId, label: 'Clients', value: wifiClientsCount.records.length.toString() });
							break;
						case 'ROUTER':
							newNodePropertiesInfo.push({ nodeId, label: 'IP', value: properties.ip });
							newNodePropertiesInfo.push({ nodeId, label: 'MAC', value: properties.mac });
							const routerWifisCount = await session.run('MATCH (:Router { id: $nodeId })-[]-(w:Wifi) RETURN DISTINCT w', { nodeId });
							const routerClientsCount = await session.run('MATCH (:Router { id: $nodeId })-[*1..2]-(c:Client) RETURN DISTINCT c', { nodeId });
							newNodePropertiesInfo.push({ nodeId, label: 'Wifis', value: routerWifisCount.records.length.toString() });
							newNodePropertiesInfo.push({ nodeId, label: 'Clients', value: routerClientsCount.records.length.toString() });
							break;
						case 'CLIENT':
							if (properties.ip) newNodePropertiesInfo.push({ nodeId, label: 'IP', value: properties.ip });
							newNodePropertiesInfo.push({ nodeId, label: 'MAC', value: properties.mac });
							break;
						case 'WIFIPROBE':
							newNodePropertiesInfo.push({ nodeId, label: 'ESSID', value: properties.essid });
							const wifiProbeClientsCount = await session.run('MATCH (:WifiProbe { id: $nodeId })-[*1]-(c:Client) RETURN DISTINCT c', { nodeId });
							newNodePropertiesInfo.push({ nodeId, label: 'Clients', value: wifiProbeClientsCount.records.length.toString() });
							break;
						case 'FLOOR':
							const floorRoutersCount = await session.run('MATCH (:Floor { id: $nodeId })-[*1]-(r:Router) RETURN DISTINCT r', { nodeId });
							const floorWifisCount = await session.run('MATCH (:Floor { id: $nodeId })-[*1..2]-(w:Wifi) RETURN DISTINCT w', { nodeId });
							const floorClientsCount = await session.run('MATCH (:Floor { id: $nodeId })-[*2]-(c:Client) RETURN DISTINCT c', { nodeId });
							newNodePropertiesInfo.push({ nodeId, label: 'Wifis', value: floorWifisCount.records.length.toString() });
							newNodePropertiesInfo.push({ nodeId, label: 'Routers', value: floorRoutersCount.records.length.toString() });
							newNodePropertiesInfo.push({ nodeId, label: 'Clients', value: floorClientsCount.records.length.toString() });
							break;
						case 'BUILDING':
						case 'HOUSE':
							newNodePropertiesInfo.push({ nodeId, label: 'Name', value: properties.name });
							if (node_type === 'BUILDING') {
								const buildingFloorsCount = await session.run('MATCH (:Building { id: $nodeId })-[]-(f:Floor) RETURN DISTINCT f', { nodeId });
								newNodePropertiesInfo.push({ nodeId, label: 'Floors', value: buildingFloorsCount.records.length.toString() });
							}
							const buildingRoutersCount = await session.run('MATCH (:Building { id: $nodeId })-[*1..2]-(r:Router) RETURN DISTINCT r', { nodeId });
							const buildingWifisCount = await session.run('MATCH (:Building { id: $nodeId })-[*1..3]-(w:Wifi) RETURN DISTINCT w', { nodeId });
							const buildingClientsCount = await session.run('MATCH (:Building { id: $nodeId })-[*2..3]-(c:Client) RETURN DISTINCT c', { nodeId });
							newNodePropertiesInfo.push({ nodeId, label: 'Wifis', value: buildingWifisCount.records.length.toString() });
							newNodePropertiesInfo.push({ nodeId, label: 'Routers', value: buildingRoutersCount.records.length.toString() });
							newNodePropertiesInfo.push({ nodeId, label: 'Clients', value: buildingClientsCount.records.length.toString() });
							break;
					}
					await session.close();
				}
				return newNodePropertiesInfo;
			}
			if (hoveredNode && selectedNode !== hoveredNode) {
				setNodePropertiesInfo(await generateNodePropertiesInfoFromNode(hoveredNode));
			} else if (selectedNode) {
				setNodePropertiesInfo(await generateNodePropertiesInfoFromNode(selectedNode));
			}
		}
		asyncCallback();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedNode, hoveredNode]);
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [importFromExportedGraphFile, setImportFromExportedGraphFile] = useState<File | null>(null);
	const [importFromWifiteCrackedFile, setImportFromWifiteCrackedFile] = useState<File | null>(null);
	const [importFromAirodumpCsvFile, setImportFromAirodumpCsvFile] = useState<File | null>(null);
	const [showExportDialog, setShowExportDialog] = useState(false);
	const [tabIndex, setTabIndex] = useState(0);
	const handleCancel = () => {
		setShowImportDialog(false);
		setShowExportDialog(false);
		setImportFromExportedGraphFile(null);
		setImportFromWifiteCrackedFile(null);
		setImportFromAirodumpCsvFile(null);
		setTabIndex(0);
	}
	type NodeTypeString = 'Wifi' | 'WifiProbe' | 'Handshake' | 'Client' | 'Router' | 'Building' | 'Floor';
	const generateNodeQueryStringFromParams = (type: NodeTypeString, params: any) => {
		let paramsString = _.join(_.keys(params).map(key => `${key}: $${key}`), ', ');
		return `MERGE (:${type} { ${paramsString} })`;
	}
	const generateEdgeQueryStringFromRelationType = (relationType: RelationType) => {
		return `MATCH (s { id: $source }), (t { id: $target }) MERGE (s)-[:${relationType}]->(t)`;
	}
	const handleImportSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (driver) {
			const graph = sigma.getGraph();
			const session = driver.session({ database });
			const trx = session.beginTransaction();
			const reader = new FileReader();
			if (tabIndex === 0 && importFromExportedGraphFile) {
				reader.onload = async () => {
					if (reader.result && typeof reader.result === 'string') {
						try {
							const parsedGraph = JSON.parse(reader.result);
							if (!parsedGraph.nodes && !parsedGraph.edges) throw new Neo4jError('Selected graph has no nodes nor edges!', '1');
							const importedGraph: { nodes: any[], edges: any[] } = parsedGraph;
							importedGraph.nodes.forEach(async node => {
								if (graph.hasNode(node.id)) return;
								const node_type: NodeType = node.node_type;
								let nodeType: NodeTypeString = 'Wifi';
								const nodeData: any = { id: node.id };
								switch(node_type) {
									case 'WIFI':
										nodeData.essid = node.essid;
										nodeData.bssid = node.bssid;
										if (node.password) {
											nodeData.password = node.password;
										}
										break;
									case 'WIFIPROBE':
										nodeData.essid = node.essid;
										nodeType = 'WifiProbe';
										break;
									case 'HOTSPOT':
										nodeData.essid = node.essid;
										nodeData.bssid = node.bssid;
										nodeType = 'WifiProbe';
										break;
									case 'BUILDING':
									case 'HOUSE':
										nodeData.name = node.name;
										nodeData.type = _.capitalize(node.node_type.toLowerCase());
										nodeType = 'Building';
										break;
									case 'FLOOR':
										nodeData.number = int(node.number);
										nodeType = 'Floor';
										break;
									case 'ROUTER':
										nodeData.ip = node.ip;
										nodeData.mac = node.mac;
										nodeType = 'Router';
										break;
									case 'CLIENT':
										if (node.ip) nodeData.ip = node.ip;
										nodeData.mac = node.mac;
										nodeType = 'Client';
										break;
								}
								try {
									await trx.run(generateNodeQueryStringFromParams(nodeType, nodeData), nodeData);
								} catch (__) {}
							});
							importedGraph.edges.forEach(async edge => {
								const edge_type: RelationType = edge.label;
								try {
									await trx.run(generateEdgeQueryStringFromRelationType(edge_type), { source: edge.source, target: edge.target });
								} catch (__) {}
							});
							await trx.commit();
							await session.close();
							enqueueSnackbar('Graph has been imported successfuly', { variant: 'success' });
							handleCancel();
							onDoneImporting();
						} catch (e) {
							enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
						}
					}
				}
				reader.readAsText(importFromExportedGraphFile, 'utf8');
			}
			if (tabIndex === 1 && importFromWifiteCrackedFile) {
				reader.onload = async () => {
					if (reader.result && typeof reader.result === 'string') {
						try {
							const parsedGraph = JSON.parse(reader.result);
							if (!parsedGraph.length) throw new Neo4jError('Selected wifite cracked.json file has no nodes!', '1');
							type WifiteNode = WifiteCrackedWPA | WifiteCrackedWPS;
							const importedGraph: WifiteNode[] = parsedGraph;
							importedGraph.forEach(async node => {
								const nodeData: any = { id: v4() };
								nodeData.essid = node.essid;
								nodeData.bssid = node.bssid;
								if (node.type === 'WPA') {
									if (node.key) nodeData.password = node.key;
								} else {
									if (node.pin) nodeData.pin = node.pin;
									if (node.psk) nodeData.password = node.psk;
								}
								try {
									let queryString = `MERGE (n:Wifi { essid: $essid, bssid: $bssid })` +
										` ON CREATE SET n.id = $id${nodeData.password ? ', n.password = $password' : ''}${nodeData.pin ? ', n.pin = $pin' : ''}`;
									if (nodeData.password || nodeData.pin) queryString += ` ON MATCH SET ${_.join(_.compact([nodeData.password ? 'n.password = $password' : '', nodeData.pin ? 'n.pin = $pin' : '']), ', ')}`;
									await trx.run(queryString, nodeData);
								} catch (__) {}
							});
							await trx.commit();
							await session.close();
							enqueueSnackbar('Wifite cracked.json has been imported successfuly', { variant: 'success' });
							handleCancel();
							onDoneImporting();
						} catch (e) {
							enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
						}
					}
				}
				reader.readAsText(importFromWifiteCrackedFile, 'utf8');
			}
			if (tabIndex === 2 && importFromAirodumpCsvFile) {
				reader.onload = async () => {
					if (reader.result && typeof reader.result === 'string') {
						try {
							const parsedData: string[][] = [];
							const parser = parse({
								relax_column_count_less: true,
								relax_column_count_more: true,
								encoding: 'utf8',
								delimiter: ', ',
							});
							parser.on('data', data => parsedData.push(data));
							reader.result.split('\n').forEach(row => { if (!!row.trim()) parser.write(row); });
							parser.end();
							if (!parsedData.length) throw new Neo4jError('Selected airodump csv file has no nodes!', '1');
							let stationRows = true;
							const wifis: { essid: string, bssid: string }[] = [];
							const clients: { mac: string }[] = [];
							const probes: { essid: string }[] = [];
							const edges: { label: string, wifi: string, client: string }[] = [];
							parsedData.forEach(row => {
								if (row[0] === 'BSSID') return;
								if (row[0] === 'Station MAC') {
									stationRows = false;
									return;
								}
								if (stationRows) {
									wifis.push({ essid: row[13], bssid: row[0] });
								} else {
									clients.push({ mac: row[0] });
									const station = row[5].split(',')[0].trim();
									const clientProbes = _.compact(row[5].split(','));
									clientProbes.shift();
									if (!station.includes(')')) {
										edges.push({ label: 'CONNECTS_TO', wifi: station, client: row[0] });
									}
									if (clientProbes.length) {
										clientProbes.forEach(p => {
											const wifiFound = _.find(wifis, { essid: p });
											if (wifiFound) {
												const clientConnectsTo = { label: 'CONNECTS_TO', wifi: wifiFound.bssid, client: row[0] };
												if (!_.find(edges, clientConnectsTo)) edges.push(clientConnectsTo);
												return;
											}
											probes.push({ essid: p });
											edges.push({ label: 'KNOWS', wifi: p, client: row[0] });
										});
									}
								}
							});
							wifis.forEach(async node => {
								const nodeData: any = { id: v4() };
								nodeData.essid = node.essid;
								nodeData.bssid = node.bssid;
								try {
									let queryString = `MERGE (n:Wifi { essid: $essid, bssid: $bssid }) ON CREATE SET n.id = $id`;
									await trx.run(queryString, nodeData);
								} catch (__) {}
							});
							probes.forEach(async node => {
								const nodeData: any = { id: v4() };
								nodeData.essid = node.essid;
								try {
									let queryString = `MERGE (n:WifiProbe { essid: $essid }) ON CREATE SET n.id = $id`;
									await trx.run(queryString, nodeData);
								} catch (__) {}
							});
							clients.forEach(async node => {
								const nodeData: any = { id: v4() };
								nodeData.mac = node.mac;
								try {
									let queryString = `MERGE (n:Client { mac: $mac }) ON CREATE SET n.id = $id`;
									await trx.run(queryString, nodeData);
								} catch (__) {}
							});
							edges.forEach(async edge => {
								const edgeData: any = {};
								edgeData.wifi = edge.wifi;
								edgeData.client = edge.client;
								let queryString = `MATCH (c { mac: $client }), (w { ${edge.label === 'KNOWS' ? 'essid: $wifi' : 'bssid: $wifi'} }) MERGE (c)-[:${edge.label}]->(w)`;
								await trx.run(queryString, edgeData);
							});
							await trx.commit();
							await session.close();
							enqueueSnackbar('Airodump csv has been imported successfuly', { variant: 'success' });
							handleCancel();
							onDoneImporting();
						} catch (e) {
							enqueueSnackbar((e as Neo4jError).message, { variant: 'error' });
						}
					}
				}
				reader.readAsText(importFromAirodumpCsvFile, 'utf8');
			}
		}
	}
	const handleExportSubmit = (e: FormEvent) => {
		e.preventDefault();
		const serializedGraph = sigma.getGraph().export();
		const dataToBeExported = {
			nodes: JSON.parse(JSON.stringify(serializedGraph.nodes.map(node => _.assign({}, node.attributes, { type: undefined, label: undefined, x: undefined, y: undefined, image: undefined })))),
			edges: JSON.parse(JSON.stringify(serializedGraph.edges.map(edge => _.assign({}, edge.attributes, { source: edge.source, target: edge.target })))),
		}
		window.files.saveFile(JSON.stringify(dataToBeExported));
		enqueueSnackbar('Graph exported successfuly', { variant: 'success' });
		handleCancel();
	}
	return (
		<>
			<Box className={classes.floatingActionsTop} display='grid' rowGap={2}>
				<Tooltip placement='left' title='Settings'><Fab color='secondary' onClick={showSettings}><SettingsIcon /></Fab></Tooltip>
				<Tooltip placement='left' title='Add a node'><Fab color='secondary' onClick={showAddNode}><AddIcon /></Fab></Tooltip>
				<Tooltip placement='left' title='Refresh'><Fab color='secondary' onClick={() => sigma.refresh()}><RefreshIcon /></Fab></Tooltip>
				<Tooltip placement='left' title='Import from...'><Fab color='secondary' onClick={() => setShowImportDialog(true)}><UploadFileIcon /></Fab></Tooltip>
				<Tooltip placement='left' title='Export'><Fab color='secondary' onClick={() => setShowExportDialog(true)}><DownloadIcon /></Fab></Tooltip>
			</Box>
			<Box className={classes.floatingActionsBottom}>
				<ButtonGroup orientation='vertical' color='secondary' variant='contained'>
					<Tooltip placement='left' title='Zoom in'><Button onClick={handleZoomIn}><ZoomInIcon /></Button></Tooltip>
					<Tooltip placement='left' title='Reset zoom'><Button onClick={handleZoomReset}><SearchIcon /></Button></Tooltip>
					<Tooltip placement='left' title='Zoom out'><Button onClick={handleZoomOut}><ZoomOutIcon /></Button></Tooltip>
				</ButtonGroup>
			</Box>
			<Box className={classes.floatingSearchAndFind}>
				<Grid container spacing={2} sx={{ width: 350 }}>
					<Grid item xs={9} flexGrow={1} sx={{ '& .MuiTextField-root': { my: .5 }, px: .5 }}>
						{!isFindPath && <Autocomplete
							disablePortal
							options={values}
							inputValue={search}
							onInputChange={(__, v) => handleSearchChange(v)}
							noOptionsText={search ===  '' ? 'Start typing to search' : foundNode ? 'Matched a node' : 'No match'}
							fullWidth
							renderInput={(params) => <TextField {...params} onChange={e => handleSearchChange(e.target.value)} label='Find a node' />} />}
						{isFindPath && <>
							<Autocomplete
								disablePortal
								options={startValues}
								inputValue={startNodeSearch}
								onInputChange={(e, v) => { if (e && e.type === 'onChange') handleStartNodeSearchChange(v); }}
								noOptionsText={startNodeSearch ===  '' ? 'Start typing to search' : startNode ? startNode === endNode ? 'Start node and end node are the same' : 'Matched a node' : 'No match'}
								fullWidth
								renderInput={(params) => <TextField {...params} onChange={e => handleStartNodeSearchChange(e.target.value)} label='Find a start node' />} />
							<Autocomplete
								disablePortal
								options={endValues}
								inputValue={endNodeSearch}
								onInputChange={(e, v) => { if (e && e.type === 'onChange') handleEndNodeSearchChange(v); }}
								noOptionsText={endNodeSearch ===  '' ? 'Start typing to search' : endNode ? startNode === endNode ? 'Start node and end node are the same' : 'Matched a node' : 'No match'}
								fullWidth
								renderInput={(params) => <TextField {...params} onChange={e => handleEndNodeSearchChange(e.target.value)} label='Find an end node' />} />
						</>}
					</Grid>
					<Grid item container spacing={0} direction='column' justifyContent='start' alignItems='start' xs={3}>
						<Tooltip title={`${isFindPath ? 'Disable' : 'Enable' } find path`} sx={{ my: 1 }}>
							<IconButton size='large' color={isFindPath ? 'primary' : 'inherit'} onClick={() => setIsFindPath(!isFindPath)}>
								<TimelineIcon />
							</IconButton>
						</Tooltip>
					</Grid>
				</Grid>
			</Box>
			<Box className={classes.floatingActionsBottomLeft}>
				<Collapse in={expandNodeInfo && nodePropertiesInfo.length > 0} collapsedSize={theme.spacing(8)}>
					<Paper sx={{ width: 450, p: 2 }}>
						<Grid container>
							<Grid item xs={11}>Node info{(hoveredNodeLabel || selectedNodeLabel) && ` (${hoveredNodeLabel || selectedNodeLabel})`}</Grid>
							<Grid item xs={1}>
								<Tooltip title={`${expandNodeInfo ? 'Minimize' : 'Expand' } node info`}>
									<IconButton size='small' onClick={() => setExpandNodeInfo(!expandNodeInfo)}>
										{!expandNodeInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
									</IconButton>
								</Tooltip>
							</Grid>
							<Grid item xs={12}>
								{expandNodeInfo && <>
									<List>
										{nodePropertiesInfo.map(propertyInfo => <ListItem key={propertyInfo.label} secondaryAction={propertyInfo.secondaryAction}>
											<Grid container>
												<Grid item xs={3} sx={{ py: 2 }}>{propertyInfo.label}</Grid>
												<Grid item xs={8}>
													<TextField InputProps={{
														endAdornment: propertyInfo.password || propertyInfo.pin ?
															<InputAdornment position='end'>
																<IconButton onClick={() => { if (propertyInfo.toggleShowPassword) propertyInfo.toggleShowPassword(); }} edge='end'>
																	{(propertyInfo.password && _.includes(showPasswordFields, propertyInfo.nodeId)) || (propertyInfo.pin && _.includes(showPinFields, propertyInfo.nodeId)) ? <VisibilityOffIcon /> : <VisibilityIcon />}
																</IconButton>
															</InputAdornment> : ''
													}} fullWidth value={propertyInfo.value} type={(propertyInfo.password && !_.includes(showPasswordFields, propertyInfo.nodeId)) || (propertyInfo.pin && !_.includes(showPinFields, propertyInfo.nodeId)) ? 'password' : 'text'} />
												</Grid>
											</Grid>
										</ListItem>)}
									</List>
								</>}
							</Grid>
						</Grid>
					</Paper>
				</Collapse>
			</Box>
			<Dialog open={showImportDialog} fullWidth maxWidth='md'>
				<form onSubmit={handleImportSubmit}>
					<DialogTitle>
						Import from...
						<Tabs value={tabIndex} onChange={(__, newValue) => setTabIndex(newValue)}>
							<Tab value={0} label='Exported graph' />
							<Tab value={1} label='Wifite cracked.json' />
							<Tab value={2} label='Airodump-ng' />
						</Tabs>
					</DialogTitle>
					<DialogContent>
						{tabIndex === 0 && <Grid container spacing={2}>
							<Grid item>
								<Button variant='contained' component='label'>Choose a file<input accept='.json' onChange={e => setImportFromExportedGraphFile(e.target.files?.item(0) ?? null)} type='file' hidden /></Button>
							</Grid>
							<Grid item sx={{ flexGrow: 1 }}>
								{importFromExportedGraphFile && <TextField fullWidth size='small' InputProps={{ readOnly: true }} value={importFromExportedGraphFile.path} />}
							</Grid>
						</Grid>}
						{tabIndex === 1 && <Grid container spacing={2}>
							<Grid item>
								<Button variant='contained' component='label'>Choose a file<input accept='.json' onChange={e => setImportFromWifiteCrackedFile(e.target.files?.item(0) ?? null)} type='file' hidden /></Button>
							</Grid>
							<Grid item sx={{ flexGrow: 1 }}>
								{importFromWifiteCrackedFile && <TextField fullWidth size='small' InputProps={{ readOnly: true }} value={importFromWifiteCrackedFile.path} />}
							</Grid>
						</Grid>}
						{tabIndex === 2 && <Grid container spacing={2}>
							<Grid item>
								<Button variant='contained' component='label'>Choose a file<input accept='.csv' onChange={e => setImportFromAirodumpCsvFile(e.target.files?.item(0) ?? null)} type='file' hidden /></Button>
							</Grid>
							<Grid item sx={{ flexGrow: 1 }}>
								{importFromAirodumpCsvFile && <TextField fullWidth size='small' InputProps={{ readOnly: true }} value={importFromAirodumpCsvFile.path} />}
							</Grid>
						</Grid>}
					</DialogContent>
					<DialogActions>
						<Button color='inherit' onClick={handleCancel}>Cancel</Button>
						<Button type='submit' variant='contained' color='primary'>Import</Button>
					</DialogActions>
				</form>
			</Dialog>
			<Dialog open={showExportDialog} fullWidth maxWidth='md'>
				<form onSubmit={handleExportSubmit}>
					<DialogTitle>Export</DialogTitle>
					<DialogContent>
						You will be exporting ({sigma.getGraph().nodes().length}) nodes with ({sigma.getGraph().edges().length}) relations.
					</DialogContent>
					<DialogActions>
						<Button color='inherit' onClick={handleCancel}>Cancel</Button>
						<Button type='submit' variant='contained' color='primary'>Export</Button>
					</DialogActions>
				</form>
			</Dialog>
		</>
	);
}
