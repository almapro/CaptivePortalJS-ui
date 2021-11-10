import { Box, Button, ButtonGroup, Fab, Autocomplete, TextField, Paper } from '@mui/material';
import { makeStyles } from '@mui/styles';
import { FC, useContext, useState, useEffect } from 'react';
import {
	ZoomIn as ZoomInIcon,
	ZoomOut as ZoomOutIcon,
	Search as SearchIcon,
	Add as AddIcon,
	Settings as SettingsIcon,
} from '@mui/icons-material';
import { appContext } from '../App';
import { useSigma } from 'react-sigma-v2';
import Graph from 'graphology';

export type FloatingActionsProps = {
	showAddNode: () => void
	showSettings: () => void
}

export const FloatingActions: FC<FloatingActionsProps> = ({ showAddNode, showSettings }) => {
	const { theme, search, setSearch, foundNode, setFoundNode } = useContext(appContext);
	const sigma = useSigma();
	const useStyles = makeStyles({
		floatingActionsBottom: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			bottom: theme.spacing(2),
			right: theme.spacing(2),
		},
		floatingSearch: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			top: theme.spacing(2),
			left: theme.spacing(2),
		},
		floatingActionsTop: {
			position: 'absolute',
			zIndex: theme.zIndex.appBar,
			top: theme.spacing(2),
			right: theme.spacing(2),
		},
		paper: {
			padding: theme.spacing(2),
			height: `100%`,
		},
		divider: {
			width: '100%',
			height: '5px',
			margin: '5px 0 !important',
		},
	});
	const classes = useStyles();
	const [values, setValues] = useState<{ id: string, label: string }[]>([]);
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
		const graph = sigma.getGraph();
		const newValues: { id: string, label: string }[] = [];
		if (!foundNode && search.length > 0) {
			newValues.push(...findMatchingNodes(search, graph));
		}
		setValues(newValues);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, sigma]);
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
			<Box className={classes.floatingSearch}>
				<Paper>
					<Autocomplete
						disablePortal
						options={values}
						noOptionsText={search ===  '' ? 'Start typing to search' : foundNode ? 'Matched a node' : 'No match'}
						onInputChange={(__, v) => handleSearchChange(v)}
						sx={{ width: 300 }}
						renderInput={(params) => <TextField {...params} label='Find a node' />} />
				</Paper>
			</Box>
		</>
	);
}
