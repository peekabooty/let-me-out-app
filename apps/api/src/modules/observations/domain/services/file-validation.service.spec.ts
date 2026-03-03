import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FileValidationService } from './file-validation.service';

// Mock file-type since it's ESM-only
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

// Import after mocking
import { fileTypeFromBuffer } from 'file-type';

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileValidationService],
    }).compile();

    service = module.get<FileValidationService>(FileValidationService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFile', () => {
    it('should reject a file larger than 5 MB', async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB

      await expect(service.validateFile(largeBuffer, 'test.pdf')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.validateFile(largeBuffer, 'test.pdf')).rejects.toThrow(
        'exceeds maximum size of 5 MB'
      );
    });

    it('should accept a JPEG file with valid magic bytes', async () => {
      const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array.from({length: 100}).fill(0)]);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        mime: 'image/jpeg',
      });

      const mimeType = await service.validateFile(jpegBuffer, 'test.jpg');

      expect(mimeType).toBe('image/jpeg');
    });

    it('should accept a PNG file with valid magic bytes', async () => {
      const pngBuffer = Buffer.from([
        0x89,
        0x50,
        0x4E,
        0x47,
        0x0D,
        0x0A,
        0x1A,
        0x0A,
        ...Array.from({length: 100}).fill(0),
      ]);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        mime: 'image/png',
      });

      const mimeType = await service.validateFile(pngBuffer, 'test.png');

      expect(mimeType).toBe('image/png');
    });

    it('should accept a PDF file with valid magic bytes', async () => {
      const pdfBuffer = Buffer.from([
        0x25,
        0x50,
        0x44,
        0x46,
        0x2D,
        0x31,
        0x2E,
        0x34,
        ...Array.from({length: 100}).fill(0),
      ]);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        mime: 'application/pdf',
      });

      const mimeType = await service.validateFile(pdfBuffer, 'test.pdf');

      expect(mimeType).toBe('application/pdf');
    });

    it('should reject a file with unsupported MIME type based on magic bytes', async () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...Array.from({length: 100}).fill(0)]);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        mime: 'image/gif',
      });

      await expect(service.validateFile(gifBuffer, 'test.gif')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.validateFile(gifBuffer, 'test.gif')).rejects.toThrow('is not allowed');
    });

    it('should reject a file with no detectable MIME type', async () => {
      const randomBuffer = Buffer.from(Array.from({length: 100}).fill(0x00));
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue();

      await expect(service.validateFile(randomBuffer, 'test.txt')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.validateFile(randomBuffer, 'test.txt')).rejects.toThrow(
        'unknown or invalid file type'
      );
    });

    it('should reject a file that claims to be JPEG but has wrong magic bytes', async () => {
      const fakeJpegBuffer = Buffer.from('This is not a JPEG file');
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue();

      await expect(service.validateFile(fakeJpegBuffer, 'fake.jpg')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should accept a file exactly 5 MB in size', async () => {
      const exactSizeBuffer = Buffer.alloc(5 * 1024 * 1024);
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        mime: 'application/pdf',
      });

      const mimeType = await service.validateFile(exactSizeBuffer, 'exact.pdf');

      expect(mimeType).toBe('application/pdf');
    });
  });
});
