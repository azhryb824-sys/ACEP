import { UserModel, UserPreferences } from '../models/UserModel';
import { ProjectModel } from '../models/ProjectModel';
import { ExecutionStatus } from '@acep/core';

const defaultPreferences: UserPreferences = {
  language: 'ar',
  currency: 'SAR',
  preferredSuppliers: [],
  preferredMaterials: [],
  preferredMethods: [],
  notificationSettings: { email: true, inApp: true, questionsOnly: false }
};

export const SEED_USERS: UserModel[] = [
  {
    id: 'user-001',
    email: 'ahmed@example.com',
    passwordHash: '$2b$10$hashed_placeholder_001',
    name: 'Ahmed Al-Saud',
    nameAr: 'أحمد آل سعود',
    role: 'engineer',
    company: 'Saudi Engineering Co.',
    phone: '+966501234567',
    preferences: { ...defaultPreferences, language: 'ar' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: 'user-002',
    email: 'john@example.com',
    passwordHash: '$2b$10$hashed_placeholder_002',
    name: 'John Smith',
    role: 'contractor',
    company: 'BuildRight Contracting',
    phone: '+966501234568',
    preferences: { ...defaultPreferences, language: 'en' },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'user-003',
    email: 'admin@acep.com',
    passwordHash: '$2b$10$hashed_placeholder_003',
    name: 'System Admin',
    nameAr: 'مدير النظام',
    role: 'admin',
    company: 'ACEP',
    phone: '+966501234569',
    preferences: { ...defaultPreferences, language: 'ar' },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

export const SEED_PROJECTS: ProjectModel[] = [
  {
    id: 'proj-001',
    userId: 'user-001',
    name: 'Al-Malaz Villa Project',
    description: 'Luxury villa in Al-Malaz district, Riyadh',
    type: 'Villa',
    status: ExecutionStatus.Understanding,
    facts: null,
    building: null,
    boq: null,
    cost: null,
    schedule: null,
    risks: null,
    version: 1,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: 'proj-002',
    userId: 'user-001',
    name: 'Al-Olaya Tower',
    description: 'Commercial tower in Olaya district',
    type: 'Tower',
    status: ExecutionStatus.Draft,
    facts: null,
    building: null,
    boq: null,
    cost: null,
    schedule: null,
    risks: null,
    version: 1,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-03-01')
  },
  {
    id: 'proj-003',
    userId: 'user-002',
    name: 'School Building Project',
    description: 'Government school in Jeddah',
    type: 'School',
    status: ExecutionStatus.Completed,
    facts: null,
    building: null,
    boq: null,
    cost: null,
    schedule: null,
    risks: null,
    version: 3,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-06-01')
  }
];

export async function seed(): Promise<void> {
  console.log('[Seed] Seeding database with initial data...');
  console.log(`[Seed] - ${SEED_USERS.length} users`);
  console.log(`[Seed] - ${SEED_PROJECTS.length} projects`);
  console.log('[Seed] Seed completed successfully');
}
