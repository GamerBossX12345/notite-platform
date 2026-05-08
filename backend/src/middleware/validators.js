// Zod validation schemas pentru toți inputurile.
import { z } from 'zod';

// Auth schemas
export const RegisterSchema = z.object({
  email: z.string().email('Email invalid').toLowerCase(),
  username: z.string().min(3, 'Username minim 3 caractere').max(30, 'Username maxim 30 caractere').regex(/^[a-zA-Z0-9_-]+$/, 'Doar litere, cifre, _ și -'),
  password: z.string().min(8, 'Parola minim 8 caractere').regex(/[A-Z]/, 'Trebuie o literă mare').regex(/[0-9]/, 'Trebuie o cifră'),
  name: z.string().optional(),
});

export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email sau username obligatoriu'),
  password: z.string().min(1, 'Parola obligatorie'),
});

// Notes schemas
export const CreateNoteSchema = z.object({
  title: z.string().min(5, 'Titlu minim 5 caractere').max(200, 'Titlu maxim 200 caractere'),
  subject: z.string().min(1, 'Subiect obligatoriu'),
  gradeLevel: z.coerce.number().int().min(1, 'Clasa minim 1').max(12, 'Clasa maxim 12'),
  chapter: z.string().optional(),
  type: z.enum(['REZUMAT', 'EXERCITII', 'FISA', 'HARTA_CONCEPTUALA']),
  content: z.string().optional(),
});

export const UpdateNoteSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  subject: z.string().min(1).optional(),
  gradeLevel: z.coerce.number().int().min(1).max(12).optional(),
  chapter: z.string().optional(),
  type: z.enum(['REZUMAT', 'EXERCITII', 'FISA', 'HARTA_CONCEPTUALA']).optional(),
  content: z.string().optional(),
});

// Rating schema
export const CreateRatingSchema = z.object({
  value: z.coerce.number().int().min(1, 'Rating minim 1').max(5, 'Rating maxim 5'),
});

// Comment schemas
export const CreateCommentSchema = z.object({
  content: z.string().min(1, 'Comentariu nu poate fi gol').max(5000, 'Comentariu maxim 5000 caractere'),
  parentId: z.string().optional(),
});

// Duplicate check
export const DuplicateCheckSchema = z.object({
  text: z.string().min(50, 'Text minim 50 caractere'),
  threshold: z.coerce.number().min(0.5).max(1).optional().default(0.7),
});

// Report schema
export const CreateReportSchema = z.object({
  reason: z.enum(['PLAGIAT', 'CONTINUT_NEPOTRIVIT', 'SPAM', 'ALTUL']),
  details: z.string().optional(),
});

// Validare helper
export function validateRequest(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const message = Object.entries(errors)
      .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
      .join('; ');
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return result.data;
}
