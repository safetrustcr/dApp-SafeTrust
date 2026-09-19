import { beforeEach, describe, expect, it, vi } from "vitest";
import { activateWalletHandler } from "../activate-wallet.handler.js";

function firebaseToken(claims) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.sig`;
}

function mockReq({ token, body = {} } = {}) {
  return {
    body,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
}

function mockRes() {
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

describe("activateWalletHandler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.POLLAR_SECRET_KEY = "sk_test_pollar";
    process.env.HASURA_GRAPHQL_URL = "http://hasura.test/v1/graphql";
    process.env.HASURA_ADMIN_SECRET = "secret";
  });

  it("returns 401 when the bearer token is missing", async () => {
    const res = mockRes();
    await activateWalletHandler(mockReq(), res);
    expect(res._status).toBe(401);
    expect(res._body.error).toBe("Missing token");
  });

  it("returns 401 when the token payload cannot be decoded", async () => {
    const res = mockRes();
    await activateWalletHandler(mockReq({ token: "not-a-jwt" }), res);
    expect(res._status).toBe(401);
    expect(res._body.error).toBe("Invalid token");
  });

  it("returns 500 when POLLAR_SECRET_KEY is not configured", async () => {
    delete process.env.POLLAR_SECRET_KEY;
    const res = mockRes();
    await activateWalletHandler(
      mockReq({ token: firebaseToken({ user_id: "uid-1" }) }),
      res,
    );
    expect(res._status).toBe(500);
    expect(res._body.error).toBe("Pollar is not configured");
  });

  it("returns 502 when Pollar activation fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "unauthorized",
      }),
    );

    const res = mockRes();
    await activateWalletHandler(
      mockReq({ token: firebaseToken({ user_id: "uid-1" }) }),
      res,
    );

    expect(res._status).toBe(502);
    expect(res._body.error).toBe("Pollar activation failed");
  });

  it("stores the Pollar G-address and returns it on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: "GTESTADDRESS" }),
      })
      .mockResolvedValueOnce({
        json: async () => ({
          data: {
            insert_user_wallets_one: { id: "w1", wallet_address: "GTESTADDRESS" },
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const res = mockRes();
    await activateWalletHandler(
      mockReq({ token: firebaseToken({ user_id: "uid-1" }) }),
      res,
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://sdk.api.pollar.xyz/v2/wallet/activate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk_test_pollar",
          "x-pollar-api-key": "sk_test_pollar",
        }),
      }),
    );
    expect(res._status).toBe(200);
    expect(res._body).toEqual({ address: "GTESTADDRESS" });
  });

  it("returns 500 when Hasura upsert fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ address: "GTESTADDRESS" }),
        })
        .mockResolvedValueOnce({
          json: async () => ({ errors: [{ message: "constraint" }] }),
        }),
    );

    const res = mockRes();
    await activateWalletHandler(
      mockReq({ token: firebaseToken({ user_id: "uid-1" }) }),
      res,
    );

    expect(res._status).toBe(500);
    expect(res._body.error).toBe("Database sync failed");
  });
});
