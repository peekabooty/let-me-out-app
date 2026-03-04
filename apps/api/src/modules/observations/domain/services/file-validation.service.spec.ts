import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FileValidationService } from './file-validation.service';

class TestableFileValidationService extends FileValidationService {
  constructor(
    private readonly detector: jest.Mock<Promise<{ mime: string } | undefined>, [Buffer]>
  ) {
    super();
  }

  protected override async detectFileType(buffer: Buffer): Promise<{ mime: string } | undefined> {
    return this.detector(buffer);
  }
}

describe('FileValidationService', () => {
  let service: TestableFileValidationService;
  let detectFileTypeMock: jest.Mock<Promise<{ mime: string } | undefined>, [Buffer]>;

  beforeEach(async () => {
    detectFileTypeMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: FileValidationService,
          useFactory: () => new TestableFileValidationService(detectFileTypeMock),
        },
      ],
    }).compile();

    service = module.get<FileValidationService>(
      FileValidationService
    ) as TestableFileValidationService;
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateFile', () => {
    const bytes = (size: number, value = 0): number[] => new Array<number>(size).fill(value);

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
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...bytes(100)]);
      detectFileTypeMock.mockResolvedValue({
        mime: 'image/jpeg',
      });

      const mimeType = await service.validateFile(jpegBuffer, 'test.jpg');

      expect(mimeType).toBe('image/jpeg');
    });

    it('should accept a PNG file with valid magic bytes', async () => {
      const pngBuffer = Buffer.from([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
        ...bytes(100),
      ]);
      detectFileTypeMock.mockResolvedValue({
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
        0x2d,
        0x31,
        0x2e,
        0x34,
        ...bytes(100),
      ]);
      detectFileTypeMock.mockResolvedValue({
        mime: 'application/pdf',
      });

      const mimeType = await service.validateFile(pdfBuffer, 'test.pdf');

      expect(mimeType).toBe('application/pdf');
    });

    it('should reject a file with unsupported MIME type based on magic bytes', async () => {
      const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...bytes(100)]);
      detectFileTypeMock.mockResolvedValue({
        mime: 'image/gif',
      });

      await expect(service.validateFile(gifBuffer, 'test.gif')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.validateFile(gifBuffer, 'test.gif')).rejects.toThrow('is not allowed');
    });

    it('should reject a file with no detectable MIME type', async () => {
      const randomBuffer = Buffer.from(bytes(100, 0x00));
      detectFileTypeMock.mockResolvedValue(undefined);

      await expect(service.validateFile(randomBuffer, 'test.txt')).rejects.toThrow(
        BadRequestException
      );
      await expect(service.validateFile(randomBuffer, 'test.txt')).rejects.toThrow(
        'unknown or invalid file type'
      );
    });

    it('should reject a file that claims to be JPEG but has wrong magic bytes', async () => {
      const fakeJpegBuffer = Buffer.from('This is not a JPEG file');
      detectFileTypeMock.mockResolvedValue(undefined);

      await expect(service.validateFile(fakeJpegBuffer, 'fake.jpg')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should accept a file exactly 5 MB in size', async () => {
      const exactSizeBuffer = Buffer.alloc(5 * 1024 * 1024);
      detectFileTypeMock.mockResolvedValue({
        mime: 'application/pdf',
      });

      const mimeType = await service.validateFile(exactSizeBuffer, 'exact.pdf');

      expect(mimeType).toBe('application/pdf');
    });
  });
});
