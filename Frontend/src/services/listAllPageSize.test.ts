import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api';
import { LIST_ALL_PAGE_SIZE } from '@/lib/pagination';
import { employeeService } from './employeeService';
import { leaveService } from './leaveService';
import { payrollService } from './payrollService';
import { documentService } from './documentService';
import { communicationService } from './communicationService';
import { performanceService } from './performanceService';
import { disciplineService } from './disciplineService';

vi.mock('./api', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { results: [], count: 0 } }) },
}));

/**
 * Régression : ces pages de gestion appliquent recherche/tri/pagination
 * côté client sur le résultat de `getAll()`. Sans `page_size` explicite,
 * le backend (PAGE_SIZE=20) tronquait la liste et les enregistrements
 * au-delà du 20e devenaient invisibles pour la recherche.
 */
describe('services de liste : page_size par défaut', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockClear();
  });

  it('employeeService.getAll demande LIST_ALL_PAGE_SIZE', async () => {
    await employeeService.getAll();
    expect(api.get).toHaveBeenCalledWith('/personnel/employees/', {
      params: { page_size: LIST_ALL_PAGE_SIZE },
    });
  });

  it('employeeService.getAll fusionne page_size avec les filtres fournis', async () => {
    await employeeService.getAll({ status: 'active' });
    expect(api.get).toHaveBeenCalledWith('/personnel/employees/', {
      params: { status: 'active', page_size: LIST_ALL_PAGE_SIZE },
    });
  });

  it('leaveService.getAll demande LIST_ALL_PAGE_SIZE', async () => {
    await leaveService.getAll();
    expect(api.get).toHaveBeenCalledWith('/conge/leave-requests/', {
      params: { page_size: LIST_ALL_PAGE_SIZE },
    });
  });

  it('payrollService.getAll demande LIST_ALL_PAGE_SIZE', async () => {
    await payrollService.getAll();
    expect(api.get).toHaveBeenCalledWith('/paiement/payrolls/', {
      params: { page_size: LIST_ALL_PAGE_SIZE },
    });
  });

  it('documentService.getAll demande LIST_ALL_PAGE_SIZE', async () => {
    await documentService.getAll();
    expect(api.get).toHaveBeenCalledWith('/document/documents/', {
      params: { page_size: LIST_ALL_PAGE_SIZE },
    });
  });

  it('communicationService.getAll demande LIST_ALL_PAGE_SIZE', async () => {
    await communicationService.getAll();
    expect(api.get).toHaveBeenCalledWith('/communication/messages/', {
      params: { page_size: LIST_ALL_PAGE_SIZE },
    });
  });

  it('performanceService.getAllSkills demande LIST_ALL_PAGE_SIZE', async () => {
    await performanceService.getAllSkills();
    expect(api.get).toHaveBeenCalledWith('/performance/skills/', {
      params: { page_size: LIST_ALL_PAGE_SIZE },
    });
  });

  it('performanceService.getAllEvaluations demande LIST_ALL_PAGE_SIZE', async () => {
    await performanceService.getAllEvaluations();
    expect(api.get).toHaveBeenCalledWith('/performance/evaluations/', {
      params: { page_size: LIST_ALL_PAGE_SIZE },
    });
  });

  it('disciplineService.getAll demande LIST_ALL_PAGE_SIZE', async () => {
    await disciplineService.getAll();
    expect(api.get).toHaveBeenCalledWith('/discipline/actions/', {
      params: { page_size: LIST_ALL_PAGE_SIZE },
    });
  });
});
