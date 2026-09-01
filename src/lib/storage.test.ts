import { rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import { saveUpload } from "./storage";

const created: string[] = [];

afterAll(async () => {
  await Promise.all(
    created.map((url) =>
      rm(path.join(process.cwd(), "public", url), { force: true }),
    ),
  );
});

function fakeFile(type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], "upload", { type });
}

describe("saveUpload validation", () => {
  it("rejects an unsupported image type", async () => {
    await expect(
      saveUpload(fakeFile("image/tiff", 100), "image"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an oversized image", async () => {
    await expect(
      saveUpload(fakeFile("image/png", 9 * 1024 * 1024), "image"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects an empty file", async () => {
    await expect(
      saveUpload(fakeFile("video/mp4", 0), "video"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a video sent as an image", async () => {
    await expect(
      saveUpload(fakeFile("video/mp4", 100), "image"),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("saveUpload happy path", () => {
  it("stores a valid image and returns an /uploads path", async () => {
    const result = await saveUpload(fakeFile("image/png", 1024), "image");
    created.push(result.url);
    expect(result.url).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);
    expect(result.type).toBe("image/png");
  });
});
