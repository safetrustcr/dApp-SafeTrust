export function mockReq(body = {}) {
  return { body };
}

export function mockRes() {
  const res = {
    _status: null,
    _body: undefined,
    status(code) {
      this._status = code;
      return this;
    },
    json(payload) {
      this._body = payload;
      return this;
    },
  };

  return res;
}

/**
 * Creates a no-op next() that captures any error forwarded to it.
 * Used when invoking asyncHandler-wrapped handlers in tests.
 */
export function mockNext() {
  const next = (err) => {
    next.error = err ?? null;
  };
  next.error = undefined;
  return next;
}
