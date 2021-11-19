import Graph from "graphology";
import _ from "lodash";
import { Driver, Node, Path, Relationship, Session, SessionMode } from "neo4j-driver";
import RouterSvgIcon from './images/Router.svg';
import WifiSvgIcon from './images/Wifi.svg';
import HotspotSvgIcon from './images/Hotspot.svg';
import ClientSvgIcon from './images/Client.svg';
import BuildingSvgIcon from './images/Building.svg';
import HouseSvgIcon from './images/House.svg';
import FloorSvgIcon from './images/Floor.svg';
import WifiProbeSvgIcon from './images/PermScanWifi.svg';

export type NodeType = 'WIFI' | 'WIFIPROBE' | 'CLIENT' | 'ROUTER' | 'SERVER' | 'NETWORK' | 'HOTSPOT' | 'SERVICE' | 'RELATION' | 'BUILDING' | 'HOUSE' | 'FLOOR';

export type RelationType = 'BROADCASTS' | 'ATTACHED_TO' | 'KNOWS' | 'OWNS' | 'HAS_FLOOR' | 'CONNECTS_TO';

export type SessionOptions = {
  defaultAccessMode?: SessionMode;
  bookmarks?: string | string[];
  database?: string;
  fetchSize?: number;
}

export class Neo4jSigmaGraph {
  constructor(
    private graph: Graph,
    private driver: Driver,
    private sessionOptions?: SessionOptions,
  ) {}

  generateSession = () => this.driver.session(this.sessionOptions);

  getGraph = () => this.graph;

  addNodeToGraph = (node: Node) => {
    const node_type = node.labels[0].toUpperCase() as NodeType;
    const data: any = { node_type, type: 'image' };
    switch (node_type) {
      case 'WIFI':
        data.image = WifiSvgIcon;
        data.label = `${node.properties.essid} - ${node.properties.bssid}`;
        data.essid = node.properties.essid;
        data.bssid = node.properties.bssid;
        data.handshakes = node.properties.handshakes;
        break;
      case 'WIFIPROBE':
        data.image = WifiProbeSvgIcon;
        data.label = node.properties.essid;
        data.essid = node.properties.essid;
        break;
      case 'HOTSPOT':
        data.image = HotspotSvgIcon;
        data.label = `${node.properties.essid} - ${node.properties.bssid}`;
        data.essid = node.properties.essid;
        data.bssid = node.properties.bssid;
        break;
      case 'BUILDING':
      case 'HOUSE':
        data.image = node_type === 'BUILDING' ? BuildingSvgIcon : HouseSvgIcon;
        data.label = node.properties.name;
        data.name = node.properties.name;
        break;
      case 'FLOOR':
        data.image = FloorSvgIcon;
        data.label = `Floor ${node.properties.number}`;
        data.number = node.properties.number;
        break;
      case 'ROUTER':
        data.image = RouterSvgIcon;
        data.label = `${node.properties.ip} - ${node.properties.mac}`;
        data.ip = node.properties.ip;
        data.mac = node.properties.mac;
        break;
      case 'CLIENT':
        data.image = ClientSvgIcon;
        data.label = node.properties.ip ? `${node.properties.ip} - ${node.properties.mac}` : node.properties.mac;
        data.ip = node.properties.ip;
        data.mac = node.properties.mac;
        break;
    }
    if (!this.graph.hasNode(node.properties.id)) {
      this.graph.addNode(node.properties.id, data);
    }
  }

  addRelationPathToGraph = (relationPath: Path, data: any = {}) => {
    const source = relationPath.start.properties.id;
    const destination = relationPath.end.properties.id;
    const label = relationPath.segments[0].relationship.type.toUpperCase();
    return !this.graph.hasEdge(source, destination) ? this.graph.addEdge(source, destination, { label, ...data }) : this.graph.edge(source, destination);
  }

  getNodesByLabel = async (label: NodeType, _session?: Session): Promise<Node[]> => {
    const session = _session ?? this.generateSession();
    const result = await session.run(`MATCH (n:${_.capitalize(label)}) RETURN n`);
    await session.close();
    return result.records.map(record => record.toObject().n);
  }

  getNodeById = async (nodeId: string, _session?: Session): Promise<Node | undefined> => {
    const session = _session ?? this.generateSession();
    const result = await session.run('MATCH (n { id: $nodeId }) RETURN n', { nodeId });
    await session.close();
    return result.records.length ? result.records[0].toObject().n : undefined;
  }

  getNodeRelations = async (nodeId: string, _session?: Session): Promise<[Path, Relationship][]> => {
    const session = _session ?? this.generateSession();
    const result = await session.run('MATCH r1 = ({ id: $nodeId })-[]-() RETURN r1, relationships(r1) as r2', { nodeId });
    const relations: [Path, Relationship][] = result.records.map(record => [record.toObject().r1, record.toObject().r2]);
    await session.close();
    return relations;
  }

  getNodesShortestPath = async (startNodeId: string, endNodeId: string, _session: Session): Promise<Path[]> => {
    const session = _session ?? this.generateSession();
    const paths = await session.run('MATCH p = shortestPath((n1 { id: $startNodeId })-[*]-(n2 { id: $endNodeId })) RETURN p', { startNodeId, endNodeId });
    return paths.records.map(record => record.toObject().p);
  }
}
