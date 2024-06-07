const request = require("supertest");
const fs = require("fs");
const path = require("path");
const server = require("../index");

describe("File Upload", () => {
  it("should upload a file", async () => {
    const sampleFilePath = path.join(__dirname, "sample.txt");
    fs.writeFileSync(sampleFilePath, "Sample text file content");

    const response = await request(server)
      .post("/upload")
      .attach("file", sampleFilePath);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("fileUrl");

    fs.unlinkSync(sampleFilePath);
  });
  it("should error 400 if file not uploaded", async () => {
    const response = await request(server).post("/upload");

    expect(response.status).toBe(400);
  });
});
describe("Server", () => {
  it("should return status code 200", async () => {
    const response = await request(server).get("/");
    expect(response.status).toBe(200);
  });
});
