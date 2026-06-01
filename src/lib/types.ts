export interface Hotspot {
  id: string;
  panoramaId: string;
  type: 'info' | 'scene';
  pitch: number; // Vertical angle (degrees)
  yaw: number;   // Horizontal angle (degrees)
  title: string;
  description?: string;
  targetPanoramaId?: string; // Links to another room/panorama
}

export interface Panorama {
  id: string;
  projectId: string;
  name: string;
  rawImages: string[]; // List of file paths or local filenames
  stitchedUrl?: string; // Path or URL of the final stitched panorama
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  hotspots: Hotspot[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  panoramas: Panorama[];
}
