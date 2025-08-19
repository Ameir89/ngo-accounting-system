
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { LanguageProvider } from '../../contexts/LanguageContext';
import DataTable from '../Tables/DataTable';

const Wrapper = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  );
};

const mockData = [
  { id: 1, name: 'Account 1', code: '1000', type: 'asset', balance: 1000 },
  { id: 2, name: 'Account 2', code: '2000', type: 'liability', balance: 500 }
];

const mockColumns = [
  { key: 'code', title: 'Code', sortable: true },
  { key: 'name', title: 'Name', sortable: true },
  { key: 'type', title: 'Type', filterable: true },
  { key: 'balance', title: 'Balance', render: (value) => `$${value.toLocaleString()}` }
];

describe('DataTable Component', () => {
  test('renders table with data', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
      />,
      { wrapper: Wrapper }
    );
    
    expect(screen.getByText('Account 1')).toBeInTheDocument();
    expect(screen.getByText('Account 2')).toBeInTheDocument();
    expect(screen.getByText('$1,000')).toBeInTheDocument();
  });
  
  test('handles search functionality', async () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        searchable={true}
      />,
      { wrapper: Wrapper }
    );
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Account 1' } });
    
    await waitFor(() => {
      expect(screen.getByText('Account 1')).toBeInTheDocument();
      expect(screen.queryByText('Account 2')).not.toBeInTheDocument();
    });
  });
  
  test('handles sorting', async () => {
    const mockOnSort = jest.fn();
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        onSort={mockOnSort}
      />,
      { wrapper: Wrapper }
    );
    
    const codeHeader = screen.getByText('Code');
    fireEvent.click(codeHeader);
    
    expect(mockOnSort).toHaveBeenCalledWith({ key: 'code', direction: 'asc' });
  });
  
  test('shows loading state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={true}
      />,
      { wrapper: Wrapper }
    );
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  
  test('shows empty state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={false}
      />,
      { wrapper: Wrapper }
    );
    
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });
});