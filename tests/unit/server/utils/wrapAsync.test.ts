import { Request, Response, NextFunction } from 'express';
import { wrapAsync } from '../../../../src/server/src/utils/wrapAsync';

function mockReqRes() {
  const req = {} as Request;
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('wrapAsync', () => {
  test('calls the handler normally on success', async () => {
    const handler = jest.fn(async (_req: Request, res: Response) => {
      res.json({ ok: true });
    });
    const { req, res, next } = mockReqRes();

    await wrapAsync(handler)(req, res, next);

    // Let microtask queue flush
    await new Promise(r => setImmediate(r));

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
    expect(next).not.toHaveBeenCalled();
  });

  test('forwards rejected promise to next(err)', async () => {
    const error = new Error('boom');
    const handler = jest.fn(async () => { throw error; });
    const { req, res, next } = mockReqRes();

    wrapAsync(handler)(req, res, next);

    // Let microtask queue flush
    await new Promise(r => setImmediate(r));

    expect(next).toHaveBeenCalledWith(error);
  });
});
