import fs from 'fs';
import path from 'path';
import { Project, Panorama, Hotspot } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure database folders exist
function initDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Initial default demo data to showcase the Three.js 360 viewer and hotspot links
const DEFAULT_DATA: Project[] = [
  {
    id: 'demo-living-room',
    name: 'Luxury Penthouse Suite',
    description: 'Modern, high-ceiling luxury penthouse with panoramic city views and minimalist interior design.',
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    panoramas: [
      {
        id: 'pano-living-room',
        projectId: 'demo-living-room',
        name: 'Living Room Central',
        rawImages: Array.from({ length: 12 }, (_, i) => `frame_${i}.jpg`),
        stitchedUrl: '/samples/luxury_living_room.jpg', // Fully qualified local path to sample
        status: 'completed',
        hotspots: [
          {
            id: 'hotspot-to-balcony',
            panoramaId: 'pano-living-room',
            type: 'scene',
            pitch: 0,
            yaw: 135,
            title: 'Walk to Ocean Balcony',
            targetPanoramaId: 'pano-balcony'
          },
          {
            id: 'hotspot-info-tv',
            panoramaId: 'pano-living-room',
            type: 'info',
            pitch: -5,
            yaw: -45,
            title: 'Smart Home Automation Screen',
            description: 'Integrated 85-inch 8K OLED TV and spatial soundbar controlling ambient lighting, temperature, and audio zones.'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'pano-balcony',
        projectId: 'demo-living-room',
        name: 'Oceanfront Balcony',
        rawImages: Array.from({ length: 12 }, (_, i) => `frame_${i}.jpg`),
        stitchedUrl: '/samples/luxury_balcony.jpg', // Another sample
        status: 'completed',
        hotspots: [
          {
            id: 'hotspot-back-to-living',
            panoramaId: 'pano-balcony',
            type: 'scene',
            pitch: 0,
            yaw: -45,
            title: 'Return to Living Room',
            targetPanoramaId: 'pano-living-room'
          },
          {
            id: 'hotspot-info-sunset',
            panoramaId: 'pano-balcony',
            type: 'info',
            pitch: 10,
            yaw: 180,
            title: '180° Panoramic View',
            description: 'Breathtaking unimpeded direct ocean views offering world-class sunset displays every single evening.'
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }
];

export function readDb(): Project[] {
  initDirectories();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
    return DEFAULT_DATA;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading JSON DB file, resetting to empty', error);
    return [];
  }
}

export function writeDb(data: Project[]): void {
  initDirectories();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function getProjects(): Project[] {
  return readDb();
}

export function getProject(id: string): Project | undefined {
  const db = readDb();
  return db.find((p) => p.id === id);
}

export function saveProject(project: Project): Project {
  const db = readDb();
  const index = db.findIndex((p) => p.id === project.id);
  if (index >= 0) {
    db[index] = { ...project, updatedAt: new Date().toISOString() };
  } else {
    db.push(project);
  }
  writeDb(db);
  return project;
}

export function deleteProject(id: string): boolean {
  const db = readDb();
  const filtered = db.filter((p) => p.id !== id);
  if (filtered.length !== db.length) {
    writeDb(filtered);
    return true;
  }
  return false;
}
