import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./security";

function req(headers: Record<string, string>): Request {
  return new Request("https://creatorhub.app/api/posts", {
    method: "POST",
    headers,
  });
}

describe("isSameOrigin", () => {
  it("allows requests with no Origin (non-browser clients)", () => {
    expect(isSameOrigin(req({}))).toBe(true);
  });

  it("allows Sec-Fetch-Site: same-origin", () => {
    expect(isSameOrigin(req({ "sec-fetch-site": "same-origin" }))).toBe(true);
  });

  it("blocks Sec-Fetch-Site: cross-site", () => {
    expect(isSameOrigin(req({ "sec-fetch-site": "cross-site" }))).toBe(false);
  });

  it("allows a matching Origin host", () => {
    expect(
      isSameOrigin(
        req({
          origin: "https://creatorhub.app",
          host: "creatorhub.app",
        }),
      ),
    ).toBe(true);
  });

  it("blocks a mismatched Origin host", () => {
    expect(
      isSameOrigin(
        req({
          origin: "https://evil.example",
          host: "creatorhub.app",
        }),
      ),
    ).toBe(false);
  });
});
