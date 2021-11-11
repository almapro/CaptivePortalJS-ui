import { Box, Button, ButtonGroup, Fab, Autocomplete, TextField, Paper, IconButton, Grid, Tooltip } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { FC, useContext, useState, useEffect } from 'react';
import {
	ZoomIn as ZoomInIcon,
	ZoomOut as ZoomOutIcon,
	Search as SearchIcon,
	Add as AddIcon,
	Settings as SettingsIcon,
	Timeline as TimelineIcon,
} from '@mui/icons-material';
import { appContext } from '../App';
import { useSigma } from 'react-sigma-v2';
import Graph from 'graphology';

export type FloatingActionsProps = {
	showAddNode: () => void
	showSettings: () => void
}

export const FloatingActions: FC<FloatingActionsProps> = ({ showAddNode, showSettings }) => {
	const { theme, search, setSearch, foundNode, setFoundNode, isFindPath, setIsFindPath, startNode, setStartNode, startNodeSearch, setStartNodeSearch, endNode, setEndNode, endNodeSearch, setEndNodeSearch } = useContext(appContext);
	const sigma = useSigma();
	const graph = sigma.getGraph();
	const useStyles = makeStyles({
		floatingActionsBottom: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			bottom: theme.spacing(2),
			right: theme.spacing(2),
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
	return (
		<>
			<Box className={classes.floatingActionsTop} display='grid' rowGap={2}>
				<Fab color='secondary' onClick={showSettings}><SettingsIcon /></Fab>
				<Fab color='secondary' onClick={showAddNode}><AddIcon /></Fab>
			</Box>
			<Box className={classes.floatingActionsBottom}>
				<ButtonGroup orientation='vertical' color='secondary' variant='contained'>
					<Button onClick={handleZoomIn}><ZoomInIcon /></Button>
					<Button onClick={handleZoomReset}><SearchIcon /></Button>
					<Button onClick={handleZoomOut}><ZoomOutIcon /></Button>
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
		</>
	);
}
