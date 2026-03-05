import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DownloadAttachmentQuery } from '../application/queries/download-attachment.query';
import type { DownloadAttachmentResult } from '../application/queries/download-attachment.handler';

/**
 * Controller for flat attachment download endpoint.
 *
 * This controller provides a URL-friendly download endpoint that does not
 * require the observationId in the path, matching the frontend contract.
 *
 * RF-63: Attachments downloadable by users with access to the absence.
 */
@UseGuards(JwtAuthGuard)
@Controller('observations/attachments')
export class AttachmentsController {
  constructor(private readonly queryBus: QueryBus) {}

  /**
   * Downloads an attachment file by its ID.
   *
   * GET /observations/attachments/:attachmentId/download
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

    const result = await this.queryBus.execute<DownloadAttachmentQuery, DownloadAttachmentResult>(
      new DownloadAttachmentQuery(attachmentId, user.userId)
    );

    response.setHeader('Content-Type', result.mimeType);
    response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    response.send(result.buffer);
  }
}
