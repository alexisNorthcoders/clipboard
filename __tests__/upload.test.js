const request = require("supertest");
const fs = require("fs");
const path = require("path");
const {server} = require("../index");

describe("POST /upload", () => {
  it("should upload a file", async () => {
    const sampleFilePath = path.join(__dirname, "sample.txt");
    fs.writeFileSync(sampleFilePath, "Sample text file content");

    const response = await request(server)
      .post("/upload")
      .attach("file", sampleFilePath);

    expect(response.status).toBe(201);
    fs.unlinkSync(sampleFilePath);
  });
  it("should upload a file and respond with url", async () => {
    const sampleFilePath = path.join(__dirname, "sample.txt");
    fs.writeFileSync(sampleFilePath, "Sample text file content");

    const response = await request(server)
      .post("/upload")
      .attach("file", sampleFilePath);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({ message: "File uploaded successfully" })
    );
    expect(response.body.fileUrl).toBeDefined();
    fs.unlinkSync(sampleFilePath);
  });
  it("should error 400 if file not uploaded", async () => {
    const response = await request(server).post("/upload");

    expect(response.status).toBe(400);
  });
});
describe("GET /upload", function () {
  it('should return a list of files in the "uploads" folder', async () => {
    const response = await request(server).get("/upload");

    expect(response.status).toBe(200);
    expect(response.body.hasOwnProperty("files")).toBe(true);
  });
});
describe("Server", () => {
  it("should return status code 200", async () => {
    const response = await request(server).get("/");
    expect(response.status).toBe(200);
  });
});
