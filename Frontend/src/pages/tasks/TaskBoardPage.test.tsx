import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskBoardPage from './TaskBoardPage';

const { getAllMock, updateMock, deleteMock } = vi.hoisted(() => ({
  getAllMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock('@/services/taskService', () => ({
  taskService: {
    getAll: getAllMock,
    getById: vi.fn(),
    create: vi.fn(),
    update: updateMock,
    updateStatus: vi.fn(),
    delete: deleteMock,
  },
}));

vi.mock('@/services/employeeService', () => ({
  employeeService: {
    getAll: vi.fn().mockResolvedValue({ results: [] }),
  },
}));

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1, role: 'RH', name: 'RH Test' } }),
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskBoardPage />
    </QueryClientProvider>
  );
}

const existingTask = {
  id: 5,
  title: 'Préparer le rapport mensuel',
  description: 'Rapport RH du mois en cours',
  assignee: 2,
  assignee_name: 'Jean Kouassi',
  status: 'todo',
  priority: 'medium',
  due_date: '2026-08-01',
};

describe('TaskBoardPage — modification et suppression des tâches (RH/Admin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllMock.mockResolvedValue({ results: [existingTask] });
  });

  it('modifie une tâche via le menu de la carte', async () => {
    updateMock.mockResolvedValue({});
    renderPage();

    await screen.findByText('Préparer le rapport mensuel');
    const menuTrigger = screen.getByRole('button', { name: /actions pour la tâche préparer le rapport mensuel/i });
    menuTrigger.focus();
    fireEvent.keyDown(menuTrigger, { key: 'Enter' });

    const editItem = await screen.findByText('Modifier');
    fireEvent.click(editItem);

    const titleInput = await screen.findByDisplayValue('Préparer le rapport mensuel');
    fireEvent.change(titleInput, { target: { value: 'Préparer le rapport mensuel RH' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ title: 'Préparer le rapport mensuel RH' })
      );
    });
  });

  it('supprime une tâche après confirmation via le menu de la carte', async () => {
    deleteMock.mockResolvedValue(undefined);
    renderPage();

    await screen.findByText('Préparer le rapport mensuel');
    const menuTrigger = screen.getByRole('button', { name: /actions pour la tâche préparer le rapport mensuel/i });
    menuTrigger.focus();
    fireEvent.keyDown(menuTrigger, { key: 'Enter' });

    const deleteItem = await screen.findByText('Supprimer');
    fireEvent.click(deleteItem);

    await screen.findByText(/supprimer cette tâche \?/i);
    fireEvent.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith(5);
    });
  });
});
