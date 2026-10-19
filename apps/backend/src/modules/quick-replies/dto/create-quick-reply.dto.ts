// src/modules/quick-replies/dto/create-quick-reply.dto.ts

export class CreateQuickReplyDto {
  label: string;
  text: string;
  category?: string;
  sortOrder?: number;
}