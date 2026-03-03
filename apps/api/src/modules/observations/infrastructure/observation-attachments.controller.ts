import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UploadAttachmentCommand } from '../application/commands/upload-attachment.command';
import { DownloadAttachmentQuery } from '../application/queries/download-attachment.query';
import { ListAttachmentsQuery } from '../application/queries/list-attachments.query';
import { AttachmentResponseDto } from '../application/dtos/attachment-response.dto';
import type { DownloadAttachmentResult } from '../application/queries/download-attachment.handler';

/**
 * Controller for observation attachment endpoints.
 *
 * Implements RF-58 to RF-63 (attachments).
 */
@UseGuards(JwtAuthGuard)
@Controller('observations/:observationId/attachments')
export class ObservationAttachmentsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus
  ) {}

  /**
   * Uploads a file attachment to an observation.
   *
   * POST /observations/:observationId/attachments
   *
   * RF-60: Only JPEG, PNG, and PDF files allowed.
   * RF-61: Maximum 5 MB per file.
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('observationId') observationId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|pdf)$/,
          }),
        ],
      })
    )
    file: Express.Multer.File,
    @Req() request: Request
  ): Promise<AttachmentResponseDto> {
    const user = request.user as { userId: string };

    const command = new UploadAttachmentCommand(
      observationId,
      file.originalname,
      file.buffer,
      user.userId
    );

    return this.commandBus.execute<UploadAttachmentCommand, AttachmentResponseDto>(command);
  }

  /**
   * Downloads an attachment file.
   *
   * GET /observations/:observationId/attachments/:attachmentId/download
   *
   * RF-63: Attachments downloadable by users with access to the absence.
   */
  @Get(':attachmentId/download')
  async download(
    @Param('attachmentId') attachmentId: string,
    @Req() request: Request,
    @Res() response: Response
  ): Promise<void> {
    const user = request.user as { userId: string };

    const query = new DownloadAttachmentQuery(attachmentId, user.userId);

    const result = await this.queryBus.execute<DownloadAttachmentQuery, DownloadAttachmentResult>(
      query
    );

    response.setHeader('Content-Type', result.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.send(result.buffer);
  }

  /**
   * Lists all attachments for an observation.
   *
   * GET /observations/:observationId/attachments
   *
   * RF-58: Each observation can have 0 to N attachments.
   */
  @Get()
  async list(
    @Param('observationId') observationId: string,
    @Req() request: Request
  ): Promise<AttachmentResponseDto[]> {
    const user = request.user as { userId: string };

    const query = new ListAttachmentsQuery(observationId, user.userId);

    return this.queryBus.execute<ListAttachmentsQuery, AttachmentResponseDto[]>(query);
  }
}
