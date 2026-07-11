import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JobOfferListPage from './JobOfferListPage';

const { generateJobOfferMock, getJobsMock, createJobMock, updateJobMock, deleteJobMock } = vi.hoisted(() => ({
  generateJobOfferMock: vi.fn(),
  getJobsMock: vi.fn(),
  createJobMock: vi.fn(),
  updateJobMock: vi.fn(),
  deleteJobMock: vi.fn(),
}));

vi.mock('@/services/recruitmentService', async () => {
  const actual = await vi.importActual<typeof import('@/services/recruitmentService')>('@/services/recruitmentService');
  return {
    ...actual,
    recruitmentService: {
      ...actual.recruitmentService,
      getJobs: getJobsMock,
      generateJobOffer: generateJobOfferMock,
      createJob: createJobMock,
      updateJob: updateJobMock,
      deleteJob: deleteJobMock,
    },
  };
});

vi.mock('@/context/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('@/context/AuthContext')>('@/context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({ user: { id: 1, role: 'RH', name: 'RH Test' } }),
  };
});

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <JobOfferListPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('JobOfferListPage — agent IA de génération d\'offre', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getJobsMock.mockResolvedValue({ results: [] });
  });

  it('génère un brouillon depuis un fichier joint et affiche une carte de prévisualisation', async () => {
    generateJobOfferMock.mockResolvedValue({
      title: 'Business Developer Senior',
      department: 'Commercial',
      location: 'Abidjan, Côte d\'Ivoire',
      job_type: 'full_time',
      description: 'Description générée depuis le fichier fourni.',
      requirements: "5 ans d'expérience\nLinkedIn Sales Navigator",
      salary_range: '',
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /nouvelle offre/i }));

    const file = new File(['contenu'], 'fiche_de_poste.txt', { type: 'text/plain' });
    const fileInput = document.getElementById('job-offer-generate-file-input') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('fiche_de_poste.txt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /générer/i }));

    await waitFor(() => {
      expect(generateJobOfferMock).toHaveBeenCalledWith({ jobDescription: undefined, file });
    });

    expect(await screen.findByText('Business Developer Senior')).toBeInTheDocument();
    expect(screen.getByText("5 ans d'expérience")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /valider et insérer/i })).toBeInTheDocument();
  });

  it('insère le brouillon généré dans le formulaire quand on valide', async () => {
    generateJobOfferMock.mockResolvedValue({
      title: 'Développeur Backend',
      department: 'Tech',
      location: 'Dakar',
      job_type: 'full_time',
      description: 'Poste de développeur backend.',
      requirements: 'Django\nPostgreSQL',
      salary_range: '',
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /nouvelle offre/i }));
    fireEvent.change(screen.getByPlaceholderText(/décrivez le poste à créer/i), {
      target: { value: 'Poste de développeur backend Django.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /générer/i }));

    await screen.findByText('Développeur Backend');
    fireEvent.click(screen.getByRole('button', { name: /valider et insérer/i }));

    await waitFor(() => {
      expect(screen.queryByText(/valider et insérer/i)).not.toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Développeur Backend')).toBeInTheDocument();
  });

  it('annule le brouillon généré sans toucher au formulaire', async () => {
    generateJobOfferMock.mockResolvedValue({
      title: 'Titre à écarter',
      department: '',
      location: '',
      job_type: 'full_time',
      description: '',
      requirements: '',
      salary_range: '',
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /nouvelle offre/i }));
    fireEvent.change(screen.getByPlaceholderText(/décrivez le poste à créer/i), {
      target: { value: 'Description quelconque.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /générer/i }));

    await screen.findByText('Titre à écarter');
    fireEvent.click(screen.getByRole('button', { name: /ignorer le brouillon/i }));

    await waitFor(() => {
      expect(screen.queryByText('Titre à écarter')).not.toBeInTheDocument();
    });
    expect(screen.queryByDisplayValue('Titre à écarter')).not.toBeInTheDocument();
  });
});

describe('JobOfferListPage — modification et suppression (RH/Admin)', () => {
  const existingOffer = {
    id: 42,
    title: 'Développeur Backend Django Senior',
    department: 'Technologie',
    location: 'Dakar, Sénégal',
    contract_type: 'CDI',
    created_at: '2026-06-25T00:00:00Z',
    applications_count: 1,
    description: 'Nous recherchons un développeur Django expérimenté.',
    job_type: 'full_time',
    requirements: '5 ans Django',
    salary_range: '1 000 000 FCFA',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getJobsMock.mockResolvedValue({ results: [existingOffer] });
  });

  it('modifie une offre via la modale d\'édition', async () => {
    updateJobMock.mockResolvedValue({});
    renderPage();

    await screen.findByText('Développeur Backend Django Senior');
    fireEvent.click(screen.getByRole('button', { name: /modifier l'offre/i }));

    const titleInput = await screen.findByDisplayValue('Développeur Backend Django Senior');
    fireEvent.change(titleInput, { target: { value: 'Développeur Backend Django Lead' } });
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(updateJobMock).toHaveBeenCalledWith(
        42,
        expect.objectContaining({ title: 'Développeur Backend Django Lead', department: 'Technologie' })
      );
    });
  });

  it('supprime une offre après confirmation', async () => {
    deleteJobMock.mockResolvedValue(undefined);
    renderPage();

    await screen.findByText('Développeur Backend Django Senior');
    fireEvent.click(screen.getByRole('button', { name: /supprimer l'offre/i }));

    await screen.findByText(/supprimer cette offre d'emploi \?/i);
    fireEvent.click(screen.getByRole('button', { name: /^supprimer$/i }));

    await waitFor(() => {
      expect(deleteJobMock).toHaveBeenCalledWith(42);
    });
  });
});
