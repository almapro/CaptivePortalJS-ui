import { shallow } from 'enzyme';
import App from '../App';

test('App renders correctly', () => {
  const app = shallow(<App />);
  expect(app).toMatchSnapshot();
});
