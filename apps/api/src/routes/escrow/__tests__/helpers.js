/**
 * Shared mock helpers for escrow handler tests.
 *
 * mockReq(body) — creates a minimal Express-like req object.
 * mockRes()     — creates a res stub that captures .status() and .json() calls.
 */

export function mockReq(body = {}) {
  return { body };
}

export function mockRes() {
  const res = { _status: 200, _body: null };

  res.status = (code) => {
    res._status = code;
    return res;
  };

  res.json = (data) => {
    res._body = data;
    return res;
  };

  return res;
}
