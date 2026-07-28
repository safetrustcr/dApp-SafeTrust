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
