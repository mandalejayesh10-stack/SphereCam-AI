import { NextResponse } from 'next/server';
import { getProjects, saveProject, deleteProject } from '@/lib/db';
import { Project } from '@/lib/types';

export async function GET() {
  try {
    const projects = getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error('API Error: GET projects', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const projectId = 'proj-' + Math.random().toString(36).substr(2, 9);
    
    // Create new project with a pending panorama room
    const newProject: Project = {
      id: projectId,
      name: name,
      description: description || '',
      isPublished: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      panoramas: [
        {
          id: 'pano-' + Math.random().toString(36).substr(2, 9),
          projectId: projectId,
          name: 'Main Space',
          rawImages: [],
          status: 'pending',
          hotspots: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };

    saveProject(newProject);

    return NextResponse.json(newProject);
  } catch (error) {
    console.error('API Error: POST project', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const deleted = deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error: DELETE project', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const project = await request.json();
    if (!project || !project.id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    saveProject(project);
    return NextResponse.json(project);
  } catch (error) {
    console.error('API Error: PUT project', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 505 });
  }
}
