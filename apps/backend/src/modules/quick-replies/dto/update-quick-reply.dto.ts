// src/modules/quick-replies/dto/update-quick-reply.dto.ts

export class UpdateQuickReplyDto {
  label?: string;
  text?: string;
  category?: string;
  sortOrder?: number;
}