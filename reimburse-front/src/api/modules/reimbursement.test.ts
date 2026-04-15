import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestClient } from '@/api/request';
import {
  approveReimbursement,
  createReimbursement,
  deleteReimbursementAttachment,
  getReimbursementDetail,
  getReimbursements,
  markReimbursementPaid,
  rejectReimbursement,
  submitReimbursement,
  updateReimbursement,
} from '@/api/modules/reimbursement';

vi.mock('@/api/request', () => ({
  request: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  requestClient: {
    defaults: { baseURL: '/reimburse-api' },
  },
}));

const mockedRequest = await import('@/api/request').then((module) => module.request);

describe('reimbursement api module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses reimburse api base url', () => {
    expect(requestClient.defaults.baseURL).toBe('/reimburse-api');
  });

  it('loads reimbursement list and unwraps data', async () => {
    vi.mocked(mockedRequest.get).mockResolvedValueOnce({ data: [{ id: 1 }] } as never);
    const result = await getReimbursements('submitted');
    expect(mockedRequest.get).toHaveBeenCalledWith('/reimbursements', {
      params: { status: 'submitted' },
    });
    expect(result).toEqual([{ id: 1 }]);
  });

  it('creates reimbursement draft', async () => {
    vi.mocked(mockedRequest.post).mockResolvedValueOnce({ data: { id: 9 } } as never);
    const result = await createReimbursement({
      title: '差旅',
      category: 'travel',
      amount: 12.5,
      expenseDate: '2026-04-15',
    });
    expect(result.id).toBe(9);
  });

  it('gets reimbursement detail', async () => {
    vi.mocked(mockedRequest.get).mockResolvedValueOnce({ data: { id: 2 } } as never);
    const result = await getReimbursementDetail(2);
    expect(mockedRequest.get).toHaveBeenCalledWith('/reimbursements/2');
    expect(result.id).toBe(2);
  });

  it('updates reimbursement', async () => {
    vi.mocked(mockedRequest.put).mockResolvedValueOnce({ data: { id: 2, title: 'new' } } as never);
    const result = await updateReimbursement(2, { title: 'new' });
    expect(mockedRequest.put).toHaveBeenCalledWith('/reimbursements/2', { title: 'new' });
    expect(result.title).toBe('new');
  });

  it('posts submit approve reject and paid actions', async () => {
    vi.mocked(mockedRequest.post).mockResolvedValue({ data: { ok: true } } as never);
    await submitReimbursement(3);
    await approveReimbursement(3);
    await rejectReimbursement(3, '不合规');
    await markReimbursementPaid(3);
    expect(mockedRequest.post).toHaveBeenNthCalledWith(1, '/reimbursements/3/submit');
    expect(mockedRequest.post).toHaveBeenNthCalledWith(2, '/reimbursements/3/approve');
    expect(mockedRequest.post).toHaveBeenNthCalledWith(3, '/reimbursements/3/reject', {
      rejectReason: '不合规',
    });
    expect(mockedRequest.post).toHaveBeenNthCalledWith(4, '/reimbursements/3/mark-paid');
  });

  it('deletes reimbursement attachment', async () => {
    vi.mocked(mockedRequest.delete).mockResolvedValueOnce({ data: { id: 3 } } as never);
    const result = await deleteReimbursementAttachment(3, 8);
    expect(mockedRequest.delete).toHaveBeenCalledWith('/reimbursements/3/attachments/8');
    expect(result.id).toBe(3);
  });
});
