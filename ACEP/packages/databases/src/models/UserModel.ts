export interface UserModel {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  nameAr?: string;
  role: 'admin' | 'engineer' | 'contractor' | 'consultant' | 'viewer';
  company?: string;
  phone?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  language: 'ar' | 'en';
  currency: string;
  defaultProjectType?: string;
  preferredSuppliers: string[];
  preferredMaterials: string[];
  preferredMethods: string[];
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  email: boolean;
  inApp: boolean;
  questionsOnly: boolean;
}
