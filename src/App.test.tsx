import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const neo4jElements = screen.findAllByText(/neo4j/i);
  expect(neo4jElements).toBeInTheDocument();
});
