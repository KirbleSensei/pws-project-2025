import fs from 'fs';
import { Router, Request, Response } from 'express';
// @ts-ignore: Ignore missing types for formidable
import formidable, { File } from 'formidable';

import { requireRole } from './auth';

export const uploadRouter = Router();

const uploadDir = process.env.UPLOADSDIR || './uploads';

function sanitizeFilename(name: string): string {
  if (typeof name !== 'string') return '';

  const match = name.match(/^(.*?)(\.[^.]+)?$/);
  if (!match) return '';

  const base = match[1]
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const ext = match[2] || '';

  return base + ext;
}

// POST /api/upload
uploadRouter.post('/', requireRole([0]), async (req: Request, res: Response) => {
  const form = formidable({
    uploadDir,            // Directory where files are saved
    keepExtensions: true, // Preserve file extensions
    multiples: false,     // Single file upload
  });

  form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
    if (err) {
      console.error('Error while parsing form:', err);
      return res.status(400).json({ error: 'File upload failed' });
    }

    // The uploaded file (input name="file")
    const uploadedFile = (files.file as File | File[]) || null;
    // Subfolder path (optional)
    const uploadSubfolder = sanitizeFilename((fields.path?.[0] as string) || '');
    // name to use for naming the file
    const name = sanitizeFilename((fields.name?.[0] as string) || '');
    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    const backendPath = `${uploadDir}/${uploadSubfolder}/${name}`;

    if (!file) {
      deleteUploadedFile(name, uploadSubfolder);
      return res.json({ message: 'File deleted', filename: backendPath });
    }

    const fileInfo = {
      originalFilename: file.originalFilename,
      savedAs: file.filepath,
      size: file.size,
      mimeType: file.mimetype,
    };

    fileInfo.savedAs = backendPath;
    fs.renameSync(file.filepath, fileInfo.savedAs);

    return res.json({
      message: 'File uploaded successfully',
      file: fileInfo,
    });
  });
});

export function deleteUploadedFile(name: string, folder: string): boolean {
  const backendPath = `${uploadDir}/${sanitizeFilename(folder)}/${sanitizeFilename(name)}`;
  if (fs.existsSync(backendPath)) {
    fs.unlinkSync(backendPath);
    return true;
  }
  return false;
}