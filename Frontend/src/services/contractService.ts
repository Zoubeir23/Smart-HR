import api from './api';

export type ContractType = 'CDI' | 'CDD' | 'STAGE' | 'FREELANCE';
export type ContractStatus = 'active' | 'expired' | 'upcoming';

export interface Contract {
  id: number;
  employee: number;
  employee_full_name: string;
  contract_type: ContractType;
  start_date: string;
  end_date: string | null;
  salary: string;
  status: ContractStatus;
  created_at: string;
  updated_at: string;
}

export interface ContractPayload {
  employee: number;
  contract_type: ContractType;
  start_date: string;
  end_date: string | null;
  salary: number;
}

export const contractService = {
  getAll: async (): Promise<Contract[]> => {
    const { data } = await api.get('/personnel/contracts/');
    return data?.results ?? (Array.isArray(data) ? data : []);
  },

  create: async (payload: ContractPayload): Promise<Contract> => {
    const { data } = await api.post('/personnel/contracts/', payload);
    return data;
  },

  update: async (id: number, payload: Partial<ContractPayload>): Promise<Contract> => {
    const { data } = await api.patch(`/personnel/contracts/${id}/`, payload);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/personnel/contracts/${id}/`);
  },
};
