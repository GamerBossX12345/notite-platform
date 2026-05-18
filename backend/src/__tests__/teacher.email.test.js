import { describe, it, expect } from 'vitest';
import { emailQualifiesForTeacher } from '../controllers/teacher.controller.js';

describe('emailQualifiesForTeacher — auto-verificare prin domeniu', () => {
  it('acceptă emailuri .edu', () => {
    expect(emailQualifiesForTeacher('prof@harvard.edu')).toBe(true);
    expect(emailQualifiesForTeacher('alice@mit.edu')).toBe(true);
  });

  it('acceptă emailuri .edu.ro / .edu.us', () => {
    expect(emailQualifiesForTeacher('cadrudidactic@unibuc.edu.ro')).toBe(true);
    expect(emailQualifiesForTeacher('prof@stanford.edu.us')).toBe(true);
  });

  it('acceptă emailuri .ac.uk', () => {
    expect(emailQualifiesForTeacher('researcher@cam.ac.uk')).toBe(true);
  });

  it('acceptă emailuri .gov.ro (Ministerul Educației)', () => {
    expect(emailQualifiesForTeacher('inspector@edu.gov.ro')).toBe(true);
  });

  it('respinge emailuri non-instituționale', () => {
    expect(emailQualifiesForTeacher('user@gmail.com')).toBe(false);
    expect(emailQualifiesForTeacher('test@yahoo.ro')).toBe(false);
    expect(emailQualifiesForTeacher('admin@school.org')).toBe(false);
  });

  it('respinge input invalid', () => {
    expect(emailQualifiesForTeacher('')).toBe(false);
    expect(emailQualifiesForTeacher(null)).toBe(false);
    expect(emailQualifiesForTeacher(undefined)).toBe(false);
  });

  it('e case-insensitive pe domeniu', () => {
    expect(emailQualifiesForTeacher('PROF@HARVARD.EDU')).toBe(true);
    expect(emailQualifiesForTeacher('Cadru@UniBuc.Edu.Ro')).toBe(true);
  });
});
