import { Box, Button, ButtonGroup, Fab, Autocomplete, TextField, IconButton, Grid, Tooltip, Paper, Collapse, List, ListItem, InputAdornment } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { FC, useContext, useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import { appContext } from '../App';
import { useSigma } from 'react-sigma-v2';
import Graph from 'graphology';
import { NodeType } from '../neo4j-sigma-graph';
import _ from 'lodash';

export type FloatingActionsProps = {
	showAddNode: () => void
	showSettings: () => void
}

export const FloatingActions: FC<FloatingActionsProps> = ({ showAddNode, showSettings }) => {
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
	type NodePropertyInfoType = { nodeId: string,  label: string, value: string, secondaryAction?: JSX.Element, password?: boolean, toggleShowPassword?: () => void };
	const [nodePropertiesInfo, setNodePropertiesInfo] = useState<NodePropertyInfoType[]>([]);
	const [showPasswordFields, setShowPasswordFields] = useState<string[]>([]);
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
	return (
		<>
			<Box className={classes.floatingActionsTop} display='grid' rowGap={2}>
				<Tooltip placement='left' title='Settings'><Fab color='secondary' onClick={showSettings}><SettingsIcon /></Fab></Tooltip>
				<Tooltip placement='left' title='Add a node'><Fab color='secondary' onClick={showAddNode}><AddIcon /></Fab></Tooltip>
				<Tooltip placement='left' title='Refresh'><Fab color='secondary' onClick={() => sigma.refresh()}><RefreshIcon /></Fab></Tooltip>
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
														endAdornment: propertyInfo.password ?
															<InputAdornment position='end'>
																<IconButton onClick={() => { if (propertyInfo.toggleShowPassword) propertyInfo.toggleShowPassword(); }} edge='end'>
																	{_.includes(showPasswordFields, propertyInfo.nodeId) ? <VisibilityOffIcon /> : <VisibilityIcon />}
																</IconButton>
															</InputAdornment> : ''
													}} fullWidth value={propertyInfo.value} type={propertyInfo.password && !_.includes(showPasswordFields, propertyInfo.nodeId) ? 'password' : 'text'} />
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
		</>
	);
}
