import { ReactNode, useContext } from 'react';
import { Navigate, useLocation} from 'react-router-dom';
import { appContext } from '../App';

export const AuthRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
	const location = useLocation();
	const { connected } = useContext(appContext);
	if (connected) {
		if (location.state && location.state.from !== "/logout") return <Navigate to={location.state.from} />
		else return <Navigate to='/' />;
	}
	else return <>{children}</>;
}
