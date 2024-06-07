const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../index');

describe('File Upload', () => {
  it('should upload a file', async () => {
    // Create a sample file for testing
    const sampleFilePath = path.join(__dirname, 'sample.txt');
    fs.writeFileSync(sampleFilePath, 'Sample text file content');

    // Send a POST request with the sample file
    const response = await request(app)
      .post('/upload')
      .attach('file', sampleFilePath);

    // Verify the response
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('fileUrl');

    // Clean up: remove the sample file
    fs.unlinkSync(sampleFilePath);
  });
});