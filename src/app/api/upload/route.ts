import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProject, saveProject } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, panoId, images } = body;

    if (!projectId || !panoId || !images || !Array.isArray(images)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const project = getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const panoIndex = project.panoramas.findIndex(p => p.id === panoId);
    if (panoIndex === -1) {
      return NextResponse.json({ error: 'Room panorama not found' }, { status: 404 });
    }

    // Prepare uploads directory
    try {
      const projectUploadDir = path.join(process.cwd(), 'public', 'uploads', projectId);
      if (!fs.existsSync(projectUploadDir)) {
        fs.mkdirSync(projectUploadDir, { recursive: true });
      }
    } catch (e) {
      console.warn('Upload directory creation skipped (Serverless Read-Only Environment detected)');
    }

    const savedFilenames: string[] = [];

    // Save base64 frames to disk
    images.forEach((imgBase64: string, index: number) => {
      try {
        const projectUploadDir = path.join(process.cwd(), 'public', 'uploads', projectId);
        const base64Data = imgBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `frame_${index}_${Date.now()}.jpg`;
        const filePath = path.join(projectUploadDir, filename);

        fs.writeFileSync(filePath, buffer);
        savedFilenames.push(`/uploads/${projectId}/${filename}`);
      } catch (err: any) {
        if (err.code === 'EROFS') {
          // If serverless filesystem is read-only, keep the captured image as direct in-memory base64!
          savedFilenames.push(imgBase64);
        } else {
          throw err;
        }
      }
    });

    // Update state in database
    project.panoramas[panoIndex].rawImages = savedFilenames;
    project.panoramas[panoIndex].status = 'pending'; // Ready to stitch!
    project.panoramas[panoIndex].updatedAt = new Date().toISOString();
    
    saveProject(project);

    return NextResponse.json({ 
      success: true, 
      count: savedFilenames.length,
      rawImages: savedFilenames
    });
  } catch (error) {
    console.error('API Error: POST upload raw images', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
}
